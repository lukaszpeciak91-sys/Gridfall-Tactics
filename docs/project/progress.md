---
status: HISTORY
active_state: active-log
canonical_ref: docs/rules/mvp-battle-rules.md
---

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
- Continue readability passes for long-form rules text in EN/PL after future balance patches.
- Extend documentation parity checks after each gameplay/content PR to prevent drift between code, card data, and docs.
- Add automated docs consistency checklist to release workflow (rules source, progress, decisions, README).

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


## Docs Parity Audit Complete (2026-05-04)
- Audited runtime behavior across `GameState`, `enemyDecision`, `BattleScene`, and faction card data.
- Updated canonical rules doc to align turn flow, draw timing, card typing, targeting, and effect behavior to implemented code.
- Added explicit implemented-vs-deferred section and MVP simplification notes as of that audit (deterministic targeting, non-unit-as-effect, no mulligan at that time, no peek UI); the mulligan note was superseded by the 2026-05-06 Simple Opening Mulligan update below.
- Documented active Flood cap (up to 2 tokens) and current balance monitoring notes.


## Alternating Initiative MVP (2026-05-05)
- Implemented temporary alternating initiative as an MVP balancing aid.
- Purpose: reduce fixed second-actor reaction advantage observed in simulations.
- This is not necessarily the final long-term turn system.
- Added random initial first actor selection, per-turn initiative toggling after combat/draw cleanup, and enemy-first handling that waits for the player action/PASS before resolving combat.
- Added a minimal initiative UI indicator using a subtle active hero-frame glow plus a small ▶ icon near the side acting first this turn.
- Updated simulation scripts to use the same random-initial, alternating-first-actor turn order as live gameplay.


## Turn-Cap Remaining Hero HP MVP Pacing Fix (2026-05-06)
- Replaced automatic draw at the 50-turn cap with remaining-hero-HP winner resolution.
- Equal HP at the cap still remains a draw, preserving true parity cases.
- Added the rule as an MVP anti-stall measure, especially for Swarm mirrors that created excessive empty-board exhaustion draws.
- Updated live battle flow plus simulation/audit/sanity runners to share the same turn-cap winner logic.

## Documentation/UI Parity Cleanup (2026-05-06)
- Re-audited card data, UI targeting, canonical rules, and AI simulation/live-enemy paths after the latest balance and AI changes.
- Fixed player UI targeting parity for Aggro Quick Fix (`heal_2_atk_1_this_turn`) so the card now uses the targeted friendly-unit flow that the gameplay resolver and AI already used.
- Added a shared UI targeting helper plus regression coverage for Quick Fix and two-target swap selection metadata.
- Updated canonical card matrix stats and Pierce Strike behavior to match current faction JSON and `GameState` implementation.
- Documented that AI mirror simulations and the live enemy share the same `chooseBattleAction` decision engine; simulation differs only in seeded-random tie-breaking for audit repeatability.


## 2026-05-06 — Simple Opening Mulligan
- Implemented the one-time opening mulligan window after the 4-card starting hand and before the first turn begins.
- Player may keep or replace up to 2 starting-hand cards; replacements are shuffled back into deck and the same number of cards are drawn.
- Live enemy AI and AI-vs-AI simulations now use the same deterministic opening mulligan evaluator, which prefers replacing low-tempo and low-synergy opening cards.
- Simulation and sanity reports now include mulligan usage by faction alongside stability and pacing telemetry.


## Card Readability & UX Feedback Polish (2026-05-18)
- Improved card rules-text readability across hand cards, card inspect surfaces, and collection presentation paths.
- Shortened and clarified Polish localization strings for mobile card readability while preserving gameplay meaning.
- Updated card presentation names for Empire of the Golden Sun entries to match current in-game naming intent.
- Added explicit Last Stand prevention feedback so prevented lethal outcomes are communicated in battle UX.
- Added/kept modified-stat readability treatment to make combat-relevant stat changes easier to parse at a glance.
- Reconfirmed these were UX/content updates with no canonical MVP battle-rules engine change.

