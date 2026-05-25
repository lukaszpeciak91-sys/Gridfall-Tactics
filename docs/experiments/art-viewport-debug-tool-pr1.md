# Art Viewport Debug Tool — PR 1 Skeleton

This phase intentionally adds only a safe, isolated entry path for an internal debug scene.

Included in PR 1:
- Main Menu debug icon entry (mobile-tappable, discreet).
- New `ArtViewportDebugScene` skeleton.
- Back navigation to Main Menu.

Explicitly excluded from PR 1:
- Card selector and card previews.
- Any runtime crop/position controls.
- Clipboard export.
- Persistence.
- Any production renderer changes.

Future phases will add runtime-accurate preview and export behavior.

## Status and authority

- Status: **EXPERIMENTAL** (historical phase note).
- Active state: **obsolete phase artifact**.
- Canonical input behavior: `docs/battle/input-flow.md`.
- Canonical gameplay rules: `docs/rules/mvp-battle-rules.md`.
- Canonical art diagnostic/reality check: `docs/art/card-art-rendering-diagnostic.md`.

This PR-phase note is not authoritative implementation guidance.
