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
  ],
  "runtimeOverrides": {
    "example_card_id": {
      "artPositionY": 0.44
    }
  }
}
```


## Canonical runtime contract
- `ArtViewportDebugScene` is **not** a freeform crop editor.
- The blue rectangle is the fixed runtime card-art viewport geometry derived from runtime `zones.art` layout math.
- Rectangle size/position are immutable runtime geometry in this tool.
- Authoring edits only choose which source-image region is visible inside that fixed runtime viewport.
- Exported `runtime.artPositionY01` values must be interpreted by runtime rendering through shared `createCardArtwork(...)` crop behavior.
- Hand / Inspect / Collection / Battle previews must consume the same runtime crop semantics and geometry contract.
- The tool edits source-image framing, not viewport geometry.
- Do not introduce alternate preview scale/stretch logic in debug paths; use the same cover-scale + crop contract as `createCardArtwork(...)`.

## Runtime-ready override export companion
- `records` remains unchanged and is still the debug-first schema.
- Export now also includes a `runtimeOverrides` object for direct use in `cardArtCropOverrides.js`.
- Debug export field: `record.runtime.artPositionY01`.
- Runtime override field: `artPositionY`.
- Mapping rule: `record.runtime.artPositionY01 -> runtimeOverrides[record.cardId].artPositionY`.
- Ignore future fields for now (`future.artPositionX01`, `future.artScale` are not mapped).

Example `runtimeOverrides` section:
```json
{
  "runtimeOverrides": {
    "tank_bruiser_1": { "artPositionY": 0.225 }
  }
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

## Status and authority

- Status: **EXPERIMENTAL** (historical phase note).
- Active state: **obsolete phase artifact**.
- Canonical input behavior: `docs/battle/input-flow.md`.
- Canonical gameplay rules: `docs/rules/mvp-battle-rules.md`.
- Canonical art diagnostic/reality check: `docs/art/card-art-rendering-diagnostic.md`.

Clipboard/export workflow described here is historical experiment context unless promoted by a canonical doc.
