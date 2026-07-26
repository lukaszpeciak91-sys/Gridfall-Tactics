# Battle and state presentation architecture

**Status: CANONICAL** for `BattleScene` combat/turn presentation and board-state cues. Mechanical rules remain owned by [`../rules/mvp-battle-rules.md`](../rules/mvp-battle-rules.md), and combat resolution remains owned by [`combat-engine-v2.md`](combat-engine-v2.md).

This document describes the current repository implementation. Presentation consumes resolved state and events; it does not change their outcome.

## Ownership boundaries and turn notices

`YOUR TURN` / `TWÓJ RUCH` and `ENEMY TURN` / `RUCH WROGA` are recurring, informational action banners. They may use a presentation pre-beat, but they do not own or gate input, actionability, enemy decisions, combat, tokens, retries, or any state transition. Cancelling, replacing, suppressing, or destroying one has no gameplay consequence. Enemy-action pacing and its pre-combat delay are independent of the banner lifecycle.

The one-time opening `YOU START` / `ENEMY STARTS` presentation is a separate opening-flow notice. Do not reintroduce the abandoned model in which a recurring banner's completion unlocks input or advances AI/combat. Gameplay state is authoritative; banners merely report it.

## Standard-combat sequencing

1. `resolveCombat` builds the standard attack plan and resolves all mechanics before `BattleScene` starts combat animation.
2. Presentation groups resolved events by **attacker source lane**, in the fixed order `0 → 1 → 2`. An event's remote or intercepted target does not move it to the target's lane. Lanes without events produce no presentation group.
3. Each non-empty group is completely presented before the next. The centralized confirmation delays are 320 ms between presented lanes and 180 ms after the final presented lane.
4. Planned lane attacks and death-trigger presentation are completed before the board refresh and death overlays. The final live board is then rendered.

The event `lane` is therefore a source-lane presentation key, not a target-location key. Regression coverage should retain fixed ordering, omission of empty lanes, remote-target grouping, and distinct final-lane confirmation.

## Attack presentation contract

Attack targeting and damage are mechanical. `attackPresentation` selects only the visual helper, defaults to `melee`, and is read from the attacker's pre-combat snapshot.

Rotes Auge is the production example: card `control_sniper_1` declares `attackPresentation: "beam"`. On this HEAD its effect is `on_deploy_damage_enemy_unit_2`; there is no production `can_hit_any_lane` effect ID. Target selection is nevertheless mechanical and independent of the visual contract: the on-deploy effect resolves its chosen enemy target, while standard combat produces its own resolved target event. The generic presentation helper routes a beam from the snapshotted attacker index to that resolved target index or hero. It does not inspect a card ID. The event remains in its attacker's source-lane group, and beam attacks are excluded from ordinary simultaneous-melee clash animation. Beam micro-timings are intentionally not part of this contract because they are not all centralized as stable constants.

A valid planned **non-melee** attack must still be presented when another event in the same lane defeats its attacker. Mechanical removal after resolution does not cancel that plan: the pre-combat visual and event metadata remain sufficient until lane presentation ends, with the death overlay following planned presentation. This is generic to non-melee presentation, not a Rotes-Auge exception. Ordinary melee behavior remains unchanged and may suppress the defeated attacker's lunge while still presenting event feedback.

If a required attacker view, target view, route, or visual cue genuinely cannot be created, presentation falls back to event feedback only. A missing visual must never cancel or replay mechanics.

## Snapshot and event requirements

The pre-combat presentation snapshot preserves:

- a cloned board, including attacker identity, owner, effect, `attackPresentation`, immutable original-stat fields, and effective `__presentationStats`;
- owner-level `cannotDropBelowOneThisTurn` and `immuneMoveDisableThisTurn` values, so temporary cues survive mechanical cleanup during animation;
- hero HP, offline-reservation presentation data, and death-trigger state needed by feedback;
- death-overlay candidates derived by comparing the pre-combat board with the resolved board.

Resolved attack events preserve attacker side, source `lane`, target type/side, damage and combat modifiers. `attackerIndex`, `targetIndex`, and `interceptOriginalTargetIndex` are deliberately **non-enumerable properties on the live event objects**. The resolved events array also carries the non-enumerable `standardCombatPlan`. Consumers that require this routing/plan metadata must retain the original event objects and array.

**Do not JSON-serialize or object-spread-clone combat events as a handoff to presentation.** Both operations discard required non-enumerable routing metadata; array spread also drops `standardCombatPlan`. Board snapshot objects, by contrast, carry their required presentation fields as enumerable data and are explicitly cloned by the snapshot helpers.

## Modified-stat presentation

`getModifiedStatState` is the shared classifier for board and inspect rendering. It compares the effective displayed `attack` or `armor` against the unit's immutable instance-creation baseline (`originalAttack` / `originalArmor`): higher is `buff`, lower is `debuff`, and equal or unavailable is `base`. `originalMaxHp` is also retained for future-safe baseline metadata.

Effective values come from the state-aware presentation-stat helper, not necessarily the mutable raw card field. Immutable baselines survive permanent mutations—for example, a Rotcaller whose attack permanently changes from 1 to 2 displays 2 against an original baseline of 1—and survive combat snapshot cloning. Board and inspect surfaces must pass the same effective values and original baselines to the shared renderer. Health is not a persistent modified-stat key: ordinary HP damage is not styled as a debuff.

## Owner-level temporary protections

These protections are owner-scoped state, not per-unit flags:

| State | Shared effect ID | Production cards | Persistent cue |
| --- | --- | --- | --- |
| `cannotDropBelowOneThisTurn[owner]` | `cannot_drop_below_1_this_turn` | Tank: Last Stand (`tank_last_stand_1`) | HP-floor shield |
| `immuneMoveDisableThisTurn[owner]` | `immune_move_disable_this_turn` | Tank: Stability (`tank_stability_1`); Wardens: Reinforce Line (`wardens_reinforce_line_1`) | move-disable-immunity brace |

Marker resolution is derived from the current unit owner plus state. The same resolver feeds board units and inspect previews. The pre-combat snapshot retains both owner maps, so markers remain visible throughout combat presentation even though standard-combat cleanup clears both live-state protections. They disappear automatically when subsequent rendering uses the cleaned live state; marker objects must not become a second source of truth.

## Combat-presentation diagnostics

`BattleScene` retains a bounded trace for the latest combat only. It correlates each event with source/target routing, attacker identity/effect, selected animation helper, beam cue creation and lifecycle, feedback-only fallback reasons, timing between lane presentations, mechanical removal, board-view destruction, and death-overlay start/completion. Lifecycle entries are bounded as well.

The trace is diagnostic output consumed by battle reporting. It must never select targets, alter events, delay mechanics, keep units alive, or otherwise affect gameplay. Permanent documentation should describe its fields and purpose rather than embed large sample reports.

## Regression expectations

Tests should protect ownership boundaries rather than exact scene internals: informational banners never gate flow; mechanics precede presentation; source-lane grouping and ordering remain stable; beam routing is snapshot-driven and excluded from melee clashes; planned non-melee presentation survives same-lane defeat; genuine visual failures use feedback-only fallback; death overlays follow plans; non-enumerable event metadata remains live; stat baselines survive mutation/snapshots; and owner-status cues have board/inspect parity and clear with live state.
