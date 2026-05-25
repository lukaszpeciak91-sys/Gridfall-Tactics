---
status: EXPERIMENTAL
active_state: postponed
---

# Card Art Framing / Crop Debug Experiment (Postponed)

## Summary
A Collection inspect debug experiment was added to tune card artwork framing and source crop behavior in-scene.

## What it tried to solve
- Improve inspect card artwork framing when center-cover crop did not always produce ideal composition.
- Provide quick per-card adjustment controls during Collection inspect.

## Why source-crop debug alone was not enough
- Crop telemetry and step controls could show crop bounds, but they did not provide a reliable framing workflow for production-ready composition decisions.
- The debug-first flow encouraged ad-hoc per-session tweaks rather than a stable, isolated art-direction tool.

## Why Art Framing v1 was abandoned
- The v1 prototype (mode switching + preview layering) became invasive inside CollectionScene.
- The framing path introduced rendering instability and overlapping UI that reduced inspect readability.
- Debug-only masking/preview paths increased risk of visual artifacts.

## What broke or became risky
- Debug panel clutter made inspect interactions less safe.
- Temporary preview/mask paths could produce unreliable artwork visibility and white-rectangle artifact risk.
- Experimental controls expanded scene complexity in a player-facing flow.

## Decision
The entire card art crop debug + Art Framing experiment was removed from CollectionScene to preserve stable rendering behavior.

## Future recommendation
Build a clean, isolated Art Framing tool later:
- fixed viewport + movable artwork object
- no coupling to CollectionScene debug UI
- prototype and validate in isolation first
- adopt into production renderer only after stability and UX validation

## Status and cross-links

- Status: **EXPERIMENTAL** (`postponed`).
- Primary diagnostic reference: `docs/art/card-art-rendering-diagnostic.md`.
- Workflow/reference index: `docs/README.md`.

## Authority and replacement references

- Active state: **postponed** (not an active implementation track).
- Canonical input/interaction behavior: `docs/battle/input-flow.md`.
- Canonical gameplay rules authority: `docs/rules/mvp-battle-rules.md`.
- Canonical current art diagnostic: `docs/art/card-art-rendering-diagnostic.md`.

This document is historical experimental context and must not be treated as implementation truth.
