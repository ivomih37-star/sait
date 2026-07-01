#!/usr/bin/env bash
# uninstall.sh — останавливает и удаляет VPN-сервер (контейнеры, systemd-таймеры, правила ufw).
#
# По умолчанию НЕ трогает: бэкапы в /root/vpn-backups, изменения SSH-порта (harden-ssh.sh),
# сам каталог vpn-server/ и .env.
#
# Использование:
#   ./uninstall.sh                 # интерактивное подтверждение
#   ./uninstall.sh --yes           # без вопросов
#   ./uninstall.sh --yes --purge-volumes   # + удалить docker-том с ключами WireGuard (НЕОБРАТИМО)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ROOT="$(vpn_project_root)"
require_root

ASSUME_YES=false
PURGE_VOLUMES=false
for arg in "$@"; do
	case "$arg" in
		--yes) ASSUME_YES=true ;;
		--purge-volumes) PURGE_VOLUMES=true ;;
	esac
done

if [[ "$ASSUME_YES" != true ]]; then
	read -r -p "Это остановит и удалит VPN-сервер (контейнеры, таймеры, ufw-правила). Продолжить? [y/N] " CONFIRM
	[[ "$CONFIRM" =~ ^[Yy]$ ]] || { log_info "Отменено."; exit 0; }
fi

log_info "Останавливаю контейнеры..."
if [[ "$PURGE_VOLUMES" == true ]]; then
	log_warn "Удаляю docker-тома (ключи WireGuard будут потеряны безвозвратно)."
	(cd "$ROOT" && docker compose down -v) || true
else
	(cd "$ROOT" && docker compose down) || true
fi

log_info "Удаляю systemd unit'ы..."
for unit in vpn-update-routes vpn-backup vpn-heartbeat; do
	systemctl disable --now "${unit}.timer" 2>/dev/null || true
	rm -f "/etc/systemd/system/${unit}.service" "/etc/systemd/system/${unit}.timer"
done
systemctl daemon-reload

# shellcheck disable=SC1091
[[ -f "$ROOT/.env" ]] && source "$ROOT/.env"
log_info "Удаляю правила ufw (WireGuard/Xray порты)..."
ufw delete allow "${WG_PORT:-51820}/udp" 2>/dev/null || true
ufw delete allow "${XRAY_PORT:-443}/tcp" 2>/dev/null || true

log_info "Готово. НЕ удалены (при необходимости — вручную):"
log_info "  - Бэкапы: ${VPN_BACKUP_DIR:-/root/vpn-backups}"
log_info "  - Каталог проекта: $ROOT"
log_info "  - Изменения SSH-порта, если вы применяли harden-ssh.sh"
[[ "$PURGE_VOLUMES" != true ]] && log_info "  - Docker-том с ключами WireGuard (используйте --purge-volumes для удаления)"
