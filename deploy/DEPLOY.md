# Деплой РакияКлуб.рф на Beget Ubuntu VPS

Два пути на выбор: **Docker Compose** (проще) или **PM2 + системный PostgreSQL/Nginx**.

## 0. Предпосылки

- Ubuntu VPS на Beget, домен `РакияКлуб.рф` (punycode `xn--80aaldqfdq.xn--p1ai`) направлен A-записью на IP VPS.
- Установлены: `git`, `docker` + `docker compose` (или `node 22` + `pm2` + `postgresql` + `nginx`).
- Заполнен `.env` в корне проекта (скопировать из `.env.example`).

```bash
git clone <repo> /opt/rakiaclub && cd /opt/rakiaclub
cp .env.example .env && nano .env   # вписать токены, секреты, DATABASE_URL
```

---

## Вариант A — Docker Compose (рекомендуется)

```bash
docker compose -f deploy/docker-compose.yml up -d --build
# Первая инициализация схемы (если нет миграций — создать):
docker compose -f deploy/docker-compose.yml exec app npx prisma migrate deploy
docker compose -f deploy/docker-compose.yml exec app node prisma/seed.js   # демо-данные (опц.)
```

Поднимутся три сервиса: `db` (Postgres), `app` (Next на `127.0.0.1:3000`), `bot` (Telegram).

---

## Вариант B — PM2 (нативно)

```bash
# Postgres
sudo -u postgres createuser raki -P
sudo -u postgres createdb rakiaclub -O raki

npm ci
npx prisma migrate deploy
npm run build                       # standalone-вывод в .next/standalone
node prisma/seed.js                 # демо-данные (опц.)

pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup             # автозапуск после ребута
```

`raki-web` (порт 3000), `raki-bot` (long polling) и `raki-worker` (cron 10:00) — под управлением PM2.

---

## 1. Nginx + Let's Encrypt SSL

```bash
sudo cp deploy/nginx/rakiaclub.conf /etc/nginx/sites-available/rakiaclub.conf
sudo ln -s /etc/nginx/sites-available/rakiaclub.conf /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/certbot

# Выпуск сертификата (webroot)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d xn--80aaldqfdq.xn--p1ai -d www.xn--80aaldqfdq.xn--p1ai

sudo nginx -t && sudo systemctl reload nginx
# Автопродление certbot уже в systemd-таймере.
```

---

## 2. Telegram: вебхук или polling

- **Polling** (по умолчанию в `bot/index.js`) — ничего настраивать не нужно.
- **Вебхук** (через Next-роут `/api/bot/webhook`):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://xn--80aaldqfdq.xn--p1ai/api/bot/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Настроить Mini App и кнопку меню в @BotFather → `TMA_URL = https://xn--80aaldqfdq.xn--p1ai/tma`.

---

## 3. AI-генерация по расписанию

В PM2 воркер уже запускается по cron. Для Docker — системный cron на хосте:

```cron
0 10 * * * curl -fsS -X POST https://xn--80aaldqfdq.xn--p1ai/api/cron/generate-news \
  -H "x-cron-secret: $CRON_SECRET"
```

Сгенерированный пост уходит админу в Telegram с кнопками **[Одобрить] [Править] [Отклонить]**;
после одобрения публикуется на сайт + в Telegram-канал + в Facebook.

---

## 4. Обновление

```bash
git pull
# Docker:
docker compose -f deploy/docker-compose.yml up -d --build
# PM2:
npm ci && npx prisma migrate deploy && npm run build && pm2 reload deploy/ecosystem.config.cjs
```
