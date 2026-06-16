# AI Decision Diagnostic — June 16, 2026

Command: `node scripts/diagnose-ai-decisions.mjs --per-card=5 --max-games=1200 --seed=20260616`

## Executive summary

Captured 50 decision moments across 10 focus cards after scanning up to 28 ordered games. The AI scores legal actions by simulating the immediate action and valuing hero damage, open-lane pressure, pressure reduction, kills, board pressure, and card-specific heuristics. Overall, current balance results are directionally useful for simple tempo/combat cards but not trustworthy enough for final balance on indirect utility/control cards without more AI heuristic work.

## Biggest AI decision problems found

- Defensive utilities are often treated as generally valuable once legal, especially armor/stand-firm effects, even when the timing is marginal.
- Draw/sacrifice cards are guarded against obvious bad sacrifices, but their evaluation is mostly immediate and can miss opportunity cost on a 3-slot board.
- Reposition/control effects are filtered for meaningful pressure changes, which prevents many wastes, but scores can still overvalue any legal swap/control that produces immediate pressure.
- Pass behavior is reasonable when no finite scored actions exist, but the scorer rarely includes a scored pass alternative, so any finite legal utility can crowd out holding a card.

## Per-card decision audit

### attrition_swarm_feast_1 (Feast)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 3, side enemy, HP P/E 8/9
- Board before: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1`
- Top legal scores: **play-unit:attrition_swarm_rotcaller_1@3769**; play-unit:attrition_swarm_rotcaller_1@2931; play-effect:attrition_swarm_rise_again_1@2083; play-unit:attrition_swarm_rotcaller_1@1927; play-effect:attrition_swarm_feast_1@270; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_rotcaller_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Rotcaller(attrition_swarm_rotcaller_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 4, side enemy, HP P/E 6/5
- Board before: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1, attrition_swarm_infect_1`
- Top legal scores: **play-targeted-effect:attrition_swarm_infect_1@3888**; play-effect:attrition_swarm_rise_again_1@2083; play-effect:attrition_swarm_feast_1@270; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-targeted-effect","cardId":"attrition_swarm_infect_1","targetIndex":6,"targetIndexes":[6],"effectId":"infect_damage_1_opposite_ally_atk_1"}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Rotten Gift(attrition_swarm_infect_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 5, side enemy, HP P/E 7/6
- Board before: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_abomination_1, attrition_swarm_feast_1`
- Top legal scores: **play-unit:attrition_swarm_abomination_1@3922**; play-unit:attrition_swarm_abomination_1@2841; play-unit:attrition_swarm_abomination_1@2841; play-effect:attrition_swarm_rise_again_1@1653; play-effect:attrition_swarm_feast_1@270; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":0,"placementType":"redeploy","aiEvaluation":{"kind":"replace","meaningful":true,"pressureGain":382,"heroPressureGain":1,"openLaneImprovement":1,"loopKey":"replace:enemy:0:attrition_swarm_abomination_1:attrition_swarm_rotcaller_1"}}`
- Result: `{"ok":true,"type":"redeploy","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 6, side enemy, HP P/E 5/2
- Board before: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":6,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1, attrition_swarm_rotcaller_1, attrition_swarm_husk_1`
- Top legal scores: **play-unit:attrition_swarm_husk_1@2798**; play-unit:attrition_swarm_rotcaller_1@2791; play-unit:attrition_swarm_husk_1@2578; play-unit:attrition_swarm_rotcaller_1@2571; play-effect:attrition_swarm_rise_again_1@1653; play-effect:attrition_swarm_feast_1@270; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_husk_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Husk(attrition_swarm_husk_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":2,"owner":"enemy","id":"attrition_swarm_husk_1","name":"Husk","atk":1,"hp":1,"armor":0,"effectId":"combat_death_damage_enemy_lane_1"},{"i":6,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Attrition Swarm vs Control, turn 6, side enemy, HP P/E 7/5
- Board before: `[{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `attrition_swarm_husk_1, attrition_swarm_funeral_pyre_1, attrition_swarm_infect_1, attrition_swarm_feast_1`
- Top legal scores: **play-unit:attrition_swarm_husk_1@3752**; play-targeted-effect:attrition_swarm_infect_1@3748; play-targeted-effect:attrition_swarm_infect_1@3548; play-unit:attrition_swarm_husk_1@2798; play-unit:attrition_swarm_husk_1@2513; play-effect:attrition_swarm_feast_1@270; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_husk_1","slotIndex":1,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Husk(attrition_swarm_husk_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"attrition_swarm_husk_1","name":"Husk","atk":1,"hp":1,"armor":0,"effectId":"combat_death_damage_enemy_lane_1"},{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`


### swarm_recycle_1 (Substrate)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 4, side enemy, HP P/E 5/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `swarm_grunt_1, swarm_flood_1, swarm_alpha_1, swarm_recycle_1`
- Top legal scores: **play-unit:swarm_alpha_1@2551**; play-unit:swarm_grunt_1@2543; play-effect:swarm_flood_1@1713; play-effect:swarm_recycle_1@260
- Chosen: `{"type":"play-unit","cardId":"swarm_alpha_1","slotIndex":1,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Alpha(swarm_alpha_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"swarm_alpha_1","name":"Alpha","atk":1,"hp":2,"armor":0,"effectId":"adjacent_allies_atk_plus_1_ignore_armor_1"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 5, side enemy, HP P/E 3/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"},{"i":8,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"}]`
- Hand before: `swarm_grunt_1, swarm_flood_1, swarm_recycle_1, swarm_regrow_1`
- Top legal scores: **play-effect:swarm_flood_1@5276**; play-unit:swarm_grunt_1@3048; play-unit:swarm_grunt_1@3048; play-effect:swarm_regrow_1@2038; play-effect:swarm_recycle_1@-1180
- Chosen: `{"type":"play-effect","cardId":"swarm_flood_1","effectId":"fill_empty_slots_0_1","aiEvaluation":{"kind":"flood-lane-preservation","laneGain":2,"laneDifferentialGain":2,"isBehindOnLanes":true,"preservesContestedWidth":true,"opponentPressureReduced":6,"preventedImmediateHeroDamage":6,"preventsImmediateLethal":true}}`
- Result: `{"ok":true,"type":"effect","card":"Flood(swarm_flood_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"enemy_flood_token_1_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"enemy_flood_token_2_1","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"},{"i":8,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 2, side enemy, HP P/E 11/10
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `swarm_flood_1, swarm_grunt_1, swarm_spitter_1, swarm_recycle_1`
- Top legal scores: **play-effect:swarm_flood_1@3855**; play-unit:swarm_grunt_1@3732; play-unit:swarm_spitter_1@3732; play-unit:swarm_grunt_1@2543; play-unit:swarm_spitter_1@2516; play-effect:swarm_recycle_1@-1180
- Chosen: `{"type":"play-effect","cardId":"swarm_flood_1","effectId":"fill_empty_slots_0_1","aiEvaluation":{"kind":"flood-lane-preservation","laneGain":2,"laneDifferentialGain":2,"isBehindOnLanes":false,"preservesContestedWidth":false,"opponentPressureReduced":2,"preventedImmediateHeroDamage":2,"preventsImmediateLethal":false}}`
- Result: `{"ok":true,"type":"effect","card":"Flood(swarm_flood_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_flood_token_0_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"enemy_flood_token_2_1","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 3, side enemy, HP P/E 10/10
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `swarm_grunt_1, swarm_spitter_1, swarm_recycle_1, swarm_rusher_1`
- Top legal scores: **play-unit:swarm_rusher_1@3083**; play-unit:swarm_spitter_1@3056; play-unit:swarm_grunt_1@2828; play-unit:swarm_rusher_1@2513; play-unit:swarm_spitter_1@2486; play-unit:swarm_grunt_1@2060; play-unit:swarm_rusher_1@937; play-unit:swarm_spitter_1@910
- Chosen: `{"type":"play-unit","cardId":"swarm_rusher_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Rusher(swarm_rusher_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_rusher_1","name":"Rusher","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 4, side enemy, HP P/E 10/9
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`
- Hand before: `swarm_grunt_1, swarm_spitter_1, swarm_recycle_1, swarm_regrow_1`
- Top legal scores: **play-unit:swarm_spitter_1@6310**; play-unit:swarm_grunt_1@3732; play-unit:swarm_spitter_1@3732; play-unit:swarm_grunt_1@2478; play-effect:swarm_regrow_1@1743; play-unit:swarm_spitter_1@910; play-effect:swarm_recycle_1@-1180
- Chosen: `{"type":"play-unit","cardId":"swarm_spitter_1","slotIndex":0,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Spitter(swarm_spitter_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`


### swarm_spawn_1 (Spawn)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 6, side enemy, HP P/E 2/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"}]`
- Hand before: `swarm_grunt_1, swarm_recycle_1, swarm_regrow_1, swarm_spawn_1`
- Top legal scores: **play-unit:swarm_grunt_1@3732**; play-unit:swarm_grunt_1@3732; play-effect:swarm_regrow_1@2882; play-effect:swarm_spawn_1@2382
- Chosen: `{"type":"play-unit","cardId":"swarm_grunt_1","slotIndex":1,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Grunt(swarm_grunt_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"swarm_grunt_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 6, side enemy, HP P/E 8/9
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null}]`
- Hand before: `swarm_grunt_1, swarm_recycle_1, swarm_regrow_1, swarm_spawn_1`
- Top legal scores: **play-unit:swarm_grunt_1@2543**; play-effect:swarm_regrow_1@1653; play-effect:swarm_spawn_1@1153; play-effect:swarm_recycle_1@260
- Chosen: `{"type":"play-unit","cardId":"swarm_grunt_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Grunt(swarm_grunt_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_grunt_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 7, side enemy, HP P/E 6/9
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null}]`
- Hand before: `swarm_recycle_1, swarm_regrow_1, swarm_spawn_1, swarm_swarm_attack_1`
- Top legal scores: **play-effect:swarm_swarm_attack_1@2745**; play-effect:swarm_regrow_1@1653; play-effect:swarm_spawn_1@1153; swap-units:0->1@776; play-effect:swarm_recycle_1@260
- Chosen: `{"type":"play-effect","cardId":"swarm_swarm_attack_1","effectId":"buff_all_atk_1"}`
- Result: `{"ok":true,"type":"effect","card":"Swarm Attack(swarm_swarm_attack_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 8, side enemy, HP P/E 4/7
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null}]`
- Hand before: `swarm_recycle_1, swarm_regrow_1, swarm_spawn_1`
- Top legal scores: **play-effect:swarm_regrow_1@3442**; play-effect:swarm_spawn_1@2382; play-effect:swarm_recycle_1@-1180
- Chosen: `{"type":"play-effect","cardId":"swarm_regrow_1","effectId":"revive_friendly_1hp"}`
- Result: `{"ok":true,"type":"effect","card":"Regrow(swarm_regrow_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null}]`

#### Moment 5: reasonable

- Match: Swarm vs Tank, turn 9, side enemy, HP P/E 1/5
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null}]`
- Hand before: `swarm_recycle_1, swarm_spawn_1`
- Top legal scores: **play-effect:swarm_spawn_1@1153**; play-effect:swarm_recycle_1@260
- Chosen: `{"type":"play-effect","cardId":"swarm_spawn_1","effectId":"summon_grunt_empty_slot"}`
- Result: `{"ok":true,"type":"effect","card":"Spawn(swarm_spawn_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"enemy_summoned_grunt_2_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null}]`


### tank_reinforce_1 (Reinforce)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 5, side enemy, HP P/E 2/2
- Board before: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `tank_fortify_1, tank_stability_1, tank_repair_kit_1, tank_reinforce_1`
- Top legal scores: **play-effect:tank_stability_1@1180**; play-targeted-effect:tank_repair_kit_1@1092; play-targeted-effect:tank_repair_kit_1@1092; play-effect:tank_fortify_1@504; play-effect:tank_reinforce_1@252
- Chosen: `{"type":"play-effect","cardId":"tank_stability_1","effectId":"immune_move_disable_this_turn"}`
- Result: `{"ok":true,"type":"effect","card":"Stability(tank_stability_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 1, side player, HP P/E 12/12
- Board before: `[]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_heavy_1, tank_last_stand_1`
- Top legal scores: **play-unit:tank_heavy_1@4316**; play-unit:tank_heavy_1@4316; play-unit:tank_heavy_1@4316; play-unit:tank_shieldbearer_1@3744; play-unit:tank_shieldbearer_1@3744; play-unit:tank_shieldbearer_1@3744; play-effect:tank_reinforce_1@20
- Chosen: `{"type":"play-unit","cardId":"tank_heavy_1","slotIndex":6,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Heavy(tank_heavy_1)"}`
- Board after: `[{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 2, side player, HP P/E 8/10
- Board before: `[{"i":0,"owner":"enemy","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"},{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_last_stand_1, tank_guardian_1`
- Top legal scores: **play-unit:tank_guardian_1@3079**; play-unit:tank_shieldbearer_1@2911; play-unit:tank_guardian_1@2719; play-unit:tank_shieldbearer_1@2551; play-effect:tank_reinforce_1@20
- Chosen: `{"type":"play-unit","cardId":"tank_guardian_1","slotIndex":6,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Guardian(tank_guardian_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"},{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 3, side player, HP P/E 5/8
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_last_stand_1, tank_stability_1`
- Top legal scores: **play-unit:tank_shieldbearer_1@2551**; play-effect:tank_stability_1@1180; play-effect:tank_reinforce_1@252
- Chosen: `{"type":"play-unit","cardId":"tank_shieldbearer_1","slotIndex":7,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Shieldbearer(tank_shieldbearer_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 4, side player, HP P/E 5/6
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_reinforce_1, tank_last_stand_1, tank_stability_1, tank_wall_1`
- Top legal scores: **play-unit:tank_wall_1@2801**; play-unit:tank_wall_1@2384; play-effect:tank_reinforce_1@20
- Chosen: `{"type":"play-unit","cardId":"tank_wall_1","slotIndex":7,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Wall(tank_wall_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`


### wardens_stand_firm_1 (Stand Firm)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 1, side enemy, HP P/E 12/12
- Board before: `[]`
- Hand before: `wardens_watch_captain_1, wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1`
- Top legal scores: play-unit:wardens_watch_captain_1@4304; play-unit:wardens_watch_captain_1@4304; **play-unit:wardens_watch_captain_1@4304**; play-unit:wardens_spearwall_1@3762; play-unit:wardens_spearwall_1@3762; play-unit:wardens_spearwall_1@3762; play-effect:wardens_stand_firm_1@-580
- Chosen: `{"type":"play-unit","cardId":"wardens_watch_captain_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Watch Captain(wardens_watch_captain_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 2, side enemy, HP P/E 10/10
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1, wardens_halberdier_1`
- Top legal scores: **play-targeted-effect:wardens_shield_push_1@3000**; play-unit:wardens_spearwall_1@2858; play-unit:wardens_halberdier_1@2858; play-unit:wardens_spearwall_1@2578; play-unit:wardens_halberdier_1@2578; play-effect:wardens_stand_firm_1@-580
- Chosen: `{"type":"play-targeted-effect","cardId":"wardens_shield_push_1","targetIndex":6,"targetIndexes":[6,7],"effectId":"swap_adjacent_enemy_units","aiEvaluation":{"kind":"shield-push","meaningful":true,"pressureGain":260,"heroPressureGain":0,"openLaneImprovement":0}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Shield Push(wardens_shield_push_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 3, side enemy, HP P/E 8/8
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `wardens_spearwall_1, wardens_stand_firm_1, wardens_halberdier_1, wardens_hold_the_line_1`
- Top legal scores: play-unit:wardens_spearwall_1@2858; **play-unit:wardens_halberdier_1@2858**; play-unit:wardens_spearwall_1@2578; play-unit:wardens_halberdier_1@2578; play-effect:wardens_stand_firm_1@-580
- Chosen: `{"type":"play-unit","cardId":"wardens_halberdier_1","slotIndex":1,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Halberdier(wardens_halberdier_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_halberdier_1","name":"Halberdier","atk":2,"hp":1,"armor":0,"effectId":"opposing_lane_atk_plus_1"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 4, side enemy, HP P/E 8/6
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`
- Hand before: `wardens_spearwall_1, wardens_stand_firm_1, wardens_hold_the_line_1, wardens_bastion_guard_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@3219**; play-unit:wardens_spearwall_1@3078; play-unit:wardens_bastion_guard_1@2719; play-unit:wardens_spearwall_1@2578; play-effect:wardens_stand_firm_1@-580
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":1,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 5, side enemy, HP P/E 8/4
- Board before: `[{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `wardens_spearwall_1, wardens_stand_firm_1, wardens_hold_the_line_1, wardens_sentinel_1`
- Top legal scores: **play-unit:wardens_sentinel_1@4227**; play-unit:wardens_sentinel_1@2826; play-unit:wardens_spearwall_1@2778; play-unit:wardens_spearwall_1@2200; play-unit:wardens_sentinel_1@2137; play-effect:wardens_hold_the_line_1@1124; play-effect:wardens_stand_firm_1@-580
- Chosen: `{"type":"play-unit","cardId":"wardens_sentinel_1","slotIndex":1,"placementType":"redeploy","aiEvaluation":{"kind":"replace","meaningful":true,"pressureGain":407,"heroPressureGain":1,"openLaneImprovement":1,"loopKey":"replace:enemy:1:wardens_sentinel_1:wardens_bastion_guard_1"}}`
- Result: `{"ok":true,"type":"redeploy","card":"Sentinel(wardens_sentinel_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`


### wardens_shield_push_1 (Shield Push)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Wardens vs Aggro, turn 3, side enemy, HP P/E 6/3
- Board before: `[{"i":0,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":6,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `wardens_bastion_guard_1, wardens_shield_push_1, wardens_halberdier_1, wardens_hold_the_line_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@3439**; play-unit:wardens_halberdier_1@3298; play-targeted-effect:wardens_shield_push_1@2970
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":1,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":6,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable

- Match: Wardens vs Tank, turn 2, side enemy, HP P/E 10/10
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1, wardens_halberdier_1`
- Top legal scores: **play-targeted-effect:wardens_shield_push_1@3000**; play-unit:wardens_spearwall_1@2858; play-unit:wardens_halberdier_1@2858; play-unit:wardens_spearwall_1@2578; play-unit:wardens_halberdier_1@2578; play-effect:wardens_stand_firm_1@-580
- Chosen: `{"type":"play-targeted-effect","cardId":"wardens_shield_push_1","targetIndex":6,"targetIndexes":[6,7],"effectId":"swap_adjacent_enemy_units","aiEvaluation":{"kind":"shield-push","meaningful":true,"pressureGain":260,"heroPressureGain":0,"openLaneImprovement":0}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Shield Push(wardens_shield_push_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 5, side player, HP P/E 8/5
- Board before: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `wardens_brace_1, wardens_shield_push_1, wardens_stand_firm_1, wardens_sentinel_1`
- Top legal scores: **play-unit:wardens_sentinel_1@3331**; play-targeted-effect:wardens_shield_push_1@3220; play-targeted-effect:wardens_shield_push_1@3165; play-unit:wardens_sentinel_1@3046; play-unit:wardens_sentinel_1@1877; play-targeted-effect:wardens_brace_1@1088; play-effect:wardens_stand_firm_1@-580
- Chosen: `{"type":"play-unit","cardId":"wardens_sentinel_1","slotIndex":6,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Sentinel(wardens_sentinel_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":7,"owner":"player","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null}]`

#### Moment 4: reasonable

- Match: Wardens vs Tank, turn 7, side player, HP P/E 2/4
- Board before: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":2,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":2,"armor":0,"effectId":null}]`
- Hand before: `wardens_shield_push_1, wardens_stand_firm_1, wardens_reinforce_line_1, wardens_halberdier_1`
- Top legal scores: **play-targeted-effect:wardens_shield_push_1@3185**; play-unit:wardens_halberdier_1@2998; play-unit:wardens_halberdier_1@2998; play-targeted-effect:wardens_shield_push_1@2965; play-unit:wardens_halberdier_1@937; play-effect:wardens_stand_firm_1@-580
- Chosen: `{"type":"play-targeted-effect","cardId":"wardens_shield_push_1","targetIndex":1,"targetIndexes":[1,2],"effectId":"swap_adjacent_enemy_units","aiEvaluation":{"kind":"shield-push","meaningful":true,"pressureGain":445,"heroPressureGain":0,"openLaneImprovement":0}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Shield Push(wardens_shield_push_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":7,"owner":"player","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":2,"armor":0,"effectId":null}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Wardens vs Swarm, turn 3, side player, HP P/E 7/8
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_rusher_1","name":"Rusher","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null}]`
- Hand before: `wardens_bastion_guard_1, wardens_spearwall_1, wardens_brace_1, wardens_shield_push_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@3139**; play-targeted-effect:wardens_shield_push_1@3000; play-unit:wardens_spearwall_1@2998; play-unit:wardens_bastion_guard_1@2854; play-targeted-effect:wardens_shield_push_1@2835; play-unit:wardens_spearwall_1@2713; play-targeted-effect:wardens_brace_1@1088
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":8,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_rusher_1","name":"Rusher","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null}]`


### control_controller_1 (Controller)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Control vs Tank, turn 3, side enemy, HP P/E 10/8
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_system_override_1`
- Top legal scores: **play-targeted-effect:control_system_override_1@32708**; play-targeted-effect:control_system_override_1@32188; play-targeted-effect:control_system_override_1@31668; play-unit:control_controller_1@4461; play-unit:control_controller_1@4341; play-unit:control_controller_1@4336; play-unit:control_controller_1@4300; play-unit:control_controller_1@4291
- Chosen: `{"type":"play-targeted-effect","cardId":"control_system_override_1","targetIndex":8,"targetIndexes":[8],"effectId":"control_enemy_unit_this_turn"}`
- Result: `{"ok":true,"type":"targeted-effect","card":"System Override(control_system_override_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 2: reasonable

- Match: Control vs Tank, turn 4, side enemy, HP P/E 7/3
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_sniper_1`
- Top legal scores: **play-unit:control_controller_1@4556**; play-unit:control_controller_1@4556; play-unit:control_controller_1@4551; play-unit:control_controller_1@4523; play-unit:control_controller_1@4391; play-unit:control_controller_1@4331; play-unit:control_controller_1@4303; play-unit:control_controller_1@4171
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":0,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":7,"targetIndexes":[7,8],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":396,"heroPressureGain":0,"openLaneImprovement":0}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":8,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"}]`

#### Moment 3: reasonable

- Match: Control vs Tank, turn 4, side player, HP P/E 2/8
- Board before: `[{"i":0,"owner":"enemy","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_drone_1, control_controller_1, control_pulse_wave_1, control_hacker_1, control_recall_1`
- Top legal scores: **play-unit:control_controller_1@4166**; play-unit:control_controller_1@4166; play-unit:control_controller_1@4051; play-unit:control_controller_1@4051; play-unit:control_hacker_1@2746; play-unit:control_drone_1@2543; play-unit:control_hacker_1@2461; play-unit:control_hacker_1@2461
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":8,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":0,"targetIndexes":[0,2],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":146,"heroPressureGain":0,"openLaneImprovement":0}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"}]`

#### Moment 4: reasonable

- Match: Control vs Control, turn 5, side enemy, HP P/E 8/7
- Board before: `[{"i":2,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":6,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"},{"i":7,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"}]`
- Hand before: `control_controller_1, control_recall_1, control_pulse_wave_1, control_hacker_1, control_drone_1`
- Top legal scores: **play-unit:control_controller_1@4271**; play-unit:control_controller_1@4166; play-effect:control_pulse_wave_1@3106; play-unit:control_hacker_1@2966; play-unit:control_drone_1@2763; play-unit:control_hacker_1@2461; play-unit:control_drone_1@2060
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":1,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":6,"targetIndexes":[6,7],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":301,"heroPressureGain":0,"openLaneImprovement":0}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":2,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":7,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`

#### Moment 5: reasonable

- Match: Control vs Control, turn 7, side player, HP P/E 6/4
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":2,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":1,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"}]`
- Hand before: `control_swap_1, control_recall_1, control_pulse_wave_1, control_controller_1`
- Top legal scores: **play-unit:control_controller_1@4266**; play-unit:control_controller_1@4046; play-effect:control_pulse_wave_1@2906; play-targeted-effect:control_swap_1@920; play-targeted-effect:control_recall_1@20
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":7,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":1,"targetIndexes":[1,2],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":366,"heroPressureGain":0,"openLaneImprovement":0}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":1,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":2,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":7,"owner":"player","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"}]`


### control_jam_signal_1 (Jam Signal)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Control vs Aggro, turn 2, side enemy, HP P/E 11/8
- Board before: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":8,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `control_hacker_1, control_drone_1, control_controller_1, control_jam_signal_1`
- Top legal scores: **play-unit:control_hacker_1@3744**; play-unit:control_drone_1@3732; play-unit:control_hacker_1@3106; play-unit:control_drone_1@2903; play-targeted-effect:control_jam_signal_1@2370
- Chosen: `{"type":"play-unit","cardId":"control_hacker_1","slotIndex":1,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Hacker(control_hacker_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Control vs Tank, turn 2, side enemy, HP P/E 11/10
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `control_controller_1, control_disruptor_1, control_drone_1, control_jam_signal_1`
- Top legal scores: **play-unit:control_disruptor_1@3744**; play-unit:control_drone_1@3732; play-unit:control_disruptor_1@2551; play-unit:control_drone_1@2543; play-targeted-effect:control_jam_signal_1@2190
- Chosen: `{"type":"play-unit","cardId":"control_disruptor_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Disruptor(control_disruptor_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":2,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Control vs Tank, turn 3, side enemy, HP P/E 10/8
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_system_override_1`
- Top legal scores: **play-targeted-effect:control_system_override_1@32708**; play-targeted-effect:control_system_override_1@32188; play-targeted-effect:control_system_override_1@31668; play-unit:control_controller_1@4461; play-unit:control_controller_1@4341; play-unit:control_controller_1@4336; play-unit:control_controller_1@4300; play-unit:control_controller_1@4291
- Chosen: `{"type":"play-targeted-effect","cardId":"control_system_override_1","targetIndex":8,"targetIndexes":[8],"effectId":"control_enemy_unit_this_turn"}`
- Result: `{"ok":true,"type":"targeted-effect","card":"System Override(control_system_override_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Control vs Tank, turn 4, side enemy, HP P/E 7/3
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_sniper_1`
- Top legal scores: **play-unit:control_controller_1@4556**; play-unit:control_controller_1@4556; play-unit:control_controller_1@4551; play-unit:control_controller_1@4523; play-unit:control_controller_1@4391; play-unit:control_controller_1@4331; play-unit:control_controller_1@4303; play-unit:control_controller_1@4171
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":0,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":7,"targetIndexes":[7,8],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":396,"heroPressureGain":0,"openLaneImprovement":0}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":8,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"}]`

#### Moment 5: reasonable

- Match: Control vs Tank, turn 5, side enemy, HP P/E 7/1
- Board before: `[{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_drone_1, control_jam_signal_1, control_sniper_1, control_swap_1`
- Top legal scores: **play-targeted-effect:control_jam_signal_1@3080**; play-unit:control_sniper_1@2798; play-unit:control_drone_1@2763; play-unit:control_sniper_1@2578; play-unit:control_drone_1@2543; play-unit:control_sniper_1@2513; play-unit:control_drone_1@2060; play-targeted-effect:control_swap_1@920
- Chosen: `{"type":"play-targeted-effect","cardId":"control_jam_signal_1","targetIndex":6,"targetIndexes":[6,8],"effectId":"enemy_up_to_2_atk_minus_1","aiEvaluation":{"kind":"jam-signal","meaningful":true,"targetCount":2,"opponentPressureReduced":2}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Jam Signal(control_jam_signal_1)"}`
- Board after: `[{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`


### attrition_swarm_rise_again_1 (Rise Again)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 2, side enemy, HP P/E 11/12
- Board before: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":1,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_leech_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1`
- Top legal scores: **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_leech_1@3930; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_leech_1@2833; play-unit:attrition_swarm_rotcaller_1@2791; play-unit:attrition_swarm_rotcaller_1@1927; play-effect:attrition_swarm_rise_again_1@1873; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Leech(attrition_swarm_leech_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":1,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 3, side enemy, HP P/E 8/9
- Board before: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1`
- Top legal scores: **play-unit:attrition_swarm_rotcaller_1@3769**; play-unit:attrition_swarm_rotcaller_1@2931; play-effect:attrition_swarm_rise_again_1@2083; play-unit:attrition_swarm_rotcaller_1@1927; play-effect:attrition_swarm_feast_1@270; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_rotcaller_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Rotcaller(attrition_swarm_rotcaller_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 4, side enemy, HP P/E 6/5
- Board before: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1, attrition_swarm_infect_1`
- Top legal scores: **play-targeted-effect:attrition_swarm_infect_1@3888**; play-effect:attrition_swarm_rise_again_1@2083; play-effect:attrition_swarm_feast_1@270; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-targeted-effect","cardId":"attrition_swarm_infect_1","targetIndex":6,"targetIndexes":[6],"effectId":"infect_damage_1_opposite_ally_atk_1"}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Rotten Gift(attrition_swarm_infect_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 3, side enemy, HP P/E 8/10
- Board before: `[{"i":1,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":2,"owner":"enemy","id":"enemy_combat_death_grunt_2_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_infect_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1`
- Top legal scores: **play-unit:attrition_swarm_rotcaller_1@2446**; play-unit:attrition_swarm_rotcaller_1@2078; play-effect:attrition_swarm_rise_again_1@1533; play-targeted-effect:attrition_swarm_infect_1@1283; play-effect:attrition_swarm_funeral_pyre_1@770; play-targeted-effect:attrition_swarm_infect_1@368
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_rotcaller_1","slotIndex":0,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Rotcaller(attrition_swarm_rotcaller_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":1,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":2,"owner":"enemy","id":"enemy_combat_death_grunt_2_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 4, side enemy, HP P/E 8/11
- Board before: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_infect_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_abomination_1`
- Top legal scores: **play-targeted-effect:attrition_swarm_infect_1@4727**; play-targeted-effect:attrition_swarm_infect_1@3948; play-unit:attrition_swarm_abomination_1@3126; play-unit:attrition_swarm_abomination_1@2841; play-unit:attrition_swarm_abomination_1@2008; play-effect:attrition_swarm_rise_again_1@1653; play-effect:attrition_swarm_funeral_pyre_1@770; play-targeted-effect:attrition_swarm_infect_1@368
- Chosen: `{"type":"play-targeted-effect","cardId":"attrition_swarm_infect_1","targetIndex":6,"targetIndexes":[6],"effectId":"infect_damage_1_opposite_ally_atk_1"}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Rotten Gift(attrition_swarm_infect_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`


### attrition_swarm_leech_1 (Leech)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 1, side enemy, HP P/E 12/12
- Board before: `[{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_grave_call_1, attrition_swarm_leech_1, attrition_swarm_funeral_pyre_1`
- Top legal scores: **play-effect:attrition_swarm_grave_call_1@4515**; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_leech_1@2833; play-unit:attrition_swarm_rotcaller_1@2571; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_grave_call_1","effectId":"grave_call"}`
- Result: `{"ok":true,"type":"effect","card":"Grave Call(attrition_swarm_grave_call_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`

#### Moment 2: reasonable

- Match: Attrition Swarm vs Aggro, turn 2, side enemy, HP P/E 11/12
- Board before: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":1,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_leech_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1`
- Top legal scores: **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_leech_1@3930; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_leech_1@2833; play-unit:attrition_swarm_rotcaller_1@2791; play-unit:attrition_swarm_rotcaller_1@1927; play-effect:attrition_swarm_rise_again_1@1873; play-effect:attrition_swarm_funeral_pyre_1@-2580
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Leech(attrition_swarm_leech_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"enemy_grave_call_grunt_1_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":1,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`

#### Moment 3: reasonable

- Match: Attrition Swarm vs Tank, turn 1, side enemy, HP P/E 12/12
- Board before: `[]`
- Hand before: `attrition_swarm_carrier_1, attrition_swarm_leech_1, attrition_swarm_rotcaller_1, attrition_swarm_infect_1`
- Top legal scores: play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_leech_1@4322; **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_carrier_1@3779; play-unit:attrition_swarm_carrier_1@3779; play-unit:attrition_swarm_carrier_1@3779; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":2,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Leech(attrition_swarm_leech_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Attrition Swarm vs Control, turn 1, side enemy, HP P/E 12/12
- Board before: `[{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_abomination_1, attrition_swarm_husk_1, attrition_swarm_leech_1`
- Top legal scores: **play-unit:attrition_swarm_abomination_1@4339**; play-unit:attrition_swarm_abomination_1@4339; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_husk_1@3752; play-unit:attrition_swarm_husk_1@3752
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":0,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`

#### Moment 5: reasonable

- Match: Attrition Swarm vs Control, turn 2, side enemy, HP P/E 9/11
- Board before: `[{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_husk_1, attrition_swarm_leech_1, attrition_swarm_grave_call_1`
- Top legal scores: **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_leech_1@4322; play-effect:attrition_swarm_grave_call_1@4294; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_husk_1@3752; play-unit:attrition_swarm_husk_1@3752; play-unit:attrition_swarm_leech_1@2833
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":0,"placementType":"play"}`
- Result: `{"ok":true,"type":"play","card":"Leech(attrition_swarm_leech_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`


## Examples of bad/questionable decisions

Questionable moments above are primarily low-score defensive/sacrifice plays or indirect cards chosen without large immediate pressure change. No catastrophic first-legal-target pattern was observed in this sample; target candidates are scored/sorted for Jam Signal, Controller, Feast-like sacrifice, and swaps.

## Whether current balance results are trustworthy

Partially. The simulator AI is good enough to compare straightforward unit tempo and direct damage cards. It is not reliable enough to make confident final balance calls for sacrifice, draw-only, revive, defensive, and control packages because those cards depend on delayed value and hand/slot opportunity cost that the current immediate scorer only approximates.

## Recommended next step

Improve AI heuristics before balance cards: add an explicit pass/hold score, stronger opportunity-cost penalties for spending a 3-slot unit body, and delayed-value heuristics for draw/revive/defense/control. Then rerun this diagnostic and only afterwards run larger Balance Lab simulations.
