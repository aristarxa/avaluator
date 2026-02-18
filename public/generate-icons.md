# PWA Icon Generation

To generate proper PNG icons from `pwa-icon.svg`, run:

```bash
# Using sharp-cli (npm i -g sharp-cli)
sharp -i public/pwa-icon.svg -o public/pwa-192x192.png resize 192
sharp -i public/pwa-icon.svg -o public/pwa-512x512.png resize 512

# Or using Inkscape:
inkscape public/pwa-icon.svg --export-png=public/pwa-192x192.png --export-width=192
inkscape public/pwa-icon.svg --export-png=public/pwa-512x512.png --export-width=512

# Or using ImageMagick:
convert -background none -size 192x192 public/pwa-icon.svg public/pwa-192x192.png
convert -background none -size 512x512 public/pwa-icon.svg public/pwa-512x512.png
```

Alternatively, use https://maskable.app or https://realfavicongenerator.net to generate all sizes.
