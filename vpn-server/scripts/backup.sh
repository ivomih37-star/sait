#!/usr/bin/env bash
#
# backup.sh — Encrypted backup of all VPN state (keys, client configs, .env).
#
# Creates a timestamped tarball in data/backups/, keeps the last 14, and (if a
# Telegram bot is configured) uploads the archive to your chat as a document.
#
# Optional GPG symmetric encryption: set BACKUP_PASSPHRASE in .env to encrypt.
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
[[ -f "$ENV_FILE" ]] && { set -a; . "$ENV_FILE"; set +a; }

BACKUP_DIR="${ROOT_DIR}/data/backups"
KEEP=14
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${BACKUP_DIR}/vpn-backup-${TS}.tar.gz"

echo "[backup] Creating archive ${ARCHIVE}..."
tar -czf "$ARCHIVE" -C "$ROOT_DIR" \
    --exclude='data/backups' \
    --exclude='data/routes' \
    data/wg-easy .env configs xray/config.json 2>/dev/null || \
tar -czf "$ARCHIVE" -C "$ROOT_DIR" data .env configs 2>/dev/null

# Optional encryption.
FINAL="$ARCHIVE"
if [[ -n "${BACKUP_PASSPHRASE:-}" ]] && command -v gpg >/dev/null; then
  echo "[backup] Encrypting with GPG..."
  gpg --batch --yes --passphrase "$BACKUP_PASSPHRASE" -c "$ARCHIVE"
  rm -f "$ARCHIVE"
  FINAL="${ARCHIVE}.gpg"
fi
chmod 600 "$FINAL"

# Rotate old backups.
ls -1t "${BACKUP_DIR}"/vpn-backup-*.tar.gz* 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
echo "[backup] Done: $(basename "$FINAL") ($(du -h "$FINAL" | cut -f1)). Kept last ${KEEP}."

# Optional Telegram upload.
if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  echo "[backup] Uploading to Telegram..."
  curl -fsS --max-time 60 \
    -F "chat_id=${TELEGRAM_CHAT_ID}" \
    -F "document=@${FINAL}" \
    -F "caption=🔐 VPN backup ${TS}" \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" >/dev/null \
    && echo "[backup] Uploaded to Telegram." \
    || echo "[backup] Telegram upload failed (kept local copy)."
fi
