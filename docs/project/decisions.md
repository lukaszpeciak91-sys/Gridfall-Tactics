---
status: HISTORY
active_state: active-log
canonical_ref: docs/rules/mvp-battle-rules.md
---

# Project Decisions

> **Doc role (2026-05-02):** Changelog/history only. Not a normative gameplay rules source.
>
> Canonical MVP battle rules live in:
> - `docs/rules/mvp-battle-rules.md`

## Initial MVP Scope
- Focus on **battle gameplay only** for the first playable milestone.
- Use a **3x3 visual board framing** to keep systems and balancing simple.
- Implement **turn-based** combat flow.
- Limit players to **1 action per turn** in MVP.
- Historical initial scope: start with **4 faction archetypes** to establish strategic variety. Current source-of-truth is **6 full base gameplay factions** (`aggro`, `tank`, `control`, `swarm`, `wardens`, `attrition-swarm`); `attrition-swarm` is permanent, not a temporary variant.

## Battle UI MVP Layout (2026-04-29)
- Lock battle screen to a **mobile-first portrait 9:16** layout for MVP.
- Use fixed vertical zones: **top bar (~10%)**, **board (~45%)**, **single action area (~10%)**, **hand area (~25%)**, **bottom info (~5-10%)**.
- Keep interaction scope minimal: **tap cards only**, **single EXECUTE TURN button**, and **no drag-and-drop or extra menus**.
- Use one global frame image key (`frame_default`) from faction data with a safe runtime fallback border when the frame asset is missing.

## Game State Initialization (MVP)
- Introduce a dedicated `GameState` system to initialize battle state from a selected faction deck.
- Keep battle state minimal for now: 9-cell board, player deck/hand/discard zones, and turn flags.
- Draw a **4-card starting hand** at battle start.
- Use debug text in `BattleScene` to visualize state values before card UI/gameplay is added.

## Merge Integration Consistency (2026-04-30)
- Standardize faction selection + battle handoff on `factionKey` values (not faction display names).
- Treat `getFactionByKey` and `getFactionKeys` as the canonical faction API; avoid legacy map access in scenes.
- Normalize faction JSON imports to lowercase filenames for Linux/Vite case-sensitive resolution safety.

## Boot Isolation Diagnostic (2026-04-30)
- Use a staged boot recovery flow: first prove static HTML render, then prove Vite/JS module execution, then re-enable Phaser boot.
- Keep always-visible fallback overlays during diagnostics (`HTML OK` + `JS OK`) to prevent silent blank-screen regressions.
- Defer scene-level changes until core boot path is confirmed stable again.

## MVP Battle Loop Lock (2026-05-02)
- Locked rules source to `docs/rules/mvp-battle-rules.md` as single source of truth for gameplay behavior.
- Confirmed auto-turn loop (no END TURN action), `PASS` action, `redeploy`, and `swap` as the implemented MVP action model.
- Historical lock at this date: hero HP (`12/12`) and hero HP zero drove battle wins; current battle-end rules also include no-progress and turn-cap HP tiebreaks in the canonical rules doc.
- Confirmed column-only combat lanes and middle row as visual-only (non-playable).


## MVP Turn Flow Lock Update (2026-05-03)
- Superseded on 2026-05-05 by temporary alternating initiative for turn order.
- Historical lock: one meaningful action maximum per player turn, then `PASS`/`RESOLVE TURN` advanced resolution.
- Historical lock: enemy action and combat triggered only during PASS/RESOLVE.
- PASS remains valid even if the player takes no meaningful action.
- Current canonical turn order and battle-end checks are documented in `docs/rules/mvp-battle-rules.md`.

## Playable UI Debug Text Guardrail (2026-05-03)
- Permanent rule: no visible debug/test labels in playable UI unless explicitly requested for a scoped task.
- Forbidden examples unless requested: `Battle Test`, debug overlays, temporary scene labels, and hidden/background debug text that appears behind gameplay UI.


