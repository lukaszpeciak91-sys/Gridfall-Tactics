# MVP Battle Rules (Canonical)

**Status:** Frozen for MVP implementation  
**Last Updated:** 2026-05-07

**Scope:** Gameplay rules for the MVP battle loop

This is the **single canonical source of truth** for MVP battle rules.
If any other document conflicts with this file, this file wins.

## 1) Battle Outcome and Hero HP

- Player Hero HP: **12**
- Enemy Hero HP: **12**
- Battle ends immediately when either hero reaches **0 HP**.
- MVP turn cap: **50 completed full turns**.
- At the turn cap, if no winner already exists, the winner is decided by remaining hero HP:
  - Higher player hero HP -> **player wins**.
  - Higher enemy hero HP -> **enemy wins**.
  - Equal hero HP -> **draw**.
- Immediate no-progress end: if both sides have no meaningful remaining card/action, combat can no longer change hero HP, and no remaining action can realistically affect the outcome, the battle ends immediately by remaining hero HP:
  - Higher player hero HP -> **player wins**.
  - Higher enemy hero HP -> **enemy wins**.
  - Equal hero HP -> **draw**.
- There is no repeated-PASS or 3-pass stall counter; dead games end as soon as the locked outcome is detected.

## 2) Board Model

- Visual presentation is a **3x3** board.
- Gameplay logic uses only:
  - **3 enemy combat slots** (top row: indexes 0-2)
  - **3 player combat slots** (bottom row: indexes 6-8)
- Middle row (indexes 3-5) is **visual/effects-only**.
- **No unit placement** is allowed in the middle row.

## 3) Deck and Hand Rules

- Deck size: **10 cards** per faction deck JSON.
- Starting hand: **4 cards** (player and enemy both draw at battle start).
- Max hand size: **5**.
- Draw timing in loop: after both sides act/pass and combat resolves, **player draws 1 then enemy draws 1**.
- Opening mulligan: once at battle start, before the first turn begins, each side may replace up to **2** cards from the 4-card starting hand.
  - Replaced cards are shuffled back into that side's deck.
  - The side draws the same number of replacement cards, preserving the starting hand size.
  - The mulligan window closes once used/kept or once the battle starts; there are no mulligans/redraws during the match.
  - Live enemy AI and AI-vs-AI simulations use the same deterministic opening-hand evaluator, preferring to replace low-tempo cards and cards with poor opening synergy.

## 4) Turn Flow, Initiative, and Action Economy (Auto-Turn)

- **Alternating initiative is a temporary MVP balancing aid.**
- Purpose: reduce fixed second-actor reaction advantage observed in simulations.
- This is not necessarily the final long-term turn system.
- At battle start, `firstActor` is randomly selected as `player` or `enemy`.
- Before the first turn starts, both sides draw 4 cards and resolve their one opening mulligan/keep decision. The live player chooses manually in the minimal hand UI; the live enemy and simulation mirrors choose via the shared opening mulligan evaluator.
- After each full turn resolution, `firstActor` toggles so initiative alternates player → enemy → player, or enemy → player → enemy.
- Each side gets at most **1 meaningful action/pass** per full turn.
- PASS counts as the player's action for that turn.
- Combat resolves only after both sides have acted or passed.
- If `firstActor` is `player`, the full turn order is:
  1. Player takes one meaningful action or PASS.
  2. Enemy takes one action or passes.
  3. Combat resolves across all 3 lanes.
  4. If no-progress deadlock is detected, end immediately by remaining hero HP.
  5. Player draws 1.
  6. Enemy draws 1.
  7. If no-progress deadlock is detected after draws, end immediately by remaining hero HP.
  8. If this was completed turn 50 and no winner exists, apply the remaining-hero-HP turn-cap rule.
  9. Initiative toggles for the next turn if the battle is still active.
- If `firstActor` is `enemy`, the full turn order is:
  1. Enemy takes one automatic action or passes.
  2. Player takes one meaningful action or PASS.
  3. Combat resolves across all 3 lanes.
  4. If no-progress deadlock is detected, end immediately by remaining hero HP.
  5. Player draws 1.
  6. Enemy draws 1.
  7. If no-progress deadlock is detected after draws, end immediately by remaining hero HP.
  8. If this was completed turn 50 and no winner exists, apply the remaining-hero-HP turn-cap rule.
  9. Initiative toggles for the next turn if the battle is still active.

