# MVP Battle Rules (Canonical)

**Status:** Frozen for MVP implementation  
**Last Updated:** 2026-05-10

**Scope:** Gameplay rules for the MVP battle loop

This is the **single canonical source of truth** for MVP battle rules.
If any other document conflicts with this file, this file wins.

## 1) Battle Outcome and Hero HP

- Player Hero HP: **12**.
- Enemy Hero HP: **12**.
- Battle-end checks are code-driven and occur during combat finalization, no-progress checks, and the turn-cap check.
- Hero death:
  - If only the player hero is at **0 or lower HP** when hero death is finalized, the **enemy wins**.
  - If only the enemy hero is at **0 or lower HP** when hero death is finalized, the **player wins**.
  - Hero HP is clamped to 0 after winner assignment for display.
- Simultaneous lethal / hero-death draw:
  - If both heroes are at **0 or lower HP during the same combat/finalization window**, resolve the combat winner from the raw final hero HP values before clamping.
  - Higher raw player hero HP -> **player wins** (for example, player at -1 beats enemy at -4).
  - Higher raw enemy hero HP -> **enemy wins**.
  - Equal raw hero HP -> **draw** (for example, -3 vs -3 remains a draw).
  - This tiebreak changes only winner assignment after simultaneous lethal; combat order, lane order, damage timing, attack timing, and damage events are unchanged.
- MVP turn cap: **50 completed full turns**.
- At the turn cap, if no winner already exists, the winner is decided by remaining hero HP:
  - Higher player hero HP -> **player wins**.
  - Higher enemy hero HP -> **enemy wins**.
  - Equal hero HP -> **draw**.
- Immediate no-progress end: if both sides have no meaningful remaining card/action, combat can no longer change hero HP, and no remaining action can realistically affect the outcome, the battle ends immediately by remaining hero HP:
  - Higher player hero HP -> **player wins**.
  - Higher enemy hero HP -> **enemy wins**.
  - Equal hero HP -> **draw**.
- Empty board + no meaningful playable cards is a no-progress deadlock and ends immediately by remaining hero HP. Empty board + any future card that can realistically affect hero HP or create future pressure does **not** immediately end.
- There is no repeated-PASS or 3-pass stall counter; dead games end as soon as the locked outcome is detected.

### 1.1) Meaningful Actions for No-Progress Detection

For the no-progress/dead-game detector, a remaining action is meaningful only if it can realistically change the eventual winner or cause hero HP to change. This detector examines the current board plus each side's hand and deck.

Meaningful for this detector includes:
- Combat that can ever change either hero's HP from the current board, including open-lane attackers.
- A hand/deck unit with attack greater than 0.
- A hand/deck unit with an outcome-affecting special such as Runner open-lane bonus damage, Spitter lane damage, Brood death summon, Alpha aura, Attrition Swarm combat-only death pressure, Bruiser/Berserker attack growth, or Sniper lane flexibility.
- A non-unit effect that currently has useful targets and can create pressure or damage, such as attack buffs with friendly units, Quick Strike/Rush with attacking friendly units, Pierce/Pulse/System Override with enemy units, Spawn/Regrow/Grave Call with an empty friendly slot and valid source, Funeral Pyre when allied combat deaths are plausible, Infect with enemy units, or draw effects that can reach a future meaningful card.
- A friendly swap only if simulating that swap allows combat to eventually change hero HP.

Not meaningful for this detector includes:
- PASS by itself.
- Purely defensive/no-op effects in a locked board state, such as armor, heal, cannot-drop-below-1, lane play block, move immunity, or cancel-order effects when they cannot create future hero-pressure changes.
- A draw/recall/recycle effect whose available deck cards are themselves not meaningful.

Runner-only edge cases follow these same rules: an unblocked Runner in combat can change hero HP because an open enemy lane adds +2 hero damage, so the game continues until hero death, another no-progress state, or the turn cap. If both sides deliver lethal Runner/open-lane damage in the same combat pass, the simultaneous-lethal raw-HP tiebreak above decides the result.

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
- Battle UI card-state visibility: the bottom navigation row contains only Back, Rules/Help, and Fullscreen. The live player deck count is shown as a compact `DECK N` control beside the action button, and tapping it opens a read-only Deck Info panel grouped by **In Deck**, **In Hand**, **Played / Discarded**, and **On Board**. The panel lists each card name with its Unit/Effect type and count, closes from the shared bottom BACK button or an outside overlay tap, remains view-only during opening mulligan, and does not open during unsafe flow animations.

