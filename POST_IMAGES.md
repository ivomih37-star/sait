# Сетка постов с картинками · Ракия Клуб Москва

> Промпты для генерации изображений к постам (Midjourney, DALL·E, Flux,
> Stable Diffusion, Kandinsky и др.). Промпты даны на английском — нейросети
> понимают его точнее. Под каждым — короткое описание по-русски.
>
> Цель — **единая лента-сетка**: все картинки в одном стиле, чтобы профиль
> Telegram/VK выглядел цельно. Перед публикацией помнить про **18+**.

---

## 🎨 Единый стиль ленты (важно — общая основа всех промптов)

Чтобы лента смотрелась как одна сетка, во ВСЕ промпты добавляем один и тот же
«стилевой хвост»:

> **STYLE TAIL (копировать в каждый промпт):**
> `warm rustic Balkan still life, soft natural window light, wooden table,
> linen cloth, shallow depth of field, cozy autumn palette of amber green and
> terracotta, film photography look, 50mm, high detail, no text`

- **Палитра:** янтарный, болгарский зелёный, терракота, тёплый беж.
- **Свет:** мягкий дневной из окна, тёплый.
- **Фон:** дерево, лён, балканские мотивы (керамика, вышивка).
- **Соотношение сторон:** `--ar 4:5` (вертикаль для ленты) или `1:1` для сетки.
- **Без текста на картинке** — подписи добавляем уже в посте.

> ⚠️ **Negative prompt** (для SD/Flux): `text, watermark, logo, label letters,
> cartoon, lowres, blurry, extra glasses, plastic look, modern bar neon`

---

## 🖼 Карточки видов ракии (6 постов)

### 1. 🍇 Гроздова (виноградная)
**RU:** Бокал прозрачной ракии рядом с гроздью зелёного винограда на деревянном столе.

> `A small clear shot glass of grape rakia next to a bunch of fresh green
> grapes and vine leaves on a rustic wooden table, droplets on the glass,` +
> STYLE TAIL `--ar 4:5`

---

### 2. 🍑 Сливова (сливовая)
**RU:** Рюмка ракии и спелые тёмно-синие сливы, часть разрезана.

> `A traditional shot glass of plum rakia surrounded by ripe dark-blue plums,
> one plum cut in half showing the pit, on a linen cloth,` + STYLE TAIL
> `--ar 4:5`

---

### 3. 🍊 Кайсиева (абрикосовая)
**RU:** Рюмка ракии и спелые абрикосы с листочками, мягкий свет.

> `A chilled glass of apricot rakia with fresh ripe apricots and green leaves,
> warm golden backlight, condensation on the glass,` + STYLE TAIL `--ar 4:5`

---

### 4. 🍐 Дюлева (айвовая)
**RU:** Рюмка ракии и жёлтая айва, тонкий деликатный натюрморт.

> `An elegant small glass of quince rakia beside two golden ripe quinces with
> leaves, soft moody light, refined minimal still life,` + STYLE TAIL
> `--ar 4:5`

---

### 5. 🍒 Вишнева (вишнёвая)
**RU:** Рюмка ракии и горсть тёмной вишни с веточками.

> `A shot glass of cherry rakia with a handful of dark red cherries and stems
> scattered on a wooden board, rich saturated reds,` + STYLE TAIL `--ar 4:5`

---

### 6. 🍯 Мускатова (мускатная)
**RU:** Рюмка ароматной ракии, мускатный виноград и мёд в сотах.

> `A small glass of muscat grape rakia with golden muscat grapes and a piece
> of honeycomb, warm honey tones, aromatic cozy still life,` + STYLE TAIL
> `--ar 4:5`

---

## 🖼 Карточки для рубрик и сервисных постов

### 7. 📣 Анонс встречи / дегустации
**RU:** Стол с 4–6 рюмками ракии в ряд, закуски, тёплая компания (без лиц).

> `Flat-lay of a Balkan tasting table with a row of six small glasses of clear
> rakia, shopska salad, lyutenitsa, bread and cheese, hands reaching in, cozy
> gathering mood,` + STYLE TAIL `--ar 1:1`

---

### 8. 🇧🇬 Культура / традиции
**RU:** Болгарское застолье: керамика, вышитая скатерть, ракия и мезе.

> `A rustic Bulgarian feast scene with hand-painted ceramic dishes, embroidered
> tablecloth, glasses of rakia and traditional meze, folk atmosphere,` +
> STYLE TAIL `--ar 1:1`

---

### 9. 🥃 Ракиеведение (как пить / перегонка)
**RU:** Медный самогонный аппарат (казан) в деревенском дворе, осенний свет.

> `A traditional copper rakia still (kazan) in a rustic village yard, steam,
> baskets of fruit nearby, autumn golden hour, documentary photography,` +
> STYLE TAIL `--ar 1:1`

---

### 10. 💬 Вовлечение / опрос
**RU:** Две рюмки ракии рядом — «что выберешь?», минималистично.

> `Two small glasses of rakia side by side on a wooden table, one with grapes
> one with plums, symmetrical composition, clean minimal still life for a poll,`
> + STYLE TAIL `--ar 1:1`

---

## 🧩 Как собрать ленту-сетку (3 в ряд)

Рекомендуемый порядок первых 9 постов, чтобы сетка играла по цвету:

```
🍇 Гроздова   📣 Анонс      🍑 Сливова
🇧🇬 Культура   🍊 Кайсиева   🥃 Ракиеведение
🍒 Вишнева    💬 Опрос      🍐 Дюлева
```

Принцип: фруктовые яркие карточки чередуем со «сценами» (стол, застолье,
казан), чтобы не было двух одинаковых по цвету плиток рядом.

---

## ⚙️ Подсказки по генерации

- **Консистентность:** в Midjourney используй `--seed <номер>` один и тот же +
  одинаковый STYLE TAIL — лента будет как из одной фотосессии.
- **Реализм:** для фото-стиля добавляй `--style raw` (MJ) или модель Flux.
- **Кириллица на картинке:** нейросети её коверкают — НЕ проси текст на
  изображении, добавляй подписи в редакторе/посте.
- **Брендинг:** наложи маленький логотип 🇧🇬 «Ракия Клуб» в одном углу во всех
  постах — ещё сильнее свяжет ленту.
- **Бесплатно:** Kandinsky (ru), Шедеврум, Bing Image Creator — для старта
  хватит.

---

⚠️ **18+. Употребление алкоголя вредит вашему здоровью.** Наздраве! 🥃
