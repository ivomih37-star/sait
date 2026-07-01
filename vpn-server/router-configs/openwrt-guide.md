# OpenWrt + WireGuard — whole-home VPN with **domain-based** split tunneling

OpenWrt gives the cleanest split tunnel: it can route by **domain** using
`dnsmasq` + `ipset`/`nftables`, so "these domains go direct, everything else via
VPN" — no giant IP list to maintain. Tested on OpenWrt 22.03 / 23.05.

---

## 0. Install packages

```sh
opkg update
opkg install wireguard-tools kmod-wireguard luci-proto-wireguard \
             dnsmasq-full ipset kmod-nft-core   # dnsmasq-full replaces dnsmasq
# If dnsmasq-full conflicts: opkg remove dnsmasq && opkg install dnsmasq-full
```

---

## 1. Generate the router config on the server

```sh
/opt/vpn-server/scripts/add-client.sh router full
```

Note `PrivateKey`, `Address` (10.8.0.4/24), server `PublicKey`, `Endpoint`, DNS.

---

## 2. Create the WireGuard interface

**LuCI:** *Network → Interfaces → Add new interface* → name `vpn`, protocol
**WireGuard VPN**. Fill Private Key + Address `10.8.0.4/24`. Add a peer:
Public Key = server key, Endpoint Host/Port = `<IP>:51820`, **Allowed IPs
`0.0.0.0/0`**, **Persistent Keepalive `25`**, and tick **Route Allowed IPs = OFF**
(we route selectively below).

Or via CLI (`/etc/config/network`):

```
config interface 'vpn'
    option proto 'wireguard'
    option private_key '<CLIENT_PRIVATE_KEY>'
    list addresses '10.8.0.4/24'

config wireguard_vpn
    option public_key '<SERVER_PUBLIC_KEY>'
    option endpoint_host '<SERVER_PUBLIC_IP>'
    option endpoint_port '51820'
    option persistent_keepalive '25'
    option route_allowed_ips '0'      # we add policy routes ourselves
    list allowed_ips '0.0.0.0/0'
```

Firewall: create zone `vpn` (input reject, output accept, **masquerading on**,
forward reject), and **forward LAN → vpn**. Add zone `vpn` covering interface
`vpn`.

---

## 3. Policy routing — send marked traffic through the VPN

```sh
uci add network route; uci set network.@route[-1].interface='vpn'
uci set network.@route[-1].target='0.0.0.0/0'
uci set network.@route[-1].table='100'
uci commit network

# Rule: packets with fwmark 0x1 use table 100 (the VPN default route)
uci add network rule; uci set network.@rule[-1].mark='0x1'
uci set network.@rule[-1].lookup='100'; uci commit network
```

---

## 4. Domain-based split — the smart part

Instead of routing by IP, tag **domains** that should go via the VPN. Everything
NOT tagged (including all RU sites, banks, gosuslugi) stays on the ISP.

Create an nftables set and mark its members:

```sh
cat >> /etc/nftables.d/10-vpn-split.nft <<'NFT'
table inet vpnsplit {
    set via_vpn4 { type ipv4_addr; flags interval; }
    chain mark {
        type route hook output priority 0;
        ip daddr @via_vpn4 meta mark set 0x1;
    }
    chain premark {
        type filter hook prerouting priority -150;
        ip daddr @via_vpn4 meta mark set 0x1;
    }
}
NFT
```

Tell dnsmasq to add resolved IPs of "foreign" domains into that set. Put the
domain list in `/etc/dnsmasq.d/vpn-domains.conf` — pull the curated list from the
server (`configs/vpn-domains.txt`, see server README) or start with:

```
# /etc/dnsmasq.d/vpn-domains.conf  — domains routed THROUGH the VPN
nftset=/youtube.com/inet#vpnsplit#via_vpn4
nftset=/googlevideo.com/inet#vpnsplit#via_vpn4
nftset=/instagram.com/inet#vpnsplit#via_vpn4
nftset=/facebook.com/inet#vpnsplit#via_vpn4
nftset=/twitter.com/x.com/inet#vpnsplit#via_vpn4
nftset=/netflix.com/nflxvideo.net/inet#vpnsplit#via_vpn4
nftset=/spotify.com/scdn.co/inet#vpnsplit#via_vpn4
nftset=/openai.com/chatgpt.com/inet#vpnsplit#via_vpn4
nftset=/telegram.org/t.me/inet#vpnsplit#via_vpn4
```

```sh
/etc/init.d/dnsmasq restart
/etc/init.d/network restart
```

Now only those domains (and their CDNs, resolved live) traverse the VPN.
`yandex.ru`, `sberbank.ru`, `gosuslugi.ru` etc. are never added to the set → they
go **direct**. This is inherently bank-friendly and needs no IP-list upkeep.

> **Inverse mode** (route *everything* via VPN except RU): keep the default
> route on `vpn` (`option route_allowed_ips '1'`) and instead build a set
> `ru_direct` from `configs/russia-direct.txt` that marks packets to use the ISP
> table. Use whichever matches your threat model.

---

## 5. Leak-proof DNS

Point dnsmasq upstream at the VPN resolver so lookups can't leak:

```
# /etc/config/dhcp -> config dnsmasq
uci add_list dhcp.@dnsmasq[0].server='10.42.0.53'
uci set dhcp.@dnsmasq[0].noresolv='1'
uci commit dhcp; /etc/init.d/dnsmasq restart
```

---

## 6. Verify

```sh
# On a LAN client:
curl https://api.ipify.org        # foreign -> VPN country
curl https://ipinfo.io/ip
# RU check in a browser: sberbank.ru / gosuslugi.ru load with your real RU IP.
# DNS leak: https://dnsleaktest.com -> only the VPN resolver.
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| No traffic via VPN | Check `nft list ruleset` for `0x1` marks and `ip rule`/`ip route show table 100`. |
| dnsmasq won't start | You need **dnsmasq-full** (plain dnsmasq lacks nftset/ipset). |
| MTU / stalls | Set interface MTU `1412` on `vpn`. |
| Domains not routing | dnsmasq only adds IPs on **fresh** lookups — flush DNS cache / reconnect the client. |
