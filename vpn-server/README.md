# 🔐 One-Click WireGuard VPN Server

Production-ready, self-hosted VPN you deploy with **one command**. After you buy
a server, you run `./setup.sh`, type a web-panel password, and everything else —
WireGuard, web panel, QR codes, firewall, fail2ban, split tunneling (Russian
traffic goes direct), encrypted DNS, an obfuscated fallback, backups and
Telegram alerts — is configured and self-updating.

```
┌────────────┐   WireGuard (UDP 51820)    ┌──────────────────────────────┐
│  Your      │ ─────────────────────────► │  VPS (Ubuntu 22.04)          │
│  phone /   │                            │  • wg-easy  (WG + web panel) │
│  laptop /  │   XRay VLESS+REALITY (443) │  • unbound  (DoT, no leaks)  │
│  router    │ ─ ─ fallback if blocked ─► │  • xray     (DPI-resistant)  │
└────────────┘                            │  • UFW + fail2ban + auto-upd │
                                          └──────────────────────────────┘
   Russian sites / banks ─────── go DIRECT (split tunnel) ──────► internet
```

---

## 1. Which server to buy (cheapest reliable options)

| Provider | Plan | Location (low latency to RU) | Price |
|---|---|---|---|
| **Hetzner Cloud** ⭐ | CX22 (2 vCPU, 4 GB) / CPX11 | **Germany (Nürnberg/Falkenstein)**, Finland (Helsinki) | ~€3.8/mo |
| **Vultr** | Regular 1 vCPU, 1 GB | **Amsterdam (NL)**, Frankfurt (DE) | ~$5/mo |
| **Timeweb Cloud** | 1 vCPU, 1 GB | **Netherlands / Germany** | ~250₽ (~$3)/mo |

**Recommendation:** **Hetzner, Helsinki (Finland)** or **Falkenstein (Germany)** —
best price/latency/reliability for users in Russia. The Netherlands is also
excellent. Bulgaria works if you find it (e.g. some budget hosts) but DE/FI/NL
are the safe defaults.

**Spec to pick:** the smallest is enough for personal/family use — **1 CPU,
1–2 GB RAM, 10–20 GB SSD, Ubuntu 22.04 LTS**. WireGuard is extremely light; the
bottleneck is your line, not the VPS.

> When creating the server: choose **Ubuntu 22.04 LTS**, and if possible **add
> your SSH public key** during creation. If you add a key, `setup.sh` will
> auto-disable password SSH login for you.

---

## 2. Deploy (the one command)

SSH into the fresh server as `root`, then:

```bash
# Clone and run
git clone https://github.com/<you>/<repo>.git
cd <repo>/vpn-server
./setup.sh
```

or fully unattended (no prompts):

```bash
curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/vpn-server/setup.sh \
  | WEB_PASSWORD='your-strong-password' bash
```

You'll be asked **only** for the web-panel password (unless you pass
`WEB_PASSWORD`). When it finishes you'll see a summary with your IP, ports and
the SSH-tunnel command to open the panel.

### What `setup.sh` does (idempotent — safe to re-run)
1. Updates the system, installs Docker + Compose (official repo).
2. Enables IP forwarding; disables IPv6 (privacy, unless you set `DISABLE_IPV6=false`).
3. Hardens SSH (moves to port **2222**, key-only if a key exists) + **fail2ban**.
4. Configures **UFW** (only SSH / WireGuard / XRay open; web panel never exposed).
5. Enables **unattended-upgrades** (auto security patches, auto-reboot 04:30).
6. Deploys **wg-easy** + **unbound** (+ **xray** fallback) via Docker Compose.
7. Builds the **split-tunnel route lists** (Russia direct).
8. Installs cron jobs: weekly route refresh, daily backup, 5-min health check.

Config lives in `/opt/vpn-server`. Secrets are in `/opt/vpn-server/.env` (mode 600).

---

## 3. Add clients & get QR codes

From the server:

```bash
/opt/vpn-server/scripts/add-client.sh phone         # split tunnel (default)
/opt/vpn-server/scripts/add-client.sh laptop full   # full tunnel
```

