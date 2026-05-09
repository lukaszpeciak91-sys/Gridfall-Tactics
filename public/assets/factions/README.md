# Faction artwork assets

This folder reserves the future faction-art pipeline. Codex intentionally includes only text documentation and empty directory keepers. No binary faction artwork or placeholder image files are included or generated; the user will manually upload artwork later.

## Future folder structure

```text
public/assets/factions/
    aggro/
        preview.webp
        cards/
    tank/
        preview.webp
        cards/
    control/
        preview.webp
        cards/
    swarm/
        preview.webp
        cards/
```

Current reserved paths:

- `public/assets/factions/aggro/preview.webp`
- `public/assets/factions/tank/preview.webp`
- `public/assets/factions/control/preview.webp`
- `public/assets/factions/swarm/preview.webp`

## Faction preview/banner spec

- Filename: `preview.webp`
- Format: WebP
- Recommended size: `1024x576 px`
- Orientation: landscape banner style
- Composition: keep important content centered so compact cards can crop safely
- Text: avoid baked-in text unless it is intentional artwork

## Runtime behavior

`FactionSelectScene` attempts to load `public/assets/factions/{factionKey}/preview.webp` for each faction. If the image loads, the faction card renders it as a cover-cropped banner. If the file is missing, the card uses a clean faction-colored gradient fallback instead. Missing artwork should never show a broken-image icon and should never crash faction select.
