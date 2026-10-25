#!/bin/bash
# Скрипт для скачивания шрифтов Montserrat и JetBrains Mono в формате WOFF2
# Запуск: bash fonts/download-fonts.sh

set -e

FONTS_DIR="$(dirname "$0")"
cd "$FONTS_DIR"

echo "📥 Скачивание шрифтов в $FONTS_DIR"

# Функция для скачивания и конвертации
download_and_convert() {
    local font_name="$1"
    local weights="$2"
    local source_url="$3"

    echo "  📦 $font_name..."

    # Временная директория
    tmpdir=$(mktemp -d)
    trap "rm -rf $tmpdir" EXIT

    # Скачиваем TTF файлы (пример для Google Fonts)
    # Для Montserrat используем google-webfonts-helper или прямые ссылки
    # Здесь пример с использованием wget + fonttools для конвертации

    # NOTE: Этот скрипт требует установленных fonttools (pip install fonttools)
    # Если fonttools не установлен, можно скачать готовые WOFF2 файлы вручную
}

# Montserrat (weights: 300, 400, 500, 600, 700, 800)
# Ссылки на WOFF2 можно получить с https://google-webfonts-helper.herokuapp.com/fonts/montserrat
# Или скачать вручную с Google Fonts

echo "
===========================================
📋 ИНСТРУКЦИЯ ПО СКАЧИВАНИЮ ШРИФТОВ
===========================================

1. Montserrat (6 начертаний):
   - Montserrat-Light.woff2 (300)
   - Montserrat-Regular.woff2 (400)
   - Montserrat-Medium.woff2 (500)
   - Montserrat-SemiBold.woff2 (600)
   - Montserrat-Bold.woff2 (700)
   - Montserrat-ExtraBold.woff2 (800)

   Скачать: https://google-webfonts-helper.herokuapp.com/fonts/montserrat
   Выбрать: Cyrillic, Cyrillic Extended, Latin, Latin Extended
   Форматы: WOFF2 only
   Начертания: 300, 400, 500, 600, 700, 800

2. JetBrains Mono (3 начертания):
   - JetBrainsMono-Regular.woff2 (400)
   - JetBrainsMono-Medium.woff2 (500)
   - JetBrainsMono-Bold.woff2 (700)

   Скачать: https://github.com/JetBrains/JetBrainsMono/releases
   Или: https://google-webfonts-helper.herokuapp.com/fonts/jetbrains-mono

3. Положите все файлы в папку: $FONTS_DIR

4. Структура должна быть:
   fonts/
   ├── Montserrat-Light.woff2
   ├── Montserrat-Regular.woff2
   ├── Montserrat-Medium.woff2
   ├── Montserrat-SemiBold.woff2
   ├── Montserrat-Bold.woff2
   ├── Montserrat-ExtraBold.woff2
   ├── JetBrainsMono-Regular.woff2
   ├── JetBrainsMono-Medium.woff2
   ├── JetBrainsMono-Bold.woff2
   └── README.md

===========================================
"

# Проверка наличия файлов
echo "🔍 Проверка существующих файлов:"
for font in \
  "Montserrat-Light.woff2" \
  "Montserrat-Regular.woff2" \
  "Montserrat-Medium.woff2" \
  "Montserrat-SemiBold.woff2" \
  "Montserrat-Bold.woff2" \
  "Montserrat-ExtraBold.woff2" \
  "JetBrainsMono-Regular.woff2" \
  "JetBrainsMono-Medium.woff2" \
  "JetBrainsMono-Bold.woff2"; do

  if [ -f "$font" ]; then
    echo "  ✅ $font ($(du -h "$font" | cut -f1))"
  else
    echo "  ❌ $font — ОТСУТСТВУЕТ"
  fi
done

echo ""
echo "✅ Готово! После добавления файлов перезагрузите страницу."