This creates the client, saves `configs/<name>.conf`, and prints a **QR code**
right in the terminal. You can also manage clients in the **web panel**.

### Open the web panel (safely, no public exposure)
The panel is bound to `127.0.0.1` only. Reach it through an SSH tunnel from your
own machine:

```bash
ssh -p 2222 -L 51821:127.0.0.1:51821 root@<SERVER_IP>
# then open http://127.0.0.1:51821 in your browser
```

---

## 4. Client setup instructions

### 📱 iPhone / Android
1. Install **WireGuard** (App Store / Google Play).
2. Tap **+ → Create from QR code**, scan the QR from `add-client.sh` (or the
   web panel).
3. Toggle it on. Done.

*(Fallback for hostile networks: install **v2rayNG** (Android) / **Streisand**
or **Shadowrocket** (iOS) and import the VLESS URL from
`configs/xray-vless-url.txt`.)*

### 💻 Windows / macOS / Linux
1. Install the **WireGuard** desktop app (wireguard.com/install).
2. **Import tunnel from file** → choose `configs/<name>.conf` (copy it off the
   server with `scp`).
3. **Activate.**

*(Fallback: **Nekoray** / **v2rayN**, import the VLESS URL.)*

### 🌐 Router (whole home through the VPN)
- **Keenetic:** see [`router-configs/keenetic-guide.md`](router-configs/keenetic-guide.md)
- **OpenWrt:** see [`router-configs/openwrt-guide.md`](router-configs/openwrt-guide.md)
  (supports clean **domain-based** split tunneling)

---

## 5. Split tunneling — Russia direct, the world via VPN

WireGuard routes by IP (`AllowedIPs`). `scripts/update-routes.sh` computes:

```
AllowedIPs = 0.0.0.0/0  minus  (Russian CIDRs + bank/gosuslugi IPs)
```

so **only foreign/blocked traffic** enters the tunnel, while **yandex.ru,
vk.com, sberbank.ru, gosuslugi.ru, ozon.ru, …** go **direct** (fast, and keeps
banking apps working). Outputs:

- `configs/russia-direct.txt` — everything that bypasses the VPN
- `configs/allowed-ips-split.txt` — the computed split `AllowedIPs`
- `configs/allowed-ips-full.txt` — `0.0.0.0/0` (route everything)

`add-client.sh <name> split` bakes the split list into new client configs; new
web-panel clients inherit it too (via `WG_ALLOWED_IPS` in `.env`). The list
**auto-refreshes weekly** (cron). Sources: the ipdeny aggregated RU zone plus
live-resolved RU/bank domains, with an offline fallback so it never breaks.

> **Existing devices** keep their old `AllowedIPs` until you re-import the
> updated `.conf`. For truly maintenance-free domain-based split, use the
> **OpenWrt** router method.

---

## 6. Sites that block VPN (Netflix, Spotify, Steam, banks)