## StartScene Tap-Anywhere Continue (2026-05-19)
- Updated `StartScene` so pointer/tap release anywhere on the scene now triggers the same single transition to `MainMenuScene` as the logo button.
- Kept existing logo button behavior/feedback unchanged and guarded transition to fire once.

## Blocked Lane Indicator Parity (2026-05-19)
- Updated board blocked-lane marker rendering to show the same red `✕` indicator for both affected sides when lane-play blocks are active.
- Kept the indicator scoped to empty slots so it communicates “cannot place unit here this turn” without obscuring occupied unit cards.
- No gameplay, AI, or placement-validation behavior changed; this was a UI readability polish only.

## ArtViewportDebug Artwork Framing Workflow Complete (2026-05-28)
- Completed and validated the card artwork framing workflow in-game using `ArtViewportDebug` as the authoring tool.
- Locked the production data shape around normalized `artPositionY` values in the `0..1` range; the renderer reconstructs the source crop dynamically at render time so the stored crop intent remains resolution-independent.
- Confirmed Collection and Inspect previews use the same shared renderer crop path for production card artwork, keeping authored overrides consistent across those preview surfaces.
- Documented the current board-unit exception: board-unit rendering uses separate board artwork constants today rather than the Collection/Inspect shared crop override path.
- Final authoring workflow: Generate artwork → Adjust Y in `ArtViewportDebug` → Export overrides → Apply overrides to production override data.

## Generated Unit Faction-Local Art (2026-05-30)
- Added stable art identity for generated non-deck units while preserving existing Recall, redeploy, discard, revive, death, and cleanup behavior.
- Generated Grunts and Flood tokens now resolve through unique faction-local `public/assets/cards/{factionId}/{artAssetId}.webp` artwork and are explicitly preloaded even though they are not normal deck cards; binary `.webp` files remain manual repo additions outside Codex scope.
- Documented the generated-unit lifecycle convention so board, hand, discard, and revive movements keep the same token illustration metadata.


## Resource Exhaustion + 24-Turn Cap Parity Update (2026-05-31)
- Reduced the shared MVP full-turn cap from 50 to 24; live battle flow and all simulation/report runners continue to import the same `MAX_TURNS` constant.
- Added an immediate stable-boundary `resource_exhaustion` result: a side loses only when its hand, deck, and board-unit count are all zero and its base HP is strictly lower than the opponent's.
- Kept deck-empty as a required condition so a hand-empty side with future draws is never auto-defeated.
- Preserved the broader no-progress resolver, player-controlled hold-to-surrender flow, and AI safe-surrender path.
- Aligned live and simulation sequencing after combat and after both draws: resource exhaustion, then no-progress, then the turn-cap check after the post-draw checks.

## Final Battle Result Broadcast Modal Polish (2026-06-04)
- Redesigned the battle result modal as a Gridfall broadcast-style presentation without changing battle flow, combat resolution, card rendering, HUD, collection, inspect, or rules surfaces.
- Removed the redundant battle-complete eyebrow text so the localized result title is the first-read element.
- Moved the modal higher toward the battlefield area, increased result-title and premium-button prominence, and tightened unused interior space while preserving mobile portrait readability.
- Added result-colored frame/glow treatment: victory uses green, defeat uses rose/red, and draw uses gold so each outcome has a distinct presentation state.
- Reused the existing premium image button component/assets for EXIT and RETRY, increasing size and spacing instead of introducing new button art.
- Added lightweight result animations: victory scale-in with soft glow pulse, defeat slower dramatic reveal with rose glow pulse, and draw soft gold reveal.
- Added a mobile-safe victory celebration using small procedural confetti/spark rectangles and circles; no new art assets or expensive particle systems were introduced.

## Battle Result Broadcast Overlay Prototype (2026-06-04)
- Converted the end-of-battle result presentation from a framed modal window into a lightweight broadcast overlay while preserving battle-end flow, localized result/subtitle copy, EXIT/RETRY behavior, and existing celebration effects.
- Kept the battlefield readable under a darker fullscreen overlay, removed the modal panel/frame/separators, and let the result title float directly over the board with a slow 1.00 → 1.03 → 1.00 pulse.
