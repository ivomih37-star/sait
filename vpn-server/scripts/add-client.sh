#!/usr/bin/env bash
# add-client.sh — создаёт нового VPN-клиента через API wg-easy, применяет split-tunnel
# AllowedIPs (мир минус Россия) и генерирует QR-код для подключения телефона.
#
# Использование:
#   ./add-client.sh <имя-клиента> [--split|--full]
#     --split (по умолчанию)  AllowedIPs = "весь интернет минус Россия" (routing/world-minus-ru.txt)
#     --full                  AllowedIPs = 0.0.0.0/0 (полный туннель, например для роутера)
#
# Пароль веб-панели запрашивается интерактивно (или берётся из переменной окружения
# WG_EASY_PASSWORD — удобно для неинтерактивных вызовов, но НЕ храните его в файлах).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ROOT="$(vpn_project_root)"
ENV_FILE="$ROOT/.env"
[[ -f "$ENV_FILE" ]] || die "Не найден $ENV_FILE. Сначала запустите ./setup.sh"
# shellcheck disable=SC1090
source "$ENV_FILE"

CLIENT_NAME="${1:-}"
MODE="split"
if [[ "${2:-}" == "--full" ]]; then
	MODE="full"
elif [[ "${2:-}" == "--split" || -z "${2:-}" ]]; then
	MODE="split"
fi

[[ -n "$CLIENT_NAME" ]] || die "Использование: $0 <имя-клиента> [--split|--full]"
[[ "$CLIENT_NAME" =~ ^[a-zA-Z0-9_-]+$ ]] || die "Имя клиента может содержать только буквы, цифры, - и _"

require_cmd curl
require_cmd jq
require_cmd qrencode

API_BASE="http://127.0.0.1:${WEB_PORT:-51821}/api"
COOKIE_JAR="$(mktemp /tmp/vpn-add-client-cookie.XXXXXX)"
trap 'rm -f "$COOKIE_JAR" "$COOKIE_JAR.body"' EXIT

if [[ -n "${WG_EASY_PASSWORD:-}" ]]; then
	PANEL_PASSWORD="$WG_EASY_PASSWORD"
else
	read -r -s -p "Пароль веб-панели wg-easy: " PANEL_PASSWORD
	echo
fi
[[ -n "$PANEL_PASSWORD" ]] || die "Пароль не может быть пустым"

log_info "Авторизация в wg-easy API..."
HTTP_CODE=$(curl --silent --output "$COOKIE_JAR.body" --write-out '%{http_code}' \
	--cookie-jar "$COOKIE_JAR" \
	--header "Content-Type: application/json" \
	--data "{\"password\":$(jq -Rn --arg p "$PANEL_PASSWORD" '$p')}" \
	"$API_BASE/session")
unset PANEL_PASSWORD

if [[ "$HTTP_CODE" != "200" ]]; then
	die "Не удалось авторизоваться в wg-easy (HTTP $HTTP_CODE). Проверьте пароль панели."
fi

log_info "Создаю клиента '$CLIENT_NAME'..."
CREATE_RESPONSE=$(curl --silent --cookie "$COOKIE_JAR" \
	--header "Content-Type: application/json" \
	--data "{\"name\":$(jq -Rn --arg n "$CLIENT_NAME" '$n')}" \
	"$API_BASE/wireguard/client")

CLIENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')
if [[ -z "$CLIENT_ID" ]]; then
	log_warn "Ответ на создание не содержит id, ищу клиента по имени в списке..."
	CLIENT_ID=$(curl --silent --cookie "$COOKIE_JAR" "$API_BASE/wireguard/client" \
		| jq -r --arg name "$CLIENT_NAME" '[.[] | select(.name == $name)] | sort_by(.createdAt) | last | .id // empty')
fi
[[ -n "$CLIENT_ID" ]] || die "Не удалось получить id созданного клиента. Ответ API: $CREATE_RESPONSE"

log_info "Клиент создан (id: $CLIENT_ID). Забираю конфигурацию..."
RAW_CONF=$(curl --silent --cookie "$COOKIE_JAR" "$API_BASE/wireguard/client/$CLIENT_ID/configuration")
[[ -n "$RAW_CONF" ]] || die "Пустая конфигурация от API"

ALLOWED_IPS="0.0.0.0/0"
if [[ "$MODE" == "split" ]]; then
	WORLD_FILE="$ROOT/routing/world-minus-ru.txt"
	if [[ -s "$WORLD_FILE" ]]; then
		ALLOWED_IPS="$(paste -sd, "$WORLD_FILE")"
	else
		log_warn "$WORLD_FILE не найден или пуст (запустите scripts/update-routes.sh). Использую полный туннель."
		MODE="full"
	fi
fi

FINAL_CONF="$(echo "$RAW_CONF" | sed -E "s#^AllowedIPs = .*#AllowedIPs = ${ALLOWED_IPS}#")"

CONF_PATH="$ROOT/configs/${CLIENT_NAME}.conf"
echo "$FINAL_CONF" >"$CONF_PATH"
chmod 600 "$CONF_PATH"

PNG_PATH="$ROOT/configs/${CLIENT_NAME}.png"
qrencode -o "$PNG_PATH" -s 8 <"$CONF_PATH"
chmod 600 "$PNG_PATH"

log_info "Готово! Режим маршрутизации: $MODE"
log_info "Конфиг:  $CONF_PATH"
log_info "QR-код:  $PNG_PATH"
echo
echo "QR-код для сканирования в приложении WireGuard (iPhone/Android):"
qrencode -t ansiutf8 <"$CONF_PATH"

telegram_send "🔑 Добавлен новый VPN-клиент: \`${CLIENT_NAME}\` (режим: ${MODE})" || true
