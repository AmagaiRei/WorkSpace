#!/bin/bash
# ! Скрипт для скачивания шрифтов Montserrat, JetBrains Mono и Space Grotesk в формате WOFF2
# ! Запуск: bash fonts/download-fonts.sh

set -e

FONTS_DIR="$(dirname "$0")"
cd "$FONTS_DIR"

echo "📥 Скачивание шрифтов в $FONTS_DIR"

echo "
===========================================
📋 ИНСТРУКЦИЯ ПО СКАЧИВАНИЮ ШРИФТОВ
===========================================

1. Space Grotesk (Variable font, weights 300-700):
   - SpaceGrotesk-VariableFont_wght.woff2 (300-700)

   Скачать: https://github.com/googlefonts/space-grotesk/releases
   Или: https://google-webfonts-helper.herokuapp.com/fonts/space-grotesk
   Выбрать: Latin, Latin Extended, Cyrillic
   Форматы: WOFF2 Variable font only
   Начертания: 300-700 (variable)

2. Montserrat (6 начертаний):
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

3. JetBrains Mono (3 начертания):
   - JetBrainsMono-Regular.woff2 (400)
   - JetBrainsMono-Medium.woff2 (500)
   - JetBrainsMono-Bold.woff2 (700)

   Скачать: https://github.com/JetBrains/JetBrainsMono/releases
   Или: https://google-webfonts-helper.herokuapp.com/fonts/jetbrains-mono

4. Положите все файлы в папку: $FONTS_DIR

5. Структура должна быть:
   fonts/
   ├── SpaceGrotesk-VariableFont_wght.woff2
   ├── Montserrat-Light.woff2
   ├── Montserrat-Regular.woff2
   ├── Montserrat-Medium.woff2
   ├── Montserrat-SemiBold.woff2
   ├── Montserrat-Bold.woff2
   ├── Montserrat-ExtraBold.woff2
   ├── JetBrainsMono-Regular.woff2
   ├── JetBrainsMono-Medium.woff2
   ├── JetBrainsMono-Bold.woff2
   ├── Montserrat-VariableFont_wght.woff2 (опционально)
   ├── JetBrainsMono-VariableFont_wght.woff2 (опционально)
   └── README.md

===========================================
"

# ! Проверка наличия файлов
echo "🔍 Проверка существующих файлов:"
for font in \
  "SpaceGrotesk-VariableFont_wght.woff2" \
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