#!/usr/bin/env bash
# Общие функции для скриптов vpn-server. Подключается через: source "$(dirname "$0")/lib/common.sh"

# --- логирование ---
VPN_LOG_FILE="${VPN_LOG_FILE:-/var/log/vpn-server.log}"

_log() {
	local level="$1"; shift
	local msg="$*"
	local ts
	ts="$(date '+%Y-%m-%d %H:%M:%S')"
	printf '[%s] [%s] %s\n' "$ts" "$level" "$msg" | tee -a "$VPN_LOG_FILE" >&2
}

log_info()  { _log "INFO"  "$*"; }
log_warn()  { _log "WARN"  "$*"; }
log_error() { _log "ERROR" "$*"; }

die() {
	log_error "$*"
	exit 1
}

# --- проверки окружения ---
require_root() {
	if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
		die "Этот скрипт должен запускаться от root (используйте sudo)."
	fi
}

require_cmd() {
	local cmd="$1"
	command -v "$cmd" >/dev/null 2>&1 || die "Команда '$cmd' не найдена. Установите её и повторите запуск."
}

# --- сеть с повторами ---
# retry_curl <url> <output_file> [max_attempts]
retry_curl() {
	local url="$1" out="$2" attempts="${3:-3}" delay=2 i
	for ((i = 1; i <= attempts; i++)); do
		if curl --fail --silent --show-error --location --max-time 30 -o "$out" "$url"; then
			return 0
		fi
		log_warn "Попытка $i/$attempts скачать $url не удалась, повтор через ${delay}с"
		sleep "$delay"
		delay=$((delay * 2))
	done
	return 1
}

# --- атомарная замена файла ---
# atomic_replace <tmp_file> <target_file>
atomic_replace() {
	local tmp="$1" target="$2"
	chmod 644 "$tmp" 2>/dev/null || true
	mv -f "$tmp" "$target"
}

# --- пути проекта ---
vpn_project_root() {
	cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

# --- Telegram уведомления (используется несколькими скриптами) ---
# telegram_send "<текст сообщения>"
telegram_send() {
	local text="$1"
	local root
	root="$(vpn_project_root)"
	[[ -f "$root/.env" ]] || return 0
	# shellcheck disable=SC1091
	source "$root/.env"
	if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
		return 0
	fi
	curl --silent --max-time 15 \
		--data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
		--data-urlencode "text=${text}" \
		--data-urlencode "parse_mode=Markdown" \
		"https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" >/dev/null || \
		log_warn "Не удалось отправить уведомление в Telegram"
}
