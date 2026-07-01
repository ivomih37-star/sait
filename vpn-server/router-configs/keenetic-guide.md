# Keenetic + WireGuard — whole-home VPN with split tunneling

This routes your **entire home network** through the VPN, while Russian sites
and banking apps go **directly** (split tunnel). Tested on KeeneticOS 3.7+.

> **Model note:** any Keenetic with KeeneticOS 3.3+ supports WireGuard natively
> (Giga, Ultra, Viva, Hopper, Peak, etc.). No firmware flashing needed.

---

## 1. Generate the router config on the server

```bash
/opt/vpn-server/scripts/add-client.sh router full
```

Copy the printed `[Interface]`/`[Peer]` values (or the QR). You'll need:
`PrivateKey`, `Address`, server `PublicKey`, `Endpoint`, `DNS`.

---

## 2. Create the WireGuard connection on the Keenetic

1. Open the web panel: `http://192.168.1.1` (or `my.keenetic.net`).
2. **Internet → Other Connections → WireGuard** → **Add connection**.
3. Fill in:
   - **Name:** `VPN`
   - **Private key:** `PrivateKey` from step 1 (or press *Generate* and instead
     register the router's generated public key on the server — either works).
   - **Address:** `10.8.0.4/24` (the `Address` value).
4. Under **Peer**:
   - **Public key:** server `PublicKey`.
   - **Endpoint (address:port):** `<SERVER_PUBLIC_IP>:51820`.
   - **Allowed IPs:** `0.0.0.0/0` (we filter *which* traffic uses it in step 4).
   - **Keepalive:** `25`.
5. **Save**. The connection should show **green / Connected**.

---

## 3. Point DNS through the tunnel (no leaks)

1. **Internet → Other Connections → WireGuard → VPN → (edit)**.
2. Set **DNS server** to `10.42.0.53` for this interface.
3. **Management → Settings → Enable DNS-over-TLS / DNS-over-HTTPS** if your
   model offers it — belt-and-braces against leaks.

---

## 4. Split tunneling — Russia direct, the rest via VPN

Keenetic does policy routing by **connection priority** + **routes**.

**Option A — Route only foreign traffic via VPN (recommended, simplest):**

1. **Internet → Priorities of connections (Policy routing)**.
2. Create a policy **"Via VPN"** and add the **WireGuard `VPN`** connection as
   its only/primary connection.
3. Assign the policy to the devices/subnet you want protected.
4. Add the Russian ranges as **exceptions that use the main ISP connection**:
   - **Routing → Add route** → import the CIDRs from
     `/opt/vpn-server/configs/russia-direct.txt`, each pointing at the
     **ISP/main** interface (gateway of your provider connection), not the VPN.

Because there can be hundreds of routes, generate a Keenetic CLI batch from the
server and paste it over Telnet/SSH (`Management → CLI`):

```bash
# On the server — produce Keenetic 'ip route' commands for direct RU ranges.
awk '!/^#/ && NF {print "ip route "$1" ISP"}' \
    /opt/vpn-server/configs/russia-direct.txt
# Replace "ISP" with your WAN interface name (see 'show interface' in CLI).
```

Paste the output into the Keenetic CLI, then `system configuration save`.

**Option B — Only foreign apps via VPN:** put just the devices that need it
into the "Via VPN" policy and leave everything else on the ISP. Coarser, but
zero route management.

---

## 5. Keep the RU list fresh

The server refreshes `russia-direct.txt` weekly (`update-routes.sh`). Re-run the
`awk` batch above and re-paste into the Keenetic CLI whenever you want to sync
(monthly is plenty). A small scheduled reminder is enough — the ranges are
stable.

---

## 6. Verify

- On a home device visit `https://whoami.akamai.net` / `https://2ip.ru` →
  should show the **VPN server's country** for foreign sites.
- Open `sberbank.ru` / `gosuslugi.ru` → should load and show your **real RU IP**.
- DNS leak test: `https://www.dnsleaktest.com` → only the VPN resolver appears.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Connection not green | Re-check `Endpoint` IP/port and that server UDP 51820 is open. |
| Everything slow | Lower MTU to `1412` on the WireGuard interface. |
| Banks still blocked | Confirm their ranges are in `russia-direct.txt`; re-run `update-routes.sh` and re-sync routes. |
| DNS leaks | Ensure interface DNS = `10.42.0.53` and disable "Use ISP DNS". |