Meaningful player actions:
- Play a unit card to a friendly combat slot.
- Play a non-unit effect card.
- Resolve a targeted effect.
- Swap two friendly units.
- Redeploy a unit from hand onto occupied friendly slot.

## 5) Card-Type Handling Rules (Implementation Truth)

- `type: "unit"` cards are board units and must be placed/redeployed onto valid friendly combat slots.
- **All non-unit cards** are treated by gameplay logic as **effect cards**.
- `order`, `special`, and `utility` currently behave as **descriptive taxonomy labels** in card data; gameplay execution path is non-unit effect resolution unless a specific effectId says otherwise.
- Hand-card UI labels render card name, unit stats, and `textShort` directly from the current card data object, so the visible player hand follows the faction JSON values plus any card object returned from redeploy/recall.

## 6) Combat Rules

- Combat is column/lane-based (enemy index `col` vs player index `col+6`).
- No diagonal combat.
- If opposing lane is empty, attacker hits opposing hero.
- Both sides can deal damage during same combat step.
- Temporary turn-based modifiers/effects are reset after combat resolution.

## 6.1) Effect Duration Taxonomy (MVP)

- **This turn window**: Expires after PASS/combat resolution cleanup.
  - Examples: lane play blocks, `cancel_enemy_order`, temporary ATK/ARM modifiers.
- **Until consumed**: Lasts until a one-time trigger is used, then clears.
  - Example: `ignore_armor_next_attack`.
- **While on board**: Passive/auras only active while source unit remains on board.
  - Examples: adjacency aura effects like `lane_armor_aura_1`, `adjacent_allies_atk_plus_1_ignore_armor_1`.

## 7) Targeting Model (MVP)

- Manual targeting is only used where the UI/logic currently supports targeted effect resolution.
- Deterministic simplifications currently in code:
  - **Sniper (`can_hit_any_lane`)** targets the lowest-HP enemy unit; ties break to lower board index.
  - **Controller (`swap_two_enemy_units`)** on-play picks first two enemy units by lane/index order.
  - AI-controlled sides evaluate legal targeted actions, immediate effects, redeploys, and adjacent swaps with the same `chooseBattleAction` scorer used by AI-vs-AI simulation bots and the live enemy. Ties are deterministic in live enemy turns and seeded-random in simulation runs.
- No hidden-information peek UI; `peek_enemy_slot` is a no-op.
- No general manual targeting UI for unit passive abilities beyond implemented hooks.

## 8) Effect/Card Behavior Matrix (Code-aligned)

