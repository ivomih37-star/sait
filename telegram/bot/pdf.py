# -*- coding: utf-8 -*-
"""Генерация PDF-листа участников мероприятия (в стиле клуба).

Используется fpdf2 + шрифт DejaVuSans (кириллица). Возвращает путь к файлу.
"""
import os
import tempfile
from datetime import datetime

from fpdf import FPDF

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")

# фирменные цвета (RGB)
GREEN = (0, 150, 110)
GREEN_DARK = (0, 107, 79)
RED = (214, 38, 18)
CREAM = (250, 246, 239)
INK = (42, 38, 34)
MUTED = (107, 100, 92)


class ClubPDF(FPDF):
    def header(self):
        # триколор-полоска сверху
        w = self.w
        self.set_fill_color(255, 255, 255)
        self.rect(0, 0, w, 4, "F")
        self.set_fill_color(*GREEN)
        self.rect(0, 0, w / 3, 4, "F")
        self.set_fill_color(*RED)
        self.rect(2 * w / 3, 0, w / 3, 4, "F")

    def footer(self):
        self.set_y(-14)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 6,
                  "Ракия Клуб · Москва · @raki_club_msk · 18+. "
                  "Употребление алкоголя вредит вашему здоровью.",
                  align="C")


def _font(pdf, style="", size=11):
    pdf.set_font("DejaVu", style, size)


def build_participants_pdf(event, registrations):
    """event: dict(name,date,limit). registrations: list of dicts."""
    pdf = ClubPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_font("DejaVu", "", os.path.join(FONT_DIR, "DejaVuSans.ttf"))
    pdf.add_font("DejaVu", "B", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf"))
    pdf.add_page()

    # Заголовок
    _font(pdf, "B", 20)
    pdf.set_text_color(*GREEN_DARK)
    pdf.cell(0, 11, "Список участников", new_x="LMARGIN", new_y="NEXT")

    _font(pdf, "B", 14)
    pdf.set_text_color(*INK)
    pdf.cell(0, 9, event.get("name") or "Мероприятие", new_x="LMARGIN", new_y="NEXT")

    _font(pdf, "", 11)
    pdf.set_text_color(*MUTED)
    meta = []
    if event.get("date"):
        meta.append(f"Дата: {event['date']}")
    limit = event.get("limit")
    meta.append("Лимит мест: " + (str(limit) if limit else "без лимита"))
    pdf.cell(0, 7, "  ·  ".join(meta), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Таблица
    # колонки: №, Участник, Чел., Примечание (оплата)
    c_n, c_name, c_cnt, c_note = 12, 78, 18, 78
    row_h = 9

    def header_row():
        _font(pdf, "B", 10)
        pdf.set_fill_color(*GREEN)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(c_n, row_h, "№", border=0, align="C", fill=True)
        pdf.cell(c_name, row_h, "Участник", border=0, fill=True)
        pdf.cell(c_cnt, row_h, "Чел.", border=0, align="C", fill=True)
        pdf.cell(c_note, row_h, "Примечание (оплата)", border=0, fill=True,
                 new_x="LMARGIN", new_y="NEXT")

    header_row()
    _font(pdf, "", 10)
    pdf.set_text_color(*INK)
    total = 0
    for i, r in enumerate(registrations, 1):
        if i % 2 == 0:
            pdf.set_fill_color(*CREAM)
            fill = True
        else:
            pdf.set_fill_color(255, 255, 255)
            fill = True
        name = r.get("name") or "—"
        if r.get("username"):
            name += f"  @{r['username']}"
        cnt = int(r.get("count", 1))
        total += cnt
        note = r.get("note") or ""
        # обрезаем длинные строки под ширину
        name = _fit(pdf, name, c_name - 2)
        note = _fit(pdf, note, c_note - 2)
        pdf.cell(c_n, row_h, str(i), align="C", fill=fill)
        pdf.cell(c_name, row_h, name, fill=fill)
        pdf.cell(c_cnt, row_h, str(cnt), align="C", fill=fill)
        pdf.cell(c_note, row_h, note, fill=fill, new_x="LMARGIN", new_y="NEXT")

    if not registrations:
        _font(pdf, "", 10)
        pdf.set_text_color(*MUTED)
        pdf.cell(0, row_h, "Пока никто не записался.",
                 new_x="LMARGIN", new_y="NEXT")

    # Итог
    pdf.ln(2)
    _font(pdf, "B", 12)
    pdf.set_text_color(*GREEN_DARK)
    pdf.cell(0, 9,
             f"Итого: заявок {len(registrations)} · человек {total}",
             new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)
    _font(pdf, "", 9)
    pdf.set_text_color(*MUTED)
    stamp = datetime.now().strftime("%d.%m.%Y %H:%M")
    pdf.cell(0, 6, f"Сформировано: {stamp}", new_x="LMARGIN", new_y="NEXT")

    out = os.path.join(tempfile.gettempdir(), "uchastniki.pdf")
    pdf.output(out)
    return out


def _fit(pdf, text, max_w):
    """Обрезать текст с многоточием под ширину max_w (мм)."""
    if pdf.get_string_width(text) <= max_w:
        return text
    while text and pdf.get_string_width(text + "…") > max_w:
        text = text[:-1]
    return text + "…"
