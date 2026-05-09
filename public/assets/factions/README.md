# Faction preview assets

Codex intentionally includes only this text documentation and directory keepers. No binary artwork is included or generated.

Each faction folder reserves a future `preview.webp` image used by `FactionSelectScene`:

- `public/assets/factions/aggro/preview.webp`
- `public/assets/factions/tank/preview.webp`
- `public/assets/factions/control/preview.webp`
- `public/assets/factions/swarm/preview.webp`

## Required preview image spec

- Filename: `preview.webp`
- Format: WebP
- Recommended size: 1024x576 px
- Aspect ratio: 16:9 landscape
- Safe area: keep center content visible even if the card art area is cropped or scaled
- Avoid important text inside the image

If `preview.webp` is missing, the faction select screen shows a clean faction-colored fallback panel instead of a broken image or crash.
