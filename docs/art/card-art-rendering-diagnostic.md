# Card Art Rendering Diagnostic

This is the source-of-truth diagnostic for the current card-art viewport and crop behavior. It covers the runtime modes that can show card artwork before additional large-scale illustration production continues.

## Shared renderer contract

Production card illustrations are authored as `512x768` portrait WebP assets. The shared preview renderer creates an image centered on the card artwork zone, scales it with cover behavior, and applies one universal source-space crop: a centered cover crop shifted upward by `3%` of source height. For `512x768` sources, that shared upward bias is `23.04px`. The diagnostic helper reports the same cover scale, crop rectangle, and source-loss percentages used by the runtime renderer.

Formula:

```text
scale = max(zone.width / sourceWidth, zone.height / sourceHeight)
cropWidth = min(sourceWidth, zone.width / scale)
cropHeight = min(sourceHeight, zone.height / scale)
cropX = (sourceWidth - cropWidth) / 2
centeredCropY = (sourceHeight - cropHeight) / 2
upwardCropBias = sourceHeight * 0.03
cropY = max(0, centeredCropY - upwardCropBias)
```

For the current `512x768` sources and all present card-art zones, the zone is wider than the source aspect. That means:

- horizontal source crop is `0px` in normal card modes;
- vertical source crop preserves the same cover-crop height as the old centered crop;
- the crop window is shifted upward by the shared `3%` source-height bias, so top loss is about `6` percentage points lower than bottom loss;
- there is no per-card focal-point logic or per-mode responsive art-direction rule in production gameplay rendering;
- per-card overrides now support direct normalized crop placement (`cropY01`) for debug/composition tuning in collection inspect and shared preview paths; legacy `yOffset` remains backward-compatible only.

## Runtime mode audit

### Hand cards

Hand cards use `createCardPreviewView()` through `BattleScene.createHandCardView()` with card illustrations enabled. The artwork viewport is the shared `zones.art` rectangle returned by `getCardLayoutZones(width, height)` for the calculated hand-card dimensions.

On a representative `390x844` portrait viewport:

| Metric | Value |
| --- | ---: |
| Card size | `107.01 x 191.38px` |
| Artwork viewport | `95.01 x 72.38px` |
| Artwork zone center inside card | `x=0`, `y=-31.5px` |
| Source crop | `x=0`, `y=165.93`, `w=512`, `h=390.07` |
| Visible source range | `x 0-512`, `y 165.93-556.00` |
| Visible source height | `50.79%` |
| Lost source top | `21.61%` |
| Lost source bottom | `27.60%` |
| Lost source left/right | `0% / 0%` |

Expected hand variation on common portrait layouts is roughly `y 165-557`, keeping about `50-51%` of source height after the shared upward bias.

### Inspect / zoom cards

Inspect cards reuse the hand-card preview renderer at the inspect transform size. Hand-card inspect enables card illustrations. Board-unit inspect uses the same enlarged card frame, but explicitly disables production card illustrations, so board inspect currently shows placeholder art rather than the `512x768` card texture.

On a representative `390x844` portrait viewport, hand-card inspect is:

| Metric | Value |
| --- | ---: |
| Card size | `220.44 x 378.48px` |
| Artwork viewport | `196.44 x 145.48px` |
| Artwork zone center inside card | `x=0`, `y=-61.5px` |
| Source crop | `x=0`, `y=171.37`, `w=512`, `h=379.18` |
| Visible source range | `x 0-512`, `y 171.37-550.55` |
| Visible source height | `49.37%` |
| Lost source top | `22.31%` |
| Lost source bottom | `28.31%` |
| Lost source left/right | `0% / 0%` |

Inspect is not meaningfully safer than hand. Depending on viewport rounding it can be slightly more or slightly less aggressive, but it remains the same shared cover crop with the universal upward source-space bias.

### Board cards / board units

Board units do **not** currently render production card illustration textures. `createBoardUnitView()` draws a compact placeholder artwork panel from rectangles (`artBack`, `artShade`, and `artGround`) inside the board unit frame.

On a representative `390x844` portrait viewport:

| Metric | Value |
| --- | ---: |
| Board cell size | approximately `110.70 x 148.34px` including slot background |
| Unit frame size | `92.70 x 130.34px` |
| Placeholder art viewport | `80.70 x 64.34px` |
| Production texture crop | Not applicable today |

If the shared production texture crop were applied to that board art viewport in the future, the equivalent biased source crop would be approximately `x=0`, `y=156.87`, `w=512`, `h=408.19`, keeping `53.15%` of source height. That hypothetical board crop would expose more art than hand/inspect, but it is not active runtime behavior today.

### Collection cards

Collection cards use `createCardPreviewView()` with production card illustrations enabled. They are two-column cards using `height = round(width * 1.42)`, which creates the shortest artwork zone relative to the source aspect among active production-art modes.

