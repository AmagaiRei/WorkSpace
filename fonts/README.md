# Local Fonts

This directory should contain the following font files (WOFF2 format):

## Space Grotesk (Display font)

- SpaceGrotesk-VariableFont_wght.woff2 (weights 300-700, variable)

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

## Optional: Variable fonts (single file, multiple weights)

- Montserrat-VariableFont_wght.woff2 (weights 300-800)
- JetBrainsMono-VariableFont_wght.woff2 (weights 400-700)

## Where to download

### Space Grotesk

- GitHub: https://github.com/googlefonts/space-grotesk/releases
- Google Fonts: https://fonts.google.com/specimen/Space+Grotesk
- google-webfonts-helper: https://google-webfonts-helper.herokuapp.com/fonts/space-grotesk

### Montserrat

- Google Fonts: https://fonts.google.com/specimen/Montserrat
- google-webfonts-helper: https://google-webfonts-helper.herokuapp.com/fonts/montserrat

### JetBrains Mono

- Official: https://www.jetbrains.com/lp/mono/
- GitHub: https://github.com/JetBrains/JetBrainsMono/releases
- Google Fonts: https://fonts.google.com/specimen/JetBrains+Mono
- google-webfonts-helper: https://google-webfonts-helper.herokuapp.com/fonts/jetbrains-mono

## How to generate WOFF2 from TTF/OTF

```bash
# Install fonttools
pip install fonttools

# Convert TTF to WOFF2
pyftsubset Montserrat-Regular.ttf --flavor=woff2 --output-file=Montserrat-Regular.woff2
```

## Note

The CSS in `css/tokens/design-tokens.css` references these files with `@font-face` declarations using `font-display: swap` for optimal loading performance.
