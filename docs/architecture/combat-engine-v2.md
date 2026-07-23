# Combat Engine v2 — Resolution and Trigger Specification

Status: **CANONICAL** for combat-engine resolution and trigger behavior.

## Purpose

Combat Engine v2 replaces implicit lane-order and cleanup-order behavior with explicit, deterministic semantics. Its goals are predictable combat, no hidden lane-priority attack cancellation, deterministic death and trigger ordering, consistent death semantics across damage sources, separation of mechanical resolution from visual presentation, and one shared runtime path for live game and simulation.

This document is normative for combat-engine behavior. It describes runtime truth; it does not authorize gameplay, balance, copy, animation, AI, or data changes.

## Approved high-level model

Final standard combat uses this mechanical model:

1. Standard combat begins after both sides complete their action or PASS.
2. One full-board attack snapshot is created.
3. Eligible attackers, targets, contextual ATK, auras, and attack modifiers are frozen.
4. All planned attacks resolve mechanically.
5. All defeated units are identified as death waves.
6. Wave members are removed and recorded before triggers.
7. Death triggers resolve through a deterministic queue.
8. Trigger-created deaths create later waves.
9. Base lethal is finalized after the complete combat/trigger window.
10. Post-combat cleanup, draw, and turn progression occur only if the battle continues.

This is the mechanical model, not necessarily the animation order shown by `BattleScene`.

## Standard combat attack snapshot

At standard-combat start, all living, eligible, non-offline units present on the board receive a planned attack. Units killed during that same standard-combat window still execute their frozen planned attack. Units summoned, revived, or otherwise created after the snapshot do not attack in that same standard-combat window.

Targets are not retargeted after snapshot creation. A planned unit attack does not convert into Base damage if the original target dies earlier. A planned open-lane Base attack remains Base damage even if the lane is filled later. Snapshot construction does not mutate live state.

The frozen attack profile includes relevant current values, including base/permanent ATK, temporary ATK modifiers, ATK caps or attack-set-to-zero effects, auras, adjacency/formation bonuses, ally-count bonuses, debuffs, open-lane bonuses, ignore-armor state, Sniper target selection, and offline eligibility.

## Sniper

Sniper target priority is:

1. Lowest current HP.
2. Highest current effective ATK.
3. Lowest board index.

Target selection occurs during the full-board snapshot. Sniper does not have hidden first strike. A target killed by Sniper still performs its already-planned standard-combat attack. Multiple Snipers retain their independently snapshotted targets and do not retarget after earlier kills.

## Aura and contextual effects

Combat-start auras and contextual bonuses are frozen for the current standard-combat attack. Provider death during the window does not alter already-planned attacks. Final live board values update after combat. Rotcaller gains affect future combat windows, not the already-frozen current attack. Ally-count effects such as Kwoka use combat-start state.

## Death-wave architecture

Death cleanup uses this hierarchy:

1. Identify every unit at `0 HP` or below at the current stable damage boundary.
2. Apply lethal prevention such as Last Stand.
3. Establish the complete wave.
4. Remove all valid wave members.
5. Record Fallen entries.
6. Suppress dead same-wave observers.
7. Build and resolve the deterministic trigger queue.
8. Create later death waves for trigger-created lethal damage.
9. Repeat until no new deaths remain.
10. Enforce the existing safety guard.

The safety guard is a maximum of 128 wave iterations. Valid finite chains below the limit remain supported. Invalid endless chains terminate with a diagnostic rather than hanging.

## Stable death and Fallen ordering

Stable wave ordering is:

1. Enemy row by ascending board index.
2. Player row by ascending board index.

Fallen sequence is assigned from this stable wave order. Temporary Flood tokens remain excluded. Revive remains newest-to-oldest. Fallen eligibility and death-trigger eligibility are separate concerns.

## Trigger queue priority

The implemented priority is:

1. Dying-unit effect-variant `onDeath` operations.
2. Dying-unit built-in death effects, including Base damage, lane damage, both-Base damage, and same-slot summons.
3. Surviving allied-death observers, including Rotcaller/Wodzirej, Stos/Funeral Pyre, and other active observer effects where applicable.

Within equal categories, runtime uses stable wave order: enemy row ascending board index, then player row ascending board index. Observer scans are stable by board index within the applicable owner row and observer category. Combat Engine v2 does not define or imply a player-facing speed system.

