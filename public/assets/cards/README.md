# Card Illustration Pipeline

This folder documents the MVP production contract for card illustration files. The card renderer treats illustrations as generic card art: it does not assume the image is a character portrait, and it must not branch by illustration subject.

## Production asset contract

| Requirement | Contract |
| --- | --- |
| Required source size | `512x768` pixels |
| Orientation | Portrait, 2:3 aspect ratio |
| Preferred format | WebP |
| Folder convention | `public/assets/cards/{factionId}/` |
| Current filename convention | `{cardId}.webp` |

> **Naming note:** the current MVP pipeline resolves illustration filenames from the card id (`{cardId}.webp`). This may be replaced by stable `artAssetId` naming in the next PR so art filenames can stay stable even if gameplay card ids change.

Example current path:

```text
public/assets/cards/aggro/aggro_runner_1.webp
```

## Texture key convention

The current pipeline derives runtime texture keys from the faction id and card id:

```text
card.{factionId}.{cardId}
```

Example current texture key:

```text
card.aggro.aggro_runner_1
```

This is current pipeline behavior, not a promise that card ids are permanent art asset identifiers.

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

Suggested manual validation paths:

```text
public/assets/cards/aggro/aggro_runner_1.webp
public/assets/cards/control/control_override_1.webp
```

Use manual assets to verify that:

- hand cards load available illustrations and keep the placeholder fallback when a file is missing
- inspect / zoom cards use the same center-cover crop as hand cards
- collection cards use the same shared crop behavior
- mobile card text and focal art remain readable with the center `40%` focal zone and center `85%` safe content zone
- missing illustration files keep the existing fallback behavior

## Board rendering confirmation

Board and compact units do **not** render production card illustrations in the MVP. The board renderer remains art-free for readability and crop safety, and board rendering behavior should remain unchanged unless a future task explicitly changes that contract.