On a representative `390x844` portrait viewport:

| Metric | Value |
| --- | ---: |
| Card size | `176 x 250px` |
| Artwork viewport | `156 x 95px` |
| Artwork zone center inside card | `x=0`, `y=-39.5px` |
| Source crop | `x=0`, `y=205.06`, `w=512`, `h=311.79` |
| Visible source range | `x 0-512`, `y 205.06-516.85` |
| Visible source height | `40.60%` |
| Lost source top | `26.70%` |
| Lost source bottom | `32.70%` |
| Lost source left/right | `0% / 0%` |

Collection is currently the most aggressive active production-art crop, not hand.

## Cross-mode comparison

| Mode | Production texture active? | Representative visible source range | Visible source height | Crop center |
| --- | --- | --- | ---: | --- |
| Hand | Yes | `y 165.93-556.00` | `50.79%` | Source center minus 3% height |
| Hand inspect | Yes | `y 171.37-550.55` | `49.37%` | Source center minus 3% height |
| Board unit | No | Placeholder only | n/a | n/a |
| Board inspect | No | Placeholder only | n/a | n/a |
| Collection | Yes | `y 205.06-516.85` | `40.60%` | Source center minus 3% height |

The renderer crop is center-cover plus a shared upward source-space bias. The card layout itself is vertically asymmetrical because the artwork viewport sits below stat badges and above name/text panels. This production contract intentionally compensates slightly for perceived runtime framing without changing card layout, adding focal metadata, or introducing per-mode rules. A single card-level test override is currently wired through `src/data/presentation/cardArtCropOverrides.js` for `aggro_flanker_1`.

## True safe zones for `512x768` sources

Use source percentages, measured from the top-left of the source image.

### Active production-art modes only

- **Universal visible zone:** `x 0-100%`, approximately `y 27-67%` survives hand, hand inspect, and collection after the shared upward crop bias.
- **Must-survive focal zone:** keep faces, heads, key silhouettes, weapon tips, readable gestures, and unique props inside `x 12-88%`, `y 32-62%`.
- **Primary face target:** place the face/helmet center around `y 38-44%`; avoid face centers above `35%` unless the head and shoulders still fit below about `27%`.
- **Upper-body target:** place torso mass around `y 48-58%`; keep the top of the head, hair, horns, helmets, banners, and raised weapons below about `27%` if they must survive collection.
- **Lower silhouette target:** keep lower essential silhouette, ground contact, readable lower-body action, mounts, tails, and important prop bases above roughly `y 64-65%`.
- **Danger zones:** top `0-27%` and bottom `67-100%` are not production-safe across all active modes. The bottom danger zone is intentionally larger than the top danger zone because the runtime crop is biased upward.

### Hand/inspect approval target

If approving only battle readability, the hand/inspect safe zone is approximately `x 0-100%`, `y 22-72%`, with the strongest focal material in `y 32-62%`.

### Collection approval target

If the collection grid must preserve the same focal read, the stricter safe zone is approximately `x 0-100%`, `y 27-67%`, with strongest focal material in `y 32-62%`.

## Root-cause determination

The current issue is a **mixed composition and viewport-layout issue**, not evidence of a broken crop implementation.

- The renderer is doing what the code specifies: center-cover scaling with one shared `3%` upward source-space bias, reducing top loss and increasing bottom loss by the same amount.
- The active card artwork windows are much shorter than a `2:3` source. Hand/inspect keep only about half the source height; collection keeps only about two-fifths.
- If standalone illustrations place faces, upper torsos, raised arms, or silhouette-identifying details in the upper poster-like third, those elements will be cropped in runtime.
- The layout reserves large non-art areas for stats, name, and rules text. That is the viewport-layout constraint causing the short art windows.

## Recommendation

The final production contract is now the shared `3%` upward source-space bias on top of center-cover scaling. Keep this rule universal and deterministic:

- Author all card art for the biased runtime window, not for the full `512x768` frame.
- Treat collection (`y 27-67%`) as the strict universal crop.
- Keep the identity read in `x 12-88%`, `y 32-62%`.
- Put face/helmet centers around `38-44%` source height.
- Put upper torso/main mass around `48-58%` source height.
- Keep lower essential silhouette above roughly `64-65%` source height.
- Do not add broad per-card/per-faction/per-mode rule sets or focal metadata in artwork. If a scoped renderer test override is required, keep it explicit in `src/data/presentation/cardArtCropOverrides.js` and limited to named card ids.

## Override precedence update (2026-05-23)

- Per-card art crop overrides now prefer `cropY01` (normalized legal vertical crop position where `0` is top bound and `1` is bottom bound).
- Legacy `yOffset` is still read for backward compatibility only when `cropY01` is absent.
