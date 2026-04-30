# Project Progress

## Current Status
- Project initialized.
- Phaser skeleton planned.
- BattleScene MVP UI skeleton implemented with locked portrait layout zones, placeholder interactions, and frame fallback support.

## Next Milestones
- Wire placeholder battle interactions into real turn/state systems.
- Implement card/unit data models and board resolution logic.
- Add faction-specific UI frame assets beyond `frame_default`.
- Basic scene flow implemented: `StartScene` → `FactionSelectScene` → `BattleScene`.
- Added initial faction data and a minimal battle `GameState` system.
- `BattleScene` now initializes deck/hand/discard state and draws a 3-card starting hand.
- Battle debug info is rendered in-scene (faction, deck remaining, hand size, hand card names).

## Next Milestones
- Implement first gameplay actions and consume the turn action flag.
- Add card UI for displaying and selecting hand cards.
- Add board interactions and unit placement rules.


## Merge Diagnostics + Stabilization (2026-04-30)
- Diagnosed and removed post-merge API mismatches between `FactionSelectScene`, `BattleScene`, and `GameState` initialization flow.
- Replaced mixed `faction`/`factionKey` scene payload with a consistent `factionKey` handoff.
- Removed conflicting faction import casing by using lowercase JSON module paths in `src/data/factions/index.js`.
- Verified no remaining merge conflict markers and no remaining `factionMap` references in `src/`.

## Vite Boot Diagnostic Step (2026-04-30)
- Confirmed static root `index.html` test worked on GitHub Pages (visible red screen), which validates Pages is serving the correct root file.
- Narrowed blank-screen root cause to the Vite/JavaScript/Phaser boot layer rather than static hosting.
- Current diagnostic checkpoint restores minimal Vite module loading with visible fallbacks: `HTML OK` (red) + `JS OK` (blue), with Phaser game creation intentionally disabled.

## GitHub Pages Marker Verification (2026-04-30)
- Confirmed `HTML OK` marker renders on live GitHub Pages.
- Confirmed `JS OK` marker renders on live GitHub Pages.
- Next step: verify minimal Phaser boot on GitHub Pages with in-scene `PHASER OK` text before restoring scene/game systems.
