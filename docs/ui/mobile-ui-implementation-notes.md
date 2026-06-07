# Mobile UI Implementation Notes

_Last updated: UI stabilization pass before final art/canvas polish._

## Current BattleScene UI responsibilities

`BattleScene` still owns a mix of runtime gameplay flow and UI rendering. The main mixed responsibilities are:

- Battle state setup, mulligan state, turn sequencing, enemy action reveal, combat resolution timing, and result routing.
- Board, hero/player-base panels, gameplay deck counter/info panel, hand frame, hand card previews, bottom navigation, result modal, targeting/action banners, and combat/buff animations.
- Lifecycle recovery for fullscreen, viewport resize, rules/menu overlays, and WebGL restore.

Safe cleanup completed in this pass intentionally stayed small:

- Hand frame/control-row sizing now uses a pure shared helper so spacing can be tested without booting Phaser.
- Build marker rendering now uses a shared helper instead of duplicating text style in multiple scenes.
- The old scene-local floating-control helper was removed from `BattleScene`; bottom controls continue to use the shared navigation helper.

## Mobile portrait assumptions

- The game targets a portrait mobile canvas around the existing 390 × 844 design baseline.
- The shell requests portrait orientation and keeps a centered portrait frame if fullscreen lands in a wide/landscape viewport.
- Touch controls assume a minimum 48 px hit target for bottom navigation and hand controls.
- The battle UI should remain readable at the current portrait aspect before any background art is added.

## Safe gameplay zone

- The board and hero panels are the primary gameplay-readability zone.
- Card selection previews may rise from the hand, but they should not cover the player base, deck/menu controls, or bottom navigation row in normal portrait layout.
- Result modal overlays intentionally block gameplay input after a winner is set.
- Lifecycle rebuilds should redraw from the current `GameState` without changing card rules, turn rules, combat, or AI decisions.

## Background/art safe zone

- Background art should be treated as decorative behind the current battle frame.
- Keep high-contrast gameplay elements inside the existing layout bands: enemy hero, board, player hero, action, hand.
- Avoid placing critical art details under the hand band, bottom controls, build marker, result modal, or fullscreen safe-area letterboxing.
- Future art/canvas polish should not assume extra horizontal space; forced-landscape fullscreen can narrow the visible portrait canvas.

## Hand/card interaction rules

- Opening mulligan uses `selectedMulliganCardIds` and `previewedMulliganCardId`; it must not set gameplay `selectedCardId`. Hand-card long-press inspect remains available, but board gameplay input is blocked until mulligan confirmation.
- Normal gameplay card selection uses `selectedCardId`; pointer-up only reveals a visual zoom preview and does not create a separate focus/input mode. Targeted effect cards show their first selection instruction as soon as their targeting session starts.
- Tapping a selected hand card again toggles it off during gameplay.
- Tapping outside the hand clears selection only when the pointer-up is not reserved for a card, board cell action, player-base PASS/mulligan control, gameplay deck counter/info panel, utility menu, or bottom navigation control. Interrupted pointer gestures clear local press/timer bookkeeping without triggering tap behavior.
- Mulligan selection state is highlighted independently from gameplay card selection.
- Empty hand slots remain non-interactive and visually muted.


## Faction select cards and preview assets

