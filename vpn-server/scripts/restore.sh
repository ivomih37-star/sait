#!/usr/bin/env bash
# restore.sh — восстанавливает конфиги wg-easy/Xray/routing из архива, созданного backup.sh.
#
# Использование: ./restore.sh /root/vpn-backups/vpn-backup-20260101-120000.tar.gz
#
# ВНИМАНИЕ: перезаписывает текущие ключи WireGuard и конфиги. Существующие клиенты
# останутся работать, только если восстанавливаемый архив содержит те же пары ключей
# (т.е. это откат к более раннему состоянию, а не слияние).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ROOT="$(vpn_project_root)"
ARCHIVE="${1:-}"
[[ -n "$ARCHIVE" && -f "$ARCHIVE" ]] || die "Использование: $0 <путь-к-архиву.tar.gz>"

require_cmd docker
require_root

read -r -p "Это перезапишет текущие конфиги wg-easy/Xray. Продолжить? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { log_info "Отменено пользователем."; exit 0; }

TMP_DIR="$(mktemp -d /tmp/vpn-restore.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

log_info "Распаковываю $ARCHIVE..."
tar xzf "$ARCHIVE" -C "$TMP_DIR"

log_info "Останавливаю контейнеры..."
(cd "$ROOT" && docker compose stop wg-easy xray) || true

if [[ -f "$TMP_DIR/wg-config.tar.gz" ]]; then
	log_info "Восстанавливаю данные WireGuard..."
	docker run --rm --volumes-from wg-easy -v "$TMP_DIR:/backup" alpine \
		sh -c "rm -rf /etc/wireguard/* && tar xzf /backup/wg-config.tar.gz -C /" \
		|| die "Не удалось восстановить данные wg-easy"
fi

[[ -f "$TMP_DIR/xray-config.json" ]] && cp -f "$TMP_DIR/xray-config.json" "$ROOT/xray/config.json"
[[ -f "$TMP_DIR/.env" ]] && cp -f "$TMP_DIR/.env" "$ROOT/.env" && chmod 600 "$ROOT/.env"
if [[ -d "$TMP_DIR/routing" ]]; then
	cp -f "$TMP_DIR"/routing/*.txt "$ROOT/routing/" 2>/dev/null || true
fi

log_info "Запускаю контейнеры..."
(cd "$ROOT" && docker compose up -d)

log_info "Восстановление завершено."
telegram_send "♻️ vpn-server восстановлен из бэкапа: $(basename "$ARCHIVE")" || true
