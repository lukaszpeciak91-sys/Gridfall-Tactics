# MVP Battle Rules (Canonical)

**Status:** Frozen for MVP implementation  
**Last Updated:** 2026-05-31

**Scope:** Gameplay rules for the MVP battle loop

This is the **single canonical source of truth** for MVP battle rules.
If any other document conflicts with this file, this file wins.

## 1) Battle Outcome and Base HP

- Player Base HP: **12**.
- Enemy Base HP: **12**.
- Battle-end checks are code-driven and occur during combat finalization and stable-boundary resource-exhaustion, no-progress, and turn-cap checks.
- Base defeat:
  - If only the player base is at **0 or lower HP** when base defeat is finalized, the **enemy wins**.
  - If only the enemy base is at **0 or lower HP** when base defeat is finalized, the **player wins**.
  - Base HP is clamped to 0 after winner assignment for display.
- Simultaneous lethal / base-defeat draw:
  - If both bases are at **0 or lower HP during the same combat/finalization window**, resolve the combat winner from the raw final base HP values before clamping.
  - Higher raw player base HP -> **player wins** (for example, player at -1 beats enemy at -4).
  - Higher raw enemy base HP -> **enemy wins**.
  - Equal raw base HP -> **draw** (for example, -3 vs -3 remains a draw).
  - This tiebreak changes only winner assignment after simultaneous lethal; combat order, lane order, damage timing, attack timing, and damage events are unchanged.
- MVP turn cap: **24 completed full turns**.
- At the turn cap, if no winner already exists, the winner is decided by remaining base HP:
  - Higher player base HP -> **player wins**.
  - Higher enemy base HP -> **enemy wins**.
  - Equal base HP -> **draw**.
- Immediate resource-exhaustion loss: at a stable battle boundary, a side loses if and only if it has **0 cards in hand**, **0 cards in deck**, **0 units on board**, and **strictly lower base HP** than its opponent.
  - Deck-empty is required: hand-empty-only never causes an automatic loss because future draws may still exist.
  - Equal base HP does not force a resource-exhaustion winner; no-progress/draw logic remains responsible for locked parity cases.
  - Resource exhaustion is checked only at stable battle boundaries: start of turn, after combat cleanup, after both draws, and before turn-cap resolution. It is never checked during targeting, mid-combat, between lane resolutions, between the two draws, or before death-trigger cleanup.
- Immediate no-progress end: if both sides have no meaningful remaining card/action, combat can no longer change base HP, and no remaining action can realistically affect the outcome, the battle ends immediately by remaining base HP:
  - Higher player base HP -> **player wins**.
  - Higher enemy base HP -> **enemy wins**.
  - Equal base HP -> **draw**.
- A board state with no realistic outcome-changing path is a no-progress deadlock and ends immediately by remaining base HP. The centralized check distinguishes cards merely remaining in hand/deck from legally reachable plays and from plays that can realistically affect base HP or the final winner.
- Future draws and reachable summon, redeploy, revive, swap, or combat sequences keep the battle active when they can still create outcome-changing pressure. Situational cards do not keep a locked battle alive when their required target, board condition, or follow-up resource cannot exist in any reachable state.
- There is no repeated-PASS or 3-pass stall counter; dead games end as soon as the locked outcome is detected.

### 1.1) Meaningful Actions for No-Progress Detection

For the no-progress/dead-game detector, a remaining action is meaningful only if it can realistically change the eventual winner or cause base HP to change. This detector examines the current board plus each side's hand and deck.

Meaningful for this detector includes:
- Combat that can ever change either base's HP from the current board, including open-lane attackers.
- A hand/deck unit with attack greater than 0.
- A hand/deck unit with an outcome-affecting special such as Runner open-lane bonus damage, Spitter lane damage, Brood death summon, Alpha aura, Attrition Swarm combat-only death pressure, Bruiser/Berserker attack growth, or Sniper lane flexibility.
- A non-unit effect that currently has useful targets and can create pressure or damage, such as attack buffs with friendly units, Quick Strike/Rush with attacking friendly units, Pierce/Pulse/System Override with enemy units, Spawn/Regrow/Grave Call with an empty friendly slot and valid source, Funeral Pyre when allied combat deaths are plausible, Rotten Gift with enemy units, or draw effects that can reach a future meaningful card.
- A friendly swap only if simulating that swap allows combat to eventually change base HP.

Not meaningful for this detector includes:
- PASS by itself.
- Purely defensive/no-op effects in a locked board state, such as armor, heal, cannot-drop-below-1, lane play block, move immunity, or cancel-order effects when they cannot create future base-pressure changes.
- A draw/recall/recycle effect whose available deck cards are themselves not meaningful.

