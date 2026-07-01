#!/usr/bin/env bash
#
# setup.sh — One-click WireGuard VPN server deployment.
#
# Deploys wg-easy (WireGuard + web panel) in Docker, an optional XRay/VLESS
# fallback for hostile networks, UFW firewall, fail2ban, split-tunnel route
# lists (Russian traffic goes direct), automatic security updates, backups and
# Telegram notifications.
#
# Usage (on a fresh Ubuntu 22.04 server, as root):
#   git clone <repo> vpn && cd vpn/vpn-server && ./setup.sh
# or:
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/vpn-server/setup.sh | bash
#
# The only thing you are asked for is the web-panel password. Everything else
# is auto-detected or has a sane default (override via ./.env or env vars).
#
set -Eeuo pipefail

# --------------------------------------------------------------------------- #
# Constants & paths
# --------------------------------------------------------------------------- #
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
INSTALL_DIR="/opt/vpn-server"
LOG_FILE="/var/log/vpn-setup.log"
ENV_FILE="${SCRIPT_DIR}/.env"
UBUNTU_MIN="20.04"

# Defaults (override in .env or via environment)
: "${WG_PORT:=51820}"           # WireGuard UDP port
: "${WEB_PORT:=51821}"          # wg-easy web panel port (bound to localhost only)
: "${SSH_PORT:=2222}"           # new hardened SSH port (0 = keep 22)
: "${XRAY_ENABLE:=true}"        # deploy XRay/VLESS fallback
: "${XRAY_PORT:=443}"           # XRay TCP port (TLS)
: "${DISABLE_IPV6:=true}"       # disable IPv6 if unused
: "${INSTALL_DIR:=/opt/vpn-server}"

# --------------------------------------------------------------------------- #
# Logging helpers
# --------------------------------------------------------------------------- #
c_reset='\033[0m'; c_red='\033[0;31m'; c_grn='\033[0;32m'; c_ylw='\033[0;33m'; c_blu='\033[0;34m'
log()  { echo -e "${c_blu}[$(date +%H:%M:%S)]${c_reset} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${c_grn}[ OK ]${c_reset} $*"           | tee -a "$LOG_FILE"; }
warn() { echo -e "${c_ylw}[WARN]${c_reset} $*"           | tee -a "$LOG_FILE"; }
err()  { echo -e "${c_red}[FAIL]${c_reset} $*"           | tee -a "$LOG_FILE" >&2; }

on_error() {
  local exit_code=$?
  err "Setup failed at line ${BASH_LINENO[0]} (exit ${exit_code}). See ${LOG_FILE}."
  err "Fix the issue and re-run ./setup.sh — the script is idempotent."
  exit "$exit_code"
}
trap on_error ERR

# --------------------------------------------------------------------------- #
# Pre-flight checks
# --------------------------------------------------------------------------- #
require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "This script must run as root. Try: sudo ./setup.sh"
    exit 1
  fi
}

check_os() {
  if [[ ! -f /etc/os-release ]]; then
    err "Cannot detect OS (no /etc/os-release). Ubuntu 22.04 LTS required."
    exit 1
  fi
  # shellcheck disable=SC1091
  . /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]]; then
    warn "Detected ${PRETTY_NAME:-unknown}. This script is tested on Ubuntu 22.04 LTS."
    warn "Continuing anyway in 5s (Ctrl-C to abort)..."; sleep 5
  else
    ok "OS: ${PRETTY_NAME}"
  fi
}

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    log "Loading configuration from ${ENV_FILE}"
    set -a; # shellcheck disable=SC1090
    . "$ENV_FILE"; set +a
  fi
}

detect_public_ip() {
  local ip=""
  for url in "https://api.ipify.org" "https://ifconfig.me" "https://icanhazip.com"; do
    ip="$(curl -fsS --max-time 8 "$url" 2>/dev/null | tr -d '[:space:]' || true)"
    [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && { echo "$ip"; return 0; }
  done
  # Fallback: primary interface address
  ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}'
}

prompt_password() {
  # Password may come from env (WEB_PASSWORD) for fully unattended installs.
  if [[ -n "${WEB_PASSWORD:-}" ]]; then
    ok "Web-panel password taken from environment."
    return 0
  fi
  if [[ ! -t 0 ]]; then
    # Non-interactive (e.g. curl | bash) and no password supplied -> generate one.
    WEB_PASSWORD="$(head -c 18 /dev/urandom | base64 | tr -d '/+=' | head -c 20)"
    GENERATED_PASSWORD=1
    warn "No TTY and WEB_PASSWORD unset — generated a random password (shown at the end)."
    return 0
  fi
  local p1 p2
  while true; do
    read -rsp "Set a password for the wg-easy web panel: " p1; echo
    read -rsp "Repeat the password: " p2; echo
    [[ "$p1" == "$p2" && -n "$p1" ]] && { WEB_PASSWORD="$p1"; break; }
    warn "Passwords did not match or were empty. Try again."
  done
  ok "Web-panel password set."
}

