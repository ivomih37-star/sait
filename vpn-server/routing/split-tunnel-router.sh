#!/usr/bin/env bash
# split-tunnel-router.sh — генерирует конфиги для домен-based split-tunnel на роутере
# (Keenetic/OpenWrt), на основе routing/ru-domains.txt и routing/force-vpn-domains.txt.
#
# Запускается НА VPN-СЕРВЕРЕ (или локально, где есть bash) — не на самом роутере,
# т.к. форматы вывода нужно один раз собрать и скопировать на роутер вручную
# (см. router-configs/openwrt-guide.md и keenetic-guide.md).
#
# Результат кладётся в routing/router-artifacts/:
#   dnsmasq-ru-direct.conf     — ipset-директивы dnsmasq: ru-домены -> ipset "ru_direct"
#   dnsmasq-force-vpn.conf     — ipset-директивы dnsmasq: домены с геоблоком -> ipset "vpn_force"
#   openwrt-ipset-firewall.txt — команды создания ipset'ов и правил policy routing для OpenWrt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../scripts/lib/common.sh
source "$SCRIPT_DIR/../scripts/lib/common.sh"

ROUTING_DIR="$SCRIPT_DIR"
OUT_DIR="$ROUTING_DIR/router-artifacts"
mkdir -p "$OUT_DIR"

RU_DOMAINS_FILE="$ROUTING_DIR/ru-domains.txt"
FORCE_VPN_DOMAINS_FILE="$ROUTING_DIR/force-vpn-domains.txt"

[[ -f "$RU_DOMAINS_FILE" ]] || die "Не найден $RU_DOMAINS_FILE"
[[ -f "$FORCE_VPN_DOMAINS_FILE" ]] || die "Не найден $FORCE_VPN_DOMAINS_FILE"

strip_comments() {
	grep -v '^\s*#' "$1" | grep -v '^\s*$'
}

# --- dnsmasq ipset-директивы ---
# Синтаксис dnsmasq: ipset=/domain1/domain2/.../ipset_name
gen_dnsmasq_ipset() {
	local domains_file="$1" ipset_name="$2" out_file="$3"
	local domains
	domains="$(strip_comments "$domains_file" | tr '\n' '/' | sed 's#/$##')"
	{
		echo "# Автосгенерировано split-tunnel-router.sh — не редактировать вручную."
		echo "# Скопируйте этот файл на роутер в /etc/dnsmasq.d/ (OpenWrt) и перезапустите dnsmasq."
		echo "ipset=/${domains}/${ipset_name}"
	} >"$out_file"
	log_info "Создан $out_file (ipset: $ipset_name)"
}

gen_dnsmasq_ipset "$RU_DOMAINS_FILE" "ru_direct" "$OUT_DIR/dnsmasq-ru-direct.conf"
gen_dnsmasq_ipset "$FORCE_VPN_DOMAINS_FILE" "vpn_force" "$OUT_DIR/dnsmasq-force-vpn.conf"

# --- OpenWrt: создание ipset'ов + policy routing ---
FW_OUT="$OUT_DIR/openwrt-ipset-firewall.txt"
cat >"$FW_OUT" <<'EOF'
# Автосгенерировано split-tunnel-router.sh — команды для OpenWrt (выполнить на роутере через SSH).
# Подробное пошаговое объяснение — в router-configs/openwrt-guide.md

# 1. Создаём ipset для прямых (RU) доменов и для принудительно-VPN доменов
uci -q delete firewall.ru_direct
uci set firewall.ru_direct=ipset
uci set firewall.ru_direct.name='ru_direct'
uci set firewall.ru_direct.match='dst_net'
uci set firewall.ru_direct.storage='hash'

uci -q delete firewall.vpn_force
uci set firewall.vpn_force=ipset
uci set firewall.vpn_force.name='vpn_force'
uci set firewall.vpn_force.match='dst_net'
uci set firewall.vpn_force.storage='hash'

uci commit firewall

# 2. Политика маршрутизации: всё, что попало в vpn_force ИЛИ не попало в ru_direct — через wg0.
#    Домены из ru-domains.txt (ru_direct) всегда идут через обычный WAN (напрямую).
#    dnsmasq (см. dnsmasq-*.conf) сам наполняет ipset'ы при резолве DNS-имён из списков.

ip rule add fwmark 0x1 table 100
ip route add default dev wg0 table 100

# Правило firewall: пакеты к vpn_force -> помечаем fwmark 0x1 (уйдут в table 100 -> wg0)
uci add firewall rule
uci set firewall.@rule[-1].name='mark-vpn-force'
uci set firewall.@rule[-1].src='lan'
uci set firewall.@rule[-1].dest_ip='@vpn_force'
uci set firewall.@rule[-1].target='MARK'
uci set firewall.@rule[-1].set_mark='0x1'

uci commit firewall
service firewall restart
service dnsmasq restart
EOF

log_info "Создан $FW_OUT"
log_info "Готово. Скопируйте файлы из $OUT_DIR на роутер (см. router-configs/*.md для вашей модели)."
