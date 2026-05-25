---
status: EXPERIMENTAL
active_state: planning-only
---

# Art Framing Tool v2 — Inspect-Only Prototype Plan

## 1) Recommended architecture
- Add a **mode switch inside existing Collection crop debug tooling** (`Crop Debug` / `Art Framing`).
- Keep the existing crop pipeline untouched for production card rendering.
- In `Art Framing` mode, apply an **inspect-only transform layer** to the illustration object:
  - fixed viewport/window (card art zone)
  - image moves/scales behind it
  - frame/title/stats remain unchanged
- Implement this as a dedicated inspect-preview adapter (e.g. `applyInspectArtFrameTransform(preview)`), not as a global rendering rewrite.

## 2) Recommended data format
Use normalized placement values that describe image placement relative to the viewport, not source crop extraction:

```json
{
  "artFrame": {
    "x": 0.00,
    "y": -0.12,
    "scale": 1.08
  }
}
```

Guidelines:
- `x`, `y`: normalized offsets from viewport center (`-1..1` conceptual domain; clamp narrower in UI e.g. `-0.4..0.4`).
- `scale`: multiplicative zoom (`1.0` default, clamp e.g. `0.85..1.35`).
- Keep **inspect-session overrides separate** from persisted production schema initially.

## 3) Safe prototype scope
- **Only in Collection inspect preview**.
- No board renderer changes.
- No hand renderer migration.
- No removal of legacy crop debug.
- No gameplay coupling.

## 4) Recommended debug UI structure
Inside current debug panel:
- Mode segmented toggle:
  - `[ Crop Debug ]`
  - `[ Art Framing ]`
- Art Framing controls (minimal/noisy-overlays avoided):
  - `↑ ↓` for vertical nudge
  - optional `← →` for horizontal nudge
  - `+ / -` for scale
  - `Reset`
  - live value readout `x / y / scale`
- Keep only a subtle viewport outline in framing mode (optional), disable dense crop telemetry there.

## 5) Risk analysis
### Phaser mask lifecycle
- Risk: leaked geometry masks/graphics objects when preview is reopened repeatedly.
- Mitigation: create mask once per inspect preview instance and explicitly destroy mask shape + mask when closing preview.

### Depth/layering
- Risk: framed art drawing above text/stats if depth/order is altered.
- Mitigation: do not change display-list ordering; only mutate art transform.

### Performance
- Risk: per-frame mask rebuilds or object recreation.
- Mitigation: no per-frame rebuild; only update transform on control input.

### Renderer divergence
- Risk: inspect behavior diverges from board/hand unexpectedly.
- Mitigation: explicit feature-flag/mode boundary and naming (`inspect-only art framing`). Keep legacy crop output intact.

### Board compatibility
- Risk: accidental shared-path changes affecting battle cards.
- Mitigation: confine all prototype logic to CollectionScene inspect branch.

### Persistence/schema migration
- Risk: locking into unstable keys early.
- Mitigation: keep framing values in debug session maps first, export JSON manually for evaluation, then formalize schema after validation.

## 6) Rollout strategy
1. Add inspect-only mode switch + framing controls (no persistence).
2. Add copy/export payload for `artFrame` session overrides.
3. Run visual pass on representative cards (faces, tall subjects, busy backgrounds).
4. Decide clamp/default ranges from real usage.
5. Introduce read-path support for `artFrame` in one renderer behind a guarded flag.
6. Later migration tooling: map legacy `artPositionY` into approximate `artFrame.y` where possible.

## 7) Recommended next implementation task
- Implement `Art Framing` mode in `CollectionScene` debug panel with inspect-only transforms and temporary session buffer export, while leaving all existing crop debug code paths and renderer behavior unchanged.


## Status and cross-links

- Status: **EXPERIMENTAL** (`planning-only`).
- This plan is not canonical gameplay/UI behavior.
- Primary diagnostic reference: `docs/art/card-art-rendering-diagnostic.md`.
- Workflow/reference index: `docs/README.md`.

## Authority and replacement references

- Active state: **planning-only** (prototype not active in production flow).
- This plan is **not** a canonical implementation instruction set.
- Canonical input behavior (including swap and interaction arbitration): `docs/battle/input-flow.md`.
- Canonical gameplay rules authority: `docs/rules/mvp-battle-rules.md`.
- Canonical art behavior diagnostic: `docs/art/card-art-rendering-diagnostic.md`.

Any implementation assumptions here are historical planning notes unless promoted by newer canonical docs/decisions.
