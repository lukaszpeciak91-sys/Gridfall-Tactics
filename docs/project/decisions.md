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

## Card Artwork Framing/Cropping Architecture (2026-05-28)
- Accepted architecture: store per-card vertical framing as normalized `artPositionY` values in the `0..1` range, not as source pixels or viewport pixels.
- The renderer remains responsible for reconstructing the concrete source crop dynamically at render time from the active artwork zone, source texture dimensions, cover scale, and normalized `artPositionY` intent. This keeps crop intent resolution-independent across device sizes and card preview sizes.
- `ArtViewportDebug` is the accepted authoring tool for vertical card-art framing. Its export is the handoff format for applying reviewed values into production override data.
- Collection and Inspect previews must continue to use the same shared renderer crop path for production card artwork so authored crop intent is previewed through the same behavior players see.
- Board-unit rendering currently remains a separate path using board-specific artwork constants; do not assume board units consume the same per-card production crop overrides until that path is explicitly redesigned.
- Rejected: pixel-based crop storage, because it couples authoring intent to one source/render size and becomes brittle across renderer/layout changes.
- Rejected: source-image viewport authoring as the primary workflow, because it asks artists/authors to reason about source rectangles instead of the actual runtime card read.
- Rejected: repeated artwork regeneration as the framing solution, because the validated workflow can preserve approved artwork and tune presentation through explicit runtime crop intent.
- Final workflow: Generate artwork → Adjust Y in `ArtViewportDebug` → Export overrides → Apply overrides to production override data.

## Generated Unit Art Identity (2026-05-30)
- Generated non-deck units now use stable faction-local card illustration metadata instead of a shared token art directory.
- Spawn/Brood Grunts resolve as `swarm/token_grunt_01`, Flood tokens resolve as `swarm/token_flood_01`, and Carrier/Grave Call Grunts resolve as `attrition_swarm/token_grunt_02` under `public/assets/cards/`.
- `factionId`, `artAssetId`, `tokenType`, `isToken`, and `collectible` are lifecycle metadata: Recall, redeploy displacement, replay from hand, discard, fallen, and revive must preserve them without changing gameplay rules.
- Binary token artwork files are a manual follow-up outside Codex scope: add `public/assets/cards/swarm/token_grunt_01.webp`, `public/assets/cards/swarm/token_flood_01.webp`, and `public/assets/cards/attrition_swarm/token_grunt_02.webp` when final art is ready.


## Resource Exhaustion + 24-Turn Cap MVP Rule (2026-05-31)
- Reduced the shared turn cap from 50 completed turns to 24 completed turns based on observed simulation pacing; this supersedes only the cap value in the 2026-05-06 turn-cap decision.
- Added a simple stable-boundary `resource_exhaustion` loss: hand empty, deck empty, no owned board units, and strictly lower remaining hero HP are all required.
- Explicitly rejected hand-empty-only automatic loss because future deck draws can still exist.
- Equal-HP exhaustion does not force a winner. The existing no-progress deadlock resolver remains in place for locked parity cases.
- Live battles and simulation/report runners check base lethal first through combat resolution, then resource exhaustion, then no-progress; after both draws they check resource exhaustion and no-progress again before turn-cap resolution.
- Player hold-to-surrender remains optional and player-controlled. AI safe surrender remains available, with deterministic resource-exhaustion and no-progress checks taking priority at stable turn boundaries.

## Premium UI Typography Standard (2026-06-04)
- Adopted one global premium UI font stack for Polish, English, and future locales: `Segoe UI, Arial, sans-serif`.
- This supersedes the experimental premium broadcast font investigation and rejects locale-specific premium font stacks.
- Scope is premium UI only: premium buttons, broadcast-style UI chrome, menu screens, result screens, and premium overlays.
- Card rendering, gameplay HUD text, Rules panel text, Collection cards, Inspect cards, and localization content remain outside this decision.
- Future premium typography changes must validate Polish diacritic rendering against: `PORAŻKA`, `WYJDŹ`, `PONÓW`, `PUBLICZNOŚĆ`, `PRZEJĘCIE`, `ZAKŁÓCENIE`, `ZEWRZEĆ`.
- Canonical standard: `docs/ui/premium-typography-standard.md`.

## Battle Result Presentation Direction (2026-06-04)
- Shift battle result presentation away from modal-dialog chrome and toward an interdimensional broadcast-overlay treatment.
- Result screens should keep the battlefield visible behind fullscreen dimming, avoid framed panel backgrounds, and place the localized result title/subtitle/buttons directly over the board.
- Result-specific glows, victory fireworks, existing button assets, and end-of-battle navigation/retry behavior remain unchanged unless a later scoped UX decision supersedes them.

## Battle Result Broadcast Overlay Final Direction (2026-06-04)
- Accepted the broadcast-overlay result presentation as the MVP-final direction and rejected returning to popup-dialog/modal-window framing for battle results.
- Battle result screens should remain panel-free: no modal frames, window backgrounds, or boxed control groups over the battlefield.
- Final polish standard: place the result stack lower over the combat lanes, keep localized subtitle copy prominent with outcome-specific non-white accents, separate subtitle and controls with one thin broadcast divider, and use enlarged existing button assets for primary EXIT/RETRY controls.
- Title glow should remain animated and outcome-colored but restrained enough that battlefield art and UI remain visible beneath it.
- Victory celebrations use three staggered waves of the existing procedural fireworks/particles with slight position randomization; no new assets or reward/battle-end logic changes are part of this presentation decision.

## Screen Header Presentation Standard (2026-06-04)
- All non-battle menu screens use the same premium broadcast header pattern: centered title text near the top of the screen followed by a thin decorative line.
- Typography is locked to the premium UI font stack (`Segoe UI, Arial, sans-serif`) with bold weight, localized uppercase text, subtle glow, and subtle shadow; this applies uniformly to Polish, English, and future localizations with no per-screen font special casing.
- Header titles stay horizontally centered within a mobile-safe wrap width so Polish diacritics and English labels render without clipping in portrait layouts.
- Decorative header lines are centered, lightweight, semi-transparent, tintable, and approximately half of the measured title width; they are not title cards, banner panels, large ornaments, or new artwork.
- Arena / Choose Faction, Collection, Tutorial, Settings, Rules, and future non-battle menu screens should reuse this same header pattern to preserve the interdimensional prestige broadcast presentation system.
