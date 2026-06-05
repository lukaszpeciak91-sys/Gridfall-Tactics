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
- Source generation format: `1920x1080` (`16:9`)
- Runtime export: `preview.webp`
- Runtime path: `public/assets/factions/<faction-id>/preview.webp`
- Orientation: landscape faction-poster banner
- Runtime crop: rendered with cover-crop, so mobile faction-select cards show only part of the original image
- Text: avoid baked-in text; faction name, flavor text, and gameplay chips are UI-rendered

## Banner design standard

Faction banners are faction posters, not illustrations. They should sell the civilization instantly by communicating identity, emotional tone, world fantasy, and uniqueness before gameplay details. Use one dominant visual idea and one dominant civilization symbol; avoid battle scenes, character lineups, multiple heroes, or attempts to explain the entire faction.

Preferred poster structure: civilization icon/symbol on the left and civilization world/context on the right. Keep the primary symbol recognizable after a heavy mobile crop. Critical storytelling elements should stay inside the central 60% of the source image, sit lower than traditional key art, and read as large silhouettes rather than distant horizon detail.

Production uses high-resolution `1920x1080` source art because runtime faction cards cover-crop `preview.webp`; compact mobile cards display only a cropped portion of the original banner. Banner readability takes priority over full-image beauty.

## Runtime behavior

`FactionSelectScene` attempts to load the runtime URL `/assets/factions/{factionId}/preview.webp` for each faction, backed by source files at `public/assets/factions/{factionId}/preview.webp`. If the image loads, the faction card renders it as a cover-cropped banner. If the file is missing, the card uses a clean faction-colored gradient fallback instead. Missing artwork should never show a broken-image icon and should never crash faction select.
