# -*- coding: utf-8 -*-
"""Хранение мероприятия и заявок в JSON-файле.

Путь к данным — переменная окружения DATA_DIR (на Railway смонтировать Volume,
напр. /data). Если не задана — папка ./data рядом с ботом (для локального теста).
Так заявки переживают передеплой.
"""
import json
import os
import threading
from datetime import datetime, timezone

DATA_DIR = os.environ.get("DATA_DIR") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data"
)
DATA_FILE = os.path.join(DATA_DIR, "registrations.json")

_lock = threading.Lock()

# Структура по умолчанию: одно «текущее» мероприятие + список заявок
_DEFAULT = {
    "event": {"name": "", "date": "", "limit": None, "open": False},
    "registrations": [],  # {user_id, name, username, count, note, ts}
}


def _ensure():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        _write(_DEFAULT)


def _read():
    _ensure()
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def _write(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DATA_FILE)


def get_event():
    return _read()["event"]


def new_event(name, date, limit=None):
    """Создать мероприятие, обнулив прошлые заявки."""
    with _lock:
        _write({
            "event": {"name": name, "date": date, "limit": limit, "open": True},
            "registrations": [],
        })
    return get_event()


def set_open(is_open):
    with _lock:
        data = _read()
        data["event"]["open"] = bool(is_open)
        _write(data)
    return get_event()


def total_people(data=None):
    data = data or _read()
    return sum(int(r.get("count", 1)) for r in data["registrations"])


def spots_left():
    data = _read()
    limit = data["event"].get("limit")
    if limit is None:
        return None  # без лимита
    return max(0, int(limit) - total_people(data))


def add_registration(user_id, name, username, count, note=""):
    """Добавить/обновить заявку пользователя. Возвращает (запись, статус).
    статус: 'added' | 'updated'."""
    with _lock:
        data = _read()
        status = "added"
        rec = None
        for r in data["registrations"]:
            if r["user_id"] == user_id:
                rec = r
                status = "updated"
                break
        if rec is None:
            rec = {"user_id": user_id}
            data["registrations"].append(rec)
        rec.update({
            "name": name,
            "username": username or "",
            "count": int(count),
            "note": note or rec.get("note", ""),
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        })
        _write(data)
        return rec, status


def remove_registration(user_id):
    with _lock:
        data = _read()
        before = len(data["registrations"])
        data["registrations"] = [
            r for r in data["registrations"] if r["user_id"] != user_id
        ]
        _write(data)
        return len(data["registrations"]) < before


def list_registrations():
    return _read()["registrations"]