## Universal HP-death semantics

> Every lethal HP-based death entering death-wave cleanup uses the same valid death-trigger eligibility, regardless of damage source.

This includes standard combat, immediate combat, direct effect damage, on-play damage, System Override self-damage, HP decay, trigger-created damage, and effect-variant unit damage. Affected mechanics include Carrier, Husk, Abomination, Rotcaller/Wodzirej, Stos/Funeral Pyre, Brood, Control Drone, and other valid death effects. The damage source does not determine eligibility once a lethal HP death enters death-wave cleanup.

## Intentional non-death removals and exclusions

Universal HP-death semantics do not currently include explicit destroy effects, return to hand, redeploy displacement, transform/replacement, or temporary Flood expiry/cleanup.

These behaviors remain intentionally unchanged. Explicit destroy is a separate existing category and was not redefined by Combat Engine v2. Return and redeploy are removals, not deaths. Temporary Flood tokens remain excluded from Fallen and death effects where established. Do not treat all board removal as death.

## Key card behavior

### Rotcaller / Wodzirej

Rotcaller/Wodzirej reacts to the first valid adjacent allied HP death according to its existing per-board-instance opportunity rules, gains permanent `+1 ATK`, and uses that bonus only in later combat windows. The current standard attack remains frozen. A Rotcaller dying in the same wave does not observe that wave. Multiple instances remain independent.

### Stos / Funeral Pyre

Each surviving active Stos/Funeral Pyre instance may trigger once per turn. Multiple instances remain independent. Dead Stos instances do not observe the wave that killed them. Base damage resolves inside the complete trigger window. Usage resets according to the existing turn rule.

### Carrier

Any lethal HP death triggers Carrier's same-slot `1/1` summon. Legacy and canonical effect IDs map to the same universal behavior. The generated unit does not attack in the same standard-combat snapshot.

### Husk

Any lethal HP death triggers Husk's existing opposed-lane HP damage. Resulting lethal damage creates later death waves.

### Abomination

Any lethal HP death causes Abomination to damage both Bases by the established amount. Simultaneous lethal remains a draw.

### Brood / Control Drone

Brood and Control Drone preserve their already-universal death behavior.

## Immediate combat windows

Quick Strike, Rush, Stock Reassignment, and other immediate lane-combat behavior use current live state at the immediate-combat boundary. Both eligible lane participants retaliate where applicable. Same-lane damage is simultaneous. Death waves resolve before Base lethal finalization. Summons do not attack again inside the same immediate lane slice. Survivors may still participate in later standard combat. Immediate combat does not clear standard “until combat” state where current rules explicitly preserve it. Ignore-armor-next-hit consumption remains based on the actual combat hit.

Immediate combat is a separate small combat window, not part of the later standard full-board snapshot.

## System Override

System Override resolves as follows: the selected enemy attacks its own Base, then loses 1 HP. Lethal self-damage enters universal HP-death cleanup. Valid Carrier, Rotcaller, Stos, and other death reactions may occur. Death waves complete before Base lethal finalization. A surviving unit may participate in later standard combat.

## Direct damage

Direct unit damage is non-combat damage for attack-specific mechanics. Lethal HP loss still enters universal death waves. Last Stand remains respected. Direct damage does not automatically consume ignore-armor-next-hit. Death-trigger-created unit damage creates later waves. Direct Base damage follows the relevant caller/window finalization boundary.

## Base lethal finalization

Standard combat preserves raw Base HP until the entire attack/death-trigger window completes. Immediate combat does the same for its immediate window. Later valid triggers may turn an apparent single-sided lethal into simultaneous lethal. Final winner or draw is resolved only after the applicable combat/trigger window. Both Bases at `0 HP` or below in the same finalized window produce a draw.

Effect-variant Base damage may finalize immediately per operation, but current runtime still executes later operations and supports opposing lethal draw outcomes. Effect-variant immediate finalization is accepted legacy behavior, not an active defect.

## Presentation versus mechanics

`GameState` resolves the full mechanical result synchronously. `BattleScene` presents returned events afterward. Lane animations remain visually sequential, while mutual same-lane clashes may animate in parallel. Visual order does not redefine mechanical eligibility. The player may see lane 0 before lane 1 even though both attacks were frozen from the same standard-combat snapshot. No requirement exists for all units to animate simultaneously.