Runner-only edge cases follow these same rules: an unblocked Runner in combat can change base HP because an open enemy lane adds +2 base damage, so the game continues until base defeat, another no-progress state, or the turn cap. If both sides deliver lethal Runner/open-lane damage in the same combat pass, the simultaneous-lethal raw-HP tiebreak above decides the result.

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
- Battle UI card-state visibility: the bottom navigation row contains only Back, Rules/Help, and Fullscreen. The live player deck count is shown as a compact `DECK N` control beside the player base, and tapping it opens a read-only Deck Info panel grouped by **In Deck**, **In Hand**, **Played / Discarded**, and **On Board**. The panel lists each card name with its Unit/Effect type and count, closes from the shared bottom BACK button or an outside overlay tap, remains view-only during opening mulligan, and does not open during unsafe flow animations.

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
- At each stable turn start, resource exhaustion is checked before no-progress handling and before either side acts; this gives deterministic end rules priority over optional AI surrender.
- Combat resolves only after both sides have acted or passed.
- If `firstActor` is `player`, the full turn order is:
  1. Player takes one action or PASS.
  2. Enemy takes one action or passes.
  3. Combat resolves across all 3 lanes, including base-lethal resolution and death-trigger cleanup.
  4. If resource exhaustion is detected, end immediately with `resource_exhaustion`.
  5. If no-progress deadlock is detected, end immediately by remaining base HP.
  6. Player draws 1.
  7. Enemy draws 1.
  8. If resource exhaustion is detected after both draws, end immediately with `resource_exhaustion`.
  9. If no-progress deadlock is detected after both draws, end immediately by remaining base HP.
  10. If this was completed turn 24 and no winner exists, apply the remaining-base-HP turn-cap rule.
  11. Initiative toggles for the next turn if the battle is still active.
- If `firstActor` is `enemy`, the full turn order is:
  1. Enemy takes one automatic action or passes.
  2. Player takes one action or PASS.
  3. Combat resolves across all 3 lanes, including base-lethal resolution and death-trigger cleanup.
  4. If resource exhaustion is detected, end immediately with `resource_exhaustion`.
  5. If no-progress deadlock is detected, end immediately by remaining base HP.
  6. Player draws 1.
  7. Enemy draws 1.
  8. If resource exhaustion is detected after both draws, end immediately with `resource_exhaustion`.
  9. If no-progress deadlock is detected after both draws, end immediately by remaining base HP.
  10. If this was completed turn 24 and no winner exists, apply the remaining-base-HP turn-cap rule.
  11. Initiative toggles for the next turn if the battle is still active.

Player turn actions that spend the one action for the turn:
- Play a unit card to a friendly combat slot.
- Play a non-unit effect card.
- Resolve a targeted effect.
- Swap two friendly units.
- Redeploy a unit from hand onto an occupied friendly slot.
- PASS without taking another action.

The no-progress detector still exists and uses the stricter "meaningful for outcome" definition in section 1.1; not every legal turn action is considered outcome-meaningful in a locked board state. Player surrender remains an optional, player-controlled hold gesture in concedable states rather than an automatic hand-empty loss.


## 4.1) Result Modal, Retry, and Back-to-Faction-Select Flow

- When a battle ends, the result modal displays **YOU WIN**, **YOU LOSE**, or **DRAW**.
- **RETRY** destroys the result modal, clears transient battle input/flow flags, and restarts `BattleScene` with the same player faction key and the same enemy faction key. The restarted battle creates a fresh battle state, reshuffles decks, redraws opening hands, and opens the normal mulligan flow again.
- **EXIT** destroys the result modal, clears transient battle input/flow flags, and starts `FactionSelectScene`.

## 5) Card-Type Handling Rules (Implementation Truth)

- `type: "unit"` cards are board units and must be placed/redeployed onto valid friendly combat slots.
- **All non-unit cards** are treated by gameplay logic as **effect cards**.
- `order`, `special`, and `utility` currently behave as **descriptive taxonomy labels** in card data; gameplay execution path is non-unit effect resolution unless a specific effectId says otherwise.
- Balance Lab custom/replacement cards may use implemented non-production effectId `swap_any_two_friendly_units` — Swap any 2 [ALLY]. It requires exactly two different acting-owner units and adds no stat buffs, damage, or draw.
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
- If opposing lane is empty, attacker hits opposing base.
- Both sides can deal damage during same combat step.
- Temporary combat-window modifiers/effects are reset during the nearest standard combat cleanup window.
- Temporary armor from Reactive Plating (`temp_armor_1`) and Wardens formation armor orders lasts until the nearest standard combat cleanup window; wording should use “until combat” and must not imply immediate lane-combat cleanup.
- Wardens defensive friction means: “When affected unit is attacked, attacker has -1 ATK for that combat damage calculation.” It applies only to unit-vs-unit combat damage calculations, does not create persistent temp state, does not reduce open-lane base damage, and does not reduce non-combat damage.
- Wardens defensive friction is capped at **-1 ATK total** per attack even if Sentinel and one or more Spearwalls would all apply. This MVP cap avoids zero-damage lockouts.

