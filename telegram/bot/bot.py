#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Диалоговый бот «Ракия Клуб»: приветствие, команды, запись на встречи + PDF.

Режим: long-polling. Токен — TELEGRAM_BOT_TOKEN. Админ — TELEGRAM_ADMIN_ID.
Данные заявок — в storage (на Railway Volume через DATA_DIR).
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
    ConversationHandler,
    MessageHandler,
    filters,
)

import texts
import storage
from pdf import build_participants_pdf

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO
)
log = logging.getLogger("raki-bot")

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ADMIN_ID = int(os.environ.get("TELEGRAM_ADMIN_ID", "1528705718"))

# состояния диалогов
ZAP_NAME, ZAP_COUNT = range(2)
EV_NAME, EV_DATE, EV_LIMIT = range(2, 5)

PRIVATE = filters.ChatType.PRIVATE


def is_admin(update: Update) -> bool:
    return update.effective_user and update.effective_user.id == ADMIN_ID


# ---------- базовые команды ----------
async def start(update, _ctx):
    await update.effective_message.reply_text(
        texts.ABOUT, parse_mode=ParseMode.HTML, disable_web_page_preview=True
    )


async def rules(update, _ctx):
    await update.effective_message.reply_text(texts.RULES, parse_mode=ParseMode.HTML)


async def schedule(update, _ctx):
    ev = storage.get_event()
    if ev.get("open") and ev.get("name"):
        extra = f"\n\n🎟 Открыта запись на «{ev['name']}» ({ev['date']}). Жми /zapis"
    else:
        extra = ""
    await update.effective_message.reply_text(
        texts.SCHEDULE + extra, parse_mode=ParseMode.HTML,
        disable_web_page_preview=True,
    )


async def join(update, _ctx):
    await update.effective_message.reply_text(texts.JOIN, parse_mode=ParseMode.HTML)


async def greet_new_members(update, _ctx):
    for member in update.message.new_chat_members:
        if member.is_bot:
            continue
        await update.effective_message.reply_text(
            texts.WELCOME.format(name=member.mention_html()),
            parse_mode=ParseMode.HTML,
        )


async def unknown(update, _ctx):
    await update.effective_message.reply_text(texts.UNKNOWN)


# ---------- запись на встречу (гость, в личке) ----------
async def zapis_start(update, ctx):
    ev = storage.get_event()
    if not (ev.get("open") and ev.get("name")):
        await update.message.reply_text(texts.NO_EVENT)
        return ConversationHandler.END
    await update.message.reply_text(
        texts.ZAP_ASK_NAME.format(event=ev["name"], date=ev["date"])
    )
    return ZAP_NAME


async def zapis_name(update, ctx):
    ctx.user_data["zap_name"] = update.message.text.strip()[:60]
    await update.message.reply_text(texts.ZAP_ASK_COUNT)
    return ZAP_COUNT


async def zapis_count(update, ctx):
    txt = update.message.text.strip()
    if not txt.isdigit() or not (1 <= int(txt) <= 20):
        await update.message.reply_text(texts.ZAP_BAD_COUNT)
        return ZAP_COUNT
    count = int(txt)
    u = update.effective_user
    rec, _status = storage.add_registration(
        user_id=u.id, name=ctx.user_data.get("zap_name") or u.full_name,
        username=u.username or "", count=count,
    )
    ev = storage.get_event()
    left = storage.spots_left()
    spots = "" if left is None else f"Свободных мест: {left}.\n"
    await update.message.reply_text(
        texts.ZAP_DONE.format(name=rec["name"], count=count,
                              event=ev["name"], date=ev["date"], spots=spots)
    )
    # уведомление организатору
    try:
        await ctx.bot.send_message(
            ADMIN_ID,
            f"🆕 Заявка: {rec['name']}"
            + (f" (@{rec['username']})" if rec["username"] else "")
            + f" — {count} чел. На «{ev['name']}».",
        )
    except Exception as e:  # noqa: BLE001
        log.warning("Не смог уведомить админа: %s", e)
    return ConversationHandler.END


async def cancel(update, _ctx):
    await update.message.reply_text(texts.ZAP_CANCEL)
    return ConversationHandler.END


async def cancel_zapis(update, _ctx):
    ok = storage.remove_registration(update.effective_user.id)
    await update.message.reply_text(texts.ZAP_REMOVED if ok else texts.ZAP_NONE)


# ---------- админ ----------
async def admin_help(update, _ctx):
    if not is_admin(update):
        return
    await update.message.reply_text(texts.ADMIN_HELP, parse_mode=ParseMode.HTML)


async def spisok(update, _ctx):
    if not is_admin(update):
        await update.message.reply_text(texts.ADMIN_ONLY)
        return
    ev = storage.get_event()
    regs = storage.list_registrations()
    if not regs:
        await update.message.reply_text(f"«{ev.get('name') or '—'}»: заявок пока нет.")
        return
    lines = [f"🎉 <b>{ev['name']}</b> — {ev['date']}", ""]
    total = 0
    for i, r in enumerate(regs, 1):
        total += int(r["count"])
        uname = f" @{r['username']}" if r["username"] else ""
        note = f" — {r['note']}" if r.get("note") else ""
        lines.append(f"{i}. {r['name']}{uname} — {r['count']} чел.{note}")
    left = storage.spots_left()
    lines.append("")
    lines.append(f"Итого: заявок {len(regs)} · человек {total}"
                 + ("" if left is None else f" · свободно {left}"))
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.HTML)


