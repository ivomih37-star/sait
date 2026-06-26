# Диалоговый бот клуба — план

Бот, который **общается** в чате клуба: встречает новичков, отвечает на команды
(`/start`, `/rules`, `/schedule`), помогает с записью на встречу. Это отдельный
сценарий от бота-постера: ему нужен **постоянно работающий процесс**, который
слушает обновления Telegram.

> 🔒 Токен — в переменных окружения/секретах хостинга, не в коде. Можно завести
> отдельного бота (напр. `raki_club_helper_bot`), чтобы не смешивать с постером.

---

## Постер vs диалоговый бот

| | Постер (есть) | Диалоговый (этот план) |
|---|---|---|
| Что делает | публикует в канал по расписанию | отвечает людям в чате |
| Как работает | разовый запуск (GitHub Actions/cron) | всегда онлайн (long-polling/webhook) |
| Хостинг | не нужен | нужен (сервер/облако) |
| Сложность | низкая | средняя |

---

## Что бот должен уметь (MVP)

- **Приветствие новичков** — при входе в чат прислать текст из
  [`../WELCOME_MESSAGE.md`](../WELCOME_MESSAGE.md), отметить @нового.
- **/start** — короткое «о клубе» + ссылки (сайт, расписание).
- **/rules** — правила из [`../CHAT_RULES.md`](../CHAT_RULES.md).
- **/schedule** — ближайшие встречи (текст или ссылка на страницу расписания).
- **/join** — как попасть на встречу (куда писать).
- *(опц.)* анти-спам капча на входе — сообщение «напиши что-нибудь за 5 минут».

---

## Технологии

- **Язык:** Python 3.12.
- **Библиотека:** [`python-telegram-bot`](https://python-telegram-bot.org)
  (v21+, async) — самая удобная для хендлеров команд и событий входа.
- **Режим обновлений:**
  - **Long-polling** — проще, не нужен публичный URL/HTTPS. Хорош для старта.
  - **Webhook** — эффективнее, но нужен домен + HTTPS (или сервис вроде Render).

---

## Где хостить (варианты)

| Вариант | Плюсы | Минусы |
|---|---|---|
| **VPS** (Timeweb, Selectel, Hetzner) | полный контроль, дёшево | нужно админить |
| **Render / Railway / Fly.io** | быстрый деплой из GitHub | бесплатные тиры засыпают |
| **Домашний мини-сервер / Raspberry Pi** | бесплатно | зависит от твоего интернета |
| **Облачная функция** | дёшево | сложнее с long-polling, лучше webhook |

> ⚠️ GitHub Actions для диалогового бота **не подходит** — он не держит
> постоянный процесс (джоб ограничен по времени). Actions годятся только для
> постера по расписанию.

---

## Структура (предлагаемая)

```
telegram/bot/
  bot.py            # точка входа: хендлеры команд и событий
  texts.py          # тексты (тянуть из WELCOME_MESSAGE.md / CHAT_RULES.md)
  requirements.txt  # python-telegram-bot==21.*
  Dockerfile        # для деплоя на Render/VPS
  .env.example      # TELEGRAM_BOT_TOKEN= (реальный — в секретах хостинга)
```

Эскиз `bot.py` (long-polling):
```python
from telegram.ext import (ApplicationBuilder, CommandHandler,
                          ChatMemberHandler)

async def start(update, ctx):
    await update.message.reply_text(ABOUT_TEXT, disable_web_page_preview=True)

async def rules(update, ctx):
    await update.message.reply_text(RULES_TEXT)

async def greet(update, ctx):
    # сработает при входе нового участника
    await ctx.bot.send_message(update.chat_member.chat.id, WELCOME_TEXT)

app = ApplicationBuilder().token(os.environ["TELEGRAM_BOT_TOKEN"]).build()
app.add_handler(CommandHandler("start", start))
app.add_handler(CommandHandler("rules", rules))
app.add_handler(ChatMemberHandler(greet, ChatMemberHandler.CHAT_MEMBER))
app.run_polling()
```

---

## Пошаговый план

1. Завести отдельного бота в @BotFather (`raki_club_helper_bot`), сохранить токен.
2. Добавить бота в **чат клуба** (не канал) и сделать админом — чтобы видеть
   входы участников (и, если нужно, удалять спам).
   - В BotFather: `/setprivacy` → **Disable**, чтобы бот видел сообщения чата.
3. Написать `telegram/bot/bot.py` с командами `/start`, `/rules`, `/schedule`,
   приветствием новичков (тексты — из готовых `*.md`).
4. Локально протестировать: `pip install -r requirements.txt`, задать
   `TELEGRAM_BOT_TOKEN`, `python bot.py`, проверить команды.
5. Задеплоить на выбранный хостинг (Docker на VPS / Render), токен — в секретах.
6. Включить автоперезапуск (systemd/`restart: always` в Docker), чтобы бот жил
   24/7.

---

## Объём работ

- MVP (3–4 команды + приветствие, long-polling) — компактный скрипт, готовится
  за один заход. Дальше можно наращивать (капча, запись на встречу, авто-FAQ).

> Скажи, на каком хостинге планируешь крутить (VPS / Render / другое) — и я
> соберу рабочий `telegram/bot/` под него.

---

⚠️ 18+. Токен бота — только в секретах. Наздраве! 🇧🇬🥃
