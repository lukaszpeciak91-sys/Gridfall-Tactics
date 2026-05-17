# Card Art Rendering Diagnostic

This is the source-of-truth diagnostic for the current card-art viewport and crop behavior. It covers the runtime modes that can show card artwork before additional large-scale illustration production continues.

## Shared renderer contract

Production card illustrations are authored as `512x768` portrait WebP assets. The shared preview renderer creates an image centered on the card artwork zone, scales it with cover behavior, and applies a centered source-space crop. The diagnostic helper reports the same cover scale, crop rectangle, and source-loss percentages used by the runtime renderer.

Formula:

```text
scale = max(zone.width / sourceWidth, zone.height / sourceHeight)
cropWidth = min(sourceWidth, zone.width / scale)
cropHeight = min(sourceHeight, zone.height / scale)
cropX = (sourceWidth - cropWidth) / 2
cropY = (sourceHeight - cropHeight) / 2
```

For the current `512x768` sources and all present card-art zones, the zone is wider than the source aspect. That means:

- horizontal source crop is `0px` in normal card modes;
- vertical source crop is equal at the top and bottom;
- the crop anchor is the geometric center of the source image;
- there is no per-card focal-point logic, manual offset, or responsive art-direction rule.

## Runtime mode audit

### Hand cards

Hand cards use `createCardPreviewView()` through `BattleScene.createHandCardView()` with card illustrations enabled. The artwork viewport is the shared `zones.art` rectangle returned by `getCardLayoutZones(width, height)` for the calculated hand-card dimensions.

On a representative `390x844` portrait viewport:

| Metric | Value |
| --- | ---: |
| Card size | `107.01 x 191.38px` |
| Artwork viewport | `95.01 x 72.38px` |
| Artwork zone center inside card | `x=0`, `y=-31.5px` |
| Source crop | `x=0`, `y=188.97`, `w=512`, `h=390.07` |
| Visible source range | `x 0-512`, `y 188.97-579.03` |
| Visible source height | `50.79%` |
| Lost source top | `24.60%` |
| Lost source bottom | `24.60%` |
| Lost source left/right | `0% / 0%` |

Expected hand variation on common portrait layouts is roughly `y 188-580`, keeping about `50-51%` of source height.

### Inspect / zoom cards

Inspect cards reuse the hand-card preview renderer at the inspect transform size. Hand-card inspect enables card illustrations. Board-unit inspect uses the same enlarged card frame, but explicitly disables production card illustrations, so board inspect currently shows placeholder art rather than the `512x768` card texture.

On a representative `390x844` portrait viewport, hand-card inspect is:

| Metric | Value |
| --- | ---: |
| Card size | `220.44 x 378.48px` |
| Artwork viewport | `196.44 x 145.48px` |
| Artwork zone center inside card | `x=0`, `y=-61.5px` |
| Source crop | `x=0`, `y=194.41`, `w=512`, `h=379.18` |
| Visible source range | `x 0-512`, `y 194.41-573.59` |
| Visible source height | `49.37%` |
| Lost source top | `25.31%` |
| Lost source bottom | `25.31%` |
| Lost source left/right | `0% / 0%` |

Inspect is not meaningfully safer than hand. Depending on viewport rounding it can be slightly more or slightly less aggressive, but it remains centered vertical cover crop near the middle half of the source.

### Board cards / board units

Board units do **not** currently render production card illustration textures. `createBoardUnitView()` draws a compact placeholder artwork panel from rectangles (`artBack`, `artShade`, and `artGround`) inside the board unit frame.

On a representative `390x844` portrait viewport:

| Metric | Value |
| --- | ---: |
| Board cell size | approximately `110.70 x 148.34px` including slot background |
| Unit frame size | `92.70 x 130.34px` |
| Placeholder art viewport | `80.70 x 64.34px` |
| Production texture crop | Not applicable today |

If the shared production texture crop were applied to that board art viewport in the future, the equivalent source crop would be approximately `x=0`, `y=179.91`, `w=512`, `h=408.19`, keeping `53.15%` of source height. That hypothetical board crop would expose more art than hand/inspect, but it is not active runtime behavior today.

### Collection cards

Collection cards use `createCardPreviewView()` with production card illustrations enabled. They are two-column cards using `height = round(width * 1.42)`, which creates the shortest artwork zone relative to the source aspect among active production-art modes.

On a representative `390x844` portrait viewport:

