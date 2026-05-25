# Art Viewport Debug Tool — PR 2 Runtime Preview + Y Controls

PR 2 adds the first usable internal runtime preview workflow for mobile calibration.

## Included in PR 2
- Card selector with deterministic ordering and large Prev/Next controls.
- Hand and Inspect preview cards rendered through `createCardPreviewView(...)`.
- Illustration rendering enabled in both previews (`enableCardIllustration: true`).
- Shared temporary runtime Y override (`temporaryArtCropY01`) applied to both previews.
- Large `Y -` / `Y +` controls for repeated tapping.
- Step toggle (`0.010`, `0.025`, `0.050`) for fine/coarse adjustments.
- Live readout of `artPositionY01`.
- Reset button that restores the selected card's current/default runtime Y value.
- Disabled/future-only readout for X and Scale.

## Behavioral model
The tool follows one fixed rule:

- **Fixed viewport, movable artwork underneath.**

The card frame/viewport does not move. The artwork framing changes only by adjusting temporary runtime Y.

## Explicit limits in PR 2
- Y-only runtime adjustment.
- No X runtime adjustment.
- No scale runtime adjustment.
- No clipboard export.
- No persistence.
- No writes to card data or `cardArtCropOverrides`.
- No production scene behavior changes.

## Usage
1. Open `Art Viewport Debug` from Main Menu.
2. Use `Prev` / `Next` to choose a card.
3. Tap `Y -` / `Y +` to move artwork under the fixed viewport.
4. Use `Step Toggle` for smaller/larger increments.
5. Tap `Reset` to restore that card's default/current runtime Y baseline.
6. Compare Hand and Inspect previews; both share the same temporary Y value.
