#!/usr/bin/env bash
#
# add-client.sh — Create a WireGuard client and print a QR code + config.
#
# Usage:
#   ./add-client.sh <name> [split|full]
#     name   client label (e.g. phone, laptop, router)
#     mode   split = RU/banks bypass VPN (default) | full = everything via VPN
#
# Talks to the wg-easy REST API on 127.0.0.1 (no external exposure). Writes the
# .conf to configs/<name>.conf and renders a scannable QR code in the terminal.
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
[[ -f "$ENV_FILE" ]] && { set -a; . "$ENV_FILE"; set +a; }

: "${WEB_PORT:=51821}"
: "${WEB_PASSWORD:?WEB_PASSWORD not set (check .env)}"
NAME="${1:-}"
MODE="${2:-split}"
[[ -n "$NAME" ]] || { echo "Usage: $0 <name> [split|full]"; exit 1; }

API="http://127.0.0.1:${WEB_PORT}"
CJAR="$(mktemp)"
trap 'rm -f "$CJAR"' EXIT

command -v qrencode >/dev/null || { echo "Installing qrencode..."; apt-get install -y -qq qrencode; }

echo "[add-client] Authenticating to wg-easy..."
if ! curl -fsS -c "$CJAR" -H 'Content-Type: application/json' \
      -d "{\"password\":\"${WEB_PASSWORD}\"}" "${API}/api/session" >/dev/null; then
  echo "ERROR: cannot reach wg-easy at ${API}. Is the container up? (docker compose ps)"
  exit 1
fi

echo "[add-client] Creating client '${NAME}'..."
curl -fsS -b "$CJAR" -H 'Content-Type: application/json' \
  -d "{\"name\":\"${NAME}\"}" "${API}/api/wireguard/client" >/dev/null

# Find the client id we just created (latest with this name).
CID="$(curl -fsS -b "$CJAR" "${API}/api/wireguard/client" \
        | python3 -c "import sys,json; cs=json.load(sys.stdin);
m=[c for c in cs if c['name']=='${NAME}'];
print(m[-1]['id'] if m else '')")"
[[ -n "$CID" ]] || { echo "ERROR: could not locate created client."; exit 1; }

OUT="${ROOT_DIR}/configs/${NAME}.conf"
curl -fsS -b "$CJAR" "${API}/api/wireguard/client/${CID}/configuration" -o "$OUT"

# Apply split-tunnel AllowedIPs if requested and available.
if [[ "$MODE" == "split" && -s "${ROOT_DIR}/configs/allowed-ips-split.txt" ]]; then
  SPLIT="$(cat "${ROOT_DIR}/configs/allowed-ips-split.txt")"
  # Replace the AllowedIPs line in the [Peer] section.
  python3 - "$OUT" "$SPLIT" <<'PY'
import sys
path, split = sys.argv[1], sys.argv[2]
out=[]
for l in open(path).read().splitlines():
    out.append("AllowedIPs = " + split if l.strip().startswith("AllowedIPs") else l)
open(path,"w").write("\n".join(out)+"\n")
PY
  echo "[add-client] Applied SPLIT tunnel (RU + banks bypass VPN)."
else
  echo "[add-client] Using FULL tunnel (all traffic via VPN)."
fi
chmod 600 "$OUT"

echo
echo "================ ${NAME}.conf ================"
cat "$OUT"
echo "=============================================="
echo
echo "Scan this QR with the WireGuard mobile app:"
qrencode -t ansiutf8 < "$OUT"
echo
echo "Saved config: ${OUT}"
echo "For desktop: import ${OUT} into the WireGuard client."
