# Card Illustration Composition Standard

This document formalizes the production composition rules for Gridfall Tactics card illustrations. For exact runtime viewport measurements and source-space crop percentages, see `docs/art/card-art-rendering-diagnostic.md`. It is an art-pipeline and rendering-guideline document only: do not use it to redesign card UI, gameplay, board layout, or crop logic.

## Production intent

Card illustrations must be authored for the current mobile-first renderer, not for full-frame poster display. The renderer intentionally prioritizes small hand-card readability by using a shared center-cover crop inside the card artwork zone. Future art should therefore be generated, reviewed, and approved against the cropped runtime read rather than against the uncropped `512x768` source alone.

The problem this standard solves is composition readability, not image quality. High-detail cinematic images can fail if their focal point, gesture, or silhouette depends on uncropped top/bottom context, tiny props, edge framing, or multiple competing reads.

Global art direction target: **readable at gameplay glance**. Future prompts should prioritize faster battlefield readability at small size while preserving cinematic dark fantasy/sci-fi quality, premium painterly rendering, faction identity, and rich detail.

## Current rendering audit

### Source asset contract

Production card illustrations are `512x768` portrait WebP files. The source aspect is 2:3, but the runtime artwork windows are landscape-to-near-square zones inside cards and board unit placeholders, so runtime display crops the vertical source substantially.

### Shared card crop behavior

The active card artwork renderer:

1. resolves the loaded illustration texture only when a caller opts in to card illustrations;
2. creates a Phaser image at the artwork-zone center;
3. computes `scale = max(zone.width / sourceWidth, zone.height / sourceHeight)` so the image fully covers the artwork zone;
4. displays the scaled image at `sourceWidth * scale` by `sourceHeight * scale`;
5. sizes the crop rectangle to `zone.width / scale` by `zone.height / scale`;
6. shifts that source crop upward by the shared production bias of approximately `3%` of source height; and
7. falls back to the generic placeholder artwork when no loaded texture exists.

This is a **center-cover crop with one shared upward source-space bias**. It is not a focal-point-aware crop, per-card safe-area crop, responsive art-direction crop, per-mode crop, or custom masked crop. The crop rectangle remains deterministic and universal for card artwork.

### Shared card layout zones

All preview cards share the same proportional internal layout:

- outer padding: approximately `5.5%` of card width on all sides;
- stat badge row: `11.2%` of inner height;
- artwork zone: the remaining area after stat, name, text, and gaps;
- name row: `13.5%` of inner height;
- rules text row: `31.5%` of inner height.

Because hand, inspect, and collection cards all reserve space for stat badges, name, and rules text, the visible illustration window is much shorter than the source portrait image.

### Hand-card artwork visible area

Hand cards enable production illustrations. On common portrait phone viewports, the hand card artwork zone is roughly `90–102px` wide by `67–77px` high. For a `512x768` source, this usually preserves the full source width and about `383–390px` of source height, shifted upward by about `23px` on a `512x768` source.

Practical source-space read: roughly **x `0–512`, y `166–556`** on a `390x844` phone-size layout. In other words, hand cards typically discard about **49–50% of the source height total**, with less loss at the top than the bottom because of the shared upward bias. The hand-card crop is one of the strictest production reads and should be treated as a primary approval target.

### Inspect-card artwork visible area

Hand inspect / zoom cards also enable production illustrations and reuse the same shared preview renderer. The inspect card is larger on screen, but it is vertically compacted relative to the hand-card aspect to fit the tactical board lane. That changes the artwork-zone aspect and can make the vertical crop slightly more aggressive.

Practical source-space read on common portrait phone layouts: approximately **x `0–512`, y `171–551`**, preserving about **379–386px** of source height and discarding about **50% of the source height total** split across top and bottom. Inspect cards improve pixel size, but they do not recover lost top/bottom composition context.

### Collection-card artwork visible area

Collection cards enable production illustrations through the same preview renderer. A two-column mobile collection grid is the strictest active production-art crop and must be checked against the diagnostic safe zone.

Practical source-space read on common portrait phone layouts: approximately **x `0–512`, y `205–517`**, preserving about **309–312px** of source height and discarding about **59–60% of the source height total** split across top and bottom.

### Board-card artwork behavior

Board slots and compact board units currently do **not** render production illustration textures. The board renders slot backgrounds plus compact unit cards with stat badges, a simple placeholder art panel, name text, owner accent, and tactical highlights. Board inspect deliberately disables production illustrations for board units and uses the same card detail shell without art textures.

