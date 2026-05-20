# Faction Source-of-Truth Alignment

## Current base faction roster

Gridfall Tactics currently has **6 full base gameplay factions**:

| Runtime faction key | Faction id | Definition file | Presentation layer |
| --- | --- | --- | --- |
| `Aggro` | `aggro` | `src/data/factions/aggro.json` | `Porcelain Court` |
| `Tank` | `tank` | `src/data/factions/tank.json` | `Empire of the Golden Sun` |
| `Control` | `control` | `src/data/factions/control.json` | `Orden der Glasköpfe` |
| `Swarm` | `swarm` | `src/data/factions/swarm.json` | `Spore Choir` |
| `Wardens` | `wardens` | `src/data/factions/wardens.json` | `Mammoth Clans` |
| `Attrition Swarm` | `attrition-swarm` | `src/data/factions/attrition-swarm.json` | `Gravehearts` |

`attrition-swarm` is a full permanent base faction, not a temporary variant. All six current factions are base gameplay factions. Future armies may be presentation or thematic expansions built from these mechanical bases, but the current faction mechanics, IDs, card IDs, and card descriptions remain the base source.

## Runtime source of truth

- `src/data/factions/index.js` is the runtime faction registry and defines the runtime faction order returned by `getFactionKeys()`.
- `src/data/factions/*.json` files are the gameplay data source for faction ids, faction names, decks, cards, card ids, `cardNumber`, and `artAssetId`.
- `src/data/presentation/factionPresentation.js` is an additive presentation layer for display names, art direction metadata, and card display-name overrides. It must not rename gameplay faction ids or card ids.
- `src/scenes/FactionSelectScene.js` contains faction-select card styling/details for the selectable faction cards and must include all runtime faction keys so a base faction does not inherit another faction's fallback details.
- `src/localization/translations/*.json` owns localized UI strings, including faction-select descriptions and tags.

## Tooling and simulator source of truth

Runtime gameplay order from `src/data/factions/index.js` is:

```text
Aggro -> Tank -> Control -> Swarm -> Wardens -> Attrition Swarm
```

Before the source-of-truth alignment, simulator tooling loaded `src/data/factions/*.json` by filename sort and keyed entries by each JSON file's `name`. That produced this order:

```text
Aggro -> Attrition Swarm -> Control -> Swarm -> Tank -> Wardens
```

That drift did not change individual game rules or card resolution. It affected matchup iteration/report ordering, aggregate table ordering, seeded matchup seed inputs, and any balance reports generated from that tooling order; reports could therefore be misleading when comparing before/after runs if the ordering source was not noted. No tests intentionally depended on the filename-sorted simulator order. To remove that ambiguity, simulator tooling now uses `getFactionKeys()` / `getFactionByKey()` from the runtime registry so simulated matchup enumeration follows the same source and order as runtime gameplay.

## Asset path source of truth

Active card illustration files use:

```text
public/assets/cards/{factionId}/{artAssetId}.webp
```

Faction preview/banner art uses:

```text
public/assets/factions/{factionId}/preview.webp
```

`public/assets/cards/` is the only canonical source directory for gameplay card illustrations. `public/assets/factions/` is limited to faction-level preview, banner, logo, and UI artwork; it must not contain gameplay card-art subfolders.