- `FactionSelectScene` uses compact mobile faction cards with the header copy `SELECT YOUR TEAM` and the subtitle `Tap a faction to begin battle`. The header is intentionally smaller and more cinematic than the earlier prototype label.
- Each faction card is wider and noticeably shorter than the previous tall layout: cards are up to `382 px` wide, `164 px` tall, and separated by a `12 px` vertical gap. This reduces card height by roughly 36% from the previous `258 px` card while keeping the full card as the tap target.
- The card layout is poster-first: artwork is the dominant visual element, the faction name sits near the lower-left region of the banner, flavor text follows beneath it, and gameplay chips sit in the upper-right region as metadata rather than primary content. Visual hierarchy is Artwork → Faction Name → Flavor Text → Gameplay Chips, so the card feels like a premium broadcast poster rather than a menu row.
- Current mobile descriptions are intentionally concise for all 6 base factions: `Fast pressure.`, `Armor and sustain.`, `Disrupt and reposition.`, `Board swarm tactics.`, `Defensive friction and zone control.`, and `Death value and recursion.` Tags are two short chips per faction to avoid paragraph-like card text.
- Tapping anywhere on a faction card starts a battle with that faction. A subtle press overlay provides tap feedback, and the list remains vertically scrollable for shorter portrait screens.
- The scene attempts to load each preview image from runtime URL `/assets/factions/<faction-id>/preview.webp`, backed by source files at `public/assets/factions/<faction-id>/preview.webp`, where the current faction folders are `aggro`, `tank`, `control`, `swarm`, `wardens`, and `attrition-swarm`. Expected files are:
  - `public/assets/factions/aggro/preview.webp`
  - `public/assets/factions/tank/preview.webp`
  - `public/assets/factions/control/preview.webp`
  - `public/assets/factions/swarm/preview.webp`
  - `public/assets/factions/wardens/preview.webp`
  - `public/assets/factions/attrition-swarm/preview.webp`
- Gameplay card illustrations use the single canonical source `public/assets/cards/{factionId}/{artAssetId}.webp` and runtime URL `/assets/cards/<faction-id>/<art-asset-id>.webp`.
- `public/assets/factions/` is limited to faction-level preview/banner/UI assets and must not contain gameplay card-art subfolders.
- Faction preview/banner image spec: generate source art at `1920x1080` (`16:9`), export runtime `preview.webp`, and store it at `public/assets/factions/<faction-id>/preview.webp`. Artwork is generated at high resolution because runtime uses cover-crop and mobile faction-select cards display only a portion of the original image.
- Mobile crop lessons from production: aggressive center crop means critical storytelling elements must remain inside the central `60%` of the image, important elements should sit lower than traditional key art, focal points should not sit near top edges, distant horizon details should not carry the primary read, and large readable silhouettes outperform detailed scenes. Successful banners keep the primary faction symbol recognizable after heavy crop; banner readability beats full-image beauty.
- If a preview image loads, it renders as a cover-cropped banner. If `preview.webp` is missing, the card draws a clean faction-colored gradient fallback with no broken-image icon and no gameplay crash.
- Artwork will be manually uploaded later by the user. Codex only created text documentation and empty directory keepers for this asset pipeline; no binary faction artwork or placeholder images are included.

## Controls behavior

- Bottom navigation controls are shared across faction select and battle screens.
- Battle bottom controls are anchored to the hand control row so they do not drift into the card row.
- Battle bottom controls contain only Back, Rules/Help, and Fullscreen; gameplay card/deck state is not shown in this navigation row.
- Back exits battle through cleanup and returns to faction select.
- Rules opens `RulesPanelScene` over the current scene and resumes the same battle state afterward.
- Fullscreen toggles Phaser fullscreen and requests portrait orientation when entering fullscreen.
- A compact `DECK N` gameplay counter sits beside the player base controls, away from the hand and bottom navigation controls.
- Tapping `DECK N` opens a read-only Deck Info panel for the player cards. It groups card status as In Deck, In Hand, Played / Discarded, and On Board; each entry shows presentation-aware card name, Unit/Effect type, and count through the deck-summary render mode so localization can later change labels without changing gameplay data.
- Card UI uses one card data source with multiple display modes: hand cards now use the HAND/FULL render mode with presentation-aware name, relevant unit stats, and `textShort`; full detail labels can include short rules text, while board/compact labels may use presentation-aware names but must remain name plus ATK/HP/ARM-style stats only. Future board tap or long-press previews can expose full rules text without crowding the combat board.
- Card artwork remains language-neutral; localized strings should come from display adapters and render-mode formatting rather than from art assets.
- In-game overlays, including Rules / How To Play and Deck Info, dim gameplay behind the panel, reserve pointer input while open, and restore gameplay input only after dismissal.
- In-game overlays do not use top-right `X` close controls. The standard dismissal pattern is a centered, bottom-aligned `BACK` button sized for mobile tapping plus tap/click outside the panel.
- Tapping outside an in-game overlay closes only that overlay; the dimmed overlay layer consumes the tap so underlying gameplay controls do not also act on it.
- Deck Info can be viewed during the opening mulligan, is blocked while battle flow animations are resolving, and keeps masked scrolling available when card groups exceed the reduced panel height.
- The player base owns the action label: it reads `KEEP HAND`/`MULLIGAN N` during the opening mulligan, then shows HP plus `PASS` when pass is legal. Holding the base triggers surrender only in concedable contexts.
- Controller play/redeploy uses explicit manual unit-on-play targeting; Hacker keeps its automatic lane behavior.
- Persistent targeting/swap instructions and transient action/turn banners are centrally coordinated so transient notices defer rather than overlap.


