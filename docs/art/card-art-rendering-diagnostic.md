# Card Art Rendering Diagnostic

This is the source-of-truth diagnostic for the current card-art viewport and crop behavior. It covers the runtime modes that can show card artwork before additional large-scale illustration production continues.

## Shared renderer contract

Production card illustrations are authored as portrait WebP assets. The accepted crop contract stores vertical framing intent as normalized `artPositionY` values in the `0..1` range, where `0` means the highest legal crop position, `1` means the lowest legal crop position, and `0.5` is centered. These values are not pixels and do not encode a fixed source-image viewport.

At render time, the shared card preview renderer reconstructs the concrete crop from the active artwork zone, source texture dimensions, cover scale, and effective `artPositionY`. This keeps the crop intent resolution-independent across hand, collection, and inspect card sizes.

Formula:

```text
scale = max(zone.width / sourceWidth, zone.height / sourceHeight)
cropWidth = min(sourceWidth, zone.width / scale)
cropHeight = min(sourceHeight, zone.height / scale)
cropX = (sourceWidth - cropWidth) / 2
maxCropY = sourceHeight - cropHeight
normalizedArtPositionY = clamp(effective artPositionY, 0, 1)
cropY = maxCropY * normalizedArtPositionY
```

For the current portrait sources and all present card-art zones, the zone is wider than the source aspect. That means:

- horizontal source crop is `0px` in normal card modes;
- vertical source crop height is derived from cover scaling for the active artwork zone;
- vertical crop placement is reconstructed from normalized `artPositionY`, not stored pixels;
- crop intent remains portable across renderer sizes because only the normalized legal crop position is persisted;
- there is no per-faction or per-mode responsive art-direction rule in production gameplay rendering;
- production overrides prefer `artPositionY`; legacy `cropY01` and `yOffset` are backward-compatible fallback inputs only.

## Accepted authoring workflow (2026-05-28)

`ArtViewportDebug` is the accepted authoring tool for card artwork vertical framing. The validated workflow is:

1. Generate artwork.
2. Adjust Y in `ArtViewportDebug` while reviewing the runtime card read.
3. Export overrides.
4. Apply the exported values to production override data.

This workflow intentionally tunes the runtime presentation of approved artwork instead of regenerating art repeatedly to solve framing problems.

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

Expected hand variation on common portrait layouts depends on the effective normalized `artPositionY`; the visible crop height remains cover-derived while crop placement is reconstructed dynamically.

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

Inspect is not meaningfully safer than hand. Depending on viewport rounding it can be slightly more or slightly less aggressive, but it remains the same shared renderer path with dynamic normalized `artPositionY` crop placement.

### Board cards / board units

Board units do **not** currently render production card illustration textures. `createBoardUnitView()` draws a compact placeholder artwork panel from rectangles (`artBack`, `artShade`, and `artGround`) inside the board unit frame.

On a representative `390x844` portrait viewport:

| Metric | Value |
| --- | ---: |
| Board cell size | approximately `110.70 x 148.34px` including slot background |
| Unit frame size | `92.70 x 130.34px` |
| Placeholder art viewport | `80.70 x 64.34px` |
| Production texture crop | Not applicable today |

Board-unit artwork currently uses separate board constants for artwork positioning and is not the same production card override path used by Collection/Inspect previews. Do not assume board-unit rendering consumes per-card `artPositionY` overrides until that path is explicitly redesigned.

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

### Collection vs ArtViewportDebug ordering and identity

- Collection card traversal is runtime faction order from `getFactionKeys()`, then deck JSON order within each faction (`deck.forEach(...)`). This is effectively faction deck order (`Tank 5/10`, etc.).
- `ArtViewportDebugScene` currently builds entries from the same runtime factions/decks but then applies a global sort by `card.id`, so selector order is **not** faction deck order.
- To prevent wrong-card tuning, the debug selector label includes canonical deck identity metadata (faction + deck position + cardNumber + card id + localized display name), e.g. `Tank 5/10 • #5 • tank_bruiser_1 • Weteran Złamanego Kła`.

## Cross-mode comparison

| Mode | Production texture active? | Shared crop path? | Crop placement source |
| --- | --- | --- | --- |
| Hand | Yes | Yes | Effective normalized `artPositionY` |
| Hand inspect | Yes | Yes | Effective normalized `artPositionY` |
| Board unit | Yes, compact board art | No | Separate board artwork constants |
| Board inspect | Uses enlarged card frame path when applicable | Same as its preview path | Effective normalized `artPositionY` when production art is enabled |
| Collection | Yes | Yes | Effective normalized `artPositionY` |

The renderer crop is center-cover plus dynamic normalized vertical crop placement. The card layout itself is vertically asymmetrical because the artwork viewport sits below stat badges and above name/text panels. The production contract compensates for perceived runtime framing through explicit `artPositionY` crop intent without changing card layout or introducing per-mode rules.