| Faction | Card | Type | Stats | effectId | Implemented behavior | Targeting model | MVP simplifications / notes |
|---|---|---|---|---|---|---|---|
| Aggro | Runner | unit | 2/1/0 | lane_empty_bonus_damage | +2 hero damage if opposing lane empty during attack. | Lane combat | Implemented in combat resolver. |
| Aggro | Striker | unit | 2/2/0 | null | No special behavior. | Lane combat | Baseline unit. |
| Aggro | Glass Cannon | unit | 3/1/0 | self_damage_after_attack | Takes 1 self damage after attack resolves. | Lane combat | Implemented as pending self-damage. |
| Aggro | Flanker | unit | 2/2/0 | empty_adjacent_bonus_atk | +1 ATK if adjacent friendly slot is empty. | Lane combat | Adjacent check is board-state based. |
| Aggro | Scout | unit | 2/1/0 | block_enemy_lane_play_this_turn | On play, blocks enemy unit placement in same lane this turn. | On-play lane | Symmetric for player/enemy; clears at PASS/combat cleanup. |
| Aggro | Full Attack | order | - | aggro_buff_all_atk_2 | Friendly units get temp +2 ATK this turn. | Non-targeted effect | Expires after combat. |
| Aggro | Rush | order | - | swap_adjacent_then_resolve | Swap with adjacent friendly (prefers left), resolve that lane combat immediately. | Targeted friendly | Fails if no adjacent friendly. |
| Aggro | Pierce Strike | order | - | ignore_armor_next_attack | Deal 1 damage to targeted enemy; if it survives, the next hit on it ignores armor once. | Targeted enemy | Consumes ignore flag on first mitigated hit. |
| Aggro | Adrenaline | special | - | quick_strike | Resolve selected friendly unit's lane combat immediately. | Targeted friendly | Lane-only immediate combat slice. |
| Aggro | Quick Fix | utility | - | heal_1_atk_1_draw_on_kill_this_turn | Heal targeted friendly by 1 (capped by max HP), then grant it +1 ATK this turn. If that Quick Fix target destroys an enemy unit during combat while the buff is active, draw 1. | Targeted friendly | Uses targeted heal resolution, one-shot combat kill draw tracking, and temporary attack modifier/trigger cleanup after combat. |
| Control | Hacker | unit | 1/1/0 | enemy_lane_atk_minus_1 | On play: opposing lane unit gets temp -1 ATK this turn. | Lane on-play | Also available as targeted effectId path. |
| Control | Disruptor | unit | 1/2/0 | cancel_enemy_order | **On play unit trigger**: cancel next enemy non-unit/effect action this turn window. | On-play non-targeted | Cancels at most one enemy non-unit action; expires at PASS/combat cleanup if unused; not a persistent aura. |
| Control | Sniper | unit | 2/1/0 | can_hit_any_lane | Attacks lowest-HP enemy unit across lanes. | Deterministic auto-target | Tie-break: lowest index. |
| Control | Controller | unit | 1/2/0 | swap_two_enemy_units | On play: swap first two enemy units if at least two exist. | Deterministic on-play | Not manual two-pick UI for this unit trigger. |
| Control | Drone | unit | 1/1/0 | death_damage_enemy_hero_1 | On death, enemy hero takes 1. | Death trigger | Applies after unit removed. |
| Control | Swap | order | - | swap_any_two_units | Swap two selected units anywhere on board. | Two-target targeted effect | Requires two distinct occupied slots. |
| Control | Jam Signal | order | - | enemy_all_atk_minus_1 | Up to 2 enemy units get temp -1 ATK this turn. | Non-targeted effect | Picks occupied enemy lanes from left to right; expires after combat. |
| Control | Pulse Wave | order | - | damage_up_to_2_enemies_1 | Deal 1 damage to up to 2 enemy row units. | Non-targeted deterministic effect | Picks occupied enemy lanes from left to right; defeated units cleaned up immediately. |
| Control | System Override | special | - | control_enemy_unit_this_turn | Target enemy attacks its own hero in next combat. | Targeted enemy | Clears after combat cleanup. |
| Control | Recall | utility | - | return_friendly_draw_1 | Return friendly unit to hand, then draw 1. | Targeted friendly | Blocked if hand already full. |
| Swarm | Grunt | unit | 1/1/0 | null | No special behavior. | Lane combat | Baseline token-like unit. |
| Swarm | Spitter | unit | 1/1/0 | on_play_lane_damage_1 | On play, deal 1 to opposing lane enemy unit. | Lane on-play | No hero damage from this trigger. |
| Swarm | Brood | unit | 1/2/0 | on_death_summon_grunt | On death, summon 1/1 Grunt in same slot if now empty. | Death trigger | Uses generated token cardId. |
| Swarm | Rusher | unit | 2/1/0 | null | No special behavior. | Lane combat | Baseline attacker. |
| Swarm | Alpha | unit | 1/2/0 | adjacent_allies_atk_plus_1_ignore_armor_1 | Adjacent allies gain +1 attack in combat and ignore exactly 1 armor when dealing combat damage. | Passive adjacency aura | Calculated at combat time; Alpha only benefits if adjacent to another Alpha. |
| Swarm | Spawn | order | - | summon_grunt_empty_slot | Summon 1/1 Grunt to first empty friendly slot. | Non-targeted effect | Fizzles if no empty slot. |
| Swarm | Swarm Attack | order | - | buff_all_atk_1 | Friendly units get temp +1 ATK this turn. | Non-targeted effect | Swarm-specific behavior remains unchanged. |
| Swarm | Regrow | order | - | revive_friendly_1hp | Revive first unit found in discard to empty slot at 1 HP. | Non-targeted effect | First empty slot + first unit in discard. |
| Swarm | Flood | special | - | fill_empty_slots_0_1 | Summon up to **2** 0/1 Tokens in empty friendly slots, left-to-right. | Non-targeted effect | **Flood nerf is active in code** (not 3 tokens). |
| Swarm | Recycle | utility | - | destroy_friendly_draw_2 | Destroy targeted friendly unit, draw 2. | Targeted friendly | Immediate destroy, then draw. |
| Tank | Shieldbearer | unit | 1/2/0 | lane_armor_aura_1 | Adjacent allies gain +1 armor in combat. | Passive adjacency aura | Calculated during damage mitigation. |
| Tank | Heavy | unit | 2/3/0 | null | No special behavior. | Lane combat | Baseline durable unit. |
| Tank | Guardian | unit | 1/3/0 | intercept_lane_damage | Intercepts lane damage for adjacent ally once per combat cycle. | Deterministic adjacency intercept | One guardian intercept per index per resolve pass. |
| Tank | Wall | unit | 0/3/0 | cannot_attack | Cannot attack (ATK forced to 0). | Lane combat | Still can receive buffs/debuffs. |
| Tank | Bruiser | unit | 2/3/0 | gain_atk_when_damaged | Gains temp +1 ATK when damaged. | Damage trigger | Stacks within turn; reset after combat. |
| Tank | Fortify | order | - | buff_all_armor_1 | Friendly units get temp +1 armor this turn. | Non-targeted effect | Temp armor reset after combat. |
| Tank | Stability | order | - | immune_move_disable_this_turn | Grants immunity vs move/disable effects this turn. | Non-targeted effect | Blocks swap/disable effects by opponent. |
| Tank | Reinforce | order | - | heal_all_1 | Heal all friendly units by 1 (to max HP). | Non-targeted effect | Uses unit max HP cap. |
| Tank | Last Stand | special | - | cannot_drop_below_1_this_turn | Friendly units cannot drop below 1 HP this turn. | Non-targeted effect | Reset after combat resolve. |
| Tank | Reactive Plating | utility | - | temp_armor_1 | Targeted friendly gains temp +1 armor this combat. | Targeted friendly | Stacks with armor normally and resets with combat cleanup; does not heal HP. |

