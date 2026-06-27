#!/usr/bin/env python3
"""Генератор брендовых карточек-картинок для постов (1080x1080 PNG).
Пишет HTML по каждому виду ракии, затем рендерится в PNG через Chromium
(см. соседний build.sh)."""
import html
import pathlib

OUT = pathlib.Path(__file__).parent

KINDS = [
    {"slug": "grozdova", "icon": "🍇", "name": "Гроздова", "abv": "40°",
     "raw": "Виноград", "taste": "Сухая, с лёгкой терпкостью",
     "serve": "Охлаждённой, с шопским салатом", "accent": "#7a3b8f"},
    {"slug": "slivova", "icon": "🍑", "name": "Сливова", "abv": "40–45°",
     "raw": "Слива", "taste": "Мягкая, чуть сладковатая",
     "serve": "Прохладной, к мясным закускам", "accent": "#9b3b5a"},
    {"slug": "kaysieva", "icon": "🍊", "name": "Кайсиева", "abv": "40°",
     "raw": "Абрикос", "taste": "Ароматная, нежный вкус",
     "serve": "Хорошо охлаждённой, как аперитив", "accent": "#d2731f"},
    {"slug": "dyuleva", "icon": "🍐", "name": "Дюлева", "abv": "40°",
     "raw": "Айва", "taste": "Деликатная, медово-цветочная",
     "serve": "Слегка охлаждённой, маленькими глотками", "accent": "#b08d1f"},
    {"slug": "vishneva", "icon": "🍒", "name": "Вишнева", "abv": "40°",
     "raw": "Вишня", "taste": "Яркая, ягодная, с горчинкой",
     "serve": "Охлаждённой, к десертам и сырам", "accent": "#a01f2e"},
    {"slug": "muskatova", "icon": "🍯", "name": "Мускатова", "abv": "40°",
     "raw": "Мускатный виноград", "taste": "Цветочно-медовый аромат",
     "serve": "Охлаждённой, как дижестив", "accent": "#c79a1e"},
]

ANNOUNCE = {
    "slug": "anons", "icon": "🎉", "title": "Первая дегустация",
    "date": "Пятница · 24 июля · 19:00",
    "line1": "5 образцов болгарской ракии",
    "line2": "Мезе · карты дегустации · знакомство",
    "place": "Москва · по записи в чате", "accent": "#00966e",
}

BASE_CSS = """
* { margin:0; padding:0; box-sizing:border-box;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
html,body { width:1080px; height:1080px; font-family:'DejaVu Sans',Arial,sans-serif; }
.card { width:1080px; height:1080px; position:relative;
  background:linear-gradient(160deg,#faf6ef 0%,#f1ead9 100%);
  display:flex; flex-direction:column; overflow:hidden; }
.top { height:18px; background:linear-gradient(90deg,#fff 0 33%,#00966e 33% 66%,#d62612 66% 100%); }
.body { flex:1; display:flex; flex-direction:column; align-items:center;
  justify-content:center; text-align:center; padding:0 90px; }
.badge { width:300px; height:300px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:170px; line-height:1; margin-bottom:40px;
  box-shadow:0 20px 50px rgba(0,0,0,.12); }
.name { font-size:104px; font-weight:800; color:#2a2622; letter-spacing:-1px; }
.abv { display:inline-block; margin-top:18px; font-size:38px; font-weight:700;
  color:#fff; border-radius:999px; padding:8px 34px; }
.meta { margin-top:54px; width:100%; max-width:760px; }
.row { display:flex; align-items:baseline; gap:20px; padding:18px 0;
  border-bottom:2px dotted #d9d2c7; text-align:left; }
.row:last-child { border-bottom:none; }
.k { font-size:30px; font-weight:700; text-transform:uppercase; letter-spacing:1px;
  color:#006b4f; width:230px; flex:none; }
.v { font-size:36px; color:#4a443c; }
.foot { height:120px; background:#006b4f; color:#fff;
  display:flex; align-items:center; justify-content:center; gap:18px;
  font-size:34px; font-weight:600; }
.flag { width:46px; height:46px; border-radius:50%; overflow:hidden;
  border:2px solid rgba(255,255,255,.5); flex:none; }
.flag span { display:block; height:15.3px; }
.flag .w{background:#fff} .flag .g{background:#00966e} .flag .r{background:#d62612}
.foot .age { font-weight:800; }
/* announce */
.a-body { justify-content:center; }
.a-title { font-size:96px; font-weight:800; color:#2a2622; }
.a-date { margin-top:24px; font-size:46px; font-weight:700; color:#d62612; }
.a-line { margin-top:30px; font-size:42px; color:#4a443c; }
.a-place { margin-top:40px; font-size:36px; color:#6b645c; }
.a-badge { font-size:150px; margin-bottom:30px; }
"""

FOOT = ('<div class="foot">'
        '<span class="flag"><span class="w"></span><span class="g"></span>'
        '<span class="r"></span></span>'
        'Ракия Клуб · Москва · @raki_club_msk · <span class="age">18+</span></div>')


def kind_html(k):
    e = lambda s: html.escape(s)
    return f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>{BASE_CSS}</style></head><body>
<div class="card"><div class="top"></div>
<div class="body">
  <div class="badge" style="background:{k['accent']}22">{k['icon']}</div>
  <div class="name">{e(k['name'])}</div>
  <div class="abv" style="background:{k['accent']}">{e(k['abv'])}</div>
  <div class="meta">
    <div class="row"><div class="k">Сырьё</div><div class="v">{e(k['raw'])}</div></div>
    <div class="row"><div class="k">Вкус</div><div class="v">{e(k['taste'])}</div></div>
    <div class="row"><div class="k">Как пить</div><div class="v">{e(k['serve'])}</div></div>
  </div>
</div>{FOOT}</div></body></html>"""


def announce_html(a):
    e = lambda s: html.escape(s)
    return f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>{BASE_CSS}</style></head><body>
<div class="card"><div class="top"></div>
<div class="body a-body">
  <div class="a-badge">{a['icon']}</div>
  <div class="a-title">{e(a['title'])}</div>
  <div class="a-date">{e(a['date'])}</div>
  <div class="a-line">🥃 {e(a['line1'])}</div>
  <div class="a-line">🍽 {e(a['line2'])}</div>
  <div class="a-place">📍 {e(a['place'])}</div>
</div>{FOOT}</div></body></html>"""


def main():
    files = []
    for k in KINDS:
        p = OUT / f"card-{k['slug']}.html"
        p.write_text(kind_html(k), encoding="utf-8")
        files.append(p.name)
    p = OUT / f"card-{ANNOUNCE['slug']}.html"
    p.write_text(announce_html(ANNOUNCE), encoding="utf-8")
    files.append(p.name)
    print("\n".join(files))


if __name__ == "__main__":
    main()
