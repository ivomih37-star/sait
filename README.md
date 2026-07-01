# РакияКлуб.рф · Клуб любителей болгарской ракии

Премиальная цифровая экосистема сообщества ценителей болгарской ракии в Москве:
каталог редких серий с интерактивными вкусовыми матрицами, дегустации с записью,
Telegram Mini App, B2B-портал для HoReCa, phygital QR-оценки и AI-автоматизация
контента с модерацией.

Эстетика — «Modern Bulgaria»: тёмный фон + золото/амбер, Bento Grid, живые
анимации. Хостинг — Beget Ubuntu VPS.

> 18+. Употребление алкоголя вредит вашему здоровью.

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Framer Motion, Lucide, Recharts |
| Backend | Next.js API Routes (Node), Prisma ORM |
| БД | PostgreSQL |
| Telegram | grammY (бот + Mini App backend) |
| AI | Anthropic Claude (`@anthropic-ai/sdk`, модель `claude-opus-4-8`) |
| Соцсети | Meta Graph API (Facebook Page) |
| Деплой | Docker Compose / PM2 + Nginx + Let's Encrypt |

Подробнее об архитектуре и дереве проекта — в [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Локальный запуск с нуля

**Требуется:** Node.js 22+, PostgreSQL 14+.

```bash
# 1. Зависимости
npm install

# 2. Переменные окружения
cp .env.example .env
#   как минимум заполнить DATABASE_URL; для живых интеграций — токены
#   (TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY, FACEBOOK_*, JWT_SECRET, CRON_SECRET)

# 3. БД: схема + демо-данные
npx prisma migrate dev      # создаёт/применяет миграции
npm run db:seed             # производитель, 4 продукта, 3 дегустации

# 4. Дев-сервер
npm run dev                 # http://localhost:3000
```

Маршруты: `/` (главная), `/catalog` (каталог), `/raspisanie` (дегустации),
`/tma` (Telegram Mini App), `/b2b/login` (HoReCa), `/admin` (модерация контента),
`/admin/scan` (контроль билетов), `/qr/[id]` (phygital-оценка).

## Скрипты

| Команда | Назначение |
|---------|-----------|
| `npm run dev` | Дев-сервер Next |
| `npm run build` | Прод-сборка (`prisma generate` + `next build`, standalone) |
| `npm start` | Запуск прод-сборки |
| `npm test` | Юнит-тесты (vitest) |
| `npm run bot` | Telegram-бот (long polling) |
| `npm run worker` | AI-воркер: RSS → генерация → очередь на апрув |
| `npm run db:seed` | Сидинг демо-данными |
| `npm run prisma:studio` | Prisma Studio (просмотр БД) |

## Telegram и AI

- **Бот**: `npm run bot` (long polling) или вебхук на `/api/bot/webhook`.
  Mini App — кнопка меню в @BotFather на `TMA_URL` (`…/tma`).
- **AI-контент**: воркер берёт свежую новость из RSS (`RSS_FEEDS`, по умолчанию
  Google News по «ракия България»), Claude генерит 2 варианта (аналитический для
  Web/Facebook и живой для Telegram) → запись в `NewsQueue` со статусом `PENDING`
  → бот шлёт админу кнопки **[Одобрить] [Править] [Отклонить]** → по одобрению
  публикация на сайт + в Telegram-канал + в Facebook.

## Тесты

```bash
npm test        # vitest: подпись initData, билеты, magic-link, RSS-парсер
```

CI (GitHub Actions, `.github/workflows/ci.yml`): на каждый push/PR —
`npm ci` → `prisma generate` → тесты → сборка.

## Деплой

Прод на Beget Ubuntu VPS (Docker Compose или PM2 + Nginx + Let's Encrypt) —
пошаговый рунбук в [`deploy/DEPLOY.md`](deploy/DEPLOY.md).

---

Все материалы проекта (контент, правила, смета, бланки) — в [`CONTENT.md`](CONTENT.md).