## Rules/Card Parity Audit Lock (2026-05-04)
- Superseded on 2026-05-05 by temporary alternating initiative for turn order.
- Historical action economy at audit time: player could take at most one meaningful action, then PASS resolved enemy action -> combat -> player draw 1 -> enemy draw 1.
- Reconfirmed runtime typing model: only `type: unit` is deployable; all non-unit cards execute as effect cards.
- Reconfirmed deterministic MVP behavior: Sniper targets lowest-HP enemy (index tiebreak), Controller on-play swaps first two enemy units by index order.
- Reconfirmed Flood nerf is active in code: `fill_empty_slots_0_1` summons up to 2 tokens left-to-right.
- Historical note: mulligan was deferred/not active at this audit time; superseded on 2026-05-06 by the Simple Opening Mulligan MVP decision below.


## Temporary Alternating Initiative MVP (2026-05-05)
- Alternating initiative is a temporary MVP balancing aid.
- Purpose: reduce fixed second-actor reaction advantage observed in simulations.
- This is not necessarily the final long-term turn system.
- Runtime state now tracks `firstActor` as `player` or `enemy`; battle start chooses it randomly.
- After each complete turn (both sides act/pass, combat resolves, both sides draw), `firstActor` toggles for the next turn.
- Enemy-first turns execute enemy AI at turn start, then wait for the player action/PASS before combat resolves.
- Playable UI may show only a minimal initiative indicator (subtle hero-frame glow and small ▶ icon); no banners, debug text, or layout redesign.


## Turn-Cap Remaining Hero HP MVP Rule (2026-05-06)
- Added a 50-completed-turn cap resolution that compares remaining hero HP when no winner exists.
- Higher remaining player hero HP wins for the player; higher remaining enemy hero HP wins for the enemy.
- Equal remaining hero HP still produces a true draw.
- This is an MVP anti-stall/pacing solution, not the final long-term tournament or overtime system.
- Primary motivation: Swarm mirrors were producing excessive empty-board exhaustion draws under the old automatic draw-at-cap rule.
- Simulation and sanity runners must use the same shared turn-cap resolution helper as live gameplay; no special-case simulation behavior.
- Later no-progress deadlock handling replaced any repeated-PASS/3-pass stall-counter assumptions; locked outcomes are resolved from board/resource state instead of pass counts.


## Simple Opening Mulligan MVP (2026-05-06)
- Added a single opening mulligan only at battle start to improve opening-hand consistency without adding in-match redraw systems.
- Limit is up to 2 replaced cards from the 4-card starting hand; hand size, deck size, hero HP, action economy, mana/energy assumptions, and combat flow remain unchanged.
- AI-controlled sides use the shared deterministic evaluator for parity between live enemy behavior and simulation mirrors.
- The evaluator intentionally stays simple: value playable early units, penalize no-board/low-tempo effects, and replace the lowest-scoring opening cards only when they fall at or below the opening threshold.


## Card Readability + Localization Clarity Lock (2026-05-18)
- Locked a readability-first card text direction across hand, inspect, and collection views so long effect strings stay legible on mobile portrait.
- Locked persistent modified-stat readability treatment so temporary/permanent stat changes remain visible and understandable during combat decisions.
- Locked explicit Last Stand prevention feedback in battle UI to remove hidden-rule ambiguity when lethal is prevented.
- Locked card presentation naming and Polish copy shortening/simplification as the current UX standard for Empire of the Golden Sun content.
- These are UX/content clarity decisions (not rules-engine changes) and should be treated as binding for future card text and presentation updates unless replaced by a newer documented decision.

## StartScene Input UX Parity (2026-05-19)
- Locked StartScene continue behavior to accept pointer/tap release anywhere on the scene, not only the logo hit area.
- Logo remains an explicit interactive target with the same hover/press feedback and transition path.
- Transition must remain single-fire (`isTransitioning` guarded) to prevent duplicate scene launches on rapid taps or overlapping logo/global input.

## Blocked-Lane Board Indicator Parity (2026-05-19)
- Locked blocked-lane UI feedback to render on both board sides when the corresponding per-lane block flag is active for that side.
- Marker remains a lightweight red `✕` and is shown only on empty lane slots to avoid implying combat disable or covering occupied unit readability.
- This is presentation-only parity; lane block gameplay and AI decision logic remain unchanged.
