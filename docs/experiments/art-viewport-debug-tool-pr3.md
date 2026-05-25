# Art Viewport Debug Tool — PR 3 Clipboard Export + MVP Polish

PR 3 completes the MVP visual calibration/export loop for art framing.

## Included in PR 3
- `Copy current` action:
  - Builds a deterministic record for the currently selected card.
  - Copies that record payload to clipboard.
  - Stores/updates the card in an in-session pending records collection.
  - Re-copying the same card updates (replaces) that card record instead of duplicating it.
- `Copy all` action:
  - Exports only records that were explicitly copied during this debug session.
  - Sorts records by `cardId` for deterministic output.
  - Copies deterministic JSON to clipboard.
- Pending records count readout (`Records: N`).
- Selector restore behavior:
  - Selecting a card restores the collected Y value if that card is already in pending records.
  - Otherwise, selection uses the card baseline/default Y.
- Clipboard fallback/status messaging:
  - Success statuses (`Copied current record`, `Copied all records`).
  - Visible error/fallback status when clipboard API is unavailable/fails.
  - Visible fallback export text shown for manual copy when needed.
- Mobile UX polish:
  - Copy controls separated from Y movement controls.
  - Readable status and record count in the control dock.
  - X/Scale remain visible as disabled/future-only.

## Deterministic export format
```json
{
  "version": 1,
  "tool": "art-viewport-debug",
  "records": [
    {
      "cardId": "example_card_id",
      "shared": true,
      "runtime": {
        "artPositionY01": 0.44
      },
      "future": {
        "artPositionX01": 0.5,
        "artScale": 1
      }
    }
  ]
}
```

## Workflow (phone-friendly)
1. Open `Art Viewport Debug` from Main Menu.
2. Select a card using `Prev` / `Next`.
3. Adjust Y using `Y -` / `Y +` and `Step Toggle`.
4. Tap `Copy current` to capture that card.
5. Repeat for additional cards.
6. Tap `Copy all` to export all collected records in deterministic JSON.
7. Paste exported JSON into Codex later for a separate **manual** patching task.

## Explicit boundaries retained
- No persistence.
- No writes to `cardArtCropOverrides`.
- No automatic patching.
- No runtime schema changes.
- No production renderer/Battle/Collection changes.
- X and Scale remain future-only (not runtime-adjustable in this MVP).
