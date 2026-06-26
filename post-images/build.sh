#!/usr/bin/env bash
# Генерация брендовых карточек-картинок для постов (1080x1080 PNG).
# Требуется Chromium/Chrome. Запуск: bash build.sh
set -e
cd "$(dirname "$0")"

# найти chrome/chromium
CH="${CHROME:-}"
if [ -z "$CH" ]; then
  for c in chromium chromium-browser google-chrome \
           /opt/pw-browsers/chromium-*/chrome-linux/chrome; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then CH="$c"; break; fi
  done
fi
[ -z "$CH" ] && { echo "Chrome/Chromium не найден. Задайте переменную CHROME."; exit 1; }

python3 generate.py >/dev/null
for f in card-*.html; do
  png="${f%.html}.png"
  "$CH" --headless --no-sandbox --disable-gpu --hide-scrollbars \
        --force-device-scale-factor=1 --window-size=1080,1080 \
        --screenshot="$png" --virtual-time-budget=2500 "$f" >/dev/null 2>&1
  echo "✓ $png"
done
rm -f card-*.html   # промежуточные файлы не нужны
echo "Готово. PNG лежат рядом."
