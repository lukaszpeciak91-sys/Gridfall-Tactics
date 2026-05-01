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

## GitHub Pages Deploy Issue (Resolved)

### Problem
- GitHub Pages showed blank/gray screen.
- Later debug showed:
  - HTML OK
  - JS OK
  - Phaser import failed: "Failed to resolve module specifier 'phaser'"

### Root Cause
- GitHub Pages was serving root `index.html` (dev mode).
- That file loads `/src/main.js`.
- Browser cannot resolve `phaser` without Vite bundling.
- Production must use Vite build output (`dist`).

### What Was Done
- Verified HTML and JS execution separately.
- Added debug markers (`HTML OK` / `JS OK` / `START OK`).
- Confirmed Phaser failure was a runtime import issue.
- Replaced GitHub Pages deploy with a GitHub Actions workflow.
- Configured workflow to:
  - run `npm run build`
  - upload `dist/`
  - deploy `dist` as artifact
- Ensured `vite.config.js` uses `base: './'`.

### Result
- GitHub Pages now serves `dist/index.html`.
- Assets load from `./assets/*.js`.
- Phaser boots correctly.
- `StartScene` renders (`START OK`).

### Key Lesson
- Never deploy raw source with Vite projects.
- Always deploy `dist` build to GitHub Pages.

### Rule (Permanent)
- GitHub Pages must deploy `dist/` only.
- Root `index.html` is build input, not production output.


## Battle UI Mobile Readability Pass (2026-05-01)
- Refined `BattleScene` layout zones for portrait mobile readability using responsive scale width/height percentages.
- Kept existing card selection and unit placement interactions intact while improving board/card tap targets and spacing.
- Added a compact hand-area deck indicator (`Deck xN`) and retained a single `EXECUTE TURN` action button.