## 3.1) Card Economy (No Cost in MVP)

- Cards have **no cost** in MVP.
- There is **no mana, energy, or other resource system**.
- The card economy is intentionally limited by the action economy: each side gets at most **1 action or PASS per full turn**.
- The absence of card cost fields in faction JSON is intentional and is **not** a missing data field.

## 4) Turn Flow, Initiative, and Action Economy (Auto-Turn)

- **Alternating initiative is a temporary MVP balancing aid.**
- Purpose: reduce fixed second-actor reaction advantage observed in simulations.
- This is not necessarily the final long-term turn system.
- At battle start, `firstActor` is randomly selected as `player` or `enemy`.
- Before the first turn starts, both sides draw 4 cards and resolve their one opening mulligan/keep decision. The live enemy resolves its automatic mulligan immediately after opening draw; the live player then chooses `KEEP HAND` or selects up to 2 cards and confirms `MULLIGAN`. Simulation mirrors use the shared opening mulligan evaluator.
- After each full turn resolution, `firstActor` toggles so initiative alternates player → enemy → player, or enemy → player → enemy.
- Each side gets at most **1 action or PASS** per full turn. In UI flow, PASS is only available while the player has not already used their turn action.
- PASS counts as that side's action for the turn, advances the auto-turn sequence, and does **not** increment any stall/pass counter.
- Combat resolves only after both sides have acted or passed.
- If `firstActor` is `player`, the full turn order is:
  1. Player takes one action or PASS.
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
  2. Player takes one action or PASS.
  3. Combat resolves across all 3 lanes.
  4. If no-progress deadlock is detected, end immediately by remaining hero HP.
  5. Player draws 1.
  6. Enemy draws 1.
  7. If no-progress deadlock is detected after draws, end immediately by remaining hero HP.
  8. If this was completed turn 50 and no winner exists, apply the remaining-hero-HP turn-cap rule.
  9. Initiative toggles for the next turn if the battle is still active.

Player turn actions that spend the one action for the turn:
- Play a unit card to a friendly combat slot.
- Play a non-unit effect card.
- Resolve a targeted effect.
- Swap two friendly units.
- Redeploy a unit from hand onto an occupied friendly slot.
- PASS without taking another action.

The no-progress detector uses the stricter "meaningful for outcome" definition in section 1.1; not every legal turn action is considered outcome-meaningful in a locked board state.


## 4.1) Result Modal, Retry, and Back-to-Faction-Select Flow

- When a battle ends, the result modal displays **YOU WIN**, **YOU LOSE**, or **DRAW**.
- **RETRY** destroys the result modal, clears transient battle input/flow flags, and restarts `BattleScene` with the same player faction key and the same enemy faction key. The restarted battle creates a fresh battle state, reshuffles decks, redraws opening hands, and opens the normal mulligan flow again.
- **EXIT** destroys the result modal, clears transient battle input/flow flags, and starts `FactionSelectScene`.

## 5) Card-Type Handling Rules (Implementation Truth)