## Decorative overlay artifact incident (2026-06-07)

A visible horizontal line was discovered inside card artwork previews. The root cause was **not** crop overrides, `artPositionY` tuning, `boardArtPositionY` tuning, WebP compression, source artwork assets, or the crop math above. Several weeks were spent investigating crop tuning and artwork assets before the issue was traced to shared card-preview decorative layers.

Root cause: shared decorative layers in `createCardPreviewView()` overlapped the artwork viewport after the artwork had been rendered. In particular:

1. `artRecessHighlight` rendered after artwork and its lower stroke overlapped the artwork viewport, producing a visible horizontal line near the artwork bottom.
2. `namePanelHighlight` had incorrect vertical positioning, so it rendered inside the artwork area instead of inside the name panel and could create additional horizontal artifacts.

Rendering guardrails from this incident:

- Treat `zones.art` as a protected rendering region: decorative panel highlights, divider strokes, shadows, and later UI polish layers must not overlap artwork content unless they are intentionally clipped to the viewport and explicitly reviewed as part of the art treatment.
- Decorative panel highlights must remain inside their owning panel. For example, name-panel highlights belong inside `zones.name`, not near the artwork boundary.
- When a horizontal artifact appears consistently across many cards, inspect shared UI overlay layers early before assuming asset, crop, compression, or per-card framing problems.
- Future visual QA should verify that decorative strokes and highlights remain outside the artwork viewport in Hand, Inspect, and Collection previews.

Regression coverage should continue to assert that the art recess no longer draws a lower highlight stroke over artwork and that the name-panel highlight stays inside the name panel and outside `zones.art`.

## True safe zones for `512x768` sources

Use source percentages, measured from the top-left of the source image.

### Active production-art modes only

- **Universal visible zone:** `x 0-100%`, approximately `y 27-67%` survives conservative hand, hand inspect, and collection framing when authoring for the shared renderer path.
- **Must-survive focal zone:** keep faces, heads, key silhouettes, weapon tips, readable gestures, and unique props inside `x 12-88%`, `y 32-62%`.
- **Primary face target:** place the face/helmet center around `y 38-44%`; avoid face centers above `35%` unless the head and shoulders still fit below about `27%`.
- **Upper-body target:** place torso mass around `y 48-58%`; keep the top of the head, hair, horns, helmets, banners, and raised weapons below about `27%` if they must survive collection.
- **Lower silhouette target:** keep lower essential silhouette, ground contact, readable lower-body action, mounts, tails, and important prop bases above roughly `y 64-65%`.
- **Danger zones:** top `0-27%` and bottom `67-100%` are not production-safe across all active modes unless the card receives an explicit reviewed `artPositionY` override.

### Hand/inspect approval target

If approving only battle readability, the hand/inspect safe zone is approximately `x 0-100%`, `y 22-72%`, with the strongest focal material in `y 32-62%`.

### Collection approval target

If the collection grid must preserve the same focal read, the stricter safe zone is approximately `x 0-100%`, `y 27-67%`, with strongest focal material in `y 32-62%`.

## Root-cause determination

The current issue is a **mixed composition and viewport-layout issue**, not evidence of a broken crop implementation.

- The renderer is doing what the code specifies: center-cover scaling with concrete crop placement reconstructed from normalized `artPositionY`.
- The active card artwork windows are much shorter than a `2:3` source. Hand/inspect keep only about half the source height; collection keeps only about two-fifths.
- If standalone illustrations place faces, upper torsos, raised arms, or silhouette-identifying details in the upper poster-like third, those elements will be cropped in runtime.
- The layout reserves large non-art areas for stats, name, and rules text. That is the viewport-layout constraint causing the short art windows.

## Decision update (2026-05-28)

The final production contract is normalized runtime crop intent on top of center-cover scaling. Keep this rule universal and deterministic for card preview surfaces:

- Store reviewed framing as `artPositionY` in the `0..1` range.
- Let the renderer reconstruct the concrete source crop dynamically at render time.
- Treat Collection/Inspect previews as authoritative because they use the same shared renderer crop path for production card artwork.
- Keep the identity read in `x 12-88%`, `y 32-62%` when generating new art so only modest Y adjustment is needed.
- Do not store pixel crop rectangles as production intent.
- Do not use source-image viewport authoring as the primary workflow; author against the runtime read in `ArtViewportDebug`.
- Do not rely on repeated artwork regeneration to fix framing when a reviewed `artPositionY` override can preserve approved art.
- Remember that board-unit rendering currently uses separate board constants and is not proof that shared card-preview crop behavior has changed.

## Override precedence update (2026-05-28)

- Per-card art crop overrides now prefer `artPositionY` (normalized legal vertical crop position where `0` is top bound and `1` is bottom bound).
- Legacy `cropY01` and `yOffset` remain backward-compatible inputs only when `artPositionY` is absent.
