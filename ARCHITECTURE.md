# РакияКлуб.рф — архитектура экосистемы

Премиальная full-stack экосистема Клуба любителей болгарской ракии.
Эстетика «Modern Bulgaria»: тёмный фон + золото/амбер, Bento Grid, живые
анимации Framer Motion. Хостинг — Beget Ubuntu VPS.

## Технологический стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| Визуализация | Lucide React (иконки), Recharts / SVG (radar charts) |
| Backend | Next.js API Routes (Node runtime), Prisma ORM |
| БД | PostgreSQL (на проде), смена на MySQL — через `provider` |
| Telegram | grammY (бот + Mini App backend), TMA на Next.js |
| AI | Anthropic Claude API (генерация контента) |
| Соцсети | Meta Graph API (Facebook Page) |
| Деплой | Docker Compose / PM2 + Nginx + Let's Encrypt |

> ⚠️ Переход с GitHub Pages (`output: "export"`) на серверный рантайм
> (`output: "standalone"`) — статический экспорт несовместим с API Routes
> и серверной валидацией Telegram `initData`.

## Дерево проекта

```
РакияКлуб/
├── app/
│   ├── layout.js                  # корневой layout, шрифты Playfair+Montserrat
│   ├── globals.css                # Tailwind + дизайн-токены
│   ├── page.jsx                   # [Шаг 3] Главная: интерактивный Bento Grid
│   ├── catalog/
│   │   ├── page.jsx               # каталог продуктов
│   │   └── [slug]/page.jsx        # карточка + Radar Chart (Flavour Matrix)
│   ├── qr/[productId]/page.jsx    # phygital QR-страница: оценка/фидбэк
│   ├── tma/page.jsx               # Telegram Mini App (календарь, выбор места, билет)
│   ├── b2b/
│   │   ├── login/page.jsx         # вход по magic-link
│   │   └── dashboard/page.jsx     # опт-цены, бренд-киты, заявки на аллокацию
│   ├── admin/page.jsx             # модерация AI-очереди контента
│   └── api/
│       ├── tma/
│       │   ├── validate/route.js  # серверная валидация Telegram initData
│       │   ├── events/route.js    # календарь дегустаций
│       │   ├── register/route.js  # запись + выбор места
│       │   └── ticket/route.js    # генерация QR-билета
│       ├── products/route.js
│       ├── ratings/route.js       # приём QR-оценок
│       ├── b2b/
│       │   ├── auth/route.js       # magic-link выдача/проверка
│       │   └── allocations/route.js
│       ├── bot/webhook/route.js   # вебхук Telegram (основной + админ-бот)
│       ├── admin/content/route.js # апрув/правка/публикация контента
│       └── cron/generate-news/route.js
├── components/
│   ├── bento/                     # [Шаг 3] BentoGrid, BentoTile, TiltCard
│   ├── charts/                    # [Шаг 3] FlavourRadar (spider chart)
│   ├── tma/                       # Calendar, SeatMap, DigitalTicket
│   ├── pairing/                   # GastroPairing виджет (AI)
│   ├── b2b/                       # таблицы опт-цен, download-центр
│   └── ui/                        # примитивы (Button, Card, Badge)
├── lib/
│   ├── prisma.js                  # singleton Prisma Client ✅
│   ├── telegram/                  # [Шаг 4] validateInitData, bot, adminBot
│   ├── ai/                        # [Шаг 4] генерация 2 вариантов контента
│   ├── facebook/                  # [Шаг 4] публикация в Meta Graph API
│   └── auth/                      # magic-link, подпись JWT-билетов
├── prisma/
│   ├── schema.prisma              # схема БД ✅ (Шаг 2)
│   └── seed.js                    # демо-данные ✅
├── bot/index.js                   # [Шаг 4] standalone процесс бота (PM2/Docker)
├── worker/news-worker.js          # [Шаг 4] cron-воркер AI-контента
└── deploy/                        # [Шаг 4] Docker Compose, Nginx, PM2 ecosystem
    ├── Dockerfile
    ├── docker-compose.yml
    ├── ecosystem.config.js
    └── nginx/rakiaclub.conf
```

`✅` — реализовано (Шаги 1–2). `[Шаг N]` — в плане соответствующего шага.

## Модель данных (Prisma)

```
User ──┬─ B2bProfile ── AllocationRequest ─┐
       ├─ Registration ── Seat ── EventTable ── Event
       ├─ Rating                                 │
       └─ MagicLink                              ─┘
Producer ── Product ──┬─ TasteProfile (6 осей radar)
                      ├─ Pairing (AI-гастропейринг)
                      ├─ Rating (QR-фидбэк)
                      └─ AllocationRequest
NewsQueue (AI-контент: DRAFT→PENDING→APPROVED→PUBLISHED)
```

Полное описание — в `prisma/schema.prisma`.

## Дорожная карта

- **Шаг 1 ✅** — структура проекта, конфиги, стек.
- **Шаг 2 ✅** — Prisma-схема + сидер.
- **Шаг 3 ✅** — анимированный Bento Grid + интерактивный Radar Chart.
- **Шаг 4 ✅** — Telegram бот/TMA + админ-апрув AI-контента + B2B + QR
  + деплой-блюпринты (Docker/PM2/Nginx/Let's Encrypt).

> Проект переведён в ESM (`"type":"module"`): standalone-процессы `bot/` и
> `worker/` запускаются через `node` напрямую, поэтому общие `lib/`-модули
> используют относительные импорты с расширениями (`@/`-алиас резолвит только
> webpack для маршрутов Next).
