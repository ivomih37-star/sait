# OpenWrt: WireGuard + домен-based split-tunnel

Настройка роутера так, чтобы российские сайты (`routing/ru-domains.txt`) шли напрямую,
сервисы с геоблоком (`routing/force-vpn-domains.txt`) — всегда через VPN, а весь
остальной трафик — по умолчанию через VPN (частичный полный туннель, если не задано иное).

Требования: OpenWrt 21.02+, свободные ~10MB места (для `dnsmasq-full`), доступ по SSH.

## 1. Установка пакетов

```sh
opkg update
opkg install wireguard-tools luci-proto-wireguard kmod-wireguard
opkg install ipset

# dnsmasq-full поддерживает ipset-директивы (стоковый dnsmasq — нет)
opkg remove dnsmasq
opkg install dnsmasq-full
```

## 2. Импорт конфига WireGuard

Скопируйте `configs/router.conf` (сгенерирован `setup.sh`, режим `--full`, т.к. само
разделение трафика роутер делает сам через ipset, а не через `AllowedIPs`) на роутер:

```sh
scp configs/router.conf root@<ip-роутера>:/etc/wireguard/wg0.conf
```

Через LuCI: **Network → Interfaces → Add new interface**, протокол `WireGuard`,
имя `wg0`, затем **Edit → Add peer**, заполните поля из `router.conf` (PrivateKey
интерфейса, PublicKey/Endpoint/AllowedIPs пира) — либо просто примените файл конфига
напрямую через `wg-quick` (см. ниже), если предпочитаете CLI.

Через CLI (без LuCI):
```sh
wg-quick up /etc/wireguard/wg0.conf
```
Автозапуск при загрузке:
```sh
uci set network.wg0=interface
uci set network.wg0.proto='wireguard'
# ... (проще через LuCI мастер импорта, он сам генерирует нужный uci-конфиг)
```

## 3. Генерация списков доменов на сервере

На **VPN-сервере** (не на роутере) выполните:

```sh
cd vpn-server
./routing/split-tunnel-router.sh
```

Это создаст `routing/router-artifacts/`:
- `dnsmasq-ru-direct.conf` — ru-домены → ipset `ru_direct`
- `dnsmasq-force-vpn.conf` — домены с геоблоком → ipset `vpn_force`
- `openwrt-ipset-firewall.txt` — готовые UCI-команды

Скопируйте на роутер:
```sh
scp routing/router-artifacts/dnsmasq-*.conf root@<ip-роутера>:/etc/dnsmasq.d/
```

## 4. Применение ipset и policy routing

Выполните команды из `openwrt-ipset-firewall.txt` на роутере (через SSH), либо вручную:

```sh
uci set firewall.ru_direct=ipset
uci set firewall.ru_direct.name='ru_direct'
uci set firewall.ru_direct.match='dst_net'
uci set firewall.ru_direct.storage='hash'

uci set firewall.vpn_force=ipset
uci set firewall.vpn_force.name='vpn_force'
uci set firewall.vpn_force.match='dst_net'
uci set firewall.vpn_force.storage='hash'

uci commit firewall

ip rule add fwmark 0x1 table 100
ip route add default dev wg0 table 100

uci add firewall rule
uci set firewall.@rule[-1].name='mark-vpn-force'
uci set firewall.@rule[-1].src='lan'
uci set firewall.@rule[-1].dest_ip='@vpn_force'
uci set firewall.@rule[-1].target='MARK'
uci set firewall.@rule[-1].set_mark='0x1'
uci commit firewall

service dnsmasq restart
service firewall restart
```

Домены из `ru_direct` резолвятся и матчатся стандартной локальной таблицей маршрутизации
(идут через WAN), домены из `vpn_force` — принудительно помечаются и уходят в table 100 (wg0).
Всё, что не попало ни в один из списков, маршрутизируется согласно основной таблице
(по умолчанию — тоже через wg0, если вы сделали `wg0` default route; чтобы получить
поведение "весь мир кроме РФ через VPN", проще всего сделать `wg0` шлюзом по умолчанию
и добавить `ru_direct` как исключение через отдельное policy-правило с `target=ACCEPT`
и явным `route` через WAN table).

## 5. Проверка

```sh
# На роутере: список IP, попавших в ipset
ipset list ru_direct | head
ipset list vpn_force | head

# С устройства в локальной сети:
nslookup sberbank.ru      # должен резолвиться и идти через WAN
nslookup netflix.com      # должен идти через wg0
curl ifconfig.me          # ваш VPN-IP для "обычного" трафика
```

## 6. Обновление списков

Список российских доменов/сервисов с геоблоком курируется вручную в
`routing/ru-domains.txt` и `routing/force-vpn-domains.txt` на сервере. После правок —
повторно запустите `./routing/split-tunnel-router.sh` и скопируйте обновлённые
`dnsmasq-*.conf` на роутер, затем `service dnsmasq restart`.