| Metric | Value |
| --- | ---: |
| Card size | `176 x 250px` |
| Artwork viewport | `156 x 95px` |
| Artwork zone center inside card | `x=0`, `y=-39.5px` |
| Source crop | `x=0`, `y=228.10`, `w=512`, `h=311.79` |
| Visible source range | `x 0-512`, `y 228.10-539.90` |
| Visible source height | `40.60%` |
| Lost source top | `29.70%` |
| Lost source bottom | `29.70%` |
| Lost source left/right | `0% / 0%` |

Collection is currently the most aggressive active production-art crop, not hand.

## Cross-mode comparison

| Mode | Production texture active? | Representative visible source range | Visible source height | Crop center |
| --- | --- | --- | ---: | --- |
| Hand | Yes | `y 188.97-579.03` | `50.79%` | Source center |
| Hand inspect | Yes | `y 194.41-573.59` | `49.37%` | Source center |
| Board unit | No | Placeholder only | n/a | n/a |
| Board inspect | No | Placeholder only | n/a | n/a |
| Collection | Yes | `y 228.10-539.90` | `40.60%` | Source center |

The renderer crop is centered in source space. The card layout itself is vertically asymmetrical because the artwork viewport sits below stat badges and above name/text panels. This makes the artwork window appear high in the card frame, but it does not change the source crop anchor: the source crop remains equal top/bottom.

## True safe zones for `512x768` sources

Use source percentages, measured from the top-left of the source image.

### Active production-art modes only

- **Universal visible zone:** `x 0-100%`, `y 30-70%` survives hand, hand inspect, and collection.
- **Must-survive focal zone:** keep faces, heads, key silhouettes, weapon tips, readable gestures, and unique props inside `x 12-88%`, `y 35-65%`.
- **Primary face target:** place the face/helmet center around `y 43-48%`; avoid face centers above `40%` unless the head and shoulders still fit below `30%`.
- **Upper-body target:** place torso mass around `y 50-62%`; keep the top of the head, hair, horns, helmets, banners, and raised weapons below about `30%` if they must survive collection.
- **Danger zones:** top `0-30%` and bottom `70-100%` are not production-safe across all active modes. The top `0-25%` is already lost in hand/inspect; the top `0-30%` is lost in collection. Bottom loss is symmetrical by source crop.

### Hand/inspect approval target

If approving only battle readability, the hand/inspect safe zone is approximately `x 0-100%`, `y 25-75%`, with the strongest focal material in `y 35-65%`.

### Collection approval target

If the collection grid must preserve the same focal read, the stricter safe zone is approximately `x 0-100%`, `y 30-70%`, with strongest focal material in `y 38-62%`.

## Root-cause determination

The current issue is a **mixed composition and viewport-layout issue**, not evidence of a broken crop implementation.

- The renderer is doing what the code specifies: centered cover crop with equal source loss at top and bottom.
- The active card artwork windows are much shorter than a `2:3` source. Hand/inspect keep only about half the source height; collection keeps only about two-fifths.
- If standalone illustrations place faces, upper torsos, raised arms, or silhouette-identifying details in the upper poster-like third, those elements will be cropped in runtime.
- The layout reserves large non-art areas for stats, name, and rules text. That is the viewport-layout constraint causing the short art windows.

## Recommendation

Do not continue full art production until the team chooses one of these standards:

1. **No renderer/layout change:** adopt the strict composition standard above. This is the safest code path because it preserves current UI behavior, but all images must be generated for the cropped runtime read rather than as full-frame portraits.
2. **Smallest systemic renderer/layout fix:** if preserving poster-like upper-body portraits is preferred, increase the universal artwork viewport height by reducing non-art vertical allocation in `CARD_ZONE_RATIOS`, then regenerate this diagnostic. This is a systemic layout change, not a per-card offset. Avoid manual image offsets and per-card crop logic.

Do **not** apply a universal upward crop-origin adjustment as the first fix. It would save more headroom but would remove even more lower-body/ground context and would diverge from the current center-cover standard without solving collection's very short viewport.

Production-ready standard if no UI change is made:

- Author all card art for a centered runtime window, not for the full `512x768` frame.
- Treat collection (`y 30-70%`) as the strict universal crop.
- Keep the identity read in `x 12-88%`, `y 35-65%`.
- Put face/helmet centers around `43-48%` source height.
- Put no must-survive content in the top `30%` or bottom `30%`.