- `type: "unit"` cards are board units and must be placed/redeployed onto valid friendly combat slots.
- **All non-unit cards** are treated by gameplay logic as **effect cards**.
- `order`, `special`, and `utility` currently behave as **descriptive taxonomy labels** in card data; gameplay execution path is non-unit effect resolution unless a specific effectId says otherwise.
- Card JSON remains the gameplay source of truth. It still owns stable `id`, original `name`, `effectId`, targeting, stats, and `textShort`; do not remove original names, add translation files, or add `nameKey`/`textKey` until the later localization migration.
- Presentation metadata is additive UI data. Card display strings flow through `src/localization/cardDisplay.js`, which now prefers locale-aware presentation-name overrides from `src/data/presentation/factionPresentation.js` and falls back to English presentation names or the original `card.name`.
- UI-specific labels are separated by explicit render-mode helpers in `src/rendering/cardRenderModes.js`. This keeps gameplay data stable while allowing multiple UI render modes for hand/full cards, board/compact units, collection rows/details, and deck summaries.
- Deck Info summary entries, Collection row/detail labels, hand-card UI labels, hand zoom/full preview, enemy action messages, and compact board unit names are routed through presentation-aware display helpers.
- Hand-card UI labels use the HAND/FULL render mode: presentation-aware card name, unit stats when relevant, and `textShort`.
- Board cards must stay compact: board unit labels may use presentation-aware names, but they must remain name plus ATK/HP/ARM-style combat stats and must not show long rules text or `textShort`.
- Artwork remains language-neutral. Future localization should swap text through display adapters/render modes rather than baking language into card art.
- A future board tap or long-press affordance can open a full card preview when players need long rules text, without putting that text directly on board units.
- Future localization migration is expected to add `nameKey` / `textKey` while keeping gameplay data stable and avoiding behavior changes.

- Individual card objects in faction JSON do **not** need a `faction` field; cards inherit faction identity from the top-level faction JSON file (`id` / `name`).
- The canonical behavior matrix may list faction for readability, but source card data must not duplicate that value per card.

## 6) Combat Rules

- Combat is column/lane-based (enemy index `col` vs player index `col+6`).
- No diagonal combat.
- If opposing lane is empty, attacker hits opposing hero.
- Both sides can deal damage during same combat step.
- Temporary turn-based modifiers/effects are reset after combat resolution.
- Temporary armor from Reactive Plating (`temp_armor_1`) and Wardens formation armor orders lasts until full turn/combat cleanup; wording should use “until combat ends” and must not imply immediate lane-combat cleanup.
- Wardens defensive friction means: “When affected unit is attacked, attacker has -1 ATK for that combat damage calculation.” It applies only to unit-vs-unit combat damage calculations, does not create persistent temp state, does not reduce open-lane hero damage, and does not reduce non-combat damage.
- Wardens defensive friction is capped at **-1 ATK total** per attack even if Sentinel and one or more Spearwalls would all apply. This MVP cap avoids zero-damage lockouts.

## 6.1) Effect Duration Taxonomy (MVP)

- **This turn window**: Expires after PASS/combat resolution cleanup.
  - Examples: lane play blocks, `cancel_enemy_order`, temporary ATK/ARM modifiers.
- **Until consumed**: Lasts until a one-time trigger is used, then clears.
  - Example: `ignore_armor_next_attack`.
- **While on board**: Passive/auras only active while source unit remains on board.
  - Examples: adjacency aura effects like `lane_armor_aura_1`, `adjacent_allies_atk_plus_1_ignore_armor_1`.

## 7) Targeting Model (MVP)

- Card JSON `targeting` values are descriptive metadata, not the sole source of truth for manual UI targeting.
- Actual manual targeting is determined by `src/systems/cardTargeting.js` and effectId-specific handling in `GameState`.
- Some cards resolve deterministically instead of opening manual targeting UI. Deterministic effects must remain deterministic: Spawn, Regrow, Flood, Sniper, Controller, Jam Signal, and Pulse Wave do not get added manual targeting in MVP.
- Manual targeting is only used where the UI/logic currently supports targeted effect resolution.
- Deterministic simplifications currently in code:
  - **Sniper (`can_hit_any_lane`)** targets the lowest-HP enemy unit; ties break to lower board index.
  - **Controller (`swap_two_enemy_units`)** on-play picks first two enemy units by lane/index order.
  - **Shield Push (`swap_leftmost_adjacent_enemies`)** swaps the leftmost legal adjacent enemy pair in the opponent row only; it never crosses sides and never changes ownership. If no adjacent enemy pair exists, it has no legal deterministic resolution and is rejected rather than discarded.
  - **Reinforce Line / Hold The Line (`adjacent_allies_temp_armor_1`)** give +1 temporary ARM to friendly units with same-row adjacent allies; isolated friendly units have no legal deterministic resolution and the order is rejected rather than discarded.
  - AI-controlled sides evaluate legal targeted actions, immediate effects, redeploys, and adjacent swaps with the same `chooseBattleAction` scorer used by AI-vs-AI simulation bots and the live enemy. Ties are deterministic in live enemy turns and seeded-random in simulation runs.
