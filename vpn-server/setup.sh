#!/usr/bin/env bash
# setup.sh — разворачивает VPN-сервер "в одну кнопку" на чистом Ubuntu 22.04.
#
# Использование:
#   git clone <repo> && cd vpn-server && sudo ./setup.sh
#
# Единственный интерактивный ввод: пароль веб-панели wg-easy (и, по желанию, Telegram
# bot token/chat id для уведомлений — можно пропустить нажатием Enter).
#
# Скрипт идемпотентен: повторный запуск не пересоздаёт уже сгенерированные секреты
# в .env, а лишь обновляет контейнеры/systemd-таймеры.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"
export VPN_LOG_FILE="/var/log/vpn-setup.log"
# shellcheck source=scripts/lib/common.sh
source "$ROOT/scripts/lib/common.sh"

trap 'log_error "Установка прервана на строке $LINENO. Подробности в $VPN_LOG_FILE"' ERR

log_info "=== VPN-сервер: установка начата ==="

# ---------------------------------------------------------------------------
# 1. Проверки окружения
# ---------------------------------------------------------------------------
require_root

if [[ -r /etc/os-release ]]; then
	# shellcheck disable=SC1091
	source /etc/os-release
	if [[ "${ID:-}" != "ubuntu" ]]; then
		die "Поддерживается только Ubuntu (обнаружено: ${PRETTY_NAME:-неизвестно}). Установка остановлена."
	fi
	if [[ "${VERSION_ID:-}" != "22.04" ]]; then
		log_warn "Скрипт рассчитан на Ubuntu 22.04 LTS, обнаружено ${VERSION_ID:-неизвестно}. Продолжаю на свой страх и риск."
	fi
else
	die "Не удалось определить дистрибутив (/etc/os-release отсутствует)."
fi

ARCH="$(uname -m)"
case "$ARCH" in
	x86_64|aarch64) ;;
	*) die "Неподдерживаемая архитектура: $ARCH (поддерживаются x86_64, aarch64)" ;;
esac

MEM_KB="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
if (( MEM_KB < 450000 )); then
	log_warn "Обнаружено меньше 512MB RAM ($((MEM_KB / 1024))MB). Рекомендуется минимум 1GB для стабильной работы."
fi

# ---------------------------------------------------------------------------
# 2. Обновление системы и установка пакетов
# ---------------------------------------------------------------------------
log_info "Обновляю систему (apt-get update && upgrade)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

log_info "Устанавливаю базовые пакеты..."
apt-get install -y \
	curl jq ufw fail2ban qrencode ipset unattended-upgrades \
	ca-certificates gnupg apt-transport-https software-properties-common \
	python3 openssl

# ---------------------------------------------------------------------------
# 3. Docker + Compose plugin
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
	log_info "Устанавливаю Docker Engine..."
	GET_DOCKER_SCRIPT="$(mktemp /tmp/get-docker.XXXXXX.sh)"
	retry_curl "https://get.docker.com" "$GET_DOCKER_SCRIPT" 3 || die "Не удалось скачать установщик Docker"
	sh "$GET_DOCKER_SCRIPT" || die "Установка Docker завершилась ошибкой"
	rm -f "$GET_DOCKER_SCRIPT"
	systemctl enable --now docker
else
	log_info "Docker уже установлен, пропускаю."
fi

docker version >/dev/null 2>&1 || die "Docker установлен, но не запускается"
docker compose version >/dev/null 2>&1 || die "Плагин 'docker compose' не найден"

# ---------------------------------------------------------------------------
# 4. Генерация .env (секреты) — только при первом запуске
# ---------------------------------------------------------------------------
ENV_FILE="$ROOT/.env"
PANEL_PASSWORD_PLAIN=""

if [[ -f "$ENV_FILE" ]]; then
	log_info ".env уже существует — пропускаю генерацию секретов (повторный запуск)."
