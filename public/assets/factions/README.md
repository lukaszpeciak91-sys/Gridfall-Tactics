# Faction artwork assets

This folder is reserved for faction-level artwork only: preview images, banners, logos, faction select visuals, and other faction UI art. It is not a gameplay card illustration location. Codex intentionally includes only text documentation and empty directory keepers. No binary faction artwork or placeholder image files are included or generated; the user will manually upload artwork later.

## Source of truth

The current faction roster is defined by `src/data/factions/index.js`, which imports the faction JSON files from `src/data/factions/`. Each reserved artwork folder must use the faction's `id` from those JSON files, not a display name guessed from UI copy.

Current roster count: **6 full base gameplay factions**. `attrition-swarm` is a full permanent base faction, not a temporary variant. Future armies may be presentation/thematic expansions based on these mechanical bases, but the current six faction mechanics and card descriptions remain the base source.

| Faction key / display name | Faction id | Definition file |
| --- | --- | --- |
| `Aggro` | `aggro` | `src/data/factions/aggro.json` |
| `Tank` | `tank` | `src/data/factions/tank.json` |
| `Control` | `control` | `src/data/factions/control.json` |
| `Swarm` | `swarm` | `src/data/factions/swarm.json` |
| `Wardens` | `wardens` | `src/data/factions/wardens.json` |
| `Attrition Swarm` | `attrition-swarm` | `src/data/factions/attrition-swarm.json` |

## Folder structure

```text
public/assets/factions/
    aggro/
        preview.webp
    tank/
        preview.webp
    control/
        preview.webp
    swarm/
        preview.webp
    wardens/
        preview.webp
    attrition-swarm/
        preview.webp
```

Current faction preview paths:

- `public/assets/factions/aggro/preview.webp`
- `public/assets/factions/tank/preview.webp`
- `public/assets/factions/control/preview.webp`
- `public/assets/factions/swarm/preview.webp`
- `public/assets/factions/wardens/preview.webp`
- `public/assets/factions/attrition-swarm/preview.webp`

Gameplay card illustrations must not be stored under `public/assets/factions/`. The canonical gameplay card illustration source is `public/assets/cards/{factionId}/{artAssetId}.webp`.

## Faction preview/banner spec

- Filename: `preview.webp`
- Format: WebP
- Recommended size: `1024x576 px`
- Orientation: landscape banner style
- Composition: keep important content centered so compact cards can crop safely
- Text: avoid baked-in text unless it is intentional artwork

## Runtime behavior

`FactionSelectScene` attempts to load the runtime URL `/assets/factions/{factionId}/preview.webp` for each faction, backed by source files at `public/assets/factions/{factionId}/preview.webp`. If the image loads, the faction card renders it as a cover-cropped banner. If the file is missing, the card uses a clean faction-colored gradient fallback instead. Missing artwork should never show a broken-image icon and should never crash faction select.