- No hidden-information peek UI; `peek_enemy_slot` is a no-op.
- No general manual targeting UI for unit passive abilities beyond implemented hooks.

### 7.1) Attrition Swarm Combat-Only Death Effects

- Attrition Swarm is a second Swarm-style faction focused on attrition, death value, sticky trades, and controlled bad-trade payoff. The no-cost MVP rules still apply: Attrition Swarm cards have no cost/mana/energy fields and use the same 10-card deck size.
- Combat-only death effects trigger only from defeated-unit cleanup during combat resolution. Non-combat destruction, redeploy replacement, return-to-hand effects, and targeted non-combat damage do not count as combat deaths.
- Feast is explicitly non-combat destruction: it destroys a friendly unit and draws 1, but it does not trigger Husk, Carrier, Rotcaller, Abomination, or Funeral Pyre.
- Funeral Pyre is a deterministic non-targeted order. It is active for the next combat cleanup window, counts only allied combat deaths, and is capped at 2 total lane-damage triggers per owner per combat. Multiple Funeral Pyres do not raise that cap.
- Abomination combat-death hero damage is applied before final hero HP clamping, so the raw-HP simultaneous lethal tiebreak in section 1 applies normally. Husk and Funeral Pyre combat-death damage is board-only and has no hero fallback.
- Rotcaller uses same-row adjacency only and can gain at most +1 temporary ATK per combat; the temporary ATK clears after combat with other temporary unit modifiers.

## 8) Effect/Card Behavior Matrix (Code-aligned)

| Faction | Card | Type | Stats | effectId | Implemented behavior | Targeting model | MVP simplifications / notes |
|---|---|---|---|---|---|---|---|
| Aggro | Runner | unit | 2/1/0 | lane_empty_bonus_damage | Open enemy line: enemy hero loses 2 HP. | Lane combat | Implemented in combat resolver. |
| Aggro | Berserker | unit | 2/2/0 | wounded_atk_plus_1 | +1 ATK while current HP is below max HP. | Lane combat | Continuous card-local wounded check; bonus disappears when healed to full HP. |
| Aggro | Glass Cannon | unit | 3/1/0 | self_damage_after_attack | Takes 1 self damage after attack resolves. | Lane combat | Implemented as pending self-damage. |
| Aggro | Flanker | unit | 2/2/0 | empty_adjacent_bonus_atk | If adjacent ally slot empty: +1 ATK. | Lane combat | Adjacent check is board-state based. |
| Aggro | Scout | unit | 2/1/0 | block_enemy_lane_play_this_turn | On play: block enemy unit play here this turn. | On-play lane | Symmetric for player/enemy; clears at PASS/combat cleanup. |
| Aggro | Full Attack | order | - | aggro_buff_all_atk_2 | Friendly units get temp +2 ATK this turn. | Non-targeted effect | Expires after combat. |
| Aggro | Rush | order | - | swap_adjacent_then_resolve | Swap with adjacent ally; fight that lane. | Targeted friendly | Fails if no adjacent friendly; prefers left if both sides are available. |
| Aggro | Pierce Strike | order | - | ignore_armor_next_attack | Deal 1. Next combat hit ignores its armor. | Targeted enemy | If the target survives, consumes ignore flag on first mitigated hit. |
| Aggro | Adrenaline | special | - | quick_strike | Resolve selected friendly unit's lane combat immediately. | Targeted friendly | Lane-only immediate combat slice. |
| Aggro | Quick Fix | utility | - | heal_1_atk_1_draw_on_kill_this_turn | Target [ALLY]: heal 1, +1 ATK this turn. Draw on kill. | Targeted friendly | Heal is capped by max HP; draw uses one-shot combat kill tracking and temporary trigger cleanup after combat. |
| Control | Hacker | unit | 1/2/0 | enemy_lane_atk_minus_1 | On play: opposing lane unit gets temp -1 ATK this turn. | Lane on-play | Also available as targeted effectId path. |
| Control | Disruptor | unit | 1/2/0 | cancel_enemy_order | On play: cancel next enemy effect this turn. | On-play non-targeted | Cancels at most one enemy non-unit action; expires at PASS/combat cleanup if unused; not a persistent aura. |
| Control | Sniper | unit | 2/1/0 | can_hit_any_lane | Attacks lowest-HP enemy unit. | Deterministic auto-target | Tie-break: lowest index; no manual target UI. |
| Control | Controller | unit | 1/2/0 | swap_two_enemy_units | On play: swap first 2 enemies. | Deterministic on-play | Picks first two enemy units by index order; not manual two-pick UI for this unit trigger. |
| Control | Drone | unit | 1/1/0 | death_damage_enemy_hero_1 | On death: enemy hero loses 1 HP. | Death trigger | Applies after unit removed. |
| Control | Swap | order | - | swap_any_two_units | Swap two selected units on one side. | Two-target targeted effect | Requires two distinct occupied slots with the same owner; cannot trade units between sides. |
| Control | Jam Signal | order | - | enemy_all_atk_minus_1 | Leftmost 2 enemies -1 ATK this turn. | Non-targeted deterministic effect | Picks occupied enemy lanes from left to right; expires after combat. |
| Control | Pulse Wave | order | - | damage_all_enemies_1_ignore_armor | Deal 1 to all enemies ignoring armor. | Non-targeted deterministic effect | Damages occupied enemy lanes only, ignores armor, never damages heroes, and cleans up defeated units after all Pulse Wave damage is applied. |
| Control | System Override | special | - | control_enemy_unit_this_turn | Target enemy hits its own hero next combat. | Targeted enemy | Clears after combat cleanup. |
| Control | Recall | utility | - | return_friendly_draw_1 | Return [ALLY] to hand. Draw 1. | Targeted friendly | Blocked if hand already full. |
| Swarm | Grunt | unit | 1/1/0 | null | No special behavior. | Lane combat | Baseline token-like unit. |
| Swarm | Spitter | unit | 1/1/0 | on_play_lane_damage_1 | On play: deal 1 to enemy in lane. | Lane on-play | No hero damage from this trigger. |
| Swarm | Brood | unit | 1/2/0 | on_death_summon_grunt | On death: summon 1/1 here. | Death trigger | Uses generated token cardId if same slot is now empty. |
| Swarm | Rusher | unit | 2/1/0 | null | No special behavior. | Lane combat | Baseline attacker. |
| Swarm | Alpha | unit | 1/2/0 | adjacent_allies_atk_plus_1_ignore_armor_1 | Adjacent allies +1 ATK, ignore 1 ARM. | Passive adjacency aura | Calculated at combat time; Alpha only benefits if adjacent to another Alpha. |
| Swarm | Spawn | order | - | summon_grunt_empty_slot | Summon 1/1 in first empty ally slot. | Non-targeted deterministic effect | Fizzles if no empty slot; no manual target UI. |
| Swarm | Swarm Attack | order | - | buff_all_atk_1 | All [ALLY] +1 ATK this turn. | Non-targeted effect | Swarm-specific behavior remains unchanged. |
| Swarm | Regrow | order | - | revive_friendly_1hp | Revive first discarded unit at 1 HP. | Non-targeted deterministic effect | First empty slot + first unit in discard; no manual target UI. |
| Swarm | Flood | special | - | fill_empty_slots_0_1 | Fill up to 2 empty ally slots with temporary 1/1s. | Non-targeted deterministic effect | Fills up to 2 empty friendly slots left-to-right with temporary 1/1 Tokens; they vanish after combat, do not enter discard, and do not trigger death effects. |
| Swarm | Recycle | utility | - | destroy_friendly_draw_1 | Destroy ally. Draw 1. | Targeted friendly | Immediate non-combat destroy, then draw 1. |
| Attrition Swarm | Husk | unit | 1/1/0 | combat_death_damage_enemy_lane_1 | Combat death: deal 1 to opposed enemy. | Combat-only death trigger | Damages only an opposing enemy unit in the same lane; no hero fallback; does not trigger from Feast, redeploy, return, or non-combat damage cleanup. |
| Attrition Swarm | Carrier | unit | 1/2/0 | combat_death_summon_grunt | Combat death: summon 1/1 here. | Combat-only death trigger | Summons a same-owner 1/1 in the same slot only after combat death and only if the slot is empty. |
| Attrition Swarm | Leech | unit | 2/1/0 | leech_heal_hero_on_combat_kill | Combat kill and survive: heal your hero 1. | Lane combat kill trigger | Heals its owner hero by 1 after dealing lethal combat damage and surviving; hero heal is capped by max HP. |
| Attrition Swarm | Rotcaller | unit | 1/2/0 | rotcaller_adjacent_death_atk_1 | First adjacent [ALLY] combat death: +1 ATK. | Combat-only same-row adjacency trigger | Capped at +1 per Rotcaller per combat and clears after combat. |
| Attrition Swarm | Abomination | unit | 2/2/0 | combat_death_damage_both_heroes_1 | Combat death: both heroes lose 1 HP. | Combat-only death trigger | Both-hero damage participates in raw-HP simultaneous lethal resolution. |
| Attrition Swarm | Funeral Pyre | order | - | funeral_pyre | First 2 [ALLY] combat deaths: deal 1 to opposed enemy. | Non-targeted deterministic effect | Active for combat cleanup; cap 2 per owner per combat; damages only opposing enemy units in the dying allies’ lanes; no hero fallback; multiple plays do not stack above cap. |
| Attrition Swarm | Infect | order | - | infect_damage_1_opposite_ally_atk_1 | Deal 1 to enemy. If it survives, opposed [ALLY] +1 ATK. | Targeted enemy | Non-combat damage; if the target survives, the caster-owned unit directly opposite it gets +1 ATK until combat cleanup; if the target dies or no opposite ally exists, no buff or hero damage occurs. |
| Attrition Swarm | Feast | utility | - | destroy_friendly_draw_1 | Destroy [ALLY]. Draw 1. | Targeted friendly | Reuses Recycle-style non-combat destruction and does not trigger combat-only death effects. |
| Attrition Swarm | Rise Again | order | - | revive_friendly_1hp | Revive the first discarded unit at 1 HP. | Non-targeted deterministic effect | First empty friendly slot + first unit in discard; no manual target UI. |
| Attrition Swarm | Grave Call | order | - | grave_call | Summon 1/1. If no [ALLY], summon 2. | Non-targeted deterministic effect | Fills first empty friendly slot, or up to 2 left-to-right if the owner has no allies; rejected if no empty slot exists. |
| Tank | Shieldbearer | unit | 1/2/0 | lane_armor_aura_1 | Adjacent allies have +1 ARM in combat. | Passive adjacency aura | Calculated during damage mitigation. |
| Tank | Heavy | unit | 2/3/0 | null | No special behavior. | Lane combat | Baseline durable unit. |
| Tank | Guardian | unit | 1/3/0 | intercept_lane_damage | Intercepts combat damage for adjacent ally. | Deterministic adjacency intercept | One guardian intercept per index per resolve pass. |
| Tank | Wall | unit | 0/2/0 | cannot_attack | Cannot attack (ATK forced to 0). | Lane combat | Still can receive buffs/debuffs. |
| Tank | Bruiser | unit | 2/3/0 | gain_atk_when_damaged | When damaged and survives: +1 ATK this turn. | Damage trigger | Stacks within turn; reset after combat. |
| Tank | Fortify | order | - | buff_all_armor_1 | Friendly units get temp +1 armor this turn. | Non-targeted effect | Temp armor reset after combat. |
| Tank | Stability | order | - | immune_move_disable_this_turn | Allies can’t be moved/disabled this turn. | Non-targeted effect | Blocks swap/disable effects by opponent. |
| Tank | Reinforce | order | - | heal_all_1 | Heal all friendly units by 1 (to max HP). | Non-targeted effect | Uses unit max HP cap. |
| Tank | Last Stand | special | - | cannot_drop_below_1_this_turn | Allies can’t drop below 1 HP this turn. | Non-targeted effect | Reset after combat resolve. |
| Tank | Reactive Plating | utility | - | temp_armor_1 | Target [ALLY] +1 ARM until combat ends. | Targeted friendly | Stacks with armor normally and resets at full turn/combat cleanup; does not heal HP. |
| Wardens | Sentinel | unit | 2/2/0 | warden_defensive_friction_self | Attackers: -1 ATK. | Lane combat defensive friction | Combat-time only; capped with all Wardens friction at -1 total. |
| Wardens | Spearwall | unit | 1/1/0 | warden_defensive_friction_adjacent | Attackers of adjacent allies: -1 ATK. | Passive adjacency aura | Same-row adjacency only; does not protect itself unless adjacent to another Spearwall; capped with all Wardens friction at -1 total. |
| Wardens | Halberdier | unit | 2/1/0 | opposing_lane_atk_plus_1 | Opposed: +1 ATK. | Lane combat | Board-state check only; no history or moved-this-turn logic. |
| Wardens | Bastion Guard | unit | 1/3/0 | null | No special behavior. | Lane combat | Baseline durable unit. |
| Wardens | Watch Captain | unit | 2/2/0 | null | No special behavior. | Lane combat | Baseline leader unit. |
| Wardens | Brace | utility | - | temp_armor_1 | Target [ALLY] +1 ARM until combat ends. | Targeted friendly | Reuses temporary armor cleanup; no costs. |
| Wardens | Shield Push | order | - | swap_leftmost_adjacent_enemies | Swap two adjacent enemies. | Non-targeted deterministic effect | Same enemy row only; no cross-side movement; no ownership changes; rejected if no legal adjacent enemy pair. |
| Wardens | Stand Firm | order | - | friendly_immovable_this_turn | All [ALLY] can't be moved this turn. | Non-targeted effect | Move-only protection; unlike Tank Stability, it does not block disable effects. |
| Wardens | Reinforce Line | order | - | adjacent_allies_temp_armor_1 | Adjacent [ALLY] +1 ARM until combat ends. | Non-targeted formation effect | Same-row friendly units with adjacent allies gain +1 temporary ARM; isolated allies have no legal deterministic resolution; no lane targeting UI. |
| Wardens | Hold The Line | order | - | adjacent_allies_temp_armor_1 | Adjacent [ALLY] +1 ARM until combat ends. | Non-targeted formation effect | Same adjacency behavior as Reinforce Line; reinforces Wardens shield-wall formation identity and reuses temporary armor cleanup. |

## 9) Implemented vs Deferred (Explicit)

Implemented now:
- PASS auto-turn loop.
- 1 meaningful action cap per player turn.
- Unit/effect split by `type === unit` vs non-unit.
- Targeted/non-targeted effect pipelines, including UI targeting for every targeted hand effect currently implemented in `GameState`.
- Deterministic Sniper targeting.
- Deterministic Controller on-play enemy swap.
- Flood capped at up to 2 temporary 1/1 Tokens that vanish after combat and do not trigger death effects.
- Wardens defensive friction, Halberdier opposing-lane bonus, Shield Push, Stand Firm, and Reinforce Line.
- Attrition Swarm combat-only death triggers, Funeral Pyre cap-2 death pressure, Infect, Feast, Rise Again, and Grave Call.
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

- Flood tempo candidate status: **active** (`fill_empty_slots_0_1` summons up to 2 temporary 1/1 Tokens).
- Swarm no longer fills all 3 slots with Flood in current code; Flood Tokens vanish after combat and skip death effects/discard paths.
- Tank/Shieldbearer package remains under observation for balance after Wall moved to 0/3.
- No Hero HP increase currently (still 12).
- No deck-size increase currently (still 10).

## 12) Document Authority and References

- Canonical rules: `docs/rules/mvp-battle-rules.md` (this file).
- Supporting historical/progress context:
  - `docs/battle_mvp_v1.md`
  - `docs/project/decisions.md`
  - `docs/project/progress.md`
