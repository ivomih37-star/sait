#!/usr/bin/env python3
"""Публикация постов «Ракия Клуб» в Telegram-канал.

Берёт из queue.json посты, у которых sent == false и date <= сегодня (UTC),
и отправляет их через Bot API. Поддерживает обычный текст, фото (по URL из
репозитория) и нативные опросы. После успешной отправки помечает sent: true
и переписывает queue.json (workflow коммитит файл обратно).

Зависимостей нет — только стандартная библиотека.

Переменные окружения:
  TELEGRAM_BOT_TOKEN  — токен бота от BotFather (секрет)
  TELEGRAM_CHAT_ID    — @username канала или числовой -100… id
  RAW_BASE            — база для картинок (по умолчанию raw.githubusercontent…)
  DRY_RUN             — если "1" или токен не задан: ничего не шлём, только лог
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, "queue.json")

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
RAW_BASE = os.environ.get(
    "RAW_BASE", "https://raw.githubusercontent.com/ivomih37-star/sait/main/"
)
DRY_RUN = os.environ.get("DRY_RUN") == "1" or not TOKEN
API = f"https://api.telegram.org/bot{TOKEN}/"
CAPTION_LIMIT = 1024


def api_call(method, params):
    """POST в Bot API. В DRY_RUN только печатает и возвращает фейковый id."""
    if DRY_RUN:
        preview = {k: (v[:60] + "…" if isinstance(v, str) and len(v) > 60 else v)
                   for k, v in params.items()}
        print(f"  [DRY] {method}: {preview}")
        return {"ok": True, "result": {"message_id": 0}}
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(API + method, data=data)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_post(p):
    """Отправляет один пост. Возвращает message_id или None."""
    text = p.get("text", "")
    no_preview = p.get("disable_preview", True)

    # 1) Опрос
    if p.get("poll"):
        r = api_call("sendPoll", {
            "chat_id": CHAT_ID,
            "question": p["poll"]["question"],
            "options": json.dumps(p["poll"]["options"], ensure_ascii=False),
            "is_anonymous": "true",
        })
        return (r.get("result") or {}).get("message_id")

    # 2) Фото (по URL из репозитория)
    if p.get("image"):
        photo_url = RAW_BASE + p["image"].lstrip("/")
        caption = text if len(text) <= CAPTION_LIMIT else ""
        r = api_call("sendPhoto", {
            "chat_id": CHAT_ID, "photo": photo_url, "caption": caption,
        })
        mid = (r.get("result") or {}).get("message_id")
        if not caption and text:  # текст длиннее лимита подписи — добьём сообщением
            api_call("sendMessage", {
                "chat_id": CHAT_ID, "text": text,
                "disable_web_page_preview": "true" if no_preview else "false",
            })
        return mid

    # 3) Обычный текст
    r = api_call("sendMessage", {
        "chat_id": CHAT_ID, "text": text,
        "disable_web_page_preview": "true" if no_preview else "false",
    })
    return (r.get("result") or {}).get("message_id")


def main():
    if not DRY_RUN and not CHAT_ID:
        sys.exit("TELEGRAM_CHAT_ID не задан")

    with open(QUEUE, encoding="utf-8") as f:
        queue = json.load(f)

    today = date.today().isoformat()
    due = [p for p in queue if not p.get("sent") and p.get("date", "9999") <= today]
    due.sort(key=lambda p: p.get("date", ""))

    if DRY_RUN:
        print(f"DRY_RUN: токен не задан или DRY_RUN=1. Сегодня {today}.")
    print(f"К отправке: {len(due)} пост(ов).")

    changed = False
    for p in due:
        print(f"→ {p.get('id')} ({p.get('date')})")
        try:
            mid = send_post(p)
            if p.get("pin") and mid:
                api_call("pinChatMessage", {"chat_id": CHAT_ID, "message_id": mid})
            p["sent"] = True
            p["sent_at"] = datetime.now(timezone.utc).isoformat()
            changed = True
            print(f"  ✓ отправлено (message_id={mid})")
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ ошибка: {e}")
            break  # не теряем порядок: остановимся, разберёмся, допостим позже

    if changed and not DRY_RUN:
        with open(QUEUE, "w", encoding="utf-8") as f:
            json.dump(queue, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("queue.json обновлён.")
    elif DRY_RUN:
        print("DRY_RUN: queue.json не меняется.")


if __name__ == "__main__":
    main()
