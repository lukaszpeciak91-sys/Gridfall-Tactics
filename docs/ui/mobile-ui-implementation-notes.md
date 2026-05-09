# Mobile UI Implementation Notes

_Last updated: UI stabilization pass before final art/canvas polish._

## Current BattleScene UI responsibilities

`BattleScene` still owns a mix of runtime gameplay flow and UI rendering. The main mixed responsibilities are:

- Battle state setup, mulligan state, turn sequencing, enemy action reveal, combat resolution timing, and result routing.
- Board, hero panels, action button, gameplay deck counter/info panel, hand frame, hand card previews, bottom navigation, result modal, feedback banners, and combat/buff animations.
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
- Card selection previews may rise from the hand, but they should not cover the action button or bottom navigation row in normal portrait layout.
- Result modal overlays intentionally block gameplay input after a winner is set.
- Lifecycle rebuilds should redraw from the current `GameState` without changing card rules, turn rules, combat, or AI decisions.

## Background/art safe zone

- Background art should be treated as decorative behind the current battle frame.
- Keep high-contrast gameplay elements inside the existing layout bands: enemy hero, board, player hero, action, hand.
- Avoid placing critical art details under the hand band, bottom controls, build marker, result modal, or fullscreen safe-area letterboxing.
- Future art/canvas polish should not assume extra horizontal space; forced-landscape fullscreen can narrow the visible portrait canvas.

## Hand/card interaction rules

- Opening mulligan uses `selectedMulliganCardIds` and `previewedMulliganCardId`; it must not set gameplay `selectedCardId`.
- Normal gameplay card selection uses `selectedCardId`; pointer-up only reveals a visual zoom preview and does not create a separate focus/input mode.
- Tapping a selected hand card again toggles it off during gameplay.
- Tapping outside the hand clears selection only when the pointer-up is not reserved for a card, board cell action, PASS/action button, gameplay deck counter/info panel, or bottom navigation control.
- Mulligan selection state is highlighted independently from gameplay card selection.
- Empty hand slots remain non-interactive and visually muted.


## Faction select cards and preview assets

- `FactionSelectScene` uses large, vertical, mobile-friendly faction cards instead of prototype text buttons. Each card reserves a 16:9 artwork area at the top, then shows the faction name, a short playstyle description, and compact tag pills such as Fast pressure, Armor sustain, Control tools, and Swarm board.
- Tapping anywhere on a faction card starts a battle with that faction. The card list is vertically scrollable so the layout can remain portrait-friendly on shorter mobile screens.
- The scene attempts to load each preview image from `public/assets/factions/<faction-id>/preview.webp`, where the current faction folders are `aggro`, `tank`, `control`, and `swarm`. Expected future files are:
  - `public/assets/factions/aggro/preview.webp`
  - `public/assets/factions/tank/preview.webp`
  - `public/assets/factions/control/preview.webp`
  - `public/assets/factions/swarm/preview.webp`
- Faction preview image spec: filename `preview.webp`; WebP format; recommended size `1024x576 px`; `16:9` landscape aspect ratio; keep important center content visible even if scaled or cropped; avoid important text inside the image.
- If a preview image is missing, the card draws a clean faction-colored gradient fallback panel with no broken image icon and no gameplay crash.
- Codex only created text documentation and directory keepers for this asset pipeline; no binary faction artwork or placeholder images are included.

## Controls behavior

- Bottom navigation controls are shared across faction select and battle screens.
- Battle bottom controls are anchored to the hand control row so they do not drift into the card row.
- Battle bottom controls contain only Back, Rules/Help, and Fullscreen; gameplay card/deck state is not shown in this navigation row.
- Back exits battle through cleanup and returns to faction select.
- Rules opens `RulesPanelScene` over the current scene and resumes the same battle state afterward.
- Fullscreen toggles Phaser fullscreen and requests portrait orientation when entering fullscreen.
- A compact `DECK N` gameplay counter sits to the right of the action button in the action band, away from the hand and bottom navigation controls.
- Tapping `DECK N` opens a read-only Deck Info panel for the player cards. It groups card status as In Deck, In Hand, Played / Discarded, and On Board; each entry shows card name, Unit/Effect type, and count.
- In-game overlays, including Rules / How To Play and Deck Info, dim gameplay behind the panel, reserve pointer input while open, and restore gameplay input only after dismissal.
- In-game overlays do not use top-right `X` close controls. The standard dismissal pattern is a centered, bottom-aligned `BACK` button sized for mobile tapping plus tap/click outside the panel.
- Tapping outside an in-game overlay closes only that overlay; the dimmed overlay layer consumes the tap so underlying gameplay controls do not also act on it.
- Deck Info can be viewed during the opening mulligan, is blocked while battle flow animations are resolving, and keeps masked scrolling available when card groups exceed the reduced panel height.
- The action button reads `KEEP HAND`/`MULLIGAN N` during the opening mulligan and `PASS` afterward.

## Regression checklist coverage

Use this checklist for manual smoke testing before art/canvas changes, and keep automated coverage aligned with these flows:

- [ ] faction select → battle starts a fresh `BattleScene` without stale interactive objects.
- [ ] Mulligan select/unselect/confirm keeps selection visual, replaces up to two cards, and enters the first turn.
- [ ] post-Mulligan card select/play keeps pointer-down selection and pointer-up preview behavior intact.
- [ ] PASS consumes the player action only when passing is legal.
- [ ] `DECK N` appears to the right of PASS/KEEP HAND, opens the Deck Info panel, blocks gameplay input, and closes from either the bottom `BACK` button or an outside overlay tap.
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