Board rendering therefore currently uses **reserved/placeholder artwork zones**, not production card illustrations. If future board-card variants wire production art into those zones, the board art panel can reveal slightly more vertical source area than hand cards because its compact unit art region is closer to a board-token window than a text-heavy full card. Typical equivalent source visibility would be around **397–410px** of source height, depending on viewport.

### Does the crop differ between views?

Yes, but only because the artwork-zone dimensions differ. The crop algorithm is the same center-cover algorithm plus the same `3%` upward source-space bias for every illustration-enabled card view. There is no per-view focal crop metadata. Per-card override data now prefers `cropY01` (normalized legal vertical crop position) with legacy `yOffset` retained as backward-compatible fallback when `cropY01` is missing.

| Surface | Production illustration textures? | Current behavior | Typical visible source from `512x768` |
| --- | --- | --- | --- |
| Hand cards | Yes | Shared center-cover crop with ~3% upward source-space bias | Full width, biased ~`383–390px` height |
| Hand inspect / zoom | Yes | Shared biased crop in vertically compact inspect card | Full width, biased ~`379–386px` height |
| Collection cards | Yes | Shared biased crop | Full width, biased ~`309–312px` height |
| Board slots | No | Empty tactical slots | No card illustration |
| Board compact units | No | Placeholder art panel plus stats/name | No production illustration; future zone would be center-cover-like if enabled |
| Board inspect | No | Detail shell with illustration disabled | No production illustration |

## Formal composition rules

### Prompting language baseline (global)

Future illustration prompts and internal generation templates should naturally include these concepts:

- strong focal separation;
- clean readable silhouette;
- higher midtone readability;
- clear value hierarchy;
- mobile TCG readability;
- gameplay-first composition;
- readable at small size;
- subject separation from background.

These are composition/value priorities, not mandates for generic brightness or neon highlights.

### AI Crop Guidance Artifacts

When generating card illustrations:

- The artwork may be composed with a clear focal area suitable for card crops.
- The artwork may remain readable after cropping.
- The artwork may support hand, board, and inspect presentation.

However:

- Never generate visible crop guides.
- Never generate tonal bands intended to separate "visible" and "non-visible" areas.
- Never generate horizontal or vertical transition lines meant to assist future crops.
- Never create brightness zones that imply a crop boundary.
- Never create hidden framing markers.
- Never create composition helper bands.
- Never create subtle horizon-like separators unless they are a natural part of the scene itself.

The image must look like a complete standalone illustration.

Any future crop should reveal different portions of a natural image rather than exposing artificial "safe area" transitions.

### 1. Central focal point is mandatory

Every illustration must have one dominant focal read centered in the source. The primary subject can be a character, creature, object, machine, ritual core, explosion core, location landmark, symbolic shape, or abstract phenomenon, but it must read when only the middle band of the image survives.

Do not rely on top-of-frame faces, bottom-of-frame hands, edge weapons, off-center environmental landmarks, or cinematic negative space as the main read.

### 2. Silhouette first, detail second

The first read at hand-card size must be a clear silhouette or dominant shape. Detail should support that shape, not replace it. If the subject only becomes understandable through tiny costume parts, dozens of figures, particle specks, UI-like symbols, or background lore objects, the composition is not production-safe.

### 3. One gesture, one silhouette, one gameplay read

Prefer one decisive action or emblematic pose. Unit cards should communicate attitude, threat, mass, motion, or role through a single dominant silhouette. Effect cards should communicate one primary event or object: a beam, trap, ritual circle, command signal, shield impact, swarm wave, broadcast glitch, etc.

### 4. Mobile hand-card readability wins

The hand card is the strictest gameplay surface because it is small, always visible during decisions, and cropped aggressively. Art must pass the hand-card read before it is approved for collection or inspect beauty. Inspect and collection may look richer, but they cannot rescue a weak hand-card composition.

### 5. Detail density must be controlled

Acceptable detail density:

- large shapes with medium details grouped inside them;
- readable value separation between subject and background;
- a few supporting props or faction identifiers inside the safe zone;
- texture that survives downscaling as tone, not noise.
- higher midtone readability so the primary form still reads in dark atmospheric scenes.

Unacceptable detail density:

