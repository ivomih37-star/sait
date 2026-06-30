#!/usr/bin/env bash
# ===========================================================================
#  РакияКлуб · Nginx reverse proxy + Let's Encrypt SSL.
#  Запуск из корня проекта:  sudo bash deploy/ssl.sh you@email.com
#  Домен по умолчанию — РакияКлуб.рф (punycode); переопределяется DOMAIN=...
#  ВАЖНО: A-записи домена должны уже указывать на этот сервер.
# ===========================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

EMAIL="${1:-}"
DOMAIN="${DOMAIN:-xn--80aaldqfdq.xn--p1ai}"

if [ "$(id -u)" -ne 0 ]; then echo "❌ Запусти под root: sudo bash deploy/ssl.sh you@email.com"; exit 1; fi
if [ -z "$EMAIL" ]; then echo "Использование: sudo bash deploy/ssl.sh you@email.com"; exit 1; fi

command -v nginx   >/dev/null 2>&1 || apt-get install -y nginx
command -v certbot >/dev/null 2>&1 || apt-get install -y certbot python3-certbot-nginx

systemctl enable --now nginx
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot

# Шаг 1: временный HTTP-конфиг (для ACME-проверки и проксирования) — без SSL,
# чтобы nginx стартовал ещё до выпуска сертификата.
cat > /etc/nginx/sites-available/rakiaclub.conf <<NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host \$host; }
}
NGINX
ln -sf /etc/nginx/sites-available/rakiaclub.conf /etc/nginx/sites-enabled/rakiaclub.conf
nginx -t && systemctl reload nginx

# Шаг 2: выпуск сертификата через webroot (renewal будет работать без простоя).
certbot certonly --webroot -w /var/www/certbot \
  -d "${DOMAIN}" -d "www.${DOMAIN}" \
  --agree-tos -m "${EMAIL}" --no-eff-email --non-interactive \
  --deploy-hook "systemctl reload nginx"

# Шаг 3: ставим полный конфиг с HTTPS из репозитория.
cp deploy/nginx/rakiaclub.conf /etc/nginx/sites-available/rakiaclub.conf
nginx -t && systemctl reload nginx

echo ""
echo "✅ SSL готов. Сайт: https://${DOMAIN}"
