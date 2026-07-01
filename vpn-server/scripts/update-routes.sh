#!/usr/bin/env bash
# update-routes.sh — обновляет списки российских IP-диапазонов и пересчитывает
# "мир минус Россия" (используется add-client.sh для split-tunnel AllowedIPs).
#
# Запускается: вручную, из setup.sh при первой установке, и по расписанию
# systemd-таймером vpn-update-routes.timer (см. systemd/).
#
# Источники (в порядке приоритета, с fallback при недоступности):
#   1) ipdeny.com country zone file — готовый список CIDR для RU, обновляется ежедневно
#   2) RIPE NCC delegated-stats — авторитетный источник, CIDR вычисляются вручную
#
# Идемпотентно и безопасно: пишет во временный файл, проверяет на "разумность"
# (минимальное количество строк), и только потом атомарно заменяет боевой файл.
# При сбое любого из шагов — старые списки остаются нетронутыми (rollback).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ROOT="$(vpn_project_root)"
ROUTING_DIR="$ROOT/routing"
RU_IPV4_FILE="$ROUTING_DIR/ru-ipv4.txt"
WORLD_MINUS_RU_FILE="$ROUTING_DIR/world-minus-ru.txt"

TMP_DIR="$(mktemp -d /tmp/vpn-update-routes.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Минимально разумное число CIDR-диапазонов для RU. Если источник вернул меньше —
# считаем результат битым/неполным и не применяем (защита от пустого/усечённого списка).
MIN_RU_RANGES=3000

IPDENY_URL="https://www.ipdeny.com/ipblocks/data/countries/ru.zone"
RIPE_URL="https://ftp.ripe.net/ripe/stats/delegated-ripe-latest"

fetch_from_ipdeny() {
	local out="$1"
	log_info "Скачиваю список RU-диапазонов из ipdeny.com..."
	retry_curl "$IPDENY_URL" "$out" 3 || return 1
	# ipdeny отдаёт уже готовые CIDR, по одному на строку
	[[ -s "$out" ]] || return 1
	return 0
}

fetch_from_ripe() {
	local out="$1"
	local raw="$TMP_DIR/delegated-ripe-latest"
	log_info "ipdeny недоступен, пробую фолбэк — RIPE NCC delegated-stats..."
	retry_curl "$RIPE_URL" "$raw" 3 || return 1
	[[ -s "$raw" ]] || return 1

	# Формат строки: registry|cc|type|start|value|date|status[|...]
	# Пример: ripencc|RU|ipv4|5.44.0.0|4096|20111121|allocated
	# value — количество адресов (степень двойки), переводим в длину префикса.
	awk -F'|' '
		$2 == "RU" && $3 == "ipv4" && ($7 == "allocated" || $7 == "assigned") {
			print $4, $5
		}
	' "$raw" | python3 -c '
import sys, ipaddress, math
for line in sys.stdin:
    start, count = line.split()
    count = int(count)
    prefix = 32 - int(math.log2(count))
    net = ipaddress.ip_network(f"{start}/{prefix}", strict=False)
    print(net)
' >"$out"

	[[ -s "$out" ]] || return 1
	return 0
}

log_info "=== Обновление RU-списков маршрутизации ==="

RU_TMP="$TMP_DIR/ru-ipv4.new"
if ! fetch_from_ipdeny "$RU_TMP"; then
	if ! fetch_from_ripe "$RU_TMP"; then
		log_error "Оба источника RU-диапазонов недоступны. Списки НЕ обновлены (остались прежними)."
		telegram_send "⚠️ update-routes.sh: не удалось обновить RU-диапазоны (оба источника недоступны). Используются старые списки." || true
		exit 1
	fi
fi

RU_LINES=$(grep -c '/' "$RU_TMP" || true)
if (( RU_LINES < MIN_RU_RANGES )); then
	log_error "Санити-чек не пройден: получено всего $RU_LINES диапазонов (ожидалось >= $MIN_RU_RANGES). Отклоняю обновление."
	telegram_send "⚠️ update-routes.sh: новый список RU-диапазонов подозрительно короткий ($RU_LINES строк), отклонён." || true
	exit 1
