#!/usr/bin/env bash
# harden-ssh.sh — БЕЗОПАСНАЯ смена порта SSH (требование №8), в два шага, без риска
# заблокировать себе доступ к серверу.
#
# Шаг 1 (обязательный, из текущей SSH-сессии):
#   sudo ./harden-ssh.sh 2222
#   -> добавляет порт 2222 ПАРАЛЛЕЛЬНО с 22 (оба порта работают одновременно)
#
# Шаг 2 (ТОЛЬКО после того как вы вручную проверили подключение в НОВОМ окне терминала):
#   ssh -p 2222 user@server           # в новой сессии, не закрывая текущую
#   sudo ./harden-ssh.sh --finalize 2222
#   -> закрывает порт 22, остаётся только 2222
#
# Скрипт НИКОГДА не закрывает порт 22 автоматически — только по явной команде --finalize.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

SSHD_CONFIG="/etc/ssh/sshd_config"

require_root
require_cmd ufw

ssh_service_name() {
	if systemctl list-unit-files 2>/dev/null | grep -q '^ssh\.service'; then
		echo "ssh"
	else
		echo "sshd"
	fi
}

reload_ssh() {
	local svc
	svc="$(ssh_service_name)"
	sshd -t -f "$SSHD_CONFIG" || die "sshd_config содержит ошибку синтаксиса, изменения НЕ применены. Проверьте $SSHD_CONFIG"
	systemctl reload "$svc" || die "Не удалось перезагрузить $svc"
}

backup_config() {
	local ts
	ts="$(date '+%Y%m%d-%H%M%S')"
	cp -f "$SSHD_CONFIG" "${SSHD_CONFIG}.bak-${ts}"
	log_info "Резервная копия: ${SSHD_CONFIG}.bak-${ts}"
}

show_status() {
	log_info "Текущие порты в $SSHD_CONFIG:"
	grep -iE '^\s*Port\s+' "$SSHD_CONFIG" || echo "  (нет явных Port — используется порт 22 по умолчанию)"
	log_info "Правила UFW для SSH:"
	ufw status | grep -iE 'ssh|22|2[0-9]{3}' || true
}

add_port() {
	local new_port="$1"
	[[ "$new_port" =~ ^[0-9]+$ ]] && (( new_port >= 1024 && new_port <= 65535 )) \
		|| die "Порт должен быть числом от 1024 до 65535"
	(( new_port != 22 )) || die "Новый порт не может совпадать со стандартным (22)"

	backup_config

	if ! grep -qE '^\s*Port\s+22\s*$' "$SSHD_CONFIG" && ! grep -qE '^\s*Port\s+' "$SSHD_CONFIG"; then
		# Явного Port нет вообще — sshd слушает 22 по умолчанию. Делаем это явным.
		echo "Port 22" >>"$SSHD_CONFIG"
	fi

	if grep -qE "^\s*Port\s+${new_port}\s*$" "$SSHD_CONFIG"; then
		log_warn "Порт $new_port уже присутствует в конфиге, пропускаю добавление строки."
	else
		echo "Port ${new_port}" >>"$SSHD_CONFIG"
	fi

	ufw allow "${new_port}/tcp" comment "SSH (новый порт, этап harden-ssh)"

	reload_ssh

	cat <<EOF

=========================================================================
Порт ${new_port} добавлен ПАРАЛЛЕЛЬНО с портом 22. Оба сейчас активны.

ВАЖНО — прежде чем продолжить:
  1. Откройте НОВОЕ окно терминала (не закрывайте текущую сессию!)
  2. Подключитесь: ssh -p ${new_port} <ваш-пользователь>@<ip-сервера>
  3. Если подключение работает — вернитесь сюда и выполните:
       sudo $0 --finalize ${new_port}
     Это закроет порт 22 и оставит только ${new_port}.

Если что-то пошло не так — порт 22 всё ещё открыт, доступ не потерян.
=========================================================================
EOF
}

finalize_port() {
	local new_port="$1"
	[[ "$new_port" =~ ^[0-9]+$ ]] || die "Укажите порт, который вы уже проверили: --finalize <порт>"
	grep -qE "^\s*Port\s+${new_port}\s*$" "$SSHD_CONFIG" \
		|| die "Порт $new_port не найден в $SSHD_CONFIG. Сначала выполните: $0 ${new_port}"

	backup_config

	sed -i -E '/^\s*Port\s+22\s*$/d' "$SSHD_CONFIG"

	reload_ssh

	ufw delete allow 22/tcp 2>/dev/null || log_warn "Правило ufw для порта 22 не найдено (возможно уже удалено)"

	log_info "Порт 22 закрыт. SSH теперь доступен только на порту ${new_port}."
	telegram_send "🔒 SSH-порт изменён: теперь только ${new_port} (22 закрыт)" || true
}

case "${1:-}" in
	--status)
		show_status
		;;
	--finalize)
		[[ -n "${2:-}" ]] || die "Использование: $0 --finalize <порт>"
		finalize_port "$2"
		;;
	"" )
		die "Использование: $0 <новый-порт> | --finalize <порт> | --status"
		;;
	*)
		add_port "$1"
		;;
esac
