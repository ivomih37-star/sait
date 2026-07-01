#!/usr/bin/env bash
#
# telegram-notify.sh — Send a message to the configured Telegram chat.
# Usage: ./telegram-notify.sh "your message"
#
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
[[ -f "$ENV_FILE" ]] && { set -a; . "$ENV_FILE"; set +a; }

MSG="${1:-(empty message)}"
[[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]] || {
  echo "[telegram] Not configured (TELEGRAM_BOT_TOKEN/CHAT_ID missing); skipping."; exit 0; }

curl -fsS --max-time 20 \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MSG}" \
  --data-urlencode "parse_mode=HTML" \
  --data-urlencode "disable_web_page_preview=true" \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" >/dev/null \
  && echo "[telegram] sent." || { echo "[telegram] send failed."; exit 1; }
