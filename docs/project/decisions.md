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
- Start with **4 faction archetypes** to establish strategic variety.

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
- Confirmed hero HP (`12/12`) and hero HP zero as the only MVP win condition.
- Confirmed column-only combat lanes and middle row as visual-only (non-playable).


## MVP Turn Flow Lock Update (2026-05-03)
- Superseded on 2026-05-05 by temporary alternating initiative for turn order.
- Historical lock: one meaningful action maximum per player turn, then `PASS`/`RESOLVE TURN` advanced resolution.
- Historical lock: enemy action and combat triggered only during PASS/RESOLVE.
- PASS remains valid even if the player takes no meaningful action.
- Current canonical turn order is documented in `docs/rules/mvp-battle-rules.md`.

## Playable UI Debug Text Guardrail (2026-05-03)
- Permanent rule: no visible debug/test labels in playable UI unless explicitly requested for a scoped task.
- Forbidden examples unless requested: `Battle Test`, debug overlays, temporary scene labels, and hidden/background debug text that appears behind gameplay UI.


## Rules/Card Parity Audit Lock (2026-05-04)
- Superseded on 2026-05-05 by temporary alternating initiative for turn order.
- Historical action economy at audit time: player could take at most one meaningful action, then PASS resolved enemy action -> combat -> player draw 1 -> enemy draw 1.
- Reconfirmed runtime typing model: only `type: unit` is deployable; all non-unit cards execute as effect cards.
- Reconfirmed deterministic MVP behavior: Sniper targets lowest-HP enemy (index tiebreak), Controller on-play swaps first two enemy units by index order.
- Reconfirmed Flood nerf is active in code: `fill_empty_slots_0_1` summons up to 2 tokens left-to-right.
- Reconfirmed mulligan remains deferred/not active in MVP.


## Temporary Alternating Initiative MVP (2026-05-05)
- Alternating initiative is a temporary MVP balancing aid.
- Purpose: reduce fixed second-actor reaction advantage observed in simulations.
- This is not necessarily the final long-term turn system.
- Runtime state now tracks `firstActor` as `player` or `enemy`; battle start chooses it randomly.
- After each complete turn (both sides act/pass, combat resolves, both sides draw), `firstActor` toggles for the next turn.
- Enemy-first turns execute enemy AI at turn start, then wait for the player action/PASS before combat resolves.
- Playable UI may show only a minimal initiative indicator (subtle hero-frame glow and small ▶ icon); no banners, debug text, or layout redesign.
