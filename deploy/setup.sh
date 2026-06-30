#!/usr/bin/env bash
# ===========================================================================
#  РакияКлуб · установщик (Docker Compose) для Beget Ubuntu VPS.
#  Ставит Docker (если нет), собирает и запускает app + Postgres + бот,
#  применяет миграции. Сидинг — флагом --seed.
#  Запуск из корня проекта:  bash deploy/setup.sh [--seed]
# ===========================================================================
set -euo pipefail
cd "$(dirname "$0")/.."   # корень проекта

echo "== РакияКлуб · установка =="

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Запусти под root:  sudo bash deploy/setup.sh"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Создан .env из .env.example."
  echo "   Заполни токены/секреты (nano .env) и запусти скрипт снова."
  exit 1
fi

# --- Docker ---
if ! command -v docker >/dev/null 2>&1; then
  echo "→ Устанавливаю Docker…"
  apt-get update -y
  apt-get install -y ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

COMPOSE="docker compose -f deploy/docker-compose.yml"

echo "→ Сборка и запуск контейнеров…"
$COMPOSE up -d --build

echo "→ Жду готовность БД…"
for _ in $(seq 1 30); do
  if $COMPOSE exec -T db pg_isready -U "${POSTGRES_USER:-raki}" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "→ Применяю миграции…"
$COMPOSE exec -T app npx prisma migrate deploy

if [ "${1:-}" = "--seed" ]; then
  echo "→ Сидинг демо-данными…"
  $COMPOSE exec -T app node prisma/seed.js
fi

echo ""
echo "✅ Готово. Проверка приложения:"
curl -s -o /dev/null -w "   app(127.0.0.1:3000) -> %{http_code}\n" http://127.0.0.1:3000/api/tma/events || true
echo ""
echo "Дальше — Nginx + SSL:   sudo bash deploy/ssl.sh ТВОЙ@email"
