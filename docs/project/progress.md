# Project Progress

> **Doc role (2026-05-02):** Progress log only. Not a normative gameplay rules source.
>
> Canonical MVP battle rules live in:
> - `docs/rules/mvp-battle-rules.md`

## Current Status
- Project initialized.
- Phaser skeleton planned.
- BattleScene MVP UI skeleton implemented with locked portrait layout zones, placeholder interactions, and frame fallback support.
- Battle UI layout v1 locked and implemented; board/hand/deck/action areas now follow mobile-first proportions.
- Basic scene flow implemented: `StartScene` → `FactionSelectScene` → `BattleScene`.
- Added initial faction data and a minimal battle `GameState` system.
- `BattleScene` initializes deck/hand/discard state and draws a 4-card starting hand.
- MVP battle loop implemented and verified in code:
  - auto-turn flow (no END TURN)
  - `PASS` action
  - hero HP `12/12` with hero-HP-zero win condition
  - column attack resolution
  - redeploy (occupied friendly slot returns old unit to hand)
  - swap between two friendly row units

## Next Milestones
- Add faction-specific UI frame assets beyond `frame_default`.
- Add card UI for displaying and selecting hand cards.
- Expand enemy action logic beyond placeholder deployment AI.
- Add explicit UX feedback for invalid actions (e.g., redeploy blocked/full hand).

## Merge Diagnostics + Stabilization (2026-04-30)
- Diagnosed and removed post-merge API mismatches between `FactionSelectScene`, `BattleScene`, and `GameState` initialization flow.
- Replaced mixed `faction`/`factionKey` scene payload with a consistent `factionKey` handoff.
- Removed conflicting faction import casing by using lowercase JSON module paths in `src/data/factions/index.js`.
- Verified no remaining merge conflict markers and no remaining `factionMap` references in `src/`.

## Vite/GitHub Pages Diagnostics (2026-04-30)
- Confirmed static root `index.html` diagnostics and isolated Vite/Phaser boot issues.
- Switched Pages deployment flow to build/deploy `dist/` artifact.
- Confirmed Phaser boot and `StartScene` render after deployment corrections.

## Battle UI Layout Pass (Mobile-First)
- Established structured portrait layout with top info, board, action, hand, and status regions.
- Improved readability/usability on mobile while keeping gameplay scope unchanged.


## Turn Flow Fix (2026-05-03)
- Updated `BattleScene` to enforce one meaningful player action per turn using a minimal per-turn action-used flag.
- PASS now explicitly resolves turn sequencing (enemy action, combat, draw 1) and resets transient selection/swap input state for the next turn.
- Added action blocking feedback when attempting a second meaningful action before PASS.

## UI Cleanup Guardrail Added (2026-05-03)
- Added a permanent documentation guardrail forbidding visible debug/test labels in playable UI unless explicitly requested.
- Verified no `Battle Test` string remains in `src/` or `docs/`.
