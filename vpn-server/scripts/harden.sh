#!/usr/bin/env bash
#
# harden.sh — SSH hardening + fail2ban.
#
# * moves SSH to a non-standard port (SSH_PORT, 0/22 keeps default)
# * disables root password login (keys only) if a key is already present
# * installs a fail2ban jail for sshd
#
# The script is careful NOT to lock you out: password auth is only disabled when
# an authorized_keys file with at least one key exists.
#
set -Eeuo pipefail

: "${SSH_PORT:=2222}"

echo "[harden] Configuring SSH..."
SSHD_DROPIN="/etc/ssh/sshd_config.d/99-vpn-hardening.conf"
mkdir -p /etc/ssh/sshd_config.d

HAS_KEY=0
for f in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
  [[ -s "$f" ]] && grep -qE '^(ssh-|ecdsa-|sk-)' "$f" 2>/dev/null && HAS_KEY=1
done

{
  echo "# Managed by harden.sh"
  if [[ "$SSH_PORT" != "0" && "$SSH_PORT" != "22" ]]; then
    echo "Port ${SSH_PORT}"
  fi
  echo "Protocol 2"
  echo "PermitRootLogin prohibit-password"
  echo "MaxAuthTries 3"
  echo "LoginGraceTime 30"
  echo "X11Forwarding no"
  echo "ClientAliveInterval 300"
  echo "ClientAliveCountMax 2"
  if [[ "$HAS_KEY" == "1" ]]; then
    echo "PasswordAuthentication no"
    echo "PubkeyAuthentication yes"
    echo "# password auth disabled: SSH key detected"
  else
    echo "PasswordAuthentication yes"
    echo "# WARNING: no SSH key found -> password auth kept enabled to avoid lockout."
    echo "#          Add a key and re-run harden.sh to disable password login."
  fi
} > "$SSHD_DROPIN"

if sshd -t 2>/dev/null; then
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
  if [[ "$SSH_PORT" != "0" && "$SSH_PORT" != "22" ]]; then
    echo "[harden] SSH now on port ${SSH_PORT}. Reconnect with: ssh -p ${SSH_PORT} root@<ip>"
  fi
  [[ "$HAS_KEY" == "1" ]] && echo "[harden] Password login DISABLED (key found)." \
                          || echo "[harden] Password login kept (no SSH key present)."
else
  echo "[harden] sshd config test FAILED — reverting hardening drop-in."
  rm -f "$SSHD_DROPIN"
  exit 1
fi

echo "[harden] Configuring fail2ban..."
cat > /etc/fail2ban/jail.d/sshd.local <<EOF
[sshd]
enabled  = true
port     = ${SSH_PORT}
backend  = systemd
maxretry = 4
findtime = 10m
bantime  = 1h
bantime.increment = true
bantime.factor    = 2
bantime.maxtime   = 1w
EOF

systemctl enable --now fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban >/dev/null 2>&1 || true
echo "[harden] fail2ban active (sshd jail, escalating bans)."
