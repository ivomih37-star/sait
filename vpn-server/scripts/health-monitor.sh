#!/usr/bin/env bash
#
# health-monitor.sh — Cron health check with Telegram alerting.
#
# Checks (every 5 min via cron):
#   * wg-easy / unbound / xray containers are running
#   * WireGuard UDP port is listening
#   * outbound internet works
#   * disk usage below 90%
#
# Alerts are edge-triggered: it only pings Telegram when state CHANGES
# (healthy -> unhealthy or back), so you are not spammed every 5 minutes.
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
[[ -f "$ENV_FILE" ]] && { set -a; . "$ENV_FILE"; set +a; }
: "${WG_PORT:=51820}"
STATE_FILE="${ROOT_DIR}/data/.health-state"
notify() { bash "${SCRIPT_DIR}/telegram-notify.sh" "$1" >/dev/null 2>&1 || true; }

problems=()

# Container checks.
for c in wg-easy unbound; do
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${c}$"; then
    problems+=("container '${c}' is DOWN")
  fi
done
if [[ "${XRAY_ENABLE:-true}" == "true" ]]; then
  docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^xray$' || problems+=("container 'xray' is DOWN")
fi

# WireGuard port listening?
if command -v ss >/dev/null; then
  ss -lun 2>/dev/null | grep -q ":${WG_PORT}\b" || problems+=("WireGuard UDP ${WG_PORT} not listening")
fi

# Outbound connectivity.
curl -fsS --max-time 8 https://1.1.1.1 >/dev/null 2>&1 || problems+=("no outbound internet")

# Disk space.
USE="$(df -P / | awk 'NR==2{gsub("%","",$5); print $5}')"
[[ "${USE:-0}" -ge 90 ]] && problems+=("disk ${USE}% full")

# Edge-triggered alerting.
if [[ ${#problems[@]} -gt 0 ]]; then
  NEW="unhealthy: $(IFS='; '; echo "${problems[*]}")"
  if [[ "$(cat "$STATE_FILE" 2>/dev/null || true)" != "$NEW" ]]; then
    notify "🚨 VPN server ALERT on $(hostname): ${NEW}"
    echo "$NEW" > "$STATE_FILE"
  fi
  echo "[health] ${NEW}"
  exit 1
else
  if [[ "$(cat "$STATE_FILE" 2>/dev/null || true)" == unhealthy* ]]; then
    notify "✅ VPN server RECOVERED on $(hostname). All checks passing."
  fi
  echo "healthy" > "$STATE_FILE"
  echo "[health] all checks passing"
fi
