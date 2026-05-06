# MVP Battle Rules (Canonical)

**Status:** Frozen for MVP implementation  
**Last Updated:** 2026-05-05
**Scope:** Gameplay rules for the MVP battle loop

This is the **single canonical source of truth** for MVP battle rules.
If any other document conflicts with this file, this file wins.

## 1) Battle Outcome and Hero HP

- Player Hero HP: **12**
- Enemy Hero HP: **12**
- Battle ends immediately when either hero reaches **0 HP**.

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
- No mulligan in MVP (deferred / not implemented).

## 4) Turn Flow, Initiative, and Action Economy (Auto-Turn)

- **Alternating initiative is a temporary MVP balancing aid.**
- Purpose: reduce fixed second-actor reaction advantage observed in simulations.
- This is not necessarily the final long-term turn system.
- At battle start, `firstActor` is randomly selected as `player` or `enemy`.
- After each full turn resolution, `firstActor` toggles so initiative alternates player → enemy → player, or enemy → player → enemy.
- Each side gets at most **1 meaningful action/pass** per full turn.
- PASS counts as the player's action for that turn.
- Combat resolves only after both sides have acted or passed.
- If `firstActor` is `player`, the full turn order is:
  1. Player takes one meaningful action or PASS.
  2. Enemy takes one action or passes.
  3. Combat resolves across all 3 lanes.
  4. Player draws 1.
  5. Enemy draws 1.
  6. Initiative toggles for the next turn.
- If `firstActor` is `enemy`, the full turn order is:
  1. Enemy takes one automatic action or passes.
  2. Player takes one meaningful action or PASS.
  3. Combat resolves across all 3 lanes.
  4. Player draws 1.
  5. Enemy draws 1.
  6. Initiative toggles for the next turn.

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
  - Examples: adjacency aura effects like `lane_armor_aura_1`, `adjacent_allies_atk_plus_1`.

## 7) Targeting Model (MVP)

- Manual targeting is only used where the UI/logic currently supports targeted effect resolution.
- Deterministic simplifications currently in code:
  - **Sniper (`can_hit_any_lane`)** targets the lowest-HP enemy unit; ties break to lower board index.
  - **Controller (`swap_two_enemy_units`)** on-play picks first two enemy units by lane/index order.
  - Enemy AI targeted effects choose first valid target index.
- No hidden-information peek UI; `peek_enemy_slot` is a no-op.
- No general manual targeting UI for unit passive abilities beyond implemented hooks.

## 8) Effect/Card Behavior Matrix (Code-aligned)

