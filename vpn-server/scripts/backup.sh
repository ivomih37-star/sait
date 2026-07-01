#!/usr/bin/env bash
# backup.sh — архивирует конфиги wg-easy, Xray, DNS и списки маршрутизации.
# Хранит последние BACKUP_KEEP архивов, опционально отправляет в Telegram (если < 45MB).
#
# Запускается вручную или systemd-таймером vpn-backup.timer (ежедневно).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ROOT="$(vpn_project_root)"
BACKUP_DIR="${VPN_BACKUP_DIR:-/root/vpn-backups}"
BACKUP_KEEP="${VPN_BACKUP_KEEP:-14}"
TELEGRAM_MAX_BYTES=$((45 * 1024 * 1024))

require_cmd docker
require_cmd tar

mkdir -p "$BACKUP_DIR"

TS="$(date '+%Y%m%d-%H%M%S')"
TMP_DIR="$(mktemp -d /tmp/vpn-backup.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

log_info "=== Бэкап vpn-server ($TS) ==="

if docker inspect wg-easy >/dev/null 2>&1; then
	log_info "Архивирую конфиги wg-easy (WireGuard ключи/пиры)..."
	docker run --rm --volumes-from wg-easy -v "$TMP_DIR:/backup" alpine \
		tar czf /backup/wg-config.tar.gz -C / etc/wireguard \
		|| die "Не удалось заархивировать данные wg-easy"
else
	log_warn "Контейнер wg-easy не запущен, пропускаю его данные."
fi

[[ -f "$ROOT/xray/config.json" ]] && cp -f "$ROOT/xray/config.json" "$TMP_DIR/xray-config.json"
[[ -f "$ROOT/.env" ]] && cp -f "$ROOT/.env" "$TMP_DIR/.env"
mkdir -p "$TMP_DIR/routing"
cp -f "$ROOT"/routing/*.txt "$TMP_DIR/routing/" 2>/dev/null || true

ARCHIVE_NAME="vpn-backup-${TS}.tar.gz"
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"
tar czf "$ARCHIVE_PATH" -C "$TMP_DIR" .
chmod 600 "$ARCHIVE_PATH"

log_info "Бэкап создан: $ARCHIVE_PATH ($(du -h "$ARCHIVE_PATH" | cut -f1))"

# --- ротация: оставляем последние BACKUP_KEEP архивов ---
mapfile -t OLD_BACKUPS < <(ls -1t "$BACKUP_DIR"/vpn-backup-*.tar.gz 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)))
if (( ${#OLD_BACKUPS[@]} > 0 )); then
	log_info "Удаляю ${#OLD_BACKUPS[@]} устаревших бэкапов (храним последние $BACKUP_KEEP)"
	rm -f "${OLD_BACKUPS[@]}"
fi

ARCHIVE_SIZE=$(stat -c%s "$ARCHIVE_PATH" 2>/dev/null || stat -f%z "$ARCHIVE_PATH")
if (( ARCHIVE_SIZE < TELEGRAM_MAX_BYTES )); then
	root_env="$ROOT/.env"
	if [[ -f "$root_env" ]]; then
		# shellcheck disable=SC1090
		source "$root_env"
		if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
			curl --silent --max-time 60 \
				-F "chat_id=${TELEGRAM_CHAT_ID}" \
				-F "document=@${ARCHIVE_PATH}" \
				-F "caption=📦 Бэкап vpn-server от ${TS}" \
				"https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" >/dev/null \
				|| log_warn "Не удалось отправить архив бэкапа в Telegram"
		fi
	fi
else
	log_warn "Архив больше 45MB, в Telegram не отправляется (только уведомление)."
	telegram_send "📦 Бэкап vpn-server создан ($ARCHIVE_NAME, $(du -h "$ARCHIVE_PATH" | cut -f1)) — слишком большой для отправки файлом, лежит на сервере в $BACKUP_DIR" || true
fi

log_info "=== Бэкап завершён успешно ==="
