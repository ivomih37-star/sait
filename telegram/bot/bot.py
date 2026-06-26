#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Диалоговый бот «Ракия Клуб» — встречает новичков и отвечает на команды.

Режим: long-polling (публичный домен/HTTPS не нужен — удобно для VPS Beget).
Токен берётся из переменной окружения TELEGRAM_BOT_TOKEN.

Запуск:  TELEGRAM_BOT_TOKEN=xxx python bot.py
"""
import logging
import os

from telegram import Update, BotCommand
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

import texts

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("raki-bot")

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")


async def start(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        texts.ABOUT, parse_mode=ParseMode.HTML, disable_web_page_preview=True
    )


async def rules(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(texts.RULES, parse_mode=ParseMode.HTML)


async def schedule(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        texts.SCHEDULE, parse_mode=ParseMode.HTML, disable_web_page_preview=True
    )


async def join(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(texts.JOIN, parse_mode=ParseMode.HTML)


async def greet_new_members(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Приветствие при входе новых участников в чат."""
    for member in update.message.new_chat_members:
        if member.is_bot:
            continue
        name = member.mention_html()
        await update.effective_message.reply_text(
            texts.WELCOME.format(name=name), parse_mode=ParseMode.HTML
        )


async def unknown(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(texts.UNKNOWN)


async def on_error(update: object, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    log.error("Ошибка при обработке обновления", exc_info=ctx.error)


async def set_commands(app: Application) -> None:
    """Меню команд (кнопка «/» в Telegram)."""
    await app.bot.set_my_commands([
        BotCommand("start", "О клубе и боте"),
        BotCommand("rules", "Правила чата"),
        BotCommand("schedule", "Ближайшие встречи"),
        BotCommand("join", "Как попасть на встречу"),
    ])


def main() -> None:
    if not TOKEN:
        raise SystemExit("Не задан TELEGRAM_BOT_TOKEN")

    app = ApplicationBuilder().token(TOKEN).post_init(set_commands).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("rules", rules))
    app.add_handler(CommandHandler("schedule", schedule))
    app.add_handler(CommandHandler("join", join))
    app.add_handler(
        MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, greet_new_members)
    )
    # неизвестные команды — только в личке, чтобы не шуметь в чате
    app.add_handler(
        MessageHandler(filters.COMMAND & filters.ChatType.PRIVATE, unknown)
    )
    app.add_error_handler(on_error)

    log.info("Бот запущен (long-polling).")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