fi
log_info "Получено $RU_LINES RU-диапазонов, санити-чек пройден."

# Резервная копия текущего файла перед заменой (rollback вручную при необходимости)
[[ -f "$RU_IPV4_FILE" ]] && cp -f "$RU_IPV4_FILE" "$RU_IPV4_FILE.bak"
atomic_replace "$RU_TMP" "$RU_IPV4_FILE"
log_info "RU-диапазоны обновлены: $RU_IPV4_FILE ($RU_LINES строк)"

# --- вычисляем "мир минус Россия" для split-tunnel AllowedIPs ---
log_info "Вычисляю набор 'весь интернет минус Россия'..."
WORLD_TMP="$TMP_DIR/world-minus-ru.new"

python3 - "$RU_IPV4_FILE" "$WORLD_TMP" <<'PYEOF'
import sys
import ipaddress

ru_file, out_file = sys.argv[1], sys.argv[2]

# Диапазоны, которые никогда не должны уходить в тоннель как "внешний интернет":
# приватные, loopback, link-local, multicast, документационные и т.д.
RESERVED = [
    "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
    "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24",
    "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24",
    "203.0.113.0/24", "224.0.0.0/4", "233.252.0.0/24", "240.0.0.0/4",
    "255.255.255.255/32",
]

networks = []
with open(ru_file) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            networks.append(ipaddress.ip_network(line, strict=False))
        except ValueError:
            continue
networks += [ipaddress.ip_network(c) for c in RESERVED]

# Комплемент вычисляется через сортировку целочисленных диапазонов, а не через
# ip_network.address_exclude() в цикле — последнее имеет плохую асимптотику
# (за пределами разумного времени на ~9000+ реальных RU-диапазонах).
ranges = sorted((int(n.network_address), int(n.broadcast_address)) for n in networks)

merged = []
for start, end in ranges:
    if merged and start <= merged[-1][1] + 1:
        if end > merged[-1][1]:
            merged[-1] = (merged[-1][0], end)
    else:
        merged.append((start, end))

MAX_IP = 2**32 - 1
result = []
prev_end = -1
for start, end in merged:
    if start > prev_end + 1:
        result.extend(ipaddress.summarize_address_range(
            ipaddress.IPv4Address(prev_end + 1), ipaddress.IPv4Address(start - 1)))
    prev_end = max(prev_end, end)
if prev_end < MAX_IP:
    result.extend(ipaddress.summarize_address_range(
        ipaddress.IPv4Address(prev_end + 1), ipaddress.IPv4Address(MAX_IP)))

with open(out_file, "w") as f:
    for net in result:
        f.write(f"{net}\n")
PYEOF

WORLD_LINES=$(wc -l <"$WORLD_TMP" | tr -d ' ')
if (( WORLD_LINES < 1000 )); then
	log_error "Санити-чек 'мир минус Россия' не пройден: всего $WORLD_LINES диапазонов. Отклоняю обновление."
	telegram_send "⚠️ update-routes.sh: расчёт 'мир минус Россия' выглядит некорректным ($WORLD_LINES строк), отклонён." || true
	exit 1
fi

[[ -f "$WORLD_MINUS_RU_FILE" ]] && cp -f "$WORLD_MINUS_RU_FILE" "$WORLD_MINUS_RU_FILE.bak"
atomic_replace "$WORLD_TMP" "$WORLD_MINUS_RU_FILE"
log_info "Список 'мир минус Россия' обновлён: $WORLD_MINUS_RU_FILE ($WORLD_LINES строк)"

telegram_send "✅ update-routes.sh: RU-диапазоны и split-tunnel список успешно обновлены ($RU_LINES RU-подсетей, $WORLD_LINES внешних подсетей)." || true

log_info "=== Обновление маршрутов завершено успешно ==="
