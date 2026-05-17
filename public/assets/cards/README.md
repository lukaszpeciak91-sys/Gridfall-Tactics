# Card Illustration Pipeline

This folder documents the MVP production contract for card illustration files. The card renderer treats illustrations as generic card art: it does not assume the image is a character portrait, and it must not branch by illustration subject.

## Source of truth

The current faction roster is defined by `src/data/factions/index.js`, which imports the faction JSON files from `src/data/factions/`. Card illustration folders and filename stems must use each faction's `id` field from those JSON files.

Current roster count: **6 factions**.

| Faction key / display name | Faction id | Definition file |
| --- | --- | --- |
| `Aggro` | `aggro` | `src/data/factions/aggro.json` |
| `Tank` | `tank` | `src/data/factions/tank.json` |
| `Control` | `control` | `src/data/factions/control.json` |
| `Swarm` | `swarm` | `src/data/factions/swarm.json` |
| `Wardens` | `wardens` | `src/data/factions/wardens.json` |
| `Attrition Swarm` | `attrition-swarm` | `src/data/factions/attrition-swarm.json` |

## Production asset contract

| Requirement | Contract |
| --- | --- |
| Required source size | `512x768` pixels |
| Orientation | Portrait, 2:3 aspect ratio |
| Preferred format | WebP |
| Folder convention | `public/assets/cards/{factionId}/` |
| Filename convention | `{artAssetId}.webp` |

Illustration files use stable internal art asset ids, not card names and not gameplay card ids. This keeps filenames safe while names, copy, balance, and gameplay ids continue to evolve during design.

Reserved folder examples for the current faction roster:

```text
public/assets/cards/aggro/
public/assets/cards/tank/
public/assets/cards/control/
public/assets/cards/swarm/
public/assets/cards/wardens/
public/assets/cards/attrition-swarm/
```

Example paths for the current faction roster:

```text
public/assets/cards/aggro/aggro_01.webp
public/assets/cards/tank/tank_01.webp
public/assets/cards/control/control_04.webp
public/assets/cards/swarm/swarm_01.webp
public/assets/cards/wardens/wardens_01.webp
public/assets/cards/attrition-swarm/attrition-swarm_01.webp
```

## Stable card numbering metadata

Every source card defines two internal-only illustration fields:

```json
{
  "cardNumber": 1,
  "artAssetId": "aggro_01"
}
```

- `cardNumber` is a numeric, faction-local card number.
- `artAssetId` is the stable filename stem for production art.
- `artAssetId` uses `{factionId}_{twoDigitCardNumber}`.
- Two-digit numbering is required: `01`, `02`, `03`, through `10` and beyond.
- Initial numbering was assigned from the current order in each faction data file / collection order.
- After assignment, numbers are stable identifiers and must not be automatically renumbered when card order changes later.
- Card numbers are internal/system-only and must not be displayed in UI.
- Production filenames should use `artAssetId`, not card names and not gameplay card ids.

Examples:

```text
Aggro cardNumber 1 -> artAssetId aggro_01 -> public/assets/cards/aggro/aggro_01.webp
Tank cardNumber 1 -> artAssetId tank_01 -> public/assets/cards/tank/tank_01.webp
Control cardNumber 4 -> artAssetId control_04 -> public/assets/cards/control/control_04.webp
Swarm cardNumber 1 -> artAssetId swarm_01 -> public/assets/cards/swarm/swarm_01.webp
Wardens cardNumber 1 -> artAssetId wardens_01 -> public/assets/cards/wardens/wardens_01.webp
Attrition Swarm cardNumber 1 -> artAssetId attrition-swarm_01 -> public/assets/cards/attrition-swarm/attrition-swarm_01.webp
```

## Texture key convention

The preferred runtime texture key is derived from the faction id and `artAssetId`:

```text
card.{factionId}.{artAssetId}
```

Example texture keys for the current faction roster:

```text
card.aggro.aggro_01
card.tank.tank_01
card.control.control_04
card.swarm.swarm_01
card.wardens.wardens_01
card.attrition-swarm.attrition-swarm_01
```

If a card does not define `artAssetId`, the asset resolver falls back to the existing card-id-based path and key behavior for compatibility. Explicit renderer texture keys are still supported through `artTextureKey`, `artKey`, or `art.textureKey`.

## Supported illustration subjects

Cards are not always unit, character, or portrait cards. Production illustrations may depict any card-appropriate subject, including:

- characters
- creatures
- artifacts
- technology
- rituals
- events
- explosions
- environments
- locations
- symbols
- abstract phenomena

Do not frame briefs, reviews, or renderer expectations around every card having a face, body, or character silhouette. The renderer should remain generic and subject-agnostic.

## Crop and layout behavior

Card illustrations use a shared center-cover crop in the MVP card preview renderer. The same crop behavior is used by:

- hand cards
- inspect / zoom cards
- collection cards

Center-cover means the source image is scaled until the artwork frame is fully covered, then cropped around the source center. Keep the focal read near the center so the same asset remains readable across all shared preview surfaces.

## Safe zones

Compose production source art with these safe zones:

- Center `40%`: focal zone. Put the primary read here, whether it is a character, creature, object, symbol, explosion core, ritual focus, location landmark, or abstract focal shape.
- Center `85%`: safe content zone. Keep important secondary silhouettes, effects, technology, artifacts, environmental landmarks, and readable composition cues inside this area.
- Outer `5–10%`: crop-tolerant edge. This area may crop; use it for bleed, particles, atmosphere, texture, or non-essential background.

Avoid placing critical text, icons, small silhouettes, or gameplay-readable cues near the outer edge.

## Manual validation assets

Codex should not generate or commit placeholder illustration binaries. Sample validation images should be added manually by the developer or designer when real or approved temporary art is available.

Suggested manual validation paths for the current faction roster:

```text
public/assets/cards/aggro/aggro_01.webp
public/assets/cards/tank/tank_01.webp
public/assets/cards/control/control_04.webp
public/assets/cards/swarm/swarm_01.webp
public/assets/cards/wardens/wardens_01.webp
public/assets/cards/attrition-swarm/attrition-swarm_01.webp
```

Use manual assets to verify that:

- hand cards load available illustrations and keep the placeholder fallback when a file is missing
- inspect / zoom cards use the same center-cover crop as hand cards
- collection cards use the same shared crop behavior
- mobile card text and focal art remain readable with the center `40%` focal zone and center `85%` safe content zone
- missing illustration files keep the existing fallback behavior
- board / compact units remain art-free
- card numbers do not appear in UI

## Board rendering confirmation

Board and compact units do **not** render production card illustrations in the MVP. The board renderer remains art-free for readability and crop safety, and board rendering behavior should remain unchanged unless a future task explicitly changes that contract.
