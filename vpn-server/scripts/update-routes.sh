#!/usr/bin/env bash
#
# update-routes.sh — Build & refresh the split-tunnel route lists.
#
# Goal: Russian traffic goes DIRECT (fast, and keeps banks/gosuslugi working),
# everything else goes THROUGH the VPN.
#
# WireGuard routes by IP via the client's "AllowedIPs". To send "everything
# except Russia" through the tunnel we compute:
#
#       AllowedIPs = 0.0.0.0/0  MINUS  (Russian CIDRs + VPN-hostile service IPs)
#
# Outputs (in configs/):
#   * russia-direct.txt        — CIDRs that must bypass the VPN
#   * allowed-ips-split.txt     — the computed AllowedIPs for split tunneling
#   * allowed-ips-full.txt      — 0.0.0.0/0 (route everything, for max privacy)
#
# It also updates WG_ALLOWED_IPS in ../.env so NEW wg-easy clients get the
# split list automatically, then reloads the container.
#
# Data sources (with offline fallback):
#   * Russian per-country CIDRs: ipdeny aggregated zone
#   * Bank / gosuslugi / VPN-hostile domains resolved to A records
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONF_DIR="${ROOT_DIR}/configs"
ENV_FILE="${ROOT_DIR}/.env"
DATA_DIR="${ROOT_DIR}/data/routes"
mkdir -p "$CONF_DIR" "$DATA_DIR"

RU_ZONE_URL="https://www.ipdeny.com/ipblocks/data/aggregated/ru-aggregated.zone"

# Domains that should ALSO bypass the VPN (banks + госуслуги + services that
# block or mis-behave behind datacenter VPN IPs). Their A records are resolved
# and added to the direct list.
DIRECT_DOMAINS=(
  # Госуслуги / гос
  gosuslugi.ru esia.gosuslugi.ru nalog.ru nalog.gov.ru pfr.gov.ru
  # Банки / платежи (часто блокируют VPN)
  sberbank.ru online.sberbank.ru sbrf.ru vtb.ru online.vtb.ru
  alfabank.ru online.alfabank.ru tinkoff.ru tbank.tinkoff.ru
  gazprombank.ru raiffeisen.ru open.ru psbank.ru mkb.ru sovcombank.ru
  mir.nspk.ru sbp.nspk.ru qiwi.com yoomoney.ru
  # Крупные RU-сервисы
  yandex.ru ya.ru vk.com vk.ru mail.ru ok.ru wildberries.ru ozon.ru
  avito.ru 2gis.ru rutube.ru kinopoisk.ru dzen.ru
)

log() { echo "[update-routes] $*"; }

# --------------------------------------------------------------------------- #
# 1. Fetch Russian CIDR blocks (with offline fallback)
# --------------------------------------------------------------------------- #
RU_CIDRS="${DATA_DIR}/ru-cidrs.txt"
log "Fetching Russian IP ranges..."
if curl -fsSL --max-time 30 "$RU_ZONE_URL" -o "${RU_CIDRS}.new" 2>/dev/null \
     && [[ -s "${RU_CIDRS}.new" ]]; then
  mv "${RU_CIDRS}.new" "$RU_CIDRS"
  log "Got $(wc -l < "$RU_CIDRS") Russian CIDR blocks."
elif [[ -s "$RU_CIDRS" ]]; then
  log "Download failed; reusing cached ${RU_CIDRS}."
else
  log "Download failed and no cache; using minimal built-in fallback list."
  # Minimal seed of well-known RU ranges (Yandex, VK, Sber, Rostelecom, MTS).
  cat > "$RU_CIDRS" <<'EOF'
5.45.192.0/18
5.255.192.0/18
37.9.64.0/18
77.88.0.0/18
87.250.224.0/19
93.158.128.0/18
95.108.128.0/17
178.154.128.0/17
213.180.192.0/19
95.213.0.0/18
EOF
fi