# --------------------------------------------------------------------------- #
# Installation steps
# --------------------------------------------------------------------------- #
apt_update_upgrade() {
  log "Updating system packages..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get upgrade -y -qq
  apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release ufw fail2ban qrencode \
    unattended-upgrades apt-listchanges jq python3 iptables cron
  ok "System updated and base tools installed."
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    ok "Docker + Compose already installed ($(docker --version | awk '{print $3}' | tr -d ','))."
    return 0
  fi
  log "Installing Docker Engine + Compose plugin (official repository)..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  local codename; codename="$(. /etc/os-release; echo "${UBUNTU_CODENAME:-jammy}")"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu ${codename} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  ok "Docker installed and enabled."
}

sync_project() {
  log "Installing project files to ${INSTALL_DIR}..."
  mkdir -p "$INSTALL_DIR"
  # Copy everything except the local .env secret which we regenerate.
  cp -a "${SCRIPT_DIR}/." "$INSTALL_DIR/"
  ok "Project synced to ${INSTALL_DIR}."
}

write_env() {
  log "Writing runtime environment (${INSTALL_DIR}/.env)..."
  local pw_hash
  # wg-easy >= 14 expects a bcrypt hash for PASSWORD_HASH.
  pw_hash="$(docker run --rm ghcr.io/wg-easy/wg-easy:14 \
              wgpw "$WEB_PASSWORD" 2>/dev/null | sed -e "s/PASSWORD_HASH=//" -e "s/'//g" || true)"
  if [[ -z "$pw_hash" ]]; then
    warn "Could not pre-hash password via wg-easy image; falling back to plain PASSWORD env."
  fi
  cat > "${INSTALL_DIR}/.env" <<EOF
# ---- Auto-generated by setup.sh on $(date -u +%FT%TZ) ----
PUBLIC_IP=${PUBLIC_IP}
WG_HOST=${PUBLIC_IP}
WG_PORT=${WG_PORT}
WEB_PORT=${WEB_PORT}
PASSWORD_HASH=${pw_hash}
WEB_PASSWORD=${WEB_PASSWORD}
XRAY_ENABLE=${XRAY_ENABLE}
XRAY_PORT=${XRAY_PORT}
# Split-tunnel: everything except these networks goes through the VPN.
# Regenerated by scripts/update-routes.sh (Russian ranges go DIRECT).
WG_ALLOWED_IPS=0.0.0.0/0
# WireGuard clients use the leak-proof Unbound resolver (see docker-compose.yml).
WG_DEFAULT_DNS=10.42.0.53
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-}
EOF
  chmod 600 "${INSTALL_DIR}/.env"
  ok "Environment written (mode 600)."
}

configure_sysctl() {
  log "Enabling IP forwarding and privacy sysctls..."
  cat > /etc/sysctl.d/99-vpn.conf <<EOF
net.ipv4.ip_forward = 1
net.ipv4.conf.all.src_valid_mark = 1
EOF
  if [[ "${DISABLE_IPV6,,}" == "true" ]]; then
    cat >> /etc/sysctl.d/99-vpn.conf <<EOF
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF
    ok "IPv6 disabled (DISABLE_IPV6=true)."
  fi
  sysctl --system >/dev/null
  ok "sysctl applied."
}

configure_firewall() {
  log "Configuring UFW firewall..."
  bash "${INSTALL_DIR}/scripts/firewall.sh"
  ok "Firewall configured."
}

harden_server() {
  log "Hardening SSH + fail2ban..."
  SSH_PORT="$SSH_PORT" bash "${INSTALL_DIR}/scripts/harden.sh"
  ok "Server hardened."
}

configure_auto_updates() {
  log "Enabling unattended-upgrades..."
  cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
  cat > /etc/apt/apt.conf.d/51unattended-security <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
  systemctl enable --now unattended-upgrades >/dev/null 2>&1 || true
  ok "Automatic security updates enabled (auto-reboot 04:30 if required)."
}

