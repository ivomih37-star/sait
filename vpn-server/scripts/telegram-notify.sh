#!/usr/bin/env bash
# telegram-notify.sh — отправляет ежедневный статус сервера в Telegram.
# Запускается systemd-таймером vpn-heartbeat.timer. Если Telegram не настроен (.env пуст) — тихо выходит.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ROOT="$(vpn_project_root)"
ENV_FILE="$ROOT/.env"
[[ -f "$ENV_FILE" ]] || exit 0
# shellcheck disable=SC1090
source "$ENV_FILE"

[[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]] || exit 0

WG_STATUS="недоступен"
PEER_COUNT="?"
if docker inspect wg-easy >/dev/null 2>&1; then
	if [[ "$(docker inspect -f '{{.State.Running}}' wg-easy 2>/dev/null)" == "true" ]]; then
		WG_STATUS="работает ✅"
		PEER_COUNT="$(docker exec wg-easy wg show wg0 peers 2>/dev/null | grep -c . || echo 0)"
	else
		WG_STATUS="остановлен ❌"
	fi
fi

XRAY_STATUS="недоступен"
if docker inspect xray >/dev/null 2>&1; then
	if [[ "$(docker inspect -f '{{.State.Running}}' xray 2>/dev/null)" == "true" ]]; then
		XRAY_STATUS="работает ✅"
	else
		XRAY_STATUS="остановлен ❌"
	fi
fi

UPTIME="$(uptime -p 2>/dev/null || echo 'н/д')"
DISK_USE="$(df -h / | awk 'NR==2 {print $5 " занято (" $4 " свободно)"}')"

BACKUP_DIR="${VPN_BACKUP_DIR:-/root/vpn-backups}"
LAST_BACKUP="нет бэкапов"
if compgen -G "$BACKUP_DIR/vpn-backup-*.tar.gz" >/dev/null; then
	LAST_BACKUP="$(ls -1t "$BACKUP_DIR"/vpn-backup-*.tar.gz | head -1 | xargs -n1 basename)"
fi

MESSAGE="🖥 *Статус VPN-сервера*
WireGuard: ${WG_STATUS} (подключено пиров: ${PEER_COUNT})
Xray: ${XRAY_STATUS}
Uptime: ${UPTIME}
Диск: ${DISK_USE}
Последний бэкап: ${LAST_BACKUP}"

telegram_send "$MESSAGE"