# --------------------------------------------------------------------------- #
# 2. Resolve VPN-hostile / RU service domains to IPs -> /32 direct routes
# --------------------------------------------------------------------------- #
DIRECT_DOMAIN_IPS="${DATA_DIR}/direct-domain-ips.txt"
: > "$DIRECT_DOMAIN_IPS"
log "Resolving ${#DIRECT_DOMAINS[@]} VPN-hostile/RU service domains..."
for d in "${DIRECT_DOMAINS[@]}"; do
  # getent works without extra deps; fall back to nslookup.
  ips="$(getent ahostsv4 "$d" 2>/dev/null | awk '{print $1}' | sort -u)"
  [[ -z "$ips" ]] && ips="$(nslookup "$d" 2>/dev/null | awk '/^Address: /{print $2}')"
  for ip in $ips; do
    [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && echo "${ip}/32" >> "$DIRECT_DOMAIN_IPS"
  done
done
sort -u "$DIRECT_DOMAIN_IPS" -o "$DIRECT_DOMAIN_IPS"
log "Resolved $(wc -l < "$DIRECT_DOMAIN_IPS") direct /32 host routes."

# --------------------------------------------------------------------------- #
# 3. Assemble the DIRECT list (what bypasses the VPN)
# --------------------------------------------------------------------------- #
DIRECT_ALL="${CONF_DIR}/russia-direct.txt"
{
  echo "# Networks that BYPASS the VPN (Russian ranges + VPN-hostile services)."
  echo "# Auto-generated $(date -u +%FT%TZ) by update-routes.sh — do not edit by hand."
  cat "$RU_CIDRS"
  cat "$DIRECT_DOMAIN_IPS"
} > "$DIRECT_ALL"

# --------------------------------------------------------------------------- #
# 4. Compute AllowedIPs = 0.0.0.0/0 minus the direct list (Python stdlib)
# --------------------------------------------------------------------------- #
SPLIT_OUT="${CONF_DIR}/allowed-ips-split.txt"
log "Computing split-tunnel AllowedIPs (0.0.0.0/0 minus direct list)..."
python3 - "$DIRECT_ALL" > "$SPLIT_OUT" <<'PY'
import ipaddress, sys
direct = []
with open(sys.argv[1]) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            direct.append(ipaddress.ip_network(line, strict=False))
        except ValueError:
            pass
# Start from the whole IPv4 space and carve out each direct network.
remaining = [ipaddress.ip_network("0.0.0.0/0")]
for net in direct:
    nxt = []
    for r in remaining:
        if net.overlaps(r):
            nxt.extend(r.address_exclude(net) if net.subnet_of(r) else [r])
        else:
            nxt.append(r)
    remaining = nxt
# Collapse and print, comma-separated on one line (WireGuard AllowedIPs form).
collapsed = list(ipaddress.collapse_addresses(remaining))
print(",".join(str(n) for n in collapsed))
PY

# Guard against an empty/garbage result — never ship a broken AllowedIPs.
if ! grep -q "/" "$SPLIT_OUT"; then
  log "WARNING: split computation produced no routes; defaulting to full tunnel."
  echo "0.0.0.0/0" > "$SPLIT_OUT"
fi
echo "0.0.0.0/0" > "${CONF_DIR}/allowed-ips-full.txt"
log "Split AllowedIPs written ($(wc -c < "$SPLIT_OUT") bytes)."

# --------------------------------------------------------------------------- #
# 5. Update .env so new wg-easy clients inherit the split list, then reload
# --------------------------------------------------------------------------- #
if [[ -f "$ENV_FILE" ]]; then
  SPLIT_VALUE="$(cat "$SPLIT_OUT")"
  # Escape for sed replacement (commas/slashes are fine; use a safe delimiter).
  if grep -q '^WG_ALLOWED_IPS=' "$ENV_FILE"; then
    python3 - "$ENV_FILE" "$SPLIT_VALUE" <<'PY'
import sys
path, val = sys.argv[1], sys.argv[2]
lines = open(path).read().splitlines()
out = []
for l in lines:
    out.append("WG_ALLOWED_IPS=" + val if l.startswith("WG_ALLOWED_IPS=") else l)
open(path, "w").write("\n".join(out) + "\n")
PY
  else
    echo "WG_ALLOWED_IPS=${SPLIT_VALUE}" >> "$ENV_FILE"
  fi
  log ".env updated with split AllowedIPs."

  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q '^wg-easy$'; then
    log "Reloading wg-easy to apply new default AllowedIPs..."
    ( cd "$ROOT_DIR" && docker compose up -d wg-easy >/dev/null 2>&1 ) || true
  fi
fi

log "Done."
log "  Full tunnel   -> configs/allowed-ips-full.txt"
log "  Split tunnel  -> configs/allowed-ips-split.txt  (RU + banks bypass VPN)"
log "NOTE: existing client devices keep their old AllowedIPs. Re-import the"
log "      updated .conf (or paste the new AllowedIPs) to apply the change."