## 6.1) Effect Duration Taxonomy (MVP)

- **Until combat window**: Expires during the nearest standard end-of-turn combat cleanup.
  - Use “until combat” / “do walki” for temporary ATK/ARM modifiers, movement immunity, disable immunity, Last Stand-style prevention, and Disruptor's effect-card play block that clear there.
  - Immediate lane combat from Adrenaline/Rush does not consume this window or clear these effects. Temporary values remain active through the standard combat resolution and are cleared after its presentation completes.
- **This turn window**: Expires after PASS/combat resolution cleanup for effects that are not best described as combat-window modifiers.
- **Until consumed**: Lasts until a one-time trigger is used, then clears.
  - Example: `ignore_armor_next_attack`.
- **While on board**: Passive/auras only active while source unit remains on board.
  - Examples: adjacency aura effects like `lane_armor_aura_1`, `adjacent_allies_atk_plus_1_ignore_armor_1`.


### 6.2) Disruptor effect-card block

- Disruptor applies a side-specific action-availability restriction to the opponent until the standard combat cleanup window.
- While affected, that side cannot play effect cards, including both non-targeted effects and targeted effects.
- The block does **not** apply to unit cards, manual swaps, PASS, mulligan actions, or automatic combat/death triggers.
- Attempting to play a blocked effect card is illegal before resolution: the card is not selected for targeting, is not discarded, does not resolve, and does not consume the block.
- Combat cleanup clears the restriction for both sides alongside other until-combat temporary state.

## 7) Targeting Model (MVP)

- Card JSON `targeting` values are descriptive metadata, not the sole source of truth for manual UI targeting.
- Actual manual targeting is determined by `src/systems/cardTargeting.js` and effectId-specific handling in `GameState`.
- Some cards resolve deterministically instead of opening manual targeting UI. Deterministic effects must remain deterministic: Spawn, Regrow, Flood, Sniper, Controller and Pulse Wave do not get added manual targeting in MVP; Jam Signal uses direct max-target enemy targeting.
- Manual targeting is only used where the UI/logic currently supports targeted effect resolution.
- Deterministic simplifications currently in code:
  - **Sniper (`can_hit_any_lane`)** targets the lowest-HP enemy unit; ties break to lower board index.
  - **Controller (`swap_two_enemy_units`)** on-play picks first two enemy units by lane/index order.
  - **Shield Push (`swap_adjacent_enemy_units`)** is a manual two-target order: select an enemy, then select an adjacent enemy in the same row. The selected enemies swap positions and get -1 ATK until the nearest combat cleanup; the effect never crosses sides and never changes ownership. Invalid, empty, friendly, duplicate, or non-adjacent targets are rejected rather than discarded.
  - **Reinforce Line / Hold The Line (`adjacent_allies_temp_armor_1`)** give +1 temporary ARM to friendly units with same-row adjacent allies; isolated friendly units have no legal deterministic resolution and the order is rejected rather than discarded.
  - AI-controlled sides evaluate legal targeted actions, immediate effects, redeploys, and adjacent swaps with the same `chooseBattleAction` scorer used by AI-vs-AI simulation bots and the live enemy. Ties are deterministic in live enemy turns and seeded-random in simulation runs.
- No hidden-information peek UI; `peek_enemy_slot` is a no-op.
- No general manual targeting UI for unit passive abilities beyond implemented hooks.


### 7.1) Jam Signal-style direct max-targeting

For simple positive-friendly or negative-enemy effects with no downside to selecting more targets, do **not** use a separate `CONFIRM`/`DONE` action. The game should require the maximum number of currently valid targets up to the effect limit and auto-resolve after that many targets are selected. Targets that would receive no meaningful effect do not count as valid targets.

Concrete example: Jam Signal (`enemy_up_to_2_atk_minus_1`) says "Up to 2 [ENEMIES]: -1 ATK until combat," and live targeting treats that as direct max-target selection:

