# Диалоговый бот «Ракия Клуб» — запуск на Beget

Бот встречает новичков в чате и отвечает на команды `/start`, `/rules`,
`/schedule`, `/join`. Работает в режиме **long-polling** — публичный домен и
HTTPS не нужны. План и контекст — в [`../DIALOG_BOT.md`](../DIALOG_BOT.md).

> ⚠️ Нужен **VPS / облачный сервер Beget**, а не виртуальный (shared) хостинг:
> боту требуется постоянно работающий процесс. На shared-тарифе long-polling
> держать нельзя.

## Состав
- `bot.py` — логика (команды + приветствие новичков)
- `texts.py` — тексты (правьте плейсхолдеры: `@raki_club_msk`, ссылки)
- `requirements.txt` — зависимость `python-telegram-bot`
- `Dockerfile`, `raki-bot.service` — два способа деплоя
- `.env.example` — шаблон для токена (реальный `.env` не коммитить)

## Перед деплоем
1. Создать бота в @BotFather, получить токен (см. `../BOT_SETUP.md`).
2. Добавить бота в **чат клуба** (не канал) и сделать **админом**.
3. В @BotFather: `/setprivacy` → **Disable** — чтобы бот видел вход новых
   участников и сообщения чата.

## Локальная проверка
```bash
cd telegram/bot
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export TELEGRAM_BOT_TOKEN="123456:AA..."
python bot.py
```
Напишите боту `/start` в личке и зайдите тестовым аккаунтом в чат — должно
прийти приветствие.

---

## Деплой на Beget · вариант A — systemd + venv (без Docker)

1. Закажите **облачный сервер** в панели Beget, зайдите по SSH.
2. Установите Python и скопируйте код:
   ```bash
   sudo apt update && sudo apt install -y python3-venv git
   sudo mkdir -p /opt/raki-bot && sudo chown $USER /opt/raki-bot
   # скопируйте сюда файлы из telegram/bot (git clone или scp)
   cd /opt/raki-bot
   python3 -m venv venv
   ./venv/bin/pip install -r requirements.txt
   ```
3. Создайте `/opt/raki-bot/.env`:
   ```
   TELEGRAM_BOT_TOKEN=ваш_токен
   ```
4. Установите сервис автозапуска:
   ```bash
   sudo cp raki-bot.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now raki-bot
   sudo systemctl status raki-bot      # проверить
   journalctl -u raki-bot -f           # логи
   ```
   Сервис перезапустится сам при сбое и после перезагрузки сервера.

## Деплой на Beget · вариант B — Docker

Если на сервере установлен Docker:
```bash
cd /opt/raki-bot
cp .env.example .env && nano .env       # вписать токен
docker build -t raki-bot .
docker run -d --name raki-bot --restart always --env-file .env raki-bot
docker logs -f raki-bot
```

## Обновление кода
- systemd: обновить файлы → `sudo systemctl restart raki-bot`.
- Docker: `docker build -t raki-bot . && docker rm -f raki-bot && docker run -d --name raki-bot --restart always --env-file .env raki-bot`.

---

## Безопасность
- Токен — только в `.env` / переменных окружения. В git не попадает (`.gitignore`).
- Если токен утёк — отзовите его в @BotFather (`/revoke`) и впишите новый.

⚠️ 18+. Употребление алкоголя вредит вашему здоровью. Наздраве! 🇧🇬🥃