else
	log_info "Создаю .env из шаблона..."
	cp "$ROOT/.env.example" "$ENV_FILE"
	chmod 600 "$ENV_FILE"

	echo
	echo "=== Настройка веб-панели wg-easy ==="
	# Скрипт может запускаться как "curl ... | bash" — в этом случае stdin занят самим
	# скриптом, поэтому интерактивный ввод читаем напрямую из /dev/tty. Если TTY недоступен
	# (полностью неинтерактивный запуск, напр. CI) — пароль можно передать заранее через
	# переменную окружения WG_EASY_PANEL_PASSWORD.
	if [[ -n "${WG_EASY_PANEL_PASSWORD:-}" ]]; then
		PANEL_PASSWORD_PLAIN="$WG_EASY_PANEL_PASSWORD"
	elif [[ -r /dev/tty ]]; then
		while [[ -z "$PANEL_PASSWORD_PLAIN" ]]; do
			read -r -s -p "Придумайте пароль для веб-панели wg-easy: " PANEL_PASSWORD_PLAIN </dev/tty
			echo
			[[ -n "$PANEL_PASSWORD_PLAIN" ]] || echo "Пароль не может быть пустым."
		done
	else
		die "Нет доступного терминала для ввода пароля. Задайте переменную окружения WG_EASY_PANEL_PASSWORD и запустите снова, например: WG_EASY_PANEL_PASSWORD='...' ./setup.sh"
	fi

	log_info "Хэширую пароль панели..."
	WGPW_OUTPUT="$(docker run --rm ghcr.io/wg-easy/wg-easy:14 wgpw "$PANEL_PASSWORD_PLAIN")"
	PASSWORD_HASH="$(echo "$WGPW_OUTPUT" | grep -oE "'\\\$2[aby]\\\$[^']+'" | tr -d "'")"
	[[ -n "$PASSWORD_HASH" ]] || die "Не удалось сгенерировать хэш пароля панели"

	echo
	echo "=== Telegram-уведомления (необязательно, Enter — пропустить) ==="
	TG_TOKEN_INPUT="${TELEGRAM_BOT_TOKEN_INPUT:-}"
	TG_CHAT_ID_INPUT="${TELEGRAM_CHAT_ID_INPUT:-}"
	if [[ -z "$TG_TOKEN_INPUT" && -r /dev/tty ]]; then
		read -r -p "Telegram Bot Token: " TG_TOKEN_INPUT </dev/tty || true
		if [[ -n "$TG_TOKEN_INPUT" ]]; then
			read -r -p "Telegram Chat ID: " TG_CHAT_ID_INPUT </dev/tty || true
		fi
	fi

	log_info "Определяю публичный IP сервера..."
	PUBLIC_IP=""
	for svc in "https://ifconfig.me" "https://ipinfo.io/ip" "https://icanhazip.com"; do
		PUBLIC_IP="$(curl --silent --max-time 10 "$svc" || true)"
		PUBLIC_IP="$(echo "$PUBLIC_IP" | tr -d '[:space:]')"
		if [[ "$PUBLIC_IP" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
			break
		fi
		PUBLIC_IP=""
	done
	[[ -n "$PUBLIC_IP" ]] || die "Не удалось автоматически определить публичный IP. Задайте WG_HOST вручную в .env и перезапустите."
	log_info "Публичный IP: $PUBLIC_IP"

	log_info "Генерирую параметры Xray (VLESS + Reality)..."
	XRAY_UUID="$(docker run --rm teddysun/xray xray uuid)"
	XRAY_KEYS="$(docker run --rm teddysun/xray xray x25519)"
	XRAY_PRIVATE_KEY="$(echo "$XRAY_KEYS" | awk -F': ' '/Private key/ {print $2}')"
	XRAY_PUBLIC_KEY="$(echo "$XRAY_KEYS" | awk -F': ' '/Public key/ {print $2}')"
	XRAY_SHORT_ID="$(openssl rand -hex 8)"
	[[ -n "$XRAY_UUID" && -n "$XRAY_PRIVATE_KEY" && -n "$XRAY_PUBLIC_KEY" ]] \
		|| die "Не удалось сгенерировать ключи Xray"

	sed -i \
		-e "s#^WG_HOST=.*#WG_HOST=${PUBLIC_IP}#" \
		-e "s#^PASSWORD_HASH=.*#PASSWORD_HASH='${PASSWORD_HASH}'#" \
		-e "s#^TELEGRAM_BOT_TOKEN=.*#TELEGRAM_BOT_TOKEN=${TG_TOKEN_INPUT:-}#" \
		-e "s#^TELEGRAM_CHAT_ID=.*#TELEGRAM_CHAT_ID=${TG_CHAT_ID_INPUT:-}#" \
		-e "s#^XRAY_UUID=.*#XRAY_UUID=${XRAY_UUID}#" \
		-e "s#^XRAY_PRIVATE_KEY=.*#XRAY_PRIVATE_KEY=${XRAY_PRIVATE_KEY}#" \
		-e "s#^XRAY_PUBLIC_KEY=.*#XRAY_PUBLIC_KEY=${XRAY_PUBLIC_KEY}#" \
		-e "s#^XRAY_SHORT_ID=.*#XRAY_SHORT_ID=${XRAY_SHORT_ID}#" \
		"$ENV_FILE"

	log_info ".env создан и заполнен."
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# ---------------------------------------------------------------------------
# 5. Рендер конфига Xray из шаблона
# ---------------------------------------------------------------------------
log_info "Генерирую xray/config.json..."
sed \
	-e "s#__XRAY_PORT__#${XRAY_PORT:-443}#g" \
	-e "s#__XRAY_UUID__#${XRAY_UUID}#g" \
	-e "s#__XRAY_SNI__#${XRAY_SNI:-www.microsoft.com}#g" \
	-e "s#__XRAY_PRIVATE_KEY__#${XRAY_PRIVATE_KEY}#g" \
	-e "s#__XRAY_SHORT_ID__#${XRAY_SHORT_ID}#g" \
	"$ROOT/xray/config.json.template" >"$ROOT/xray/config.json"
chmod 600 "$ROOT/xray/config.json"

# ---------------------------------------------------------------------------
# 6. Запуск контейнеров
# ---------------------------------------------------------------------------
log_info "Запускаю docker compose..."
(cd "$ROOT" && docker compose pull && docker compose up -d) || die "Не удалось запустить контейнеры"

# ---------------------------------------------------------------------------
# 7. Firewall (UFW)
# ---------------------------------------------------------------------------
log_info "Настраиваю UFW..."
# Правила добавляются аддитивно (НЕ сбрасываем существующий ufw), чтобы повторный запуск
# setup.sh не снёс порт SSH, изменённый ранее через scripts/harden-ssh.sh — это привело бы
# к потере доступа к серверу, если порт 22 уже был закрыт (--finalize).
ufw default deny incoming
ufw default allow outgoing
# Порт 22 открываем только если ни один порт SSH ещё не был явно настроен harden-ssh.sh
# (наличие второй строки Port в sshd_config — признак того, что 22 мог быть уже закрыт).
if ! grep -qE '^\s*Port\s+' /etc/ssh/sshd_config 2>/dev/null; then
	ufw allow 22/tcp comment "SSH (см. scripts/harden-ssh.sh для смены порта)"
fi
ufw allow "${WG_PORT:-51820}/udp" comment "WireGuard"
ufw allow "${XRAY_PORT:-443}/tcp" comment "Xray VLESS+Reality"
ufw logging low
ufw --force enable

# ---------------------------------------------------------------------------
# 8. fail2ban
# ---------------------------------------------------------------------------
log_info "Настраиваю fail2ban..."
cat >/etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# ---------------------------------------------------------------------------
# 9. Автообновления системы
# ---------------------------------------------------------------------------
log_info "Включаю автоматические обновления безопасности..."
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades

# ---------------------------------------------------------------------------
# 10. Отключение IPv6 (не используется)
# ---------------------------------------------------------------------------
log_info "Отключаю IPv6 (см. /etc/sysctl.d/99-vpn-disable-ipv6.conf для отката)..."
cat >/etc/sysctl.d/99-vpn-disable-ipv6.conf <<'EOF'
# Чтобы включить IPv6 обратно — удалите этот файл и выполните: sysctl --system
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF
sysctl --system >/dev/null

# ---------------------------------------------------------------------------
# 11. systemd timers (routes/backup/heartbeat)
# ---------------------------------------------------------------------------
log_info "Устанавливаю systemd-таймеры..."
for unit in vpn-update-routes vpn-backup vpn-heartbeat; do
	sed "s#__VPN_ROOT__#${ROOT}#g" "$ROOT/systemd/${unit}.service" >"/etc/systemd/system/${unit}.service"
	cp -f "$ROOT/systemd/${unit}.timer" "/etc/systemd/system/${unit}.timer"
done
systemctl daemon-reload
for unit in vpn-update-routes vpn-backup vpn-heartbeat; do
	systemctl enable --now "${unit}.timer"
done

# ---------------------------------------------------------------------------
# 12. Первичное наполнение RU-списков маршрутизации
# ---------------------------------------------------------------------------
log_info "Загружаю списки российских IP-диапазонов (может занять до минуты)..."
"$ROOT/scripts/update-routes.sh" || log_warn "Не удалось обновить RU-списки при установке — split-tunnel клиенты временно получат полный туннель. Повторите позже: ./scripts/update-routes.sh"

# ---------------------------------------------------------------------------
# 13. Ждём готовности панели и создаём примеры клиентов
# ---------------------------------------------------------------------------
if [[ -n "$PANEL_PASSWORD_PLAIN" ]]; then
	log_info "Жду готовности веб-панели wg-easy..."
	READY=false
	for _ in $(seq 1 30); do
		if curl --silent --fail --max-time 2 "http://127.0.0.1:${WEB_PORT:-51821}/" >/dev/null 2>&1; then
			READY=true
			break
		fi
		sleep 2
	done

	if [[ "$READY" == true ]]; then
		export WG_EASY_PASSWORD="$PANEL_PASSWORD_PLAIN"
		log_info "Создаю примеры клиентских конфигов (client1-phone, client2-pc, router)..."
		"$ROOT/scripts/add-client.sh" client1-phone --split || log_warn "Не удалось создать client1-phone"
		"$ROOT/scripts/add-client.sh" client2-pc --split || log_warn "Не удалось создать client2-pc"
		"$ROOT/scripts/add-client.sh" router --full || log_warn "Не удалось создать router"
		unset WG_EASY_PASSWORD
	else
		log_warn "Панель wg-easy не ответила за 60с. Создайте клиентов позже: ./scripts/add-client.sh <имя>"
	fi
fi
unset PANEL_PASSWORD_PLAIN

# ---------------------------------------------------------------------------
# Итог
# ---------------------------------------------------------------------------
XRAY_LINK="vless://${XRAY_UUID}@${WG_HOST}:${XRAY_PORT:-443}?security=reality&sni=${XRAY_SNI:-www.microsoft.com}&fp=chrome&pbk=${XRAY_PUBLIC_KEY}&sid=${XRAY_SHORT_ID}&type=tcp&flow=xtls-rprx-vision#vpn-server-fallback"

cat <<EOF

=========================================================================
 Установка завершена!

 Веб-панель wg-easy доступна ТОЛЬКО через SSH-туннель (наружу не открыта):
   ssh -L ${WEB_PORT:-51821}:127.0.0.1:${WEB_PORT:-51821} <ваш-пользователь>@${WG_HOST}
   -> откройте в браузере http://127.0.0.1:${WEB_PORT:-51821}

 Клиентские конфиги и QR-коды: $ROOT/configs/

 Xray (VLESS+Reality) fallback-ссылка (для клиентов вроде v2rayNG/NekoBox/Shadowrocket):
   ${XRAY_LINK}

 Дальнейшие шаги (см. README.md):
   - Смена SSH-порта (безопасно, в 2 этапа): sudo ./scripts/harden-ssh.sh <новый-порт>
   - Добавить клиента: ./scripts/add-client.sh <имя> [--split|--full]
   - Настройка роутера (Keenetic/OpenWrt): router-configs/
   - Ручной бэкап: ./scripts/backup.sh

 Лог установки: $VPN_LOG_FILE
=========================================================================
EOF

log_info "=== Установка успешно завершена ==="
