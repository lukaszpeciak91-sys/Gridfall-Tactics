# Card Illustration Pipeline

This folder documents the MVP production contract for card illustration files. The card renderer treats illustrations as generic card art: it does not assume the image is a character portrait, and it must not branch by illustration subject.

## Source of truth

The current faction roster is defined by `src/data/factions/index.js`, which imports the faction JSON files from `src/data/factions/`. Card illustration folders and filename stems must use each faction's `id` field from those JSON files.

Current roster count: **6 full base gameplay factions**. `attrition-swarm` is a full permanent base faction, not a temporary variant. Future armies may be presentation/thematic expansions based on these mechanical bases, but the current six faction mechanics and card descriptions remain the base source.

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
| Active card illustration folder convention | `public/assets/cards/{factionId}/` |
| Filename convention | `{artAssetId}.webp` |

Active card illustrations use `public/assets/cards/{factionId}/{artAssetId}.webp`. Illustration files use stable internal art asset ids, not card names and not gameplay card ids. This keeps filenames safe while names, copy, balance, and gameplay ids continue to evolve during design.

Canonical folder examples for the current faction roster:

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
- After assignment, numbers are stable identifiers and must not be automatically renumbered when card order changes later. Validation must check uniqueness and `artAssetId` consistency, not require `cardNumber` to equal the current array index.
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

## Crop, layout, and composition behavior

Card illustrations use a shared center-cover crop with a fixed upward source-space bias of approximately `3%` of source height in the MVP card preview renderer. The same crop behavior is used by hand cards, hand inspect / zoom cards, and collection cards. Center-cover means the source image is scaled until the artwork frame is fully covered; the final source crop is then shifted upward by the universal production bias. No per-card offsets, focal metadata, per-faction rules, or per-mode crop rules are used.

The full production audit and final composition standard live in `docs/art/card-illustration-composition.md`. In short: approve art against the cropped mobile hand-card read, not only against the uncropped `512x768` source. On common portrait phone layouts, runtime card views preserve the full source width but only the middle vertical band of the image:

- hand cards: roughly `383–390px` of source height, shifted upward by about `23px` on a `512x768` source;
- inspect / zoom cards: roughly `379–386px` of source height, shifted upward by the same source-space bias;
- collection cards: roughly `309–312px` of source height, shifted upward by the same source-space bias.

Board compact units currently do not render production illustration textures; they use placeholder/reserved art panels.

## Safe zones

Compose production source art with these `512x768` source-space safe zones:

- **Recommended face / helmet target:** center `40%` width with face or helmet center around y `38–44%`, approximately x `154–358`, y `292–338` for the focal center.
- **Must-survive focal zone:** x `12–88%`, y `32–62%`, approximately x `61–451`, y `246–476`. The dominant silhouette, gesture, and gameplay read must remain understandable here.
- **Upper torso / main mass target:** y `48–58%`, approximately y `369–445`; keep lower essential silhouette above roughly y `64–65%`, approximately y `492–499`.
- **Edge danger zones:** outer `10%` horizontally plus the upper y `0–205` and lower y `517–768` bands. Use these areas only for expendable bleed, atmosphere, particles, smoke, or non-essential background.

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
- inspect / zoom cards use the same biased center-cover crop as hand cards
- collection cards use the same shared biased crop behavior
- mobile card text and focal art remain readable with the `x 12–88%`, `y 32–62%` must-survive focal zone
- missing illustration files keep the existing fallback behavior
- board / compact units and board inspect remain art-free
- card numbers do not appear in UI

## Board rendering confirmation

Board and compact units do **not** render production card illustrations in the MVP. The board renderer remains art-free for readability and crop safety, and board rendering behavior should remain unchanged unless a future task explicitly changes that contract.


## Single canonical card-art path

The production card illustration pipeline uses exactly one source directory: `public/assets/cards/{factionId}/{artAssetId}.webp`. Faction preview art uses `public/assets/factions/{factionId}/preview.webp` and is separate from gameplay card illustrations. Do not create or document faction-local gameplay card-art folders under `public/assets/factions/`.