- wallpaper-like fields of equally important small shapes;
- many tiny characters or props competing for focus;
- particle storms that obscure the silhouette;
- intricate armor, machinery, or architecture that collapses into visual static;
- background detail with equal contrast to the subject.
- muddy midtones that collapse form separation at card size.

### 6. Background complexity must be subordinate

Backgrounds should frame the focal shape and provide faction atmosphere. They should not become the focal read unless the card is intentionally an environment/location card, and even then the environment needs one dominant landmark centered in the safe zone.

Use simplified value blocks, broadcast framing shapes, directional light, atmospheric gradients, or large faction motifs. Avoid high-contrast background clutter behind the subject.

Subject separation from background is required even in dark palettes. Avoid fully dark subjects on equally dark backgrounds unless value or edge lighting still keeps the silhouette readable at hand-card size.

### 7. Dominant shape language must fit gameplay recognition

The dominant read should help the player quickly distinguish card intent:

- aggressive cards: forward thrust, sharp diagonal, impact, chase, pounce, overextension;
- defensive cards: block, shield, wall, bulwark, brace, containment;
- control cards: signal, command, manipulation, puppet lines, tactical geometry;
- swarm cards: one massing wave or cluster silhouette, not dozens of equal tiny bodies;
- attrition/death cards: decay, collapse, sacrifice, aftermath, draining flow;
- support/heal/buff cards: centered source, aura, repair, reinforcement, broadcast blessing.

These are readability cues only; they must not imply mechanics that the card does not have.

### 8. Edges are expendable

The top, bottom, and outer edge bands of the source are not safe for essential information. Edge content may include atmosphere, cropped limbs, weapon continuation, architecture, particles, smoke, audience lights, signal noise, or other non-critical overflow.

No card name, rules text, faction label, number, UI frame, critical symbol, or must-read object may live near the source edge.

### 9. Crop-safe, not crop-dependent

The source should still look coherent when viewed uncropped, but production approval is based on crop survival. Do not compose images where the full portrait frame is required to understand scale, joke, action, or identity.

### 10. No baked gameplay/UI information

Artwork remains language-neutral and UI-neutral. Do not bake names, stats, rules text, card numbers, faction labels, card borders, targeting icons, or localization-dependent signage into the image.

## Safe-zone standard for `512x768` sources

Use these source-space zones when briefing, generating, cropping, and reviewing art. The collection grid is the strictest active production-art crop, so universal production safety means surviving approximately y `205–517`, not only the hand-card read.

### Universal visible zone

- **Normalized:** full width by approximately y `27–67%`.
- **Pixel guide:** x `0–512`, y `205–517`.
- **Purpose:** content in this band is expected to remain visible across hand, hand inspect, and collection. Content outside this band may still appear in hand/inspect, but it is not universal.

### Must-survive zone

- **Normalized:** x `12–88%`, y `32–62%`.
- **Pixel guide:** x `61–451`, y `246–476`.
- **Purpose:** the dominant silhouette, primary gesture, face/core/object, and gameplay-readable action must remain understandable inside this zone.

This zone is conservative enough to survive hand, inspect, and collection crops without per-card renderer metadata.

### Recommended focal-point target

- **Normalized:** center `40%` width; face/helmet center around y `38–44%`, with upper torso/main mass around y `48–58%`.
- **Pixel guide:** x `154–358`, with the face/helmet center around y `292–338` and upper torso/main mass around y `369–445`.
- **Purpose:** place the strongest focal point here: head/torso center, monster core, weapon impact, ritual center, explosion heart, command signal, key object, or environment landmark.

The focal point can extend beyond this target, but the read should still be obvious if only the central band is visible at hand-card scale.

### Safe supporting-content zone

- **Normalized:** center `90%` width by y `27–67%`.
- **Pixel guide:** x `26–486`, y `205–517`.
- **Purpose:** important secondary props, faction identifiers, readable limbs, major effects, and composition cues should fit here. Lower essential silhouette, ground contact, mounts, tails, and important prop bases should stay above roughly y `64–65%` (`492–499px`).

The most important read must remain inside the must-survive zone.

### Edge danger zones

- **Left/right danger:** outer `5–10%` of width, x `0–26` and `486–512` for universal support safety, with x `0–61` and `451–512` unsafe for must-survive identity.
- **Top danger:** approximately y `0–205`; hand/inspect remove most of the top fifth, and collection removes nearly the top `27%` after the upward bias.
- **Bottom danger:** approximately y `517–768`; bottom loss is larger because the crop is intentionally biased upward, and collection removes roughly the bottom `33%`.