async def pdf_cmd(update, ctx):
    if not is_admin(update):
        await update.message.reply_text(texts.ADMIN_ONLY)
        return
    ev = storage.get_event()
    path = build_participants_pdf(ev, storage.list_registrations())
    with open(path, "rb") as f:
        await ctx.bot.send_document(update.effective_chat.id, document=f,
                                    filename="uchastniki.pdf",
                                    caption=f"Список участников · {ev.get('name') or ''}")


async def open_reg(update, _ctx):
    if not is_admin(update):
        return
    storage.set_open(True)
    await update.message.reply_text("Запись открыта ✅")


async def close_reg(update, _ctx):
    if not is_admin(update):
        return
    storage.set_open(False)
    await update.message.reply_text("Запись закрыта 🔒")


async def oplata(update, ctx):
    if not is_admin(update):
        return
    if len(ctx.args) < 2:
        await update.message.reply_text("Формат: /oplata @user текст примечания")
        return
    ident = ctx.args[0].lstrip("@")
    note = " ".join(ctx.args[1:])
    for r in storage.list_registrations():
        if r.get("username", "").lower() == ident.lower() or str(r["user_id"]) == ident:
            storage.add_registration(r["user_id"], r["name"], r["username"],
                                     r["count"], note=note)
            await update.message.reply_text(f"Отметил оплату для {r['name']}: {note}")
            return
    await update.message.reply_text("Участник не найден.")


async def snyat(update, ctx):
    if not is_admin(update):
        return
    if not ctx.args:
        await update.message.reply_text("Формат: /snyat @user (или user_id)")
        return
    ident = ctx.args[0].lstrip("@")
    for r in storage.list_registrations():
        if r.get("username", "").lower() == ident.lower() or str(r["user_id"]) == ident:
            storage.remove_registration(r["user_id"])
            await update.message.reply_text(f"Снял с записи: {r['name']}")
            return
    await update.message.reply_text("Участник не найден.")


# ---------- создание мероприятия (админ, диалог) ----------
async def ev_start(update, _ctx):
    if not is_admin(update):
        await update.message.reply_text(texts.ADMIN_ONLY)
        return ConversationHandler.END
    await update.message.reply_text(texts.EV_ASK_NAME)
    return EV_NAME


async def ev_name(update, ctx):
    ctx.user_data["ev_name"] = update.message.text.strip()[:80]
    await update.message.reply_text(texts.EV_ASK_DATE)
    return EV_DATE


async def ev_date(update, ctx):
    ctx.user_data["ev_date"] = update.message.text.strip()[:60]
    await update.message.reply_text(texts.EV_ASK_LIMIT)
    return EV_LIMIT


async def ev_limit(update, ctx):
    txt = update.message.text.strip().lower()
    limit = int(txt) if txt.isdigit() else None
    ev = storage.new_event(ctx.user_data["ev_name"], ctx.user_data["ev_date"], limit)
    await update.message.reply_text(
        texts.EV_DONE.format(name=ev["name"], date=ev["date"],
                             limit=limit if limit else "без лимита")
    )
    return ConversationHandler.END


async def on_error(update, ctx):
    log.error("Ошибка обработки апдейта", exc_info=ctx.error)


async def set_commands(app: Application):
    await app.bot.set_my_commands([
        BotCommand("start", "О клубе и боте"),
        BotCommand("schedule", "Ближайшие встречи"),
        BotCommand("zapis", "Записаться на встречу"),
        BotCommand("rules", "Правила чата"),
        BotCommand("join", "Как попасть в клуб"),
    ])


def main():
    if not TOKEN:
        raise SystemExit("Не задан TELEGRAM_BOT_TOKEN")

    app = ApplicationBuilder().token(TOKEN).post_init(set_commands).build()

    # диалог записи (в личке)
    zap_conv = ConversationHandler(
        entry_points=[CommandHandler("zapis", zapis_start, filters=PRIVATE)],
        states={
            ZAP_NAME: [MessageHandler(PRIVATE & filters.TEXT & ~filters.COMMAND, zapis_name)],
            ZAP_COUNT: [MessageHandler(PRIVATE & filters.TEXT & ~filters.COMMAND, zapis_count)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
    # диалог создания мероприятия (админ, в личке)
    ev_conv = ConversationHandler(
        entry_points=[CommandHandler("newevent", ev_start, filters=PRIVATE)],
        states={
            EV_NAME: [MessageHandler(PRIVATE & filters.TEXT & ~filters.COMMAND, ev_name)],
            EV_DATE: [MessageHandler(PRIVATE & filters.TEXT & ~filters.COMMAND, ev_date)],
            EV_LIMIT: [MessageHandler(PRIVATE & filters.TEXT & ~filters.COMMAND, ev_limit)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )
    app.add_handler(zap_conv)
    app.add_handler(ev_conv)

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("rules", rules))
    app.add_handler(CommandHandler("schedule", schedule))
    app.add_handler(CommandHandler("join", join))
    app.add_handler(CommandHandler("cancel_zapis", cancel_zapis, filters=PRIVATE))

    # админ
    app.add_handler(CommandHandler("admin", admin_help, filters=PRIVATE))
    app.add_handler(CommandHandler("spisok", spisok, filters=PRIVATE))
    app.add_handler(CommandHandler("pdf", pdf_cmd, filters=PRIVATE))
    app.add_handler(CommandHandler("open", open_reg, filters=PRIVATE))
    app.add_handler(CommandHandler("close", close_reg, filters=PRIVATE))
    app.add_handler(CommandHandler("oplata", oplata, filters=PRIVATE))
    app.add_handler(CommandHandler("snyat", snyat, filters=PRIVATE))

    app.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, greet_new_members))
    app.add_handler(MessageHandler(filters.COMMAND & PRIVATE, unknown))
    app.add_error_handler(on_error)

    log.info("Бот запущен (long-polling).")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
