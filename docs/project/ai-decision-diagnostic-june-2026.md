# AI Decision Diagnostic — June 16, 2026

Command: `node scripts/diagnose-ai-decisions.mjs --per-card=5 --max-games=1200 --seed=20260616`

## Executive summary

Captured 60 decision moments across 12 focus cards after scanning up to 26 ordered games. The AI scores legal actions by simulating the immediate action and valuing hero damage, open-lane pressure, pressure reduction, kills, board pressure, and card-specific heuristics. Overall, current balance results are more reliable for simple tempo/combat cards and now expose utility-vs-HOLD margins for indirect utility/control cards.

## Biggest AI decision problems found

- Defensive utilities are often treated as generally valuable once legal, especially armor/stand-firm effects, even when the timing is marginal.
- Draw/sacrifice cards are guarded against obvious bad sacrifices, but their evaluation is mostly immediate and can miss opportunity cost on a 3-slot board.
- Reposition/control effects are filtered for meaningful pressure changes, which prevents many wastes, but scores can still overvalue any legal swap/control that produces immediate pressure.
- HOLD/PASS is now scored beside playable cards, so low-value legal utility can lose to holding the action/card.

## Per-card decision audit

### attrition_swarm_feast_1 (Feast)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 3, side enemy, HP P/E 7/7
- Board before: `[{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `attrition_swarm_grave_call_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1`
- Top legal scores: **play-effect:attrition_swarm_grave_call_1@1563 cost=560**; play-effect:attrition_swarm_rise_again_1@1263 cost=820; play-effect:attrition_swarm_feast_1@340 cost=300; pass:HOLD@0; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 1563
- Margin over HOLD: 1563
- Utility opportunity cost applied: 560
- Utility chosen reason: prevents meaningful incoming base damage
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_grave_call_1","effectId":"grave_call","aiEvaluation":{"utility":true,"cardId":"attrition_swarm_grave_call_1","utilityCategory":"utility","utilityScoreBeforeCost":2103,"utilityOpportunityCost":560,"utilityCostApplied":560,"utilityScoreAfterCost":1543,"utilityReason":"prevents meaningful incoming base damage","utilityThreshold":0,"holdScore":0,"marginOverHold":1563,"chosenAction":true,"utilityChosenReason":"prevents meaningful incoming base damage"}}`
- Result: `{"ok":true,"type":"effect","card":"Grave Call(attrition_swarm_grave_call_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 4, side enemy, HP P/E 6/7
- Board before: `[{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1, attrition_swarm_infect_1`
- Top legal scores: **play-effect:attrition_swarm_rise_again_1@2062 cost=820**; play-effect:attrition_swarm_feast_1@340 cost=300; pass:HOLD@0; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 2062
- Margin over HOLD: 2062
- Utility opportunity cost applied: 820
- Utility chosen reason: creates clear lane/hero pressure improvement
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_rise_again_1","effectId":"revive_friendly_1hp","aiEvaluation":{"utility":true,"cardId":"attrition_swarm_rise_again_1","utilityCategory":"utility","utilityScoreBeforeCost":2862,"utilityOpportunityCost":820,"utilityCostApplied":820,"utilityScoreAfterCost":2042,"utilityReason":"creates clear lane/hero pressure improvement","utilityThreshold":0,"holdScore":0,"marginOverHold":2062,"chosenAction":true,"utilityChosenReason":"creates clear lane/hero pressure improvement"}}`
- Result: `{"ok":true,"type":"effect","card":"Rise Again(attrition_swarm_rise_again_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 5, side enemy, HP P/E 4/3
- Board before: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_feast_1, attrition_swarm_infect_1, attrition_swarm_husk_1`
- Top legal scores: **play-unit:attrition_swarm_husk_1@2578**; play-effect:attrition_swarm_feast_1@160 cost=480; play-targeted-effect:attrition_swarm_infect_1@140; pass:HOLD@0; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 2578
- Margin over HOLD: 2578
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_husk_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2578,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Husk(attrition_swarm_husk_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"attrition_swarm_husk_1","name":"Husk","atk":1,"hp":1,"armor":0,"effectId":"combat_death_damage_enemy_lane_1"},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 6, side enemy, HP P/E 1/3
- Board before: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_feast_1, attrition_swarm_infect_1, attrition_swarm_carrier_1`
- Top legal scores: **play-unit:attrition_swarm_carrier_1@3779**; play-unit:attrition_swarm_carrier_1@1937; play-effect:attrition_swarm_feast_1@160 cost=480; pass:HOLD@0; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 3779
- Margin over HOLD: 3779
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_carrier_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3779,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Carrier(attrition_swarm_carrier_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"attrition_swarm_carrier_1","name":"Carrier","atk":1,"hp":2,"armor":0,"effectId":"combat_death_summon_grunt"},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 5, side enemy, HP P/E 7/8
- Board before: `[{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `attrition_swarm_infect_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1`
- Top legal scores: **play-targeted-effect:attrition_swarm_infect_1@3548**; play-effect:attrition_swarm_rise_again_1@958 cost=820; play-targeted-effect:attrition_swarm_infect_1@368; play-effect:attrition_swarm_feast_1@340 cost=300; pass:HOLD@0; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 3548
- Margin over HOLD: 3548
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-targeted-effect","cardId":"attrition_swarm_infect_1","targetIndex":6,"targetIndexes":[6],"effectId":"infect_damage_1_opposite_ally_atk_1","aiEvaluation":{"holdScore":0,"marginOverHold":3548,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Rotten Gift(attrition_swarm_infect_1)"}`
- Board after: `[{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`


### swarm_recycle_1 (Substrate)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 4, side enemy, HP P/E 5/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `swarm_grunt_1, swarm_flood_1, swarm_alpha_1, swarm_recycle_1`
- Top legal scores: **play-unit:swarm_alpha_1@2551**; play-unit:swarm_grunt_1@2543; play-effect:swarm_flood_1@973 cost=740; play-effect:swarm_recycle_1@260; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2551
- Margin over HOLD: 2551
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_alpha_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2551,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Alpha(swarm_alpha_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"swarm_alpha_1","name":"Alpha","atk":1,"hp":2,"armor":0,"effectId":"adjacent_allies_atk_plus_1_ignore_armor_1"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 5, side enemy, HP P/E 3/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"},{"i":8,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"}]`
- Hand before: `swarm_grunt_1, swarm_flood_1, swarm_recycle_1, swarm_regrow_1`
- Top legal scores: **play-effect:swarm_flood_1@4536 cost=740**; play-unit:swarm_grunt_1@3048; play-unit:swarm_grunt_1@3048; play-effect:swarm_regrow_1@1038 cost=1000; pass:HOLD@0; play-effect:swarm_recycle_1@-1180
- HOLD/PASS score: 0
- Chosen action score: 4536
- Margin over HOLD: 4536
- Utility opportunity cost applied: 740
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-effect","cardId":"swarm_flood_1","effectId":"fill_empty_slots_0_1","aiEvaluation":{"kind":"flood-lane-preservation","laneGain":2,"laneDifferentialGain":2,"isBehindOnLanes":true,"preservesContestedWidth":true,"opponentPressureReduced":6,"preventedImmediateHeroDamage":6,"preventsImmediateLethal":true,"utility":true,"cardId":"swarm_flood_1","utilityCategory":"utility","utilityScoreBeforeCost":5256,"utilityOpportunityCost":740,"utilityCostApplied":740,"utilityScoreAfterCost":4516,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":4536,"chosenAction":true,"utilityChosenReason":"prevents lethal"}}`
- Result: `{"ok":true,"type":"effect","card":"Flood(swarm_flood_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"enemy_flood_token_1_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"enemy_flood_token_2_1","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"},{"i":8,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 2, side enemy, HP P/E 11/10
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `swarm_flood_1, swarm_grunt_1, swarm_spitter_1, swarm_recycle_1`
- Top legal scores: **play-unit:swarm_grunt_1@3732**; play-unit:swarm_spitter_1@3732; play-effect:swarm_flood_1@3115 cost=740; play-unit:swarm_grunt_1@2543; play-unit:swarm_spitter_1@2516; pass:HOLD@0; play-effect:swarm_recycle_1@-1180
- HOLD/PASS score: 0
- Chosen action score: 3732
- Margin over HOLD: 3732
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_grunt_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3732,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Grunt(swarm_grunt_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_grunt_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 3, side enemy, HP P/E 10/8
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `swarm_flood_1, swarm_spitter_1, swarm_recycle_1, swarm_rusher_1`
- Top legal scores: **play-unit:swarm_rusher_1@2578**; play-unit:swarm_spitter_1@2516; play-unit:swarm_rusher_1@2513; play-unit:swarm_spitter_1@2486; play-effect:swarm_flood_1@1861 cost=740; play-unit:swarm_rusher_1@937; play-unit:swarm_spitter_1@910; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2578
- Margin over HOLD: 2578
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_rusher_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2578,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Rusher(swarm_rusher_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_rusher_1","name":"Rusher","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 4, side enemy, HP P/E 10/7
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `swarm_flood_1, swarm_spitter_1, swarm_recycle_1, swarm_regrow_1`
- Top legal scores: **play-unit:swarm_spitter_1@6950**; play-unit:swarm_spitter_1@6310; play-effect:swarm_flood_1@2746 cost=740; play-unit:swarm_spitter_1@910; play-effect:swarm_regrow_1@743 cost=1000; pass:HOLD@0; play-effect:swarm_recycle_1@-1180
- HOLD/PASS score: 0
- Chosen action score: 6950
- Margin over HOLD: 6950
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_spitter_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":6950,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Spitter(swarm_spitter_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`


### swarm_spawn_1 (Spawn)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 6, side enemy, HP P/E 2/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"}]`
- Hand before: `swarm_grunt_1, swarm_recycle_1, swarm_regrow_1, swarm_spawn_1`
- Top legal scores: **play-unit:swarm_grunt_1@3732**; play-unit:swarm_grunt_1@3732; play-effect:swarm_regrow_1@1882 cost=1000; play-effect:swarm_spawn_1@1642 cost=740; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3732
- Margin over HOLD: 3732
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_grunt_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3732,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Grunt(swarm_grunt_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"swarm_grunt_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 6, side enemy, HP P/E 8/6
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"}]`
- Hand before: `swarm_flood_1, swarm_recycle_1, swarm_regrow_1, swarm_spawn_1`
- Top legal scores: **play-effect:swarm_flood_1@1153 cost=560**; play-effect:swarm_regrow_1@833 cost=820; play-effect:swarm_spawn_1@593 cost=560; play-effect:swarm_recycle_1@260; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 1153
- Margin over HOLD: 1153
- Utility opportunity cost applied: 560
- Utility chosen reason: prevents meaningful incoming base damage
- Chosen: `{"type":"play-effect","cardId":"swarm_flood_1","effectId":"fill_empty_slots_0_1","aiEvaluation":{"kind":"flood-lane-preservation","laneGain":1,"laneDifferentialGain":1,"isBehindOnLanes":false,"preservesContestedWidth":false,"opponentPressureReduced":2,"preventedImmediateHeroDamage":2,"preventsImmediateLethal":false,"utility":true,"cardId":"swarm_flood_1","utilityCategory":"utility","utilityScoreBeforeCost":1693,"utilityOpportunityCost":560,"utilityCostApplied":560,"utilityScoreAfterCost":1133,"utilityReason":"prevents meaningful incoming base damage","utilityThreshold":0,"holdScore":0,"marginOverHold":1153,"chosenAction":true,"utilityChosenReason":"prevents meaningful incoming base damage"}}`
- Result: `{"ok":true,"type":"effect","card":"Flood(swarm_flood_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_flood_token_0_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 7, side enemy, HP P/E 7/6
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"}]`
- Hand before: `swarm_recycle_1, swarm_regrow_1, swarm_spawn_1, swarm_swarm_attack_1`
- Top legal scores: **play-effect:swarm_regrow_1@833 cost=820**; swap-units:1->2@780; play-effect:swarm_swarm_attack_1@770; play-effect:swarm_spawn_1@593 cost=560; play-effect:swarm_recycle_1@260; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 833
- Margin over HOLD: 833
- Utility opportunity cost applied: 820
- Utility chosen reason: prevents meaningful incoming base damage
- Chosen: `{"type":"play-effect","cardId":"swarm_regrow_1","effectId":"revive_friendly_1hp","aiEvaluation":{"utility":true,"cardId":"swarm_regrow_1","utilityCategory":"utility","utilityScoreBeforeCost":1633,"utilityOpportunityCost":820,"utilityCostApplied":820,"utilityScoreAfterCost":813,"utilityReason":"prevents meaningful incoming base damage","utilityThreshold":0,"holdScore":0,"marginOverHold":833,"chosenAction":true,"utilityChosenReason":"prevents meaningful incoming base damage"}}`
- Result: `{"ok":true,"type":"effect","card":"Regrow(swarm_regrow_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_alpha_1","name":"Alpha","atk":1,"hp":1,"armor":0,"effectId":"adjacent_allies_atk_plus_1_ignore_armor_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"}]`

#### Moment 4: reasonable

- Match: Swarm vs Tank, turn 8, side enemy, HP P/E 7/6
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"}]`
- Hand before: `swarm_recycle_1, swarm_spawn_1, swarm_swarm_attack_1`
- Top legal scores: **play-effect:swarm_spawn_1@813 cost=560**; pass:HOLD@0; play-effect:swarm_swarm_attack_1@-925; play-effect:swarm_recycle_1@-1180
- HOLD/PASS score: 0
- Chosen action score: 813
- Margin over HOLD: 813
- Utility opportunity cost applied: 560
- Utility chosen reason: prevents meaningful incoming base damage
- Chosen: `{"type":"play-effect","cardId":"swarm_spawn_1","effectId":"summon_grunt_empty_slot","aiEvaluation":{"utility":true,"cardId":"swarm_spawn_1","utilityCategory":"utility","utilityScoreBeforeCost":1353,"utilityOpportunityCost":560,"utilityCostApplied":560,"utilityScoreAfterCost":793,"utilityReason":"prevents meaningful incoming base damage","utilityThreshold":0,"holdScore":0,"marginOverHold":813,"chosenAction":true,"utilityChosenReason":"prevents meaningful incoming base damage"}}`
- Result: `{"ok":true,"type":"effect","card":"Spawn(swarm_spawn_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_summoned_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Swarm vs Control, turn 1, side enemy, HP P/E 12/12
- Board before: `[{"i":6,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `swarm_spawn_1, swarm_spitter_1, swarm_grunt_1, swarm_brood_1`
- Top legal scores: **play-unit:swarm_spitter_1@6630**; play-unit:swarm_brood_1@3744; play-unit:swarm_brood_1@3744; play-unit:swarm_spitter_1@3732; play-unit:swarm_spitter_1@3732; play-unit:swarm_grunt_1@3732; play-unit:swarm_grunt_1@3732; play-unit:swarm_brood_1@2771
- HOLD/PASS score: 0
- Chosen action score: 6630
- Margin over HOLD: 6630
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_spitter_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":6630,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Spitter(swarm_spitter_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"}]`


### tank_reinforce_1 (Reinforce)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 5, side enemy, HP P/E 2/2
- Board before: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `tank_fortify_1, tank_stability_1, tank_repair_kit_1, tank_reinforce_1`
- Top legal scores: **play-effect:tank_stability_1@620 cost=560**; play-targeted-effect:tank_repair_kit_1@572 cost=520; play-targeted-effect:tank_repair_kit_1@572 cost=520; play-effect:tank_reinforce_1@492 cost=440; pass:HOLD@0; play-effect:tank_fortify_1@-16 cost=520
- HOLD/PASS score: 0
- Chosen action score: 620
- Margin over HOLD: 620
- Utility opportunity cost applied: 560
- Utility chosen reason: protects an important board
- Chosen: `{"type":"play-effect","cardId":"tank_stability_1","effectId":"immune_move_disable_this_turn","aiEvaluation":{"utility":true,"cardId":"tank_stability_1","utilityCategory":"stability","utilityScoreBeforeCost":1160,"utilityOpportunityCost":560,"utilityCostApplied":560,"utilityScoreAfterCost":600,"utilityReason":"protects an important board","utilityThreshold":0,"holdScore":0,"marginOverHold":620,"chosenAction":true,"utilityChosenReason":"protects an important board"}}`
- Result: `{"ok":true,"type":"effect","card":"Stability(tank_stability_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 1, side player, HP P/E 12/12
- Board before: `[]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_heavy_1, tank_last_stand_1`
- Top legal scores: **play-unit:tank_heavy_1@4316**; play-unit:tank_heavy_1@4316; play-unit:tank_heavy_1@4316; play-unit:tank_shieldbearer_1@3744; play-unit:tank_shieldbearer_1@3744; play-unit:tank_shieldbearer_1@3744; pass:HOLD@0; play-effect:tank_reinforce_1@-2800 cost=620
- HOLD/PASS score: 0
- Chosen action score: 4316
- Margin over HOLD: 4316
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_heavy_1","slotIndex":6,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4316,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Heavy(tank_heavy_1)"}`
- Board after: `[{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 2, side player, HP P/E 8/10
- Board before: `[{"i":0,"owner":"enemy","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"},{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_last_stand_1, tank_guardian_1`
- Top legal scores: **play-unit:tank_guardian_1@3079**; play-unit:tank_shieldbearer_1@2911; play-unit:tank_guardian_1@2719; play-unit:tank_shieldbearer_1@2551; pass:HOLD@0; play-effect:tank_reinforce_1@-2800 cost=620
- HOLD/PASS score: 0
- Chosen action score: 3079
- Margin over HOLD: 3079
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_guardian_1","slotIndex":6,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3079,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Guardian(tank_guardian_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"},{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 3, side player, HP P/E 5/8
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_last_stand_1, tank_stability_1`
- Top legal scores: **play-unit:tank_shieldbearer_1@2551**; play-effect:tank_stability_1@440 cost=740; play-effect:tank_reinforce_1@312 cost=620; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2551
- Margin over HOLD: 2551
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_shieldbearer_1","slotIndex":7,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2551,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Shieldbearer(tank_shieldbearer_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 4, side player, HP P/E 5/6
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_reinforce_1, tank_last_stand_1, tank_stability_1, tank_wall_1`
- Top legal scores: **play-unit:tank_wall_1@2801**; play-unit:tank_wall_1@2384; pass:HOLD@0; play-effect:tank_reinforce_1@-2800 cost=620
- HOLD/PASS score: 0
- Chosen action score: 2801
- Margin over HOLD: 2801
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_wall_1","slotIndex":7,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2801,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Wall(tank_wall_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`


### tank_stability_1 (Stability)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 3, side enemy, HP P/E 8/5
- Board before: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"}]`
- Hand before: `tank_fortify_1, tank_shieldbearer_1, tank_wall_1, tank_stability_1`
- Top legal scores: **play-unit:tank_shieldbearer_1@3744**; play-unit:tank_wall_1@2384; play-effect:tank_stability_1@440 cost=740; pass:HOLD@0; play-effect:tank_fortify_1@-196 cost=700
- HOLD/PASS score: 0
- Chosen action score: 3744
- Margin over HOLD: 3744
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_shieldbearer_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3744,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Shieldbearer(tank_shieldbearer_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 4, side enemy, HP P/E 5/2
- Board before: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `tank_fortify_1, tank_wall_1, tank_stability_1, tank_repair_kit_1`
- Top legal scores: **play-unit:tank_wall_1@2801**; play-effect:tank_stability_1@440 cost=740; play-targeted-effect:tank_repair_kit_1@392 cost=700; play-targeted-effect:tank_repair_kit_1@392 cost=700; pass:HOLD@0; play-effect:tank_fortify_1@-196 cost=700
- HOLD/PASS score: 0
- Chosen action score: 2801
- Margin over HOLD: 2801
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_wall_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2801,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Wall(tank_wall_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 3: reasonable

- Match: Tank vs Aggro, turn 5, side enemy, HP P/E 2/2
- Board before: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `tank_fortify_1, tank_stability_1, tank_repair_kit_1, tank_reinforce_1`
- Top legal scores: **play-effect:tank_stability_1@620 cost=560**; play-targeted-effect:tank_repair_kit_1@572 cost=520; play-targeted-effect:tank_repair_kit_1@572 cost=520; play-effect:tank_reinforce_1@492 cost=440; pass:HOLD@0; play-effect:tank_fortify_1@-16 cost=520
- HOLD/PASS score: 0
- Chosen action score: 620
- Margin over HOLD: 620
- Utility opportunity cost applied: 560
- Utility chosen reason: protects an important board
- Chosen: `{"type":"play-effect","cardId":"tank_stability_1","effectId":"immune_move_disable_this_turn","aiEvaluation":{"utility":true,"cardId":"tank_stability_1","utilityCategory":"stability","utilityScoreBeforeCost":1160,"utilityOpportunityCost":560,"utilityCostApplied":560,"utilityScoreAfterCost":600,"utilityReason":"protects an important board","utilityThreshold":0,"holdScore":0,"marginOverHold":620,"chosenAction":true,"utilityChosenReason":"protects an important board"}}`
- Result: `{"ok":true,"type":"effect","card":"Stability(tank_stability_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 3, side player, HP P/E 5/8
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_last_stand_1, tank_stability_1`
- Top legal scores: **play-unit:tank_shieldbearer_1@2551**; play-effect:tank_stability_1@440 cost=740; play-effect:tank_reinforce_1@312 cost=620; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2551
- Margin over HOLD: 2551
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_shieldbearer_1","slotIndex":7,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2551,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Shieldbearer(tank_shieldbearer_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Tank vs Tank, turn 5, side enemy, HP P/E 2/11
- Board before: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_wall_1, tank_repair_kit_1, tank_last_stand_1, tank_shieldbearer_1, tank_stability_1`
- Top legal scores: **play-unit:tank_shieldbearer_1@2426**; play-unit:tank_wall_1@2391; play-effect:tank_stability_1@440 cost=740; play-targeted-effect:tank_repair_kit_1@392 cost=700; play-targeted-effect:tank_repair_kit_1@388 cost=700; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2426
- Margin over HOLD: 2426
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_shieldbearer_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2426,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Shieldbearer(tank_shieldbearer_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`


### wardens_stand_firm_1 (Stand Firm)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 1, side enemy, HP P/E 12/12
- Board before: `[]`
- Hand before: `wardens_watch_captain_1, wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1`
- Top legal scores: play-unit:wardens_watch_captain_1@4304; play-unit:wardens_watch_captain_1@4304; **play-unit:wardens_watch_captain_1@4304**; play-unit:wardens_spearwall_1@3762; play-unit:wardens_spearwall_1@3762; play-unit:wardens_spearwall_1@3762; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1320 cost=740
- HOLD/PASS score: 0
- Chosen action score: 4304
- Margin over HOLD: 4304
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_watch_captain_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4304,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Watch Captain(wardens_watch_captain_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 2, side enemy, HP P/E 10/10
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1, wardens_halberdier_1`
- Top legal scores: play-unit:wardens_spearwall_1@2858; **play-unit:wardens_halberdier_1@2858**; play-unit:wardens_spearwall_1@2578; play-unit:wardens_halberdier_1@2578; play-targeted-effect:wardens_shield_push_1@2300 cost=700; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1320 cost=740
- HOLD/PASS score: 0
- Chosen action score: 2858
- Margin over HOLD: 2858
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_halberdier_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2858,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Halberdier(wardens_halberdier_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_halberdier_1","name":"Halberdier","atk":2,"hp":1,"armor":0,"effectId":"opposing_lane_atk_plus_1"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 3, side enemy, HP P/E 8/8
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1, wardens_hold_the_line_1`
- Top legal scores: **play-unit:wardens_spearwall_1@4042**; play-unit:wardens_spearwall_1@2578; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1320 cost=740
- HOLD/PASS score: 0
- Chosen action score: 4042
- Margin over HOLD: 4042
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_spearwall_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4042,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Spearwall(wardens_spearwall_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_spearwall_1","name":"Spearwall","atk":1,"hp":1,"armor":0,"effectId":"warden_defensive_friction_adjacent"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 4, side enemy, HP P/E 6/6
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`
- Hand before: `wardens_shield_push_1, wardens_stand_firm_1, wardens_hold_the_line_1, wardens_bastion_guard_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@2934**; play-unit:wardens_bastion_guard_1@2719; play-targeted-effect:wardens_shield_push_1@2300 cost=700; play-targeted-effect:wardens_shield_push_1@2100 cost=700; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1320 cost=740
- HOLD/PASS score: 0
- Chosen action score: 2934
- Margin over HOLD: 2934
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2934,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 5, side enemy, HP P/E 6/4
- Board before: `[{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":2,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `wardens_shield_push_1, wardens_stand_firm_1, wardens_hold_the_line_1, wardens_sentinel_1`
- Top legal scores: **play-unit:wardens_sentinel_1@4215**; play-unit:wardens_sentinel_1@2826; play-unit:wardens_sentinel_1@2125; play-effect:wardens_hold_the_line_1@424 cost=700; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1320 cost=740
- HOLD/PASS score: 0
- Chosen action score: 4215
- Margin over HOLD: 4215
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_sentinel_1","slotIndex":1,"placementType":"redeploy","aiEvaluation":{"kind":"replace","meaningful":true,"pressureGain":395,"heroPressureGain":1,"openLaneImprovement":1,"loopKey":"replace:enemy:1:wardens_sentinel_1:wardens_bastion_guard_1","holdScore":0,"marginOverHold":4215,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"redeploy","card":"Sentinel(wardens_sentinel_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`


### wardens_shield_push_1 (Shield Push)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Wardens vs Aggro, turn 3, side enemy, HP P/E 6/3
- Board before: `[{"i":0,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":6,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `wardens_bastion_guard_1, wardens_shield_push_1, wardens_halberdier_1, wardens_hold_the_line_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@3439**; play-unit:wardens_halberdier_1@3298; play-targeted-effect:wardens_shield_push_1@2270 cost=700; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3439
- Margin over HOLD: 3439
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3439,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":6,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 2, side enemy, HP P/E 10/10
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1, wardens_halberdier_1`
- Top legal scores: play-unit:wardens_spearwall_1@2858; **play-unit:wardens_halberdier_1@2858**; play-unit:wardens_spearwall_1@2578; play-unit:wardens_halberdier_1@2578; play-targeted-effect:wardens_shield_push_1@2300 cost=700; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1320 cost=740
- HOLD/PASS score: 0
- Chosen action score: 2858
- Margin over HOLD: 2858
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_halberdier_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2858,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Halberdier(wardens_halberdier_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_halberdier_1","name":"Halberdier","atk":2,"hp":1,"armor":0,"effectId":"opposing_lane_atk_plus_1"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 4, side enemy, HP P/E 6/6
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`
- Hand before: `wardens_shield_push_1, wardens_stand_firm_1, wardens_hold_the_line_1, wardens_bastion_guard_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@2934**; play-unit:wardens_bastion_guard_1@2719; play-targeted-effect:wardens_shield_push_1@2300 cost=700; play-targeted-effect:wardens_shield_push_1@2100 cost=700; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1320 cost=740
- HOLD/PASS score: 0
- Chosen action score: 2934
- Margin over HOLD: 2934
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2934,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Wardens vs Swarm, turn 4, side enemy, HP P/E 6/8
- Board before: `[{"i":1,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":6,"owner":"player","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"player_flood_token_7_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"player_flood_token_8_1","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null}]`
- Hand before: `wardens_spearwall_1, wardens_brace_1, wardens_shield_push_1, wardens_bastion_guard_1, wardens_stand_firm_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@2854**; play-unit:wardens_spearwall_1@2713; play-unit:wardens_bastion_guard_1@2634; play-unit:wardens_spearwall_1@2493; play-targeted-effect:wardens_shield_push_1@2135 cost=700; play-targeted-effect:wardens_shield_push_1@2135 cost=700; play-targeted-effect:wardens_brace_1@388 cost=700; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2854
- Margin over HOLD: 2854
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2854,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":2,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"player_flood_token_7_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"player_flood_token_8_1","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 5, side player, HP P/E 8/5
- Board before: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `wardens_brace_1, wardens_shield_push_1, wardens_stand_firm_1, wardens_sentinel_1`
- Top legal scores: **play-unit:wardens_sentinel_1@3331**; play-unit:wardens_sentinel_1@3046; play-targeted-effect:wardens_shield_push_1@2520 cost=700; play-targeted-effect:wardens_shield_push_1@2465 cost=700; play-unit:wardens_sentinel_1@1877; play-targeted-effect:wardens_brace_1@388 cost=700; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1320 cost=740
- HOLD/PASS score: 0
- Chosen action score: 3331
- Margin over HOLD: 3331
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_sentinel_1","slotIndex":6,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3331,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Sentinel(wardens_sentinel_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":7,"owner":"player","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null}]`


### control_controller_1 (Controller)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Control vs Tank, turn 3, side enemy, HP P/E 10/8
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_system_override_1`
- Top legal scores: **play-targeted-effect:control_system_override_1@32008 cost=700**; play-targeted-effect:control_system_override_1@31488 cost=700; play-targeted-effect:control_system_override_1@30968 cost=700; play-unit:control_controller_1@3921 cost=540; play-unit:control_controller_1@3801 cost=540; play-unit:control_controller_1@3796 cost=540; play-unit:control_controller_1@3760 cost=540; play-unit:control_controller_1@3751 cost=540
- HOLD/PASS score: 0
- Chosen action score: 32008
- Margin over HOLD: 32008
- Utility opportunity cost applied: 700
- Utility chosen reason: n/a
- Chosen: `{"type":"play-targeted-effect","cardId":"control_system_override_1","targetIndex":8,"targetIndexes":[8],"effectId":"control_enemy_unit_this_turn","aiEvaluation":{"utility":true,"cardId":"control_system_override_1","utilityCategory":"control","utilityScoreBeforeCost":32688,"utilityOpportunityCost":700,"utilityCostApplied":700,"utilityScoreAfterCost":31988,"utilityReason":null,"utilityThreshold":320,"holdScore":0,"marginOverHold":32008,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"System Override(control_system_override_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 2: reasonable

- Match: Control vs Tank, turn 4, side enemy, HP P/E 7/3
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_sniper_1`
- Top legal scores: **play-unit:control_controller_1@4016 cost=540**; play-unit:control_controller_1@4016 cost=540; play-unit:control_controller_1@4011 cost=540; play-unit:control_controller_1@3983 cost=540; play-unit:control_controller_1@3851 cost=540; play-unit:control_controller_1@3791 cost=540; play-unit:control_controller_1@3763 cost=540; play-unit:control_controller_1@3631 cost=540
- HOLD/PASS score: 0
- Chosen action score: 4016
- Margin over HOLD: 4016
- Utility opportunity cost applied: 540
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":0,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":7,"targetIndexes":[7,8],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":396,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"cardId":"control_controller_1","utilityCategory":"control","utilityScoreBeforeCost":4536,"utilityOpportunityCost":540,"utilityCostApplied":540,"utilityScoreAfterCost":3996,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":4016,"chosenAction":true,"utilityChosenReason":"prevents lethal"}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":8,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"}]`

#### Moment 3: reasonable

- Match: Control vs Tank, turn 4, side player, HP P/E 2/8
- Board before: `[{"i":0,"owner":"enemy","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_drone_1, control_controller_1, control_pulse_wave_1, control_hacker_1, control_recall_1`
- Top legal scores: **play-unit:control_controller_1@3626 cost=540**; play-unit:control_controller_1@3626 cost=540; play-unit:control_controller_1@3511 cost=540; play-unit:control_controller_1@3511 cost=540; play-unit:control_hacker_1@2746; play-unit:control_drone_1@2543; play-unit:control_hacker_1@2461; play-unit:control_hacker_1@2461
- HOLD/PASS score: 0
- Chosen action score: 3626
- Margin over HOLD: 3626
- Utility opportunity cost applied: 540
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":8,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":0,"targetIndexes":[0,2],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":146,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"cardId":"control_controller_1","utilityCategory":"control","utilityScoreBeforeCost":4146,"utilityOpportunityCost":540,"utilityCostApplied":540,"utilityScoreAfterCost":3606,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":3626,"chosenAction":true,"utilityChosenReason":"prevents lethal"}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"}]`

#### Moment 4: reasonable

- Match: Control vs Control, turn 5, side enemy, HP P/E 8/6
- Board before: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":7,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`
- Hand before: `control_controller_1, control_recall_1, control_swap_1, control_drone_1`
- Top legal scores: **play-unit:control_controller_1@3731 cost=540**; play-unit:control_controller_1@3626 cost=540; play-unit:control_drone_1@2763; play-unit:control_drone_1@2060; play-targeted-effect:control_swap_1@220 cost=700; pass:HOLD@0; play-targeted-effect:control_recall_1@-900 cost=800
- HOLD/PASS score: 0
- Chosen action score: 3731
- Margin over HOLD: 3731
- Utility opportunity cost applied: 540
- Utility chosen reason: prevents meaningful incoming base damage
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":2,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":7,"targetIndexes":[7,8],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":301,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"cardId":"control_controller_1","utilityCategory":"control","utilityScoreBeforeCost":4251,"utilityOpportunityCost":540,"utilityCostApplied":540,"utilityScoreAfterCost":3711,"utilityReason":"prevents meaningful incoming base damage","utilityThreshold":0,"holdScore":0,"marginOverHold":3731,"chosenAction":true,"utilityChosenReason":"prevents meaningful incoming base damage"}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":2,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":7,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`

#### Moment 5: reasonable

- Match: Control vs Swarm, turn 3, side player, HP P/E 9/11
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":2,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`
- Hand before: `control_drone_1, control_swap_1, control_pulse_wave_1, control_controller_1`
- Top legal scores: **play-unit:control_controller_1@3726 cost=540**; play-unit:control_controller_1@3506 cost=540; play-effect:control_pulse_wave_1@2906; play-unit:control_drone_1@2478; play-unit:control_drone_1@2060; play-targeted-effect:control_swap_1@220 cost=700; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3726
- Margin over HOLD: 3726
- Utility opportunity cost applied: 540
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":8,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":0,"targetIndexes":[0,2],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":366,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"cardId":"control_controller_1","utilityCategory":"control","utilityScoreBeforeCost":4246,"utilityOpportunityCost":540,"utilityCostApplied":540,"utilityScoreAfterCost":3706,"utilityReason":null,"utilityThreshold":320,"holdScore":0,"marginOverHold":3726,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":7,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":8,"owner":"player","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"}]`


### control_recall_1 (Recall)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Control vs Aggro, turn 2, side player, HP P/E 12/12
- Board before: `[{"i":2,"owner":"enemy","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `control_hacker_1, control_disruptor_1, control_drone_1, control_recall_1`
- Top legal scores: **play-unit:control_hacker_1@3744**; play-unit:control_disruptor_1@3744; play-unit:control_drone_1@3732; play-unit:control_hacker_1@3091; play-unit:control_disruptor_1@3056; play-unit:control_drone_1@3048; pass:HOLD@0; play-targeted-effect:control_recall_1@-540 cost=800
- HOLD/PASS score: 0
- Chosen action score: 3744
- Margin over HOLD: 3744
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_hacker_1","slotIndex":6,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3744,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Hacker(control_hacker_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":7,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Control vs Aggro, turn 3, side player, HP P/E 12/11
- Board before: `[{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":7,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `control_disruptor_1, control_drone_1, control_recall_1, control_jam_signal_1`
- Top legal scores: **play-unit:control_disruptor_1@3744**; play-unit:control_drone_1@3732; pass:HOLD@0; play-targeted-effect:control_recall_1@-540 cost=800; play-targeted-effect:control_recall_1@-900 cost=800
- HOLD/PASS score: 0
- Chosen action score: 3744
- Margin over HOLD: 3744
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_disruptor_1","slotIndex":8,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3744,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Disruptor(control_disruptor_1)"}`
- Board after: `[{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":7,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Control vs Aggro, turn 4, side player, HP P/E 12/9
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"},{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`
- Hand before: `control_drone_1, control_recall_1, control_jam_signal_1, control_swap_1`
- Top legal scores: **play-unit:control_drone_1@2903**; play-targeted-effect:control_jam_signal_1@1670 cost=700; play-targeted-effect:control_swap_1@220 cost=700; pass:HOLD@0; play-targeted-effect:control_recall_1@-900 cost=800; play-targeted-effect:control_recall_1@-900 cost=800
- HOLD/PASS score: 0
- Chosen action score: 2903
- Margin over HOLD: 2903
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_drone_1","slotIndex":7,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2903,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Drone(control_drone_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"},{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":7,"owner":"player","id":"control_drone_1","name":"Drone","atk":1,"hp":1,"armor":0,"effectId":"death_damage_enemy_hero_1"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Control vs Aggro, turn 5, side player, HP P/E 12/6
- Board before: `[{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`
- Hand before: `control_recall_1, control_jam_signal_1, control_swap_1, control_controller_1`
- Top legal scores: play-targeted-effect:control_swap_1@220 cost=700; **pass:HOLD@0**; play-targeted-effect:control_recall_1@-900 cost=800; play-targeted-effect:control_recall_1@-900 cost=800
- HOLD/PASS score: 0
- Chosen action score: 0
- Margin over HOLD: 0
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"pass","reason":"hold-card-action","aiEvaluation":{"kind":"hold","holdScore":0,"reason":"do not spend this action/card now","marginOverHold":0,"chosenAction":true,"utilityChosenReason":"do not spend this action/card now"}}`
- Result: `{"ok":true,"type":"pass","card":null}`
- Board after: `[{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Control vs Aggro, turn 6, side player, HP P/E 10/4
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_scout_1","name":"Scout","atk":2,"hp":1,"armor":0,"effectId":"block_enemy_lane_play_this_turn"},{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`
- Hand before: `control_recall_1, control_jam_signal_1, control_swap_1, control_controller_1, control_pulse_wave_1`
- Top legal scores: **play-effect:control_pulse_wave_1@3298**; play-targeted-effect:control_jam_signal_1@1790 cost=700; play-targeted-effect:control_swap_1@220 cost=700; pass:HOLD@0; play-targeted-effect:control_recall_1@-900 cost=800; play-targeted-effect:control_recall_1@-900 cost=800
- HOLD/PASS score: 0
- Chosen action score: 3298
- Margin over HOLD: 3298
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-effect","cardId":"control_pulse_wave_1","effectId":"damage_all_enemies_1_ignore_armor","aiEvaluation":{"holdScore":0,"marginOverHold":3298,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"effect","card":"Pulse Wave(control_pulse_wave_1)"}`
- Board after: `[{"i":6,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`


### control_jam_signal_1 (Jam Signal)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Control vs Aggro, turn 2, side enemy, HP P/E 11/8
- Board before: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":8,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `control_hacker_1, control_drone_1, control_controller_1, control_jam_signal_1`
- Top legal scores: **play-unit:control_hacker_1@3744**; play-unit:control_drone_1@3732; play-unit:control_hacker_1@3106; play-unit:control_drone_1@2903; play-targeted-effect:control_jam_signal_1@1670 cost=700; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3744
- Margin over HOLD: 3744
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_hacker_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3744,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Hacker(control_hacker_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Control vs Tank, turn 2, side enemy, HP P/E 11/10
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `control_controller_1, control_disruptor_1, control_drone_1, control_jam_signal_1`
- Top legal scores: **play-unit:control_disruptor_1@3744**; play-unit:control_drone_1@3732; play-unit:control_disruptor_1@2551; play-unit:control_drone_1@2543; play-targeted-effect:control_jam_signal_1@1490 cost=700; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3744
- Margin over HOLD: 3744
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_disruptor_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3744,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Disruptor(control_disruptor_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":2,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Control vs Tank, turn 3, side enemy, HP P/E 10/8
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_system_override_1`
- Top legal scores: **play-targeted-effect:control_system_override_1@32008 cost=700**; play-targeted-effect:control_system_override_1@31488 cost=700; play-targeted-effect:control_system_override_1@30968 cost=700; play-unit:control_controller_1@3921 cost=540; play-unit:control_controller_1@3801 cost=540; play-unit:control_controller_1@3796 cost=540; play-unit:control_controller_1@3760 cost=540; play-unit:control_controller_1@3751 cost=540
- HOLD/PASS score: 0
- Chosen action score: 32008
- Margin over HOLD: 32008
- Utility opportunity cost applied: 700
- Utility chosen reason: n/a
- Chosen: `{"type":"play-targeted-effect","cardId":"control_system_override_1","targetIndex":8,"targetIndexes":[8],"effectId":"control_enemy_unit_this_turn","aiEvaluation":{"utility":true,"cardId":"control_system_override_1","utilityCategory":"control","utilityScoreBeforeCost":32688,"utilityOpportunityCost":700,"utilityCostApplied":700,"utilityScoreAfterCost":31988,"utilityReason":null,"utilityThreshold":320,"holdScore":0,"marginOverHold":32008,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"System Override(control_system_override_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Control vs Tank, turn 4, side enemy, HP P/E 7/3
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_sniper_1`
- Top legal scores: **play-unit:control_controller_1@4016 cost=540**; play-unit:control_controller_1@4016 cost=540; play-unit:control_controller_1@4011 cost=540; play-unit:control_controller_1@3983 cost=540; play-unit:control_controller_1@3851 cost=540; play-unit:control_controller_1@3791 cost=540; play-unit:control_controller_1@3763 cost=540; play-unit:control_controller_1@3631 cost=540
- HOLD/PASS score: 0
- Chosen action score: 4016
- Margin over HOLD: 4016
- Utility opportunity cost applied: 540
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":0,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":7,"targetIndexes":[7,8],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":396,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"cardId":"control_controller_1","utilityCategory":"control","utilityScoreBeforeCost":4536,"utilityOpportunityCost":540,"utilityCostApplied":540,"utilityScoreAfterCost":3996,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":4016,"chosenAction":true,"utilityChosenReason":"prevents lethal"}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":8,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Control vs Tank, turn 5, side enemy, HP P/E 7/1
- Board before: `[{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_drone_1, control_jam_signal_1, control_sniper_1, control_swap_1`
- Top legal scores: **play-unit:control_sniper_1@2798**; play-unit:control_drone_1@2763; play-unit:control_sniper_1@2578; play-unit:control_drone_1@2543; play-unit:control_sniper_1@2513; play-targeted-effect:control_jam_signal_1@2380 cost=700; play-unit:control_drone_1@2060; play-targeted-effect:control_swap_1@220 cost=700
- HOLD/PASS score: 0
- Chosen action score: 2798
- Margin over HOLD: 2798
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_sniper_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2798,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Sniper(control_sniper_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`


### attrition_swarm_rise_again_1 (Rise Again)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 3, side enemy, HP P/E 7/7
- Board before: `[{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `attrition_swarm_grave_call_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1`
- Top legal scores: **play-effect:attrition_swarm_grave_call_1@1563 cost=560**; play-effect:attrition_swarm_rise_again_1@1263 cost=820; play-effect:attrition_swarm_feast_1@340 cost=300; pass:HOLD@0; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 1563
- Margin over HOLD: 1563
- Utility opportunity cost applied: 560
- Utility chosen reason: prevents meaningful incoming base damage
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_grave_call_1","effectId":"grave_call","aiEvaluation":{"utility":true,"cardId":"attrition_swarm_grave_call_1","utilityCategory":"utility","utilityScoreBeforeCost":2103,"utilityOpportunityCost":560,"utilityCostApplied":560,"utilityScoreAfterCost":1543,"utilityReason":"prevents meaningful incoming base damage","utilityThreshold":0,"holdScore":0,"marginOverHold":1563,"chosenAction":true,"utilityChosenReason":"prevents meaningful incoming base damage"}}`
- Result: `{"ok":true,"type":"effect","card":"Grave Call(attrition_swarm_grave_call_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable

- Match: Attrition Swarm vs Aggro, turn 4, side enemy, HP P/E 6/7
- Board before: `[{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1, attrition_swarm_infect_1`
- Top legal scores: **play-effect:attrition_swarm_rise_again_1@2062 cost=820**; play-effect:attrition_swarm_feast_1@340 cost=300; pass:HOLD@0; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 2062
- Margin over HOLD: 2062
- Utility opportunity cost applied: 820
- Utility chosen reason: creates clear lane/hero pressure improvement
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_rise_again_1","effectId":"revive_friendly_1hp","aiEvaluation":{"utility":true,"cardId":"attrition_swarm_rise_again_1","utilityCategory":"utility","utilityScoreBeforeCost":2862,"utilityOpportunityCost":820,"utilityCostApplied":820,"utilityScoreAfterCost":2042,"utilityReason":"creates clear lane/hero pressure improvement","utilityThreshold":0,"holdScore":0,"marginOverHold":2062,"chosenAction":true,"utilityChosenReason":"creates clear lane/hero pressure improvement"}}`
- Result: `{"ok":true,"type":"effect","card":"Rise Again(attrition_swarm_rise_again_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 3, side enemy, HP P/E 8/10
- Board before: `[{"i":1,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":2,"owner":"enemy","id":"enemy_combat_death_grunt_2_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_infect_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1`
- Top legal scores: **play-unit:attrition_swarm_rotcaller_1@2446**; play-unit:attrition_swarm_rotcaller_1@2078; play-targeted-effect:attrition_swarm_infect_1@1283; play-effect:attrition_swarm_funeral_pyre_1@770; play-effect:attrition_swarm_rise_again_1@533 cost=1000; play-targeted-effect:attrition_swarm_infect_1@368; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2446
- Margin over HOLD: 2446
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_rotcaller_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2446,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Rotcaller(attrition_swarm_rotcaller_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":1,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":2,"owner":"enemy","id":"enemy_combat_death_grunt_2_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 4, side enemy, HP P/E 8/11
- Board before: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_infect_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_abomination_1`
- Top legal scores: **play-unit:attrition_swarm_abomination_1@3126**; play-unit:attrition_swarm_abomination_1@2621; play-unit:attrition_swarm_abomination_1@2228; play-targeted-effect:attrition_swarm_infect_1@1283; play-effect:attrition_swarm_funeral_pyre_1@770; play-effect:attrition_swarm_rise_again_1@653 cost=1000; play-targeted-effect:attrition_swarm_infect_1@368; play-targeted-effect:attrition_swarm_infect_1@368
- HOLD/PASS score: 0
- Chosen action score: 3126
- Margin over HOLD: 3126
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3126,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"play","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":2,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 5, side enemy, HP P/E 7/8
- Board before: `[{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `attrition_swarm_infect_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1`
- Top legal scores: **play-targeted-effect:attrition_swarm_infect_1@3548**; play-effect:attrition_swarm_rise_again_1@958 cost=820; play-targeted-effect:attrition_swarm_infect_1@368; play-effect:attrition_swarm_feast_1@340 cost=300; pass:HOLD@0; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 3548
- Margin over HOLD: 3548
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-targeted-effect","cardId":"attrition_swarm_infect_1","targetIndex":6,"targetIndexes":[6],"effectId":"infect_damage_1_opposite_ally_atk_1","aiEvaluation":{"holdScore":0,"marginOverHold":3548,"chosenAction":true,"utilityChosenReason":"highest scored legal action"}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Rotten Gift(attrition_swarm_infect_1)"}`
- Board after: `[{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`


### attrition_swarm_leech_1 (Leech)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable

- Match: Attrition Swarm vs Aggro, turn 1, side enemy, HP P/E 12/12
- Board before: `[{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_grave_call_1, attrition_swarm_leech_1, attrition_swarm_funeral_pyre_1`
- Top legal scores: **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_leech_1@4322; play-effect:attrition_swarm_grave_call_1@3775 cost=740; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_leech_1@2833; play-unit:attrition_swarm_rotcaller_1@2571; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 4322
- Margin over HOLD: 4322
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4322,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Leech(attrition_swarm_leech_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`

#### Moment 2: reasonable

- Match: Attrition Swarm vs Tank, turn 1, side enemy, HP P/E 12/12
- Board before: `[]`
- Hand before: `attrition_swarm_carrier_1, attrition_swarm_leech_1, attrition_swarm_rotcaller_1, attrition_swarm_infect_1`
- Top legal scores: play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_leech_1@4322; **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_carrier_1@3779; play-unit:attrition_swarm_carrier_1@3779; play-unit:attrition_swarm_carrier_1@3779; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769
- HOLD/PASS score: 0
- Chosen action score: 4322
- Margin over HOLD: 4322
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4322,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Leech(attrition_swarm_leech_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Attrition Swarm vs Control, turn 1, side enemy, HP P/E 12/12
- Board before: `[{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_abomination_1, attrition_swarm_husk_1, attrition_swarm_leech_1`
- Top legal scores: **play-unit:attrition_swarm_abomination_1@4339**; play-unit:attrition_swarm_abomination_1@4339; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_husk_1@3752; play-unit:attrition_swarm_husk_1@3752
- HOLD/PASS score: 0
- Chosen action score: 4339
- Margin over HOLD: 4339
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4339,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`

#### Moment 4: reasonable

- Match: Attrition Swarm vs Control, turn 2, side enemy, HP P/E 9/11
- Board before: `[{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_husk_1, attrition_swarm_leech_1, attrition_swarm_grave_call_1`
- Top legal scores: **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_husk_1@3752; play-unit:attrition_swarm_husk_1@3752; play-effect:attrition_swarm_grave_call_1@3554 cost=740; play-unit:attrition_swarm_leech_1@2833
- HOLD/PASS score: 0
- Chosen action score: 4322
- Margin over HOLD: 4322
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4322,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Leech(attrition_swarm_leech_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Attrition Swarm vs Swarm, turn 1, side enemy, HP P/E 12/12
- Board before: `[{"i":7,"owner":"player","id":"swarm_rusher_1","name":"Rusher","atk":2,"hp":1,"armor":0,"effectId":null}]`
- Hand before: `attrition_swarm_carrier_1, attrition_swarm_leech_1, attrition_swarm_abomination_1, attrition_swarm_rotcaller_1`
- Top legal scores: **play-unit:attrition_swarm_abomination_1@4339**; play-unit:attrition_swarm_abomination_1@4339; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_carrier_1@3779; play-unit:attrition_swarm_carrier_1@3779; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769
- HOLD/PASS score: 0
- Chosen action score: 4339
- Margin over HOLD: 4339
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4339,"chosenAction":true,"utilityChosenReason":"seeded random tie break"}}`
- Result: `{"ok":true,"type":"play","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":7,"owner":"player","id":"swarm_rusher_1","name":"Rusher","atk":2,"hp":1,"armor":0,"effectId":null}]`


## Examples of bad/questionable decisions

Questionable moments above are primarily low-score defensive/sacrifice plays or indirect cards chosen without large immediate pressure change. No catastrophic first-legal-target pattern was observed in this sample; target candidates are scored/sorted for Jam Signal, Controller, Feast-like sacrifice, and swaps.

## Whether current balance results are trustworthy

Partially. The simulator AI is good enough to compare straightforward unit tempo and direct damage cards. It is not reliable enough to make confident final balance calls for sacrifice, draw-only, revive, defensive, and control packages because those cards depend on delayed value and hand/slot opportunity cost that the current immediate scorer only approximates.

## Recommended next step

Use this HOLD-margin diagnostic as the baseline before larger Balance Lab simulations; remaining suspicious utility cards should be reviewed by their reported opportunity cost and chosen reason rather than raw finite playability.