Use danger zones only for bleed, atmosphere, non-essential environment, partial motion trails, cropped limbs, particles, smoke, audience lights, or background continuation.

### Optional atmospheric overflow zones

The outer `5–10%` of all sides can contain decorative overflow if it improves the full source image. It must remain expendable. If removing it changes card identity, the composition is not crop-safe.

## Gameplay readability principles

- **One dominant gesture:** the player should immediately understand the action or role without scanning.
- **One dominant silhouette:** avoid equal-weight groups unless they merge into one readable mass.
- **One dominant value contrast:** keep the brightest or highest-contrast area aligned with the focal point.
- **Strong focal separation:** the focal read should pop through shape and value structure before fine details resolve.
- **Clear value hierarchy:** establish primary, secondary, and tertiary value groups; avoid overly uniform tonal ranges.
- **Higher midtone readability:** preserve enough midtone separation that forms do not merge into a single dark block.
- **Reduced competing focal points:** secondary shapes should support the primary read and be lower contrast or smaller.
- **No wallpaper compositions:** avoid full-frame decorative patterns, crowd scenes, object inventories, or lore collages as primary card art.
- **No off-center cinematic framing:** avoid subjects pushed to thirds, cropped to the side, or dependent on negative space outside the center.
- **No micro-detail dependency:** tiny facial expressions, small text, mini props, distant armies, or fine linework cannot be required for comprehension.
- **Immediate card-type distinction:** unit art should read as a subject/actor; effect art should read as an event, command, field state, object, or force.
- **Readable faction flavor:** faction style should be visible through broad motifs, color, material, and shape language rather than hidden tiny props.
- **Gameplay truthfulness:** art may dramatize a card, but it should not imply unrelated targeting, board position, damage scale, or faction identity.
- **Gameplay-first composition:** beauty and atmosphere should support fast tactical reading, not fight it.

### Visual direction constraints (do / do not)

Maintain:

- cinematic quality;
- dark fantasy/sci-fi atmosphere;
- premium painterly rendering;
- faction identity and stylistic diversity;
- rich detail that supports the focal read.

Do not:

- flatten global contrast to chase safety;
- oversaturate art to force readability;
- force glowing focal points in every composition;
- homogenize factions into one tonal or stylistic look.

Improve clarity through composition and value structure, not generic brightness.

## Board-vs-hand production stance

Future artwork should optimize in this order:

1. **Hand readability:** primary approval target because hand cards are the most frequent and smallest decision surface.
2. **Shared crop-safe standard:** all production illustrations must survive the same central-safe composition without custom crop metadata.
3. **Inspect and collection checks:** inspect may show more pixels and collection is the strictest active crop; neither view may contain the only complete version of the read.
4. **Board variants:** board cards may intentionally reveal slightly more illustration context in the future, but board readability should not become the art target unless the board renderer is explicitly redesigned.

A universal crop-safe standard is sufficient for the current pipeline and preferred for future variants. Board cards could reveal slightly more context if production textures are added later, but artwork must not depend on that extra board context because board production illustrations are not currently active and collection is the strictest active crop.

## Final production generation standard

Use this checklist for every future card illustration prompt and art review:

- Source is `512x768`, portrait 2:3, WebP-ready, no baked UI/text.
- Primary read is centered, with the face/helmet focal point around x `154–358`, y `292–338`.
- Upper torso/main mass sits around y `369–445`.
- Dominant silhouette and gesture survive inside x `61–451`, y `246–476`.
- Important supporting cues stay inside x `26–486`, y `205–517`, with lower essential silhouette above roughly y `492–499`.
- Upper and lower edge bands are treated as expendable atmosphere unless they overlap the central subject.
- The image still reads when cropped to the middle ~`309–390px` of height.
- The hand-card thumbnail read is clear before inspecting the full source.
- Inspect artwork at 100% zoom and verify that no horizontal or vertical tonal seams, crop-guide artifacts, or composition helper bands are present.
- There is one dominant gesture, one dominant silhouette, and one dominant focal point.
- Background contrast and detail are lower priority than the subject.
- Faction flavor is expressed through broad shapes, colors, materials, and motifs.
- Edge content can be cropped without losing gameplay meaning.
- No per-card rendering rules are required.
