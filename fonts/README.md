# Local Fonts

This directory should contain the following font files (WOFF2 format):

## Montserrat (Sans-serif)

- Montserrat-Light.woff2 (weight 300)
- Montserrat-Regular.woff2 (weight 400)
- Montserrat-Medium.woff2 (weight 500)
- Montserrat-SemiBold.woff2 (weight 600)
- Montserrat-Bold.woff2 (weight 700)
- Montserrat-ExtraBold.woff2 (weight 800)

## JetBrains Mono (Monospace)

- JetBrainsMono-Regular.woff2 (weight 400)
- JetBrainsMono-Medium.woff2 (weight 500)
- JetBrainsMono-Bold.woff2 (weight 700)

## Where to download

### Montserrat

- Google Fonts: https://fonts.google.com/specimen/Montserrat
- Or use `google-webfonts-helper` to download WOFF2 files with specific weights

### JetBrains Mono

- Official: https://www.jetbrains.com/lp/mono/
- GitHub: https://github.com/JetBrains/JetBrainsMono/releases
- Google Fonts: https://fonts.google.com/specimen/JetBrains+Mono

## How to generate WOFF2 from TTF/OTF

```bash
# Install fonttools
pip install fonttools

# Convert TTF to WOFF2
pyftsubset Montserrat-Regular.ttf --flavor=woff2 --output-file=Montserrat-Regular.woff2
```

## Note

The CSS in `theme-system.css` references these files with `@font-face` declarations using `font-display: swap` for optimal loading performance.