deploy_stack() {
  log "Deploying Docker stack (wg-easy${XRAY_ENABLE:+ + XRay})..."
  cd "$INSTALL_DIR"
  local profiles=()
  if [[ "${XRAY_ENABLE,,}" == "true" ]]; then
    profiles=(--profile xray)
    log "Provisioning XRay/VLESS REALITY fallback..."
    if PUBLIC_IP="$PUBLIC_IP" bash "${INSTALL_DIR}/scripts/setup-xray.sh"; then
      ok "XRay provisioned."
    else
      warn "XRay provisioning failed — continuing without fallback."
      profiles=()
    fi
  fi
  docker compose "${profiles[@]}" pull
  docker compose "${profiles[@]}" up -d
  ok "Containers are up."
}

install_cron() {
  log "Installing scheduled jobs (route updates, backups, health checks)..."
  # Route list refresh — weekly.
  cat > /etc/cron.d/vpn-routes <<EOF
# Refresh Russian IP ranges / split-tunnel lists weekly
17 4 * * 1 root ${INSTALL_DIR}/scripts/update-routes.sh >> /var/log/vpn-routes.log 2>&1
EOF
  # Config backup — daily.
  cat > /etc/cron.d/vpn-backup <<EOF
30 3 * * * root ${INSTALL_DIR}/scripts/backup.sh >> /var/log/vpn-backup.log 2>&1
EOF
  # Health monitor — every 5 minutes (Telegram alerts).
  cat > /etc/cron.d/vpn-health <<EOF
*/5 * * * * root ${INSTALL_DIR}/scripts/health-monitor.sh >> /var/log/vpn-health.log 2>&1
EOF
  chmod 644 /etc/cron.d/vpn-*
  ok "Cron jobs installed."
}

first_route_update() {
  log "Generating initial split-tunnel route lists (this may take a minute)..."
  if bash "${INSTALL_DIR}/scripts/update-routes.sh"; then
    ok "Route lists generated."
  else
    warn "Route generation failed on first run; will retry via weekly cron. VPN still works (full tunnel)."
  fi
}

notify_done() {
  [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]] && return 0
  bash "${INSTALL_DIR}/scripts/telegram-notify.sh" \
    "✅ VPN server deployed on ${PUBLIC_IP}. Web panel: http://127.0.0.1:${WEB_PORT} (SSH tunnel only)." || true
}

print_summary() {
  local ssh_note="port ${SSH_PORT}"
  [[ "$SSH_PORT" == "0" || "$SSH_PORT" == "22" ]] && ssh_note="port 22 (unchanged)"
  cat <<EOF

$(echo -e "${c_grn}")============================================================$(echo -e "${c_reset}")
  ✅  WireGuard VPN server is READY
============================================================
  Public IP        : ${PUBLIC_IP}
  WireGuard        : udp/${WG_PORT}
  Web panel        : http://127.0.0.1:${WEB_PORT}   (NOT exposed publicly)
  XRay/VLESS       : $( [[ "${XRAY_ENABLE,,}" == "true" ]] && echo "tcp/${XRAY_PORT} (fallback)" || echo "disabled" )
  SSH              : ${ssh_note}

  ── Open the web panel from your laptop via an SSH tunnel ──
    ssh -p ${SSH_PORT} -L ${WEB_PORT}:127.0.0.1:${WEB_PORT} root@${PUBLIC_IP}
    then browse to  http://127.0.0.1:${WEB_PORT}
EOF
  if [[ "${GENERATED_PASSWORD:-0}" == "1" ]]; then
    echo -e "  Web password     : ${c_ylw}${WEB_PASSWORD}${c_reset}  <-- SAVE THIS NOW"
  else
    echo    "  Web password     : (the one you entered)"
  fi
  cat <<EOF

  Add a client from the CLI:   ${INSTALL_DIR}/scripts/add-client.sh phone
  Backup configs:              ${INSTALL_DIR}/scripts/backup.sh
  Refresh route lists:         ${INSTALL_DIR}/scripts/update-routes.sh

  Full docs: ${INSTALL_DIR}/README.md
============================================================
EOF
}

# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
main() {
  touch "$LOG_FILE" 2>/dev/null || true
  log "=== VPN server setup started ==="
  require_root
  check_os
  load_env
  prompt_password

  PUBLIC_IP="${PUBLIC_IP:-$(detect_public_ip)}"
  [[ -n "$PUBLIC_IP" ]] || { err "Could not determine public IP. Set PUBLIC_IP in .env."; exit 1; }
  ok "Public IP: ${PUBLIC_IP}"

  apt_update_upgrade
  install_docker
  sync_project
  write_env
  configure_sysctl
  configure_auto_updates
  harden_server
  configure_firewall
  deploy_stack
  install_cron
  first_route_update
  notify_done
  print_summary
  log "=== VPN server setup finished ==="
}

main "$@"
