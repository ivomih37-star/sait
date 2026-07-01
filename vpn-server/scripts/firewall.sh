#!/usr/bin/env bash
#
# firewall.sh — Configure UFW for the VPN server.
#
# Policy:
#   * default deny incoming, allow outgoing
#   * allow SSH (hardened port), WireGuard UDP, XRay TCP (if enabled)
#   * the wg-easy web panel is NEVER opened — reach it via SSH tunnel only
#   * allow forwarding + NAT for VPN clients
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
[[ -f "$ENV_FILE" ]] && { set -a; . "$ENV_FILE"; set +a; }

: "${WG_PORT:=51820}"
: "${XRAY_ENABLE:=true}"
: "${XRAY_PORT:=443}"
: "${SSH_PORT:=2222}"
[[ "$SSH_PORT" == "0" ]] && SSH_PORT=22

echo "[firewall] Resetting UFW to a known-good state..."
ufw --force reset >/dev/null

ufw default deny incoming
ufw default allow outgoing
ufw default allow routed        # allow forwarded VPN traffic

# --- SSH: rate-limited to slow brute force ---
ufw limit "${SSH_PORT}/tcp" comment 'SSH (hardened)'

# --- WireGuard ---
ufw allow "${WG_PORT}/udp" comment 'WireGuard'

# --- XRay/VLESS fallback ---
if [[ "${XRAY_ENABLE,,}" == "true" ]]; then
  ufw allow "${XRAY_PORT}/tcp" comment 'XRay VLESS/TLS'
fi

# NOTE: web panel port (WEB_PORT) is intentionally NOT allowed. Docker publishes
# it on 127.0.0.1 only; UFW keeps it closed to the outside world regardless.

# --- NAT / masquerade for VPN clients (added to UFW's before.rules) ---
BEFORE_RULES="/etc/ufw/before.rules"
WG_SUBNET="10.8.0.0/24"
PUB_IF="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev"){print $(i+1); exit}}')"
PUB_IF="${PUB_IF:-eth0}"

if ! grep -q "VPN-NAT-RULES" "$BEFORE_RULES" 2>/dev/null; then
  echo "[firewall] Adding NAT masquerade for ${WG_SUBNET} via ${PUB_IF}..."
  # Prepend a *nat table block before the *filter table.
  tmp="$(mktemp)"
  cat > "$tmp" <<EOF
# VPN-NAT-RULES (managed by firewall.sh) — do not edit inside this block
*nat
:POSTROUTING ACCEPT [0:0]
-A POSTROUTING -s ${WG_SUBNET} -o ${PUB_IF} -j MASQUERADE
COMMIT
# End VPN-NAT-RULES

EOF
  cat "$BEFORE_RULES" >> "$tmp"
  mv "$tmp" "$BEFORE_RULES"
fi

# Ensure forwarding is permitted by UFW policy.
sed -i 's/^DEFAULT_FORWARD_POLICY=.*/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw

ufw --force enable
echo "[firewall] Active rules:"
ufw status verbose