Presentation changes require a separate scoped PR and must not alter combat semantics.

## Compatibility and legacy identifiers

Legacy `combat_death_*` effect IDs remain compatibility aliases. Canonical `death_*` aliases represent the universal behavior. Legacy IDs do not retain combat-only logic. Compatibility wrappers such as `removeDefeatedUnits` may remain if they delegate to the same death-wave implementation. Compatibility naming must not be interpreted as current gameplay semantics.

## Active versus dormant normalization

Final normalization audit result:

- Standard combat: fully normalized.
- Immediate lane combat: fully normalized.
- System Override: coherent.
- Direct unit damage: fully normalized.
- HP decay: fully normalized.
- Trigger-created damage: fully normalized.
- Legacy cleanup aliases: harmless compatibility.
- Effect-variant Base-damage sequence finalization: accepted dormant/legacy consolidation opportunity only.
- No active runtime gap requires a PR.

## Future card implementation rules

1. New standard-combat mechanics must integrate with the full-board attack snapshot.
2. New lethal HP damage must route through the shared death-wave helper.
3. New death effects must not introduce hidden combat-only eligibility unless explicitly designed, documented, and approved as an exception.
4. New observers must respect dead-observer suppression.
5. New summons/revives created after snapshot creation must not enter the same standard-combat attack plan.
6. New Base-damage sequences must define their semantic finalization window.
7. Player-facing copy should say plain death where universal HP death is intended.
8. Return/redeploy/transform must not be treated as death accidentally.
9. Simulator and live game must use the same runtime helpers.
10. Preserve all previously approved behavior unless a task explicitly authorizes changing it.

## Regression and verification map

Representative executable coverage currently includes:

- Standard snapshot behavior: `tests/gameState.combatEvents.test.mjs`.
- Sniper: `tests/gameState.combatEvents.test.mjs`.
- Aura freeze: `tests/gameState.combatEvents.test.mjs`.
- Rotcaller timing: `test/combatDeathWaves.test.js`, `test/graveheartsWodzirejStosRework.test.js`, `tests/universalHpDeathSemantics.test.mjs`.
- Death waves: `test/combatDeathWaves.test.js`.
- Stos multiple instances: `test/combatDeathWaves.test.js`, `test/graveheartsWodzirejStosRework.test.js`, `tests/universalHpDeathSemantics.test.mjs`.
- Dead observers: `test/combatDeathWaves.test.js`, `tests/universalHpDeathSemantics.test.mjs`.
- Same-slot summons: `tests/gameState.combatEvents.test.mjs`, `tests/gameState.fallenResurrection.test.mjs`, `tests/universalHpDeathSemantics.test.mjs`.
- Trigger-created child waves: `test/combatDeathWaves.test.js`, `tests/universalHpDeathSemantics.test.mjs`.
- Safety guard: `test/combatDeathWaves.test.js`.
- Fallen order: `test/combatDeathWaves.test.js`, `tests/gameState.fallenResurrection.test.mjs`.
- Universal HP-death source matrix: `tests/universalHpDeathSemantics.test.mjs`.
- Simultaneous Base lethal: `test/combatDeathWaves.test.js`, `tests/simultaneousLethalRulesCopy.test.mjs`.
- Immediate combat: `tests/gameState.combatEvents.test.mjs`, `tests/attritionSwarmFaction.test.mjs`, `tests/overclockEffects.test.mjs`.
- Simulator determinism: `test/aiScoreComponentDiagnostics.test.js`, `tests/simulateBattlesBattleExhaustedSequencing.test.mjs`, `scripts/simulate-battles.mjs`.

## Remaining intentional non-work

No runtime PR4 was needed. No `BattleScene` animation rewrite was performed. Explicit destroy semantics remain a separate future design question. Effect-variant Base-damage sequence consolidation is optional future maintenance. No balance pass is included in Combat Engine v2 completion.

## Reusable skill extraction notes

Reusable Gridfall principles: snapshot intent before mutation; separate mechanical simultaneity from sequential presentation; batch deaths before triggers; use stable deterministic queues; prefer universal semantic categories over hidden source-based exceptions; state explicit non-death removals; defer winner finalization until the complete semantic window; keep live game and simulator on shared runtime helpers; ensure compatibility aliases do not preserve obsolete semantics; document completed architecture before extending it; preserve previously approved behavior.