| Faction | Card | Type | Stats | effectId | Implemented behavior | Targeting model | MVP simplifications / notes |
|---|---|---|---|---|---|---|---|
| Aggro | Runner | unit | 2/1/0 | lane_empty_bonus_damage | +1 hero damage if opposing lane empty during attack. | Lane combat | Implemented in combat resolver. |
| Aggro | Striker | unit | 2/2/0 | null | No special behavior. | Lane combat | Baseline unit. |
| Aggro | Glass Cannon | unit | 3/1/0 | self_damage_after_attack | Takes 1 self damage after attack resolves. | Lane combat | Implemented as pending self-damage. |
| Aggro | Flanker | unit | 1/2/0 | empty_adjacent_bonus_atk | +1 ATK if adjacent friendly slot is empty. | Lane combat | Adjacent check is board-state based. |
| Aggro | Scout | unit | 1/1/0 | block_enemy_lane_play_this_turn | On play, blocks enemy unit placement in same lane this turn. | On-play lane | Symmetric for player/enemy; clears at PASS/combat cleanup. |
| Aggro | Full Attack | order | - | buff_all_atk_1 | Friendly units get temp +1 ATK this turn. | Non-targeted effect | Expires after combat. |
| Aggro | Rush | order | - | swap_adjacent_then_resolve | Swap with adjacent friendly (prefers left), resolve that lane combat immediately. | Targeted friendly | Fails if no adjacent friendly. |
| Aggro | Pierce Strike | order | - | ignore_armor_next_attack | Marks enemy target so next hit ignores armor once. | Targeted enemy | Consumes ignore flag on first mitigated hit. |
| Aggro | Adrenaline | special | - | quick_strike | Resolve selected friendly unit's lane combat immediately. | Targeted friendly | Lane-only immediate combat slice. |
| Aggro | Quick Fix | utility | - | heal_2 | Heal targeted friendly by 2 (capped by max HP). | Targeted friendly | Implemented via targeted resolution. |
| Control | Hacker | unit | 1/2/0 | enemy_lane_atk_minus_1 | On play: opposing lane unit gets temp -1 ATK this turn. | Lane on-play | Also available as targeted effectId path. |
| Control | Disruptor | unit | 1/2/0 | cancel_enemy_order | **On play unit trigger**: cancel next enemy non-unit/effect action this turn window. | On-play non-targeted | Cancels at most one enemy non-unit action; expires at PASS/combat cleanup if unused; not a persistent aura. |
| Control | Sniper | unit | 2/1/0 | can_hit_any_lane | Attacks lowest-HP enemy unit across lanes. | Deterministic auto-target | Tie-break: lowest index. |
| Control | Controller | unit | 1/2/0 | swap_two_enemy_units | On play: swap first two enemy units if at least two exist. | Deterministic on-play | Not manual two-pick UI for this unit trigger. |
| Control | Drone | unit | 1/1/0 | death_damage_enemy_hero_1 | On death, enemy hero takes 1. | Death trigger | Applies after unit removed. |
| Control | Swap | order | - | swap_any_two_units | Swap two selected units anywhere on board. | Two-target targeted effect | Requires two distinct occupied slots. |
| Control | Jam Signal | order | - | enemy_all_atk_minus_1 | All enemy units get temp -1 ATK this turn. | Non-targeted effect | Expires after combat. |
| Control | Pulse Wave | order | - | damage_all_enemies_1 | Deal 1 damage to all enemy row units. | Non-targeted effect | Defeated units cleaned up immediately. |
| Control | System Override | special | - | control_enemy_unit_this_turn | Target enemy attacks its own hero in next combat. | Targeted enemy | Clears after combat cleanup. |
| Control | Recall | utility | - | return_friendly_draw_1 | Return friendly unit to hand, then draw 1. | Targeted friendly | Blocked if hand already full. |
| Swarm | Grunt | unit | 1/1/0 | null | No special behavior. | Lane combat | Baseline token-like unit. |
| Swarm | Spitter | unit | 1/1/0 | on_play_lane_damage_1 | On play, deal 1 to opposing lane enemy unit. | Lane on-play | No hero damage from this trigger. |
| Swarm | Brood | unit | 1/2/0 | on_death_summon_grunt | On death, summon 1/1 Grunt in same slot if now empty. | Death trigger | Uses generated token cardId. |
| Swarm | Rusher | unit | 2/1/0 | null | No special behavior. | Lane combat | Baseline attacker. |
| Swarm | Alpha | unit | 1/2/0 | adjacent_allies_atk_plus_1 | Adjacent allies gain +1 attack in combat. | Passive adjacency aura | Calculated at combat time. |
| Swarm | Spawn | order | - | summon_grunt_empty_slot | Summon 1/1 Grunt to first empty friendly slot. | Non-targeted effect | Fizzles if no empty slot. |
| Swarm | Swarm Attack | order | - | buff_all_atk_1 | Friendly units get temp +1 ATK this turn. | Non-targeted effect | Same shared effect as Aggro Full Attack. |
| Swarm | Regrow | order | - | revive_friendly_1hp | Revive first unit found in discard to empty slot at 1 HP. | Non-targeted effect | First empty slot + first unit in discard. |
| Swarm | Flood | special | - | fill_empty_slots_0_1 | Summon up to **2** 0/1 Tokens in empty friendly slots, left-to-right. | Non-targeted effect | **Flood nerf is active in code** (not 3 tokens). |
| Swarm | Recycle | utility | - | destroy_friendly_draw_2 | Destroy targeted friendly unit, draw 2. | Targeted friendly | Immediate destroy, then draw. |
| Tank | Shieldbearer | unit | 1/3/0 | lane_armor_aura_1 | Adjacent allies gain +1 armor in combat. | Passive adjacency aura | Calculated during damage mitigation. |
| Tank | Heavy | unit | 2/4/0 | null | No special behavior. | Lane combat | Baseline durable unit. |
| Tank | Guardian | unit | 1/3/0 | intercept_lane_damage | Intercepts lane damage for adjacent ally once per combat cycle. | Deterministic adjacency intercept | One guardian intercept per index per resolve pass. |
| Tank | Wall | unit | 0/4/0 | cannot_attack | Cannot attack (ATK forced to 0). | Lane combat | Still can receive buffs/debuffs. |
| Tank | Bruiser | unit | 2/3/0 | gain_atk_when_damaged | Gains temp +1 ATK when damaged. | Damage trigger | Stacks within turn; reset after combat. |
| Tank | Fortify | order | - | buff_all_armor_1 | Friendly units get temp +2 armor this turn. | Non-targeted effect | Temp armor reset after combat. |
| Tank | Stability | order | - | immune_move_disable_this_turn | Grants immunity vs move/disable effects this turn. | Non-targeted effect | Blocks swap/disable effects by opponent. |
| Tank | Reinforce | order | - | heal_all_1 | Heal all friendly units by 1 (to max HP). | Non-targeted effect | Uses unit max HP cap. |
| Tank | Last Stand | special | - | cannot_drop_below_1_this_turn | Friendly units cannot drop below 1 HP this turn. | Non-targeted effect | Reset after combat resolve. |
| Tank | Repair Kit | utility | - | heal_3 | Heal targeted friendly by 3 (max HP cap). | Targeted friendly | Implemented via targeted resolution. |

## 9) Implemented vs Deferred (Explicit)

Implemented now:
- PASS auto-turn loop.
- 1 meaningful action cap per player turn.
- Unit/effect split by `type === unit` vs non-unit.
- Targeted/non-targeted effect pipelines.
- Deterministic Sniper targeting.
- Deterministic Controller on-play enemy swap.
- Flood capped at up to 2 tokens.

Deferred / intentionally simplified:
- Mulligan flow.
- Hidden-info peek UI (`peek_enemy_slot` no-op).
- Rich manual targeting UX for unit passive triggers not already implemented.

## 10) Balance Notes (MVP Tracking)

- Flood nerf status: **active** (`fill_empty_slots_0_1` summons up to 2).
- Swarm no longer fills all 3 slots with Flood in current code.
- Tank/Wall/Shieldbearer package remains under observation for balance.
- No Hero HP increase currently (still 12).
- No deck-size increase currently (still 10).

## 11) Document Authority and References

- Canonical rules: `docs/rules/mvp-battle-rules.md` (this file).
- Supporting historical/progress context:
  - `docs/battle_mvp_v1.md`
  - `docs/project/decisions.md`
  - `docs/project/progress.md`