## Card preview decorative-layer guardrails

Shared card previews treat the artwork viewport as a protected rendering region. Decorative strokes, highlights, shadows, dividers, or polish layers must not overlap the artwork content unless that overlap is an intentional, reviewed artwork treatment.

A historical horizontal-line artifact in card artwork previews was traced to shared preview chrome rather than crop overrides, `artPositionY` / `boardArtPositionY` tuning, WebP compression, source assets, or crop math. The problematic layers were `artRecessHighlight`, whose lower stroke overlapped the artwork viewport after artwork rendering, and `namePanelHighlight`, whose vertical position placed it inside the artwork area instead of inside the name panel.

Future UI polish should check overlay geometry early when a line appears consistently across many cards: confirm panel highlights stay inside their owning panels, confirm name-panel highlights stay inside `zones.name`, and confirm no decorative stroke crosses `zones.art` in Hand, Inspect, or Collection previews.

## Regression checklist coverage

Use this checklist for manual smoke testing before art/canvas changes, and keep automated coverage aligned with these flows:

- [ ] faction select → battle starts a fresh `BattleScene` without stale interactive objects.
- [ ] Mulligan select/unselect/confirm keeps selection visual, replaces up to two cards, and enters the first turn.
- [ ] post-Mulligan card select/play keeps pointer-down selection and pointer-up preview behavior intact.
- [ ] PASS consumes the player action only when passing is legal.
- [ ] `DECK N` appears beside the player base, opens the Deck Info panel, blocks gameplay input, and closes from either the bottom `BACK` button or an outside overlay tap.
- [ ] fullscreen enter/exit preserves the active battle state and rebuilds the view from `GameState`.
- [ ] retry/back clean up result modal and transient input state before restarting or exiting.
- [ ] win/loss modal appears through delayed battle completion and its retry/exit buttons remain tappable.

## Remaining UI risks

- `BattleScene` still contains rendering, input routing, animation, lifecycle recovery, and gameplay-flow orchestration in one class. Larger extraction should wait until the art/canvas direction is clear.
- Source-regex regression tests protect several UI contracts but do not replace end-to-end pointer testing in a real browser/mobile viewport.
- Selected-card zoom is visual-only, but long card names/effect text can still crowd small cards until final card art/text treatment is designed.
- Fullscreen/orientation behavior depends on browser support for orientation lock and fullscreen APIs; unsupported browsers fall back to fit/rebuild behavior.
- Result modal dimensions are stable for current portrait assumptions but should be rechecked once final background contrast and canvas effects are added.

## Recommended next UI polish tasks

1. Capture a mobile portrait screenshot baseline before adding background art.
2. Add final background art under the existing safe-zone constraints before changing gameplay layers.
3. Prototype final card face typography inside the current hand layout before increasing overlap or adding drag gestures.
4. Add browser-driven smoke coverage for fullscreen enter/exit and result modal retry/exit when the test harness supports it.
5. Split battle rendering helpers further only after repeated art changes make the boundaries obvious.