- **Banks / gosuslugi** deliberately block datacenter VPN IPs → we keep them
  **DIRECT** (they're in `update-routes.sh` → `DIRECT_DOMAINS`), so they always
  work.
- **Streaming / geo-blocked services** are listed in `configs/vpn-domains.txt`
  and routed **through** the VPN. Honest caveat: **Netflix/Disney+** actively
  detect datacenter IPs — geo-unblock works for many services (Spotify, Steam
  regional, YouTube, most catalogs) but stubborn streamers may still flag a VPS
  IP. A residential/ISP proxy on the server is the only full fix and is out of
  scope here.
- The **XRay VLESS + REALITY** fallback (port 443) masquerades as normal HTTPS
  to a real site's SNI — use it on networks that DPI-block WireGuard.

---

## 7. Monitoring & management

- **Web panel (wg-easy):** add/remove clients, live traffic stats, QR codes.
- **Telegram alerts:** set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` in `.env`.
  `health-monitor.sh` (every 5 min) sends **edge-triggered** alerts on
  container/port/connectivity/disk problems and a recovery notice.
- **Backups:** `scripts/backup.sh` (daily) tarballs keys + configs, keeps 14,
  optional GPG encryption (`BACKUP_PASSPHRASE`), and can upload to Telegram.

Manual commands:
```bash
cd /opt/vpn-server
docker compose ps           # status
docker compose logs -f      # logs
./scripts/backup.sh         # backup now
./scripts/update-routes.sh  # refresh split lists now
./scripts/telegram-notify.sh "test"   # test alerts
```

---

## 8. Security posture

- ✅ Web panel bound to **localhost only** — reachable solely via SSH tunnel.
- ✅ SSH moved to **port 2222**, root password login disabled when a key exists.
- ✅ **fail2ban** with escalating bans on the SSH jail.
- ✅ **UFW** default-deny; only WireGuard/XRay/SSH open.
- ✅ **IPv6 disabled** by default (no IPv6 leaks).
- ✅ **No traffic logging:** wg-easy keeps only client metadata; unbound/xray
  access logs are disabled. WireGuard itself keeps no connection logs.
- ✅ **Encrypted DNS** via unbound (DNS-over-TLS to Cloudflare/Quad9) → no DNS
  leaks to the ISP.
- ✅ **Automatic security updates** with unattended-upgrades.

To change the SSH port or keep 22: set `SSH_PORT` in `.env` (0 or 22 = keep default).

---

## 9. Cost

| Item | Cost |
|---|---|
| VPS (Hetzner/Vultr/Timeweb, smallest) | **~$3–5 / month** |
| Domain (optional, only if you want a hostname / nicer REALITY SNI) | **~$1–10 / year** |
| **Total** | **≈ $3–5 / month**, no domain required |

One server comfortably serves a whole family / small group.

---

## 10. Project structure

```
vpn-server/
├── docker-compose.yml         # wg-easy + unbound (+ xray) stack
├── setup.sh                   # ONE command — full deploy
├── .env.example               # config template (setup.sh generates real .env)
├── configs/
│   ├── client1-phone.conf     # example client template (phone)
│   ├── client2-pc.conf        # example client template (desktop)
│   ├── router.conf            # example client template (router)
│   ├── vpn-domains.txt        # domains to route THROUGH the VPN
│   ├── russia-direct.txt      # (generated) RU/bank ranges that bypass VPN
│   └── allowed-ips-split.txt  # (generated) computed split AllowedIPs
├── scripts/
│   ├── add-client.sh          # create client + QR + split-tunnel config
│   ├── backup.sh              # encrypted daily backup (+ Telegram)
│   ├── update-routes.sh       # refresh Russian IP lists / split tunnel
│   ├── firewall.sh            # UFW rules + NAT
│   ├── harden.sh              # SSH hardening + fail2ban
│   ├── setup-xray.sh          # provision VLESS+REALITY fallback
│   ├── health-monitor.sh      # 5-min health check + Telegram alerts
│   └── telegram-notify.sh     # send a Telegram message
├── router-configs/
│   ├── keenetic-guide.md
│   └── openwrt-guide.md
├── xray/
│   ├── config.template.json   # rendered to config.json by setup-xray.sh
│   └── config.json            # (generated)
└── unbound/
    └── forward-records.conf   # encrypted DNS upstreams
```

---

## Appendix — Telegram bot in 60 seconds
1. Message **@BotFather** → `/newbot` → copy the **token**.
2. Message **@userinfobot** → copy your numeric **chat id**.
3. Put both in `/opt/vpn-server/.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`),
   then `./scripts/telegram-notify.sh "hello"` to test.

## Appendix — Switching Unbound to DoH (dnscrypt-proxy)
DNS-over-TLS (default) already prevents leaks. If you specifically want
DNS-over-**HTTPS**, replace the `unbound` service with a `dnscrypt-proxy`
container (DoH to Cloudflare/Quad9) and point `WG_DEFAULT_DNS` at it — the rest
of the stack is unchanged.

## Uninstall
```bash
cd /opt/vpn-server && docker compose --profile xray down -v
ufw --force reset && systemctl disable --now fail2ban
rm -rf /opt/vpn-server /etc/cron.d/vpn-*
```

---

**Disclaimer:** Self-hosting a VPN is legal in most jurisdictions for privacy
and accessing services you're entitled to. You are responsible for complying
with the laws that apply to you and your provider's terms of service.