- If two enemy units have effective ATK above 0, the player taps two valid enemies and the effect resolves immediately on the second tap.
- If one enemy unit has effective ATK above 0, the player taps that one valid enemy and the effect resolves immediately on the first tap.
- Enemy units with 0 effective ATK are not valid Jam Signal targets because another -1 ATK would have no meaningful effect; ATK remains clamped at 0 by effective-stat logic.
- If there are no enemy units with effective ATK above 0, Jam Signal should not enter a targeting session and should use the existing blocked-action feedback path.

Candidate audit for the same rule:

- **Jam Signal (`enemy_up_to_2_atk_minus_1`)** now follows the rule: dynamic target count is `min(2, valid enemy units with ATK > 0)`, with no central `CONFIRM`/`DONE` step.
- **Flood (`fill_empty_slots_0_1`)** already behaves deterministically: it fills up to 2 empty friendly slots left-to-right with temporary board-only 1/1 Tokens and no manual targeting. The tokens vanish after combat and should not be described as normal persistent summons.
- **Spawn (`summon_grunt_empty_slot`)** and **Grave Call (`grave_call`)** use first-empty-slot deterministic placement. Grave Call fills the first empty friendly slot, or up to 2 left-to-right when the owner has no allies.
- **Opening mulligan** mentions "up to 2" but is not a battle targeting effect; choosing fewer replacements is strategically meaningful, so it should not follow this rule.
- **Swap / Shield Push / Controller swap effects** should not follow this rule because the chosen pair and/or choosing a legal pair has strategic movement implications; exact two-target selection remains correct.

### 7.2) Attrition Swarm Combat-Only Death Effects

- Attrition Swarm is a second Swarm-style faction focused on attrition, death value, sticky trades, and controlled bad-trade payoff. The no-cost MVP rules still apply: Attrition Swarm cards have no cost/mana/energy fields and use the same 10-card deck size.
- Combat-only death effects trigger only from defeated-unit cleanup during combat resolution. Non-combat destruction, redeploy replacement, return-to-hand effects, and targeted non-combat damage do not count as combat deaths.
- Feast is a draw-only utility: it draws 1 card and does not target, destroy allies, damage bases, summon, revive, or trigger fallen/death interactions.
- Funeral Pyre is a deterministic non-targeted order. It is active for the nearest standard combat cleanup window, counts only allied combat deaths, and is capped at 2 total lane-damage triggers per owner per combat. Multiple Funeral Pyres do not raise that cap.
- Abomination combat-death base damage is applied before final base HP clamping, so the raw-HP simultaneous lethal tiebreak in section 1 applies normally. Husk and Funeral Pyre combat-death damage is board-only and has no base fallback.
- Rotcaller uses same-row adjacency only and can gain at most +1 temporary ATK per combat; the temporary ATK clears after combat with other temporary unit modifiers.

### 7.3) Immediate Combat Effects

- Adrenaline / Quick Strike (`quick_strike`) and Rush / Charge-style swap combat (`swap_adjacent_then_resolve`) create additional immediate lane combat.
- Immediate lane combat does not replace the standard combat phase and does not mark that unit or lane as already resolved.
- Units that survive and remain on the board may still fight during the normal combat phase later in the same turn.
- Temporary “until combat” effects are cleared by the nearest standard combat cleanup window, not by these immediate lane-combat slices.

### 7.4) System Override Timing

- System Override (`control_enemy_unit_this_turn`) is immediate: the selected enemy immediately attacks its own base, then loses 1 HP.
- It is immediate, not delayed, and not a standard-combat replacement effect.

## 8) Effect/Card Behavior Matrix (Code-aligned)

