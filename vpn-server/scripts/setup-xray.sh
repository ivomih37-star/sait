#!/usr/bin/env bash
#
# setup-xray.sh — Provision the XRay VLESS + REALITY fallback.
#
# REALITY needs no domain and no TLS certificate: it borrows the TLS handshake
# of a real public site (SNI camouflage), which makes it very hard for DPI to
# distinguish from ordinary HTTPS. This script generates the keypair, UUID and
# shortId, renders xray/config.json, and writes a ready-to-import client URL.
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
[[ -f "$ENV_FILE" ]] && { set -a; . "$ENV_FILE"; set +a; }

: "${XRAY_PORT:=443}"
: "${PUBLIC_IP:?PUBLIC_IP must be set}"
XRAY_IMAGE="ghcr.io/xtls/xray-core:latest"
# Camouflage target: a large, always-up TLS site.
DEST_HOST="${XRAY_DEST:-www.microsoft.com}"
SNI="${XRAY_SNI:-$DEST_HOST}"

CONF_OUT="${ROOT_DIR}/xray/config.json"
CLIENT_OUT="${ROOT_DIR}/configs/xray-vless-url.txt"

echo "[xray] Pulling image..."
docker pull -q "$XRAY_IMAGE" >/dev/null

echo "[xray] Generating REALITY keypair + credentials..."
KEYS="$(docker run --rm "$XRAY_IMAGE" x25519)"
PRIV="$(echo "$KEYS" | awk -F': ' '/Private/{print $2}')"
PUB="$(echo  "$KEYS" | awk -F': ' '/Public/{print $2}')"
UUID="$(docker run --rm "$XRAY_IMAGE" uuid)"
SHORT_ID="$(head -c 8 /dev/urandom | xxd -p)"

[[ -n "$PRIV" && -n "$PUB" && -n "$UUID" ]] || { echo "[xray] key generation failed"; exit 1; }

echo "[xray] Rendering config.json..."
sed -e "s|__XRAY_PORT__|${XRAY_PORT}|g" \
    -e "s|__UUID__|${UUID}|g" \
    -e "s|__PRIVATE_KEY__|${PRIV}|g" \
    -e "s|__SHORT_ID__|${SHORT_ID}|g" \
    -e "s|__DEST__|${DEST_HOST}|g" \
    -e "s|__SNI__|${SNI}|g" \
    "${ROOT_DIR}/xray/config.template.json" > "$CONF_OUT"

# Build the VLESS share URL that XRay/v2rayNG/Nekoray clients import directly.
VLESS_URL="vless://${UUID}@${PUBLIC_IP}:${XRAY_PORT}?encryption=none&flow=xtls-rprx-vision&security=reality&sni=${SNI}&fp=chrome&pbk=${PUB}&sid=${SHORT_ID}&type=tcp#VPN-Reality-Fallback"
echo "$VLESS_URL" > "$CLIENT_OUT"
chmod 600 "$CLIENT_OUT"

echo "[xray] Done. Client URL saved to ${CLIENT_OUT}"
echo "[xray] Import this in v2rayNG (Android) / Nekoray (PC) / Streisand (iOS):"
echo "        ${VLESS_URL}"
