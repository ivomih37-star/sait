#!/usr/bin/env bash
# remove-client.sh — удаляет VPN-клиента через API wg-easy и локальные файлы конфига/QR.
#
# Использование: ./remove-client.sh <имя-клиента>

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
[[ -n "$CLIENT_NAME" ]] || die "Использование: $0 <имя-клиента>"

require_cmd curl
require_cmd jq

API_BASE="http://127.0.0.1:${WEB_PORT:-51821}/api"
COOKIE_JAR="$(mktemp /tmp/vpn-remove-client-cookie.XXXXXX)"
trap 'rm -f "$COOKIE_JAR" "$COOKIE_JAR.body"' EXIT

if [[ -n "${WG_EASY_PASSWORD:-}" ]]; then
	PANEL_PASSWORD="$WG_EASY_PASSWORD"
else
	read -r -s -p "Пароль веб-панели wg-easy: " PANEL_PASSWORD
	echo
fi
[[ -n "$PANEL_PASSWORD" ]] || die "Пароль не может быть пустым"

HTTP_CODE=$(curl --silent --output "$COOKIE_JAR.body" --write-out '%{http_code}' \
	--cookie-jar "$COOKIE_JAR" \
	--header "Content-Type: application/json" \
	--data "{\"password\":$(jq -Rn --arg p "$PANEL_PASSWORD" '$p')}" \
	"$API_BASE/session")
unset PANEL_PASSWORD

[[ "$HTTP_CODE" == "200" ]] || die "Не удалось авторизоваться в wg-easy (HTTP $HTTP_CODE)."

CLIENT_ID=$(curl --silent --cookie "$COOKIE_JAR" "$API_BASE/wireguard/client" \
	| jq -r --arg name "$CLIENT_NAME" '[.[] | select(.name == $name)] | first | .id // empty')
[[ -n "$CLIENT_ID" ]] || die "Клиент '$CLIENT_NAME' не найден в wg-easy"

log_info "Удаляю клиента '$CLIENT_NAME' (id: $CLIENT_ID)..."
DELETE_CODE=$(curl --silent --output /dev/null --write-out '%{http_code}' \
	--cookie "$COOKIE_JAR" --request DELETE "$API_BASE/wireguard/client/$CLIENT_ID")
[[ "$DELETE_CODE" == "200" || "$DELETE_CODE" == "204" ]] || die "Не удалось удалить клиента (HTTP $DELETE_CODE)"

rm -f "$ROOT/configs/${CLIENT_NAME}.conf" "$ROOT/configs/${CLIENT_NAME}.png"
log_info "Клиент '$CLIENT_NAME' удалён (сервер + локальные файлы конфига/QR)."

telegram_send "🗑 VPN-клиент удалён: \`${CLIENT_NAME}\`" || true