## 9) Implemented vs Deferred (Explicit)

Implemented now:
- PASS auto-turn loop.
- 1 meaningful action cap per player turn.
- Unit/effect split by `type === unit` vs non-unit.
- Targeted/non-targeted effect pipelines, including UI targeting for every targeted hand effect currently implemented in `GameState`.
- Deterministic Sniper targeting.
- Deterministic Controller on-play enemy swap.
- Flood capped at up to 2 tokens.
- One-time opening mulligan with up to 2 replacements before game start.

Deferred / intentionally simplified:
- Hidden-info peek UI (`peek_enemy_slot` no-op).
- Rich manual targeting UX for unit passive triggers not already implemented.


## 10) AI Parity and Behavior Notes

- Live enemy AI calls `chooseEnemyAction`, which is a wrapper around the owner-agnostic `chooseBattleAction(state, 'enemy')` scorer.
- AI-vs-AI mirror/batch simulations call the same `chooseBattleAction` scorer for both `player` and `enemy` owners, so mirror bots and the live enemy share action generation and scoring rules.
- Opening mulligans use shared `selectOpeningMulliganCardIds` evaluation for AI-controlled sides in live and simulation flows, replacing up to two low-tempo/low-synergy cards before turn 1.
- The scorer considers legal unit plays, redeploys, adjacent friendly swaps, non-targeted effects, and fully resolved targeted effects; it rejects pending/blocked/no-op targets and avoids recently repeated redeploy/swap loops.
- The behavior is intentionally simple but rule-aware: it prioritizes lethal hero damage, immediate hero damage, open-lane pressure, reducing opposing pressure, kills, and meaningful board improvements.
- Known MVP simplification: it evaluates the current action's immediate board/pressure result rather than searching multiple future turns.

## 11) Balance Notes (MVP Tracking)

- Flood nerf status: **active** (`fill_empty_slots_0_1` summons up to 2).
- Swarm no longer fills all 3 slots with Flood in current code.
- Tank/Shieldbearer package remains under observation for balance after Wall moved to 0/3.
- No Hero HP increase currently (still 12).
- No deck-size increase currently (still 10).

## 12) Document Authority and References

- Canonical rules: `docs/rules/mvp-battle-rules.md` (this file).
- Supporting historical/progress context:
  - `docs/battle_mvp_v1.md`
  - `docs/project/decisions.md`
  - `docs/project/progress.md`
