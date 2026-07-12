# Faction Source-of-Truth Alignment

## Current base faction roster

Gridfall Tactics currently has **7 full base gameplay factions**:

| Runtime faction key | Faction id | Definition file | Presentation layer |
| --- | --- | --- | --- |
| `Aggro` | `aggro` | `src/data/factions/aggro.json` | `Porcelain Court` |
| `Tank` | `tank` | `src/data/factions/tank.json` | `Empire of the Golden Sun` |
| `Control` | `control` | `src/data/factions/control.json` | `Orden der Glasköpfe` |
| `Swarm` | `swarm` | `src/data/factions/swarm.json` | `Spore Choir` |
| `Wardens` | `wardens` | `src/data/factions/wardens.json` | `Mammoth Clans` |
| `Attrition Swarm` | `attrition-swarm` | `src/data/factions/attrition-swarm.json` | `Gravehearts` |
| `Overclock` | `overclock` | `src/data/factions/overclock.json` | `Project H.E.R.D.` / `Program P.A.S.Z.A.` |

`attrition-swarm` is a full permanent base faction, not a temporary variant. All seven current factions are base gameplay factions. Future armies may be presentation or thematic expansions built from these mechanical bases, but the current faction mechanics, IDs, card IDs, and card descriptions remain the base source.


## Presentation identity freeze

These presentation identities are the current lore/art direction source for faction-level banners and UI copy. They do not alter gameplay ids, card ids, decks, or rules.

| Faction id | Presentation identity | Frozen direction |
| --- | --- | --- |
| `aggro` | Porcelain Court | Immortal aristocrats in porcelain bodies harvest humanity into serum; three centuries of etiquette and atrocities. |
| `tank` | Empire of the Golden Sun | Reptilian solar empire led by a fanatical emperor; extinction through prophecy and religious certainty. |
| `control` | Orden der Glasköpfe | Techno-occult catastrophe of heads preserved in jars, searching for a signal to retune reality. |
| `swarm` | Spore Choir | Planetary superorganism where all life is merged into one consciousness and mutates endlessly. |
| `wardens` | Mammoth Clans | Eternal ice-age mammoth migration civilization, the last warmth against the cosmic Frost. |
| `attrition-swarm` | Gravehearts | Humanity trapped after New Year's Eve 1999 in memory decay and endless repetition; civilization-wide confusion rather than necromancy. |
| `overclock` | Project H.E.R.D. / Program P.A.S.Z.A. | A late-1980s state agricultural/military breeding program keeps weaponizing livestock after humanity disappears; bureaucratic, agricultural, absurd, official, and biological rather than cyberpunk or robotic. |

## Runtime source of truth

- `src/data/factions/index.js` is the runtime faction registry and defines the runtime faction order returned by `getFactionKeys()`.
- `src/data/factions/*.json` files are the gameplay data source for faction ids, faction names, decks, cards, card ids, `cardNumber`, and `artAssetId`.
- `src/data/presentation/factionPresentation.js` is an additive presentation layer for display names, art direction metadata, and card display-name overrides. It must not rename gameplay faction ids or card ids.
- `docs/art/frozen-art-bible.md` is the canonical art-direction and naming-presentation guide for faction visuals; it does not replace gameplay data in `src/data/factions/*.json`.
- `src/scenes/FactionSelectScene.js` contains faction-select card styling/details for the selectable faction cards and must include all runtime faction keys so a base faction does not inherit another faction's fallback details.
- `src/localization/translations/*.json` owns localized UI strings, including faction-select descriptions and tags.

## Tooling and simulator source of truth

Runtime gameplay order from `src/data/factions/index.js` is:

```text
Aggro -> Tank -> Control -> Swarm -> Wardens -> Attrition Swarm -> Overclock
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


Generated non-deck units use the same resolver and `public/assets/cards/{factionId}/{artAssetId}.webp` convention as collectible deck cards, but their art identity is stamped at generation time instead of coming from a deck JSON entry. The current generated-unit art identities are:

| Generated unit source | `factionId` | `artAssetId` | Runtime file |
| --- | --- | --- | --- |
| Spawn / Brood Grunt | `swarm` | `token_grunt_01` | `public/assets/cards/swarm/token_grunt_01.webp` |
| Flood Token | `swarm` | `token_flood_01` | `public/assets/cards/swarm/token_flood_01.webp` |
| Carrier / Grave Call Grunt | `attrition_swarm` | `token_grunt_02` | `public/assets/cards/attrition_swarm/token_grunt_02.webp` |

Generated units also carry `tokenType`, `isToken: true`, and `collectible: false`. Board/hand/discard/fallen/revive conversions must preserve those fields so Recall, redeploy displacement, replay from hand, and later revive continue to resolve the same faction-local token illustration. Do not place generated-unit illustrations in `public/assets/cards/tokens/`; token art remains faction-local under `public/assets/cards/`. Do not reuse the same `artAssetId` for visually different generated units, even when those units live in different faction folders. The binary `.webp` artwork files are manual repository additions outside Codex scope; when absent, the runtime must keep using the existing card-art placeholder fallback without crashing.
