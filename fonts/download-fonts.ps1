<#
.SYNOPSIS
    Скрипт для скачивания шрифтов Space Grotesk, Montserrat и JetBrains Mono в формате WOFF2
    Запуск: .\fonts\download-fonts.ps1

.DESCRIPTION
    Помогает скачать необходимые файлы шрифтов для локального использования.
    Поскольку прямые ссылки на WOFF2 могут меняться, скрипт предоставляет инструкции
    и проверяет наличие файлов.
#>

param()

$FontsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $FontsDir

Write-Host "📥 Проверка шрифтов в $FontsDir" -ForegroundColor Cyan
Write-Host ""

$RequiredFonts = @(
    "SpaceGrotesk-VariableFont_wght.woff2",
    "Montserrat-Light.woff2",
    "Montserrat-Regular.woff2",
    "Montserrat-Medium.woff2",
    "Montserrat-SemiBold.woff2",
    "Montserrat-Bold.woff2",
    "Montserrat-ExtraBold.woff2",
    "JetBrainsMono-Regular.woff2",
    "JetBrainsMono-Medium.woff2",
    "JetBrainsMono-Bold.woff2"
)

$MissingFonts = @()

Write-Host "===========================================" -ForegroundColor Green
Write-Host "📋 ИНСТРУКЦИЯ ПО СКАЧИВАНИЮ ШРИФТОВ" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

Write-Host "1. Space Grotesk (Variable font, weights 300-700):" -ForegroundColor Yellow
Write-Host "   - SpaceGrotesk-VariableFont_wght.woff2 (300-700)"
Write-Host ""
Write-Host "   Скачать: https://github.com/googlefonts/space-grotesk/releases" -ForegroundColor Cyan
Write-Host "   Или: https://google-webfonts-helper.herokuapp.com/fonts/space-grotesk" -ForegroundColor Cyan
Write-Host "   Выбрать: Latin, Latin Extended, Cyrillic" -ForegroundColor Gray
Write-Host "   Форматы: WOFF2 Variable font only" -ForegroundColor Gray
Write-Host "   Начертания: 300-700 (variable)" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Montserrat (6 начертаний):" -ForegroundColor Yellow
Write-Host "   - Montserrat-Light.woff2 (300)"
Write-Host "   - Montserrat-Regular.woff2 (400)"
Write-Host "   - Montserrat-Medium.woff2 (500)"
Write-Host "   - Montserrat-SemiBold.woff2 (600)"
Write-Host "   - Montserrat-Bold.woff2 (700)"
Write-Host "   - Montserrat-ExtraBold.woff2 (800)"
Write-Host ""
Write-Host "   Скачать: https://google-webfonts-helper.herokuapp.com/fonts/montserrat" -ForegroundColor Cyan
Write-Host "   Выбрать: Cyrillic, Cyrillic Extended, Latin, Latin Extended" -ForegroundColor Gray
Write-Host "   Форматы: WOFF2 only" -ForegroundColor Gray
Write-Host "   Начертания: 300, 400, 500, 600, 700, 800" -ForegroundColor Gray
Write-Host ""

Write-Host "3. JetBrains Mono (3 начертания):" -ForegroundColor Yellow
Write-Host "   - JetBrainsMono-Regular.woff2 (400)"
Write-Host "   - JetBrainsMono-Medium.woff2 (500)"
Write-Host "   - JetBrainsMono-Bold.woff2 (700)"
Write-Host ""
Write-Host "   Скачать: https://github.com/JetBrains/JetBrainsMono/releases" -ForegroundColor Cyan
Write-Host "   Или: https://google-webfonts-helper.herokuapp.com/fonts/jetbrains-mono" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. Положите все файлы в папку: $FontsDir" -ForegroundColor Green
Write-Host ""

Write-Host "5. Структура должна быть:" -ForegroundColor Green
Write-Host "   fonts/" -ForegroundColor Gray
foreach ($font in $RequiredFonts) {
    Write-Host "   ├── $font" -ForegroundColor Gray
}
Write-Host "   ├── Montserrat-VariableFont_wght.woff2 (опционально)" -ForegroundColor Gray
Write-Host "   ├── JetBrainsMono-VariableFont_wght.woff2 (опционально)" -ForegroundColor Gray
Write-Host "   └── README.md" -ForegroundColor Gray
Write-Host ""

Write-Host "===========================================" -ForegroundColor Green
Write-Host "🔍 ПРОВЕРКА НАЛИЧИЯ ФАЙЛОВ" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

foreach ($font in $RequiredFonts) {
    $path = Join-Path $FontsDir $font
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        $sizeKB = [math]::Round($size / 1KB, 1)
        Write-Host "  ✅ $font ($sizeKB KB)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $font — ОТСУТСТВУЕТ" -ForegroundColor Red
        $MissingFonts += $font
    }
}

Write-Host ""

if ($MissingFonts.Count -eq 0) {
    Write-Host "🎉 Все шрифты на месте! Можно перезагружать страницу." -ForegroundColor Green
} else {
    Write-Host "⚠️ Отсутствует $($MissingFonts.Count) файл(ов). Скачайте их по инструкции выше." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Готово!" -ForegroundColor Cyan