| Faction | Card | Type | Stats | effectId | Implemented behavior | Targeting model | MVP simplifications / notes |
|---|---|---|---|---|---|---|---|
| Aggro | Runner | unit | 2/1/0 | lane_empty_bonus_damage | Open lane: +2 ATK | Lane combat | Projected in effective ATK and applied as an open-lane ATK combat modifier. |
| Aggro | Berserker | unit | 2/2/0 | wounded_atk_plus_1 | While damaged: +1 ATK. | Lane combat | Continuous card-local wounded check; bonus disappears when healed to full HP. |
| Aggro | Glass Cannon | unit | 3/1/0 | self_damage_after_attack | After attack: lose 1 HP. | Lane combat | Implemented as pending self-damage. |
| Aggro | Flanker | unit | 2/2/0 | empty_adjacent_bonus_atk | Empty adjacent slot on your side: +1 ATK. | Lane combat | Adjacent check is board-state based. |
| Aggro | Scout | unit | 2/1/0 | block_enemy_lane_play_this_turn | Until opponent's next action: no unit in this lane. | On-play lane | Symmetric for player/enemy; clears after the opponent's next action opportunity resolves. |
| Aggro | Full Attack | order | - | aggro_buff_all_atk_2 | All [ALLY] +2 ATK until combat. | Non-targeted effect | Expires after combat. |
| Aggro | Rush | order | - | swap_adjacent_then_resolve | Swap with adjacent [ALLY], then that lane immediately fights. | Targeted friendly | Fails if no adjacent friendly; prefers left if both sides are available; additional immediate lane combat does not replace standard combat. |
| Aggro | Pierce Strike | order | - | ignore_armor_next_attack | Deal 1 to [ENEMY].\nNext hit ignores [ARM]. | Targeted enemy | If the target survives, consumes ignore flag on first mitigated hit. |
| Aggro | Adrenaline | special | - | quick_strike | Selected [ALLY] immediately fights in its lane | Targeted friendly | Additional lane-only immediate combat slice; surviving units may still fight in standard combat. |
| Aggro | Quick Fix | utility | - | heal_1_atk_1_draw_on_kill_this_turn | Heal [ALLY] 1. +1 ATK until combat. Kills in combat: draw 1 | Targeted friendly | Heal is capped by max HP; draw uses one-shot combat kill tracking and temporary trigger cleanup after combat. |
| Control | Hacker | unit | 1/2/0 | enemy_lane_atk_minus_1 | Opposed [ENEMY]: -1 ATK until combat | Lane on-play | Also available as targeted effectId path. |
| Control | Disruptor | unit | 1/2/0 | block_enemy_effect_cards_until_combat | Until combat, opponent cannot play effect cards | On-play action-availability restriction | Blocks the opponent from playing non-targeted and targeted effect cards until combat cleanup; units, swaps, PASS, mulligan, and automatic combat/death triggers remain legal; this is not a delayed counterspell and does not consume itself on a blocked attempt. |
| Control | Sniper | unit | 2/1/0 | can_hit_any_lane | Attacks the lowest-HP [ENEMY] | Deterministic auto-target | Tie-break: lowest index; no manual target UI. |
| Control | Controller | unit | 1/2/0 | swap_two_enemy_units | On play: swap two [ENEMIES] | Staged two-enemy on-play targeting | Unit remains played; after cast feedback, select two distinct enemy units to swap. Cancel only cancels the swap effect. |
| Control | Drone | unit | 1/1/0 | death_damage_enemy_hero_1 | On death: enemy base loses 1 HP | Death trigger | Applies after unit removed. |
| Control | Swap | order | - | swap_any_two_units | Swap 2 [ALLY] or 2 [ENEMIES] | Two-target targeted effect | Requires two distinct occupied slots with the same owner; cannot trade units between sides. |
| Control | Jam Signal | order | - | enemy_up_to_2_atk_minus_1 | Up to 2 [ENEMIES]: -1 ATK until combat | Direct max-target enemy targeting | Choose the maximum currently valid enemy targets up to 2; only enemies with effective ATK above 0 are valid; auto-resolves on the final required tap and expires after combat. |
| Control | Pulse Wave | order | - | damage_all_enemies_1_ignore_armor | Deal 1 to all [ENEMIES], ignoring ARM | Non-targeted deterministic effect | Damages occupied enemy lanes only, ignores ARM, never damages bases, and cleans up defeated units after all Pulse Wave damage is applied. |
| Control | System Override | special | - | control_enemy_unit_this_turn | Selected [ENEMY] attacks its own base, then loses 1 HP | Targeted enemy | Immediate self-base attack, then the target loses 1 HP; no delayed combat timing. |
| Control | Recall | utility | - | return_friendly_draw_1 | Return [ALLY] to hand. Draw 1 | Targeted friendly | Blocked if hand already full. |
| Swarm | Grunt | unit | 1/1/0 | null |  | Lane combat | Vanilla unit with empty rules text. |
| Swarm | Spitter | unit | 1/1/0 | on_play_lane_damage_1 | On play: deal 1 to opposed [ENEMY] | Lane on-play | No base damage from this trigger. |
| Swarm | Brood | unit | 1/2/0 | on_death_summon_grunt | On death: summon 1/1 here | Death trigger | Uses generated token cardId if same slot is now empty. |
| Swarm | Rusher | unit | 2/1/0 | null | This unit ignores [ARM] | Lane combat | Combat attacks ignore defender ARM. |
| Swarm | Alpha | unit | 1/2/0 | adjacent_allies_atk_plus_1_ignore_armor_1 | Adjacent [ALLY] in combat: +1 ATK and ignores 1 ARM | Passive adjacency aura | Calculated at combat time; Alpha only benefits if adjacent to another Alpha. |
| Swarm | Spawn | order | - | summon_grunt_empty_slot | Summon a 1/1 in the first empty slot | Non-targeted deterministic effect | Rejected if no empty slot; no manual target UI. |
| Swarm | Swarm Attack | order | - | buff_all_atk_1 | All [ALLY] +1 ATK until combat | Non-targeted effect | Swarm-specific behavior remains unchanged. |
| Swarm | Regrow | order | - | revive_friendly_1hp | Revive the newest fallen unit with 1 HP | Non-targeted deterministic effect | First empty slot + newest fallen unit; no manual target UI. |
| Swarm | Flood | special | - | fill_empty_slots_0_1 | Fill up to 2 empty slots with 1/1s. They vanish after combat | Non-targeted deterministic effect | Fills up to 2 empty ally slots left-to-right with temporary board-only 1/1 Tokens; they vanish after combat or instead of returning to hand, do not enter hand or discard, and do not trigger death effects. |
| Attrition Swarm | Husk | unit | 1/1/0 | combat_death_damage_enemy_lane_1 | Combat death:<br>-1 [HP] to opposed [ENEMY]. | Combat-only death trigger | Damages only an opposing enemy unit in the same lane; no base fallback; does not trigger from Feast, redeploy, return, or non-combat damage cleanup. |
| Swarm | Substrate | utility | - | enemy_all_armor_minus_1 | [ENEMIES]: -1 ARM until combat | Deterministic enemy board debuff | Applies temporary -1 ARM to all current enemy units; no damage, draw, summon, or permanent HP/armor reduction. |
| Attrition Swarm | Carrier | unit | 1/2/0 | combat_death_summon_grunt | Combat death: summon 1/1 here | Combat-only death trigger | Summons a same-owner 1/1 in the same slot only after combat death and only if the slot is empty. |
| Attrition Swarm | Leech | unit | 2/1/0 | leech_heal_hero_on_attack | On attack: heal your base 1 | On-attack combat trigger | Heals its owner base by 1 whenever it attacks a unit or base during combat; base heal is capped by max HP and does not require killing or surviving. |
| Attrition Swarm | Rotcaller | unit | 1/2/0 | rotcaller_adjacent_death_atk_1 | First adjacent [ALLY] death in combat: +1 ATK until combat | Combat-only same-row adjacency trigger | Capped at +1 per Rotcaller per combat and clears after combat. |
| Attrition Swarm | Abomination | unit | 2/2/0 | combat_death_damage_both_heroes_1 | Combat death: both bases lose 1 HP | Combat-only death trigger | Both-base damage participates in raw-HP simultaneous lethal resolution. |
| Attrition Swarm | Funeral Pyre | order | - | funeral_pyre | First 2 [ALLY] combat deaths:<br>-1 [HP] to opposed [ENEMY]. | Non-targeted deterministic effect | Active for combat cleanup; cap 2 per owner per combat; damages only opposing enemy units in the dying allies’ lanes; no base fallback; multiple plays do not stack above cap. |
| Attrition Swarm | Rotten Gift | order | - | infect_damage_1_opposite_ally_atk_1 | Deal 1 to [ENEMY].\nOpposed [ALLY] gains +1 [ATK]. | Targeted enemy | Non-combat damage; if the target survives, the caster-owned unit directly opposite it gets +1 ATK until combat cleanup; if the target dies or no opposite ally exists, no buff or base damage occurs. |
| Attrition Swarm | Feast | utility | - | draw_1 | Draw 1 | No target | Draw-only cycle utility; does not destroy allies, damage bases, summon, revive, or interact with fallen units. |
| Attrition Swarm | Rise Again | order | - | revive_friendly_1hp | Revive the newest fallen unit with 1 HP | Non-targeted deterministic effect | First empty friendly slot + newest unit in fallen; no manual target UI. |
| Attrition Swarm | Grave Call | order | - | grave_call | Summon a 1/1. If you have no [ALLY], summon up to 2 | Non-targeted deterministic effect | Fills first empty friendly slot, or up to 2 left-to-right if the owner has no allies; rejected if no empty slot exists. |
| Overclock | Decoy Hare | unit | 1/1/0 | opposed_enemy_offline_next_combat | Opposed [ENEMY] offline for next combat | Lane on-play / next combat | Temporarily removes the opposed enemy for the next combat window, then returns it without Fallen bookkeeping. |
| Overclock | Suppressor Hog | unit | 1/2/0 | enemy_lane_atk_minus_1 | Opposed [ENEMY]: -1 ATK until combat | Lane on-play | Reuses Control lane ATK suppression; expires after combat cleanup. |
| Overclock | Single-Use Ox | unit | 2/4/0 | decay_hp_after_combat | After combat: lose 1 HP | Post-combat decay | After participating in combat, takes 1 post-combat direct damage and uses normal non-combat death cleanup. |
| Overclock | Breach Ram | unit | 2/2/0 | empty_adjacent_bonus_atk | Empty adjacent slot on your side: +1 ATK | Lane combat | Adjacent check is board-state based. |
| Overclock | Central Specimen | unit | 1/2/0 | atk_plus_per_other_ally | +1 ATK per other [ALLY] | Lane combat | Counts other same-owner units only, not itself or enemies. |
| Overclock | Quota Exceeded | order | - | buff_all_atk_1 | All [ALLY] +1 ATK until combat | Non-targeted effect | Expires after combat cleanup. |
| Overclock | Stock Reassignment | order | - | swap_adjacent_then_resolve | Swap with adjacent [ALLY], then that lane immediately fights | Targeted friendly | Fails if no adjacent friendly; immediate lane combat does not replace standard combat. |
| Overclock | Breach Test | order | - | ignore_armor_next_attack | Deal 1 to [ENEMY].\nNext hit ignores [ARM] | Targeted enemy | If the target survives, consumes ignore flag on first mitigated hit. |
| Overclock | Conditioned Reflex | special | - | quick_strike | Selected [ALLY] immediately fights in its lane | Targeted friendly | Additional lane-only immediate combat slice; surviving units may still fight in standard combat. |
| Overclock | Temper Shift | utility | - | lane_tempo_mod_until_combat | [ENEMY] -1 ATK; opposed [ALLY] +2 ATK until combat | Targeted enemy | Uses enemy-unit lane tempo params `targetEnemyAtk: -1` and `opposingAllyAtk: 2`; expires after combat cleanup. |
| Tank | Shieldbearer | unit | 1/2/0 | lane_armor_aura_1 | Adjacent [ALLY] +1 ARM until combat | Passive adjacency aura | Calculated during damage mitigation. |
| Tank | Heavy | unit | 2/3/0 | null |  | Lane combat | Vanilla unit with empty rules text. |
| Tank | Guardian | unit | 1/3/0 | intercept_lane_damage | Takes combat damage for adjacent [ALLY] | Deterministic adjacency intercept | One guardian intercept per index per resolve pass. |
| Tank | Wall | unit | 0/2/0 | cannot_attack |  | Lane combat | Still can receive buffs/debuffs. |
| Tank | Bruiser | unit | 2/3/0 | gain_atk_when_damaged | After surviving damage: +1 ATK until next combat | Damage trigger | Caps at +1 pending bonus; clears after it is available for the next combat. |
| Tank | Fortify | order | - | buff_all_armor_1 | All [ALLY] +1 ARM until combat | Non-targeted effect | Temporary ARM resets after combat. |
| Tank | Stability | order | - | immune_move_disable_this_turn | Until combat, [ALLIES] cannot be moved | Non-targeted effect | Blocks swap/disable effects by opponent. |
| Tank | Reinforce | order | - | heal_all_1 | Heal all [ALLY] by 1 | Non-targeted effect | Uses unit max HP cap. |
| Tank | Last Stand | special | - | cannot_drop_below_1_this_turn | Until combat, [ALLIES] cannot drop below 1 HP | Non-targeted effect | Reset after combat resolve. |
| Tank | Reactive Plating | utility | - | temp_armor_1 | Target [ALLY] +1 ARM until combat | Targeted friendly | Stacks with armor normally and resets at full turn/combat cleanup; does not heal HP. |
| Wardens | Tusk Guard | unit | 2/2/0 | warden_defensive_friction_self | Attackers: -1 ATK | Lane combat defensive friction | Combat-time only; capped with all Wardens friction at -1 total. |
| Wardens | Tundra Hunter | unit | 1/1/0 | warden_defensive_friction_adjacent | Attackers of adjacent [ALLIES]: -1 ATK | Passive adjacency aura | Same-row adjacency only; does not protect itself unless adjacent to another Spearwall; capped with all Wardens friction at -1 total. |
| Wardens | Ice Pike | unit | 2/1/0 | opposing_lane_atk_plus_1 | If opposed: +1 ATK | Lane combat | Board-state check only; no history or moved-this-turn logic. |
| Wardens | Tururuk | unit | 1/3/0 | null |  | Lane combat | Vanilla unit with empty rules text. |
| Wardens | Tererek | unit | 2/2/0 | null |  | Lane combat | Vanilla unit with empty rules text. |
| Wardens | Bone Shields | utility | - | temp_armor_1 | Target [ALLY] +1 ARM until combat | Targeted friendly | Reuses temporary armor cleanup; no costs. |
| Wardens | Mammoth Stampede | order | - | swap_adjacent_enemy_units | Swap two adjacent [ENEMIES]. | Manual two-enemy targeting | Select two adjacent enemies in the same row; no cross-side movement; no ownership changes. |
| Wardens | Endure the Cold | order | - | heal_1 | Heal [ALLY] +1 [HP] | Targeted friendly | Heal is capped by unit max HP. |
| Wardens | Lock the Line | order | - | immune_move_disable_this_turn | Until combat, [ALLIES] cannot be moved | Non-targeted effect | Same mechanical behavior as Tank Stability; blocks swap/disable effects by opponent. |
| Wardens | Hold the Ice Pass | order | - | adjacent_allies_temp_armor_1 | Adjacent [ALLY] +1 ARM until combat | Non-targeted formation effect | Adjacent-allies formation armor; reinforces Wardens shield-wall formation identity and reuses temporary armor cleanup. |

## 9) Implemented vs Deferred (Explicit)

Implemented now:
- PASS auto-turn loop.
- 1 meaningful action cap per player turn.
- Unit/effect split by `type === unit` vs non-unit.
- Targeted/non-targeted effect pipelines, including UI targeting for every targeted hand effect currently implemented in `GameState`.
- Deterministic Sniper targeting.
- Manual staged Controller on-play enemy swap.
- Flood capped at up to 2 temporary 1/1 Tokens that vanish after combat and do not trigger death effects.
- Wardens defensive friction, Halberdier opposing-lane bonus, Shield Push, Stand Firm, and Reinforce Line.
- Attrition Swarm combat-only death triggers, Funeral Pyre cap-2 death pressure, Rotten Gift, Feast, Rise Again, and Grave Call.
- Overclock / Project H.E.R.D. opposed-offline windows, HP decay, per-ally ATK scaling, quick forced fights, armor breach setup, and parameterized lane tempo shift.
- One-time opening mulligan with up to 2 replacements before game start.

Deferred / intentionally simplified:
- Hidden-info peek UI (`peek_enemy_slot` no-op).
- Rich manual targeting UX for unit passive triggers not already implemented.


## 10) AI Parity and Behavior Notes

- Live enemy AI calls `chooseEnemyAction`, which is a wrapper around the owner-agnostic `chooseBattleAction(state, 'enemy')` scorer.
- AI-vs-AI mirror/batch simulations call the same `chooseBattleAction` scorer for both `player` and `enemy` owners, so mirror bots and the live enemy share action generation and scoring rules.
- Opening mulligans use shared `selectOpeningMulliganCardIds` evaluation for AI-controlled sides in live and simulation flows, replacing up to two low-tempo/low-synergy cards before turn 1.
- The scorer considers legal unit plays, redeploys, adjacent friendly swaps, non-targeted effects, and fully resolved targeted effects; it rejects pending/blocked/no-op targets and avoids recently repeated redeploy/swap loops.
- The behavior is intentionally simple but rule-aware: it prioritizes lethal base damage, immediate base damage, open-lane pressure, reducing opposing pressure, kills, and meaningful board improvements.
- Known MVP simplification: it evaluates the current action's immediate board/pressure result rather than searching multiple future turns.

## 11) Balance Notes (MVP Tracking)

- `discard` remains the Played / Discarded archive. It is not a graveyard and does not make living archived units eligible for resurrection.
- Each side has a separate `fallen` stack for persistent units that died or were explicitly destroyed after entering the board. Resurrection consumes the newest eligible fallen entry first; recalls, redeploy displacement, and temporary Flood Token removal do not add entries.
- Flood tempo candidate status: **active** (`fill_empty_slots_0_1` summons up to 2 temporary 1/1 Tokens).
- Swarm no longer fills all 3 slots with Flood in current code; Flood Tokens are temporary board-only units. They vanish after combat or whenever they would leave the board through a return-to-hand path, and they skip hand, discard, and death-effect paths.
- Generated Grunts remain persistent card-like generated units: they return to hand through redeploy and Recall, preserve their artwork metadata, and can be replayed, discarded, or revived normally.
- Tank/Shieldbearer package remains under observation for balance after Wall moved to 0/3.
- No Base HP increase currently (still 12).
- No deck-size increase currently (still 10).

## 12) Document Authority and References

- Canonical rules: `docs/rules/mvp-battle-rules.md` (this file).
- Supporting historical/progress context:
  - `docs/battle_mvp_v1.md`
  - `docs/project/decisions.md`
  - `docs/project/progress.md`
