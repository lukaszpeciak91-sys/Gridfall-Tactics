# AI Decision Diagnostic — June 16, 2026

Command: `node scripts/diagnose-ai-decisions.mjs --per-card=5 --max-games=28 --seed=20260616`

## Executive summary

Captured 50 decision moments across 10 focus cards after scanning up to 24 ordered games. The AI scores legal actions by simulating the immediate action and valuing hero damage, open-lane pressure, pressure reduction, kills, board pressure, and card-specific heuristics. Overall, current balance results are more reliable for simple tempo/combat cards and now expose utility-vs-HOLD margins for indirect utility/control cards.

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
- Top legal scores: **play-effect:attrition_swarm_grave_call_1@1303 cost=820**; play-effect:attrition_swarm_rise_again_1@1003 cost=1080; pass:HOLD@0; play-effect:attrition_swarm_feast_1@-550 cost=820; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 1303
- Margin over HOLD: 1303
- Utility opportunity cost applied: 820
- Utility chosen reason: meaningful pressure swing
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_grave_call_1","effectId":"grave_call","aiEvaluation":{"utility":true,"utilityOpportunityCost":820,"utilityReason":"meaningful pressure swing","utilityThreshold":0,"holdScore":0,"marginOverHold":1303}}`
- Result: `{"ok":true,"type":"effect","card":"Grave Call(attrition_swarm_grave_call_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 4, side enemy, HP P/E 6/7
- Board before: `[{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1, attrition_swarm_infect_1`
- Top legal scores: **play-effect:attrition_swarm_rise_again_1@1802 cost=1080**; pass:HOLD@0; play-effect:attrition_swarm_feast_1@-550 cost=820; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 1802
- Margin over HOLD: 1802
- Utility opportunity cost applied: 1080
- Utility chosen reason: creates clear lane/hero pressure improvement
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_rise_again_1","effectId":"revive_friendly_1hp","aiEvaluation":{"utility":true,"utilityOpportunityCost":1080,"utilityReason":"creates clear lane/hero pressure improvement","utilityThreshold":0,"holdScore":0,"marginOverHold":1802}}`
- Result: `{"ok":true,"type":"effect","card":"Rise Again(attrition_swarm_rise_again_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 5, side enemy, HP P/E 4/3
- Board before: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_feast_1, attrition_swarm_infect_1, attrition_swarm_husk_1`
- Top legal scores: **play-unit:attrition_swarm_husk_1@2578**; play-targeted-effect:attrition_swarm_infect_1@140; pass:HOLD@0; play-effect:attrition_swarm_feast_1@-730 cost=1000; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 2578
- Margin over HOLD: 2578
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_husk_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2578}}`
- Result: `{"ok":true,"type":"play","card":"Husk(attrition_swarm_husk_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"attrition_swarm_husk_1","name":"Husk","atk":1,"hp":1,"armor":0,"effectId":"combat_death_damage_enemy_lane_1"},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 6, side enemy, HP P/E 1/3
- Board before: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_feast_1, attrition_swarm_infect_1, attrition_swarm_carrier_1`
- Top legal scores: **play-unit:attrition_swarm_carrier_1@3779**; play-unit:attrition_swarm_carrier_1@1937; pass:HOLD@0; play-effect:attrition_swarm_feast_1@-730 cost=1000; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 3779
- Margin over HOLD: 3779
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_carrier_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3779}}`
- Result: `{"ok":true,"type":"play","card":"Carrier(attrition_swarm_carrier_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"attrition_swarm_carrier_1","name":"Carrier","atk":1,"hp":2,"armor":0,"effectId":"combat_death_summon_grunt"},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 5, side enemy, HP P/E 7/6
- Board before: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_abomination_1, attrition_swarm_feast_1`
- Top legal scores: **play-unit:attrition_swarm_abomination_1@3922**; play-unit:attrition_swarm_abomination_1@2841; play-unit:attrition_swarm_abomination_1@2841; play-effect:attrition_swarm_rise_again_1@393 cost=1260; pass:HOLD@0; play-effect:attrition_swarm_feast_1@-730 cost=1000; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 3922
- Margin over HOLD: 3922
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":0,"placementType":"redeploy","aiEvaluation":{"kind":"replace","meaningful":true,"pressureGain":382,"heroPressureGain":1,"openLaneImprovement":1,"loopKey":"replace:enemy:0:attrition_swarm_abomination_1:attrition_swarm_rotcaller_1","holdScore":0,"marginOverHold":3922}}`
- Result: `{"ok":true,"type":"redeploy","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`


### swarm_recycle_1 (Substrate)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 4, side enemy, HP P/E 5/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `swarm_grunt_1, swarm_flood_1, swarm_alpha_1, swarm_recycle_1`
- Top legal scores: **play-unit:swarm_alpha_1@2551**; play-unit:swarm_grunt_1@2543; play-effect:swarm_flood_1@713 cost=1000; play-effect:swarm_recycle_1@260; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2551
- Margin over HOLD: 2551
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_alpha_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2551}}`
- Result: `{"ok":true,"type":"play","card":"Alpha(swarm_alpha_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"swarm_alpha_1","name":"Alpha","atk":1,"hp":2,"armor":0,"effectId":"adjacent_allies_atk_plus_1_ignore_armor_1"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":2,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 5, side enemy, HP P/E 3/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"},{"i":8,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"}]`
- Hand before: `swarm_grunt_1, swarm_flood_1, swarm_recycle_1, swarm_regrow_1`
- Top legal scores: **play-effect:swarm_flood_1@4276 cost=1000**; play-unit:swarm_grunt_1@3048; play-unit:swarm_grunt_1@3048; play-effect:swarm_regrow_1@778 cost=1260; pass:HOLD@0; play-effect:swarm_recycle_1@-1180
- HOLD/PASS score: 0
- Chosen action score: 4276
- Margin over HOLD: 4276
- Utility opportunity cost applied: 1000
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-effect","cardId":"swarm_flood_1","effectId":"fill_empty_slots_0_1","aiEvaluation":{"kind":"flood-lane-preservation","laneGain":2,"laneDifferentialGain":2,"isBehindOnLanes":true,"preservesContestedWidth":true,"opponentPressureReduced":6,"preventedImmediateHeroDamage":6,"preventsImmediateLethal":true,"utility":true,"utilityOpportunityCost":1000,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":4276}}`
- Result: `{"ok":true,"type":"effect","card":"Flood(swarm_flood_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"enemy_flood_token_1_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"enemy_flood_token_2_1","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"},{"i":8,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 2, side enemy, HP P/E 11/10
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `swarm_flood_1, swarm_grunt_1, swarm_spitter_1, swarm_recycle_1`
- Top legal scores: **play-unit:swarm_grunt_1@3732**; play-unit:swarm_spitter_1@3732; play-effect:swarm_flood_1@2855 cost=1000; play-unit:swarm_grunt_1@2543; play-unit:swarm_spitter_1@2516; pass:HOLD@0; play-effect:swarm_recycle_1@-1180
- HOLD/PASS score: 0
- Chosen action score: 3732
- Margin over HOLD: 3732
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_grunt_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3732}}`
- Result: `{"ok":true,"type":"play","card":"Grunt(swarm_grunt_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_grunt_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 3, side enemy, HP P/E 10/8
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `swarm_flood_1, swarm_spitter_1, swarm_recycle_1, swarm_rusher_1`
- Top legal scores: **play-unit:swarm_rusher_1@2578**; play-unit:swarm_spitter_1@2516; play-unit:swarm_rusher_1@2513; play-unit:swarm_spitter_1@2486; play-effect:swarm_flood_1@1601 cost=1000; play-unit:swarm_rusher_1@937; play-unit:swarm_spitter_1@910; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2578
- Margin over HOLD: 2578
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_rusher_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2578}}`
- Result: `{"ok":true,"type":"play","card":"Rusher(swarm_rusher_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_rusher_1","name":"Rusher","atk":2,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 4, side enemy, HP P/E 10/7
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `swarm_flood_1, swarm_spitter_1, swarm_recycle_1, swarm_regrow_1`
- Top legal scores: **play-unit:swarm_spitter_1@6950**; play-unit:swarm_spitter_1@6310; play-effect:swarm_flood_1@2486 cost=1000; play-unit:swarm_spitter_1@910; play-effect:swarm_regrow_1@483 cost=1260; pass:HOLD@0; play-effect:swarm_recycle_1@-1180
- HOLD/PASS score: 0
- Chosen action score: 6950
- Margin over HOLD: 6950
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_spitter_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":6950}}`
- Result: `{"ok":true,"type":"play","card":"Spitter(swarm_spitter_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`


### swarm_spawn_1 (Spawn)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Swarm vs Aggro, turn 6, side enemy, HP P/E 2/6
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"}]`
- Hand before: `swarm_grunt_1, swarm_recycle_1, swarm_regrow_1, swarm_spawn_1`
- Top legal scores: **play-unit:swarm_grunt_1@3732**; play-unit:swarm_grunt_1@3732; play-effect:swarm_regrow_1@1622 cost=1260; play-effect:swarm_spawn_1@1382 cost=1000; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3732
- Margin over HOLD: 3732
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"swarm_grunt_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3732}}`
- Result: `{"ok":true,"type":"play","card":"Grunt(swarm_grunt_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":1,"owner":"enemy","id":"swarm_grunt_1","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 6, side enemy, HP P/E 8/6
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"}]`
- Hand before: `swarm_flood_1, swarm_recycle_1, swarm_regrow_1, swarm_spawn_1`
- Top legal scores: **play-effect:swarm_flood_1@893 cost=820**; play-effect:swarm_regrow_1@573 cost=1080; play-effect:swarm_spawn_1@333 cost=820; play-effect:swarm_recycle_1@260; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 893
- Margin over HOLD: 893
- Utility opportunity cost applied: 820
- Utility chosen reason: meaningful pressure swing
- Chosen: `{"type":"play-effect","cardId":"swarm_flood_1","effectId":"fill_empty_slots_0_1","aiEvaluation":{"kind":"flood-lane-preservation","laneGain":1,"laneDifferentialGain":1,"isBehindOnLanes":false,"preservesContestedWidth":false,"opponentPressureReduced":2,"preventedImmediateHeroDamage":2,"preventsImmediateLethal":false,"utility":true,"utilityOpportunityCost":820,"utilityReason":"meaningful pressure swing","utilityThreshold":0,"holdScore":0,"marginOverHold":893}}`
- Result: `{"ok":true,"type":"effect","card":"Flood(swarm_flood_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_flood_token_0_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Swarm vs Tank, turn 7, side enemy, HP P/E 7/6
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"}]`
- Hand before: `swarm_recycle_1, swarm_regrow_1, swarm_spawn_1, swarm_swarm_attack_1`
- Top legal scores: **play-effect:swarm_regrow_1@793 cost=1080**; swap-units:1->2@780; play-effect:swarm_swarm_attack_1@770; play-effect:swarm_spawn_1@553 cost=820; play-effect:swarm_recycle_1@260; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 793
- Margin over HOLD: 793
- Utility opportunity cost applied: 1080
- Utility chosen reason: meaningful pressure swing
- Chosen: `{"type":"play-effect","cardId":"swarm_regrow_1","effectId":"revive_friendly_1hp","aiEvaluation":{"utility":true,"utilityOpportunityCost":1080,"utilityReason":"meaningful pressure swing","utilityThreshold":0,"holdScore":0,"marginOverHold":793}}`
- Result: `{"ok":true,"type":"effect","card":"Regrow(swarm_regrow_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_alpha_1","name":"Alpha","atk":1,"hp":1,"armor":0,"effectId":"adjacent_allies_atk_plus_1_ignore_armor_1"},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":1,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"}]`

#### Moment 4: reasonable

- Match: Swarm vs Tank, turn 8, side enemy, HP P/E 7/6
- Board before: `[{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"}]`
- Hand before: `swarm_recycle_1, swarm_spawn_1, swarm_swarm_attack_1`
- Top legal scores: **play-effect:swarm_spawn_1@1562 cost=820**; pass:HOLD@0; play-effect:swarm_swarm_attack_1@-925; play-effect:swarm_recycle_1@-1180
- HOLD/PASS score: 0
- Chosen action score: 1562
- Margin over HOLD: 1562
- Utility opportunity cost applied: 820
- Utility chosen reason: creates clear lane/hero pressure improvement
- Chosen: `{"type":"play-effect","cardId":"swarm_spawn_1","effectId":"summon_grunt_empty_slot","aiEvaluation":{"utility":true,"utilityOpportunityCost":820,"utilityReason":"creates clear lane/hero pressure improvement","utilityThreshold":0,"holdScore":0,"marginOverHold":1562}}`
- Result: `{"ok":true,"type":"effect","card":"Spawn(swarm_spawn_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_summoned_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":1,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"}]`

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
- Chosen: `{"type":"play-unit","cardId":"swarm_spitter_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":6630}}`
- Result: `{"ok":true,"type":"play","card":"Spitter(swarm_spitter_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"}]`


### tank_reinforce_1 (Reinforce)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 5, side enemy, HP P/E 2/2
- Board before: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`
- Hand before: `tank_fortify_1, tank_stability_1, tank_repair_kit_1, tank_reinforce_1`
- Top legal scores: play-effect:tank_stability_1@360 cost=820; play-targeted-effect:tank_repair_kit_1@312 cost=780; play-targeted-effect:tank_repair_kit_1@312 cost=780; **pass:HOLD@0**; play-effect:tank_fortify_1@-276 cost=780; play-effect:tank_reinforce_1@-348 cost=600
- HOLD/PASS score: 0
- Chosen action score: 0
- Margin over HOLD: 0
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"pass","reason":"hold-card-action","aiEvaluation":{"kind":"hold","holdScore":0,"reason":"do not spend this action/card now","marginOverHold":0}}`
- Result: `{"ok":true,"type":"pass","card":null}`
- Board after: `[{"i":1,"owner":"enemy","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":6,"owner":"player","id":"aggro_berserker_1","name":"Berserker","atk":2,"hp":1,"armor":0,"effectId":"wounded_atk_plus_1"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 1, side player, HP P/E 12/12
- Board before: `[]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_heavy_1, tank_last_stand_1`
- Top legal scores: **play-unit:tank_heavy_1@4316**; play-unit:tank_heavy_1@4316; play-unit:tank_heavy_1@4316; play-unit:tank_shieldbearer_1@3744; play-unit:tank_shieldbearer_1@3744; play-unit:tank_shieldbearer_1@3744; pass:HOLD@0; play-effect:tank_reinforce_1@-760 cost=780
- HOLD/PASS score: 0
- Chosen action score: 4316
- Margin over HOLD: 4316
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_heavy_1","slotIndex":6,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4316}}`
- Result: `{"ok":true,"type":"play","card":"Heavy(tank_heavy_1)"}`
- Board after: `[{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 2, side player, HP P/E 8/10
- Board before: `[{"i":0,"owner":"enemy","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"},{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_last_stand_1, tank_guardian_1`
- Top legal scores: **play-unit:tank_guardian_1@3079**; play-unit:tank_shieldbearer_1@2911; play-unit:tank_guardian_1@2719; play-unit:tank_shieldbearer_1@2551; pass:HOLD@0; play-effect:tank_reinforce_1@-760 cost=780
- HOLD/PASS score: 0
- Chosen action score: 3079
- Margin over HOLD: 3079
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_guardian_1","slotIndex":6,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3079}}`
- Result: `{"ok":true,"type":"play","card":"Guardian(tank_guardian_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"},{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 3, side player, HP P/E 5/8
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_shieldbearer_1, tank_reinforce_1, tank_last_stand_1, tank_stability_1`
- Top legal scores: **play-unit:tank_shieldbearer_1@2551**; play-effect:tank_stability_1@180 cost=1000; pass:HOLD@0; play-effect:tank_reinforce_1@-528 cost=780
- HOLD/PASS score: 0
- Chosen action score: 2551
- Margin over HOLD: 2551
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_shieldbearer_1","slotIndex":7,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2551}}`
- Result: `{"ok":true,"type":"play","card":"Shieldbearer(tank_shieldbearer_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"},{"i":6,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":1,"armor":0,"effectId":"intercept_lane_damage"},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Tank vs Aggro, turn 4, side player, HP P/E 5/6
- Board before: `[{"i":1,"owner":"enemy","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `tank_reinforce_1, tank_last_stand_1, tank_stability_1, tank_wall_1`
- Top legal scores: **play-unit:tank_wall_1@2801**; play-unit:tank_wall_1@2384; pass:HOLD@0; play-effect:tank_reinforce_1@-760 cost=780
- HOLD/PASS score: 0
- Chosen action score: 2801
- Margin over HOLD: 2801
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"tank_wall_1","slotIndex":7,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2801}}`
- Result: `{"ok":true,"type":"play","card":"Wall(tank_wall_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"},{"i":8,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`


### wardens_stand_firm_1 (Stand Firm)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 1, side enemy, HP P/E 12/12
- Board before: `[]`
- Hand before: `wardens_watch_captain_1, wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1`
- Top legal scores: play-unit:wardens_watch_captain_1@4304; play-unit:wardens_watch_captain_1@4304; **play-unit:wardens_watch_captain_1@4304**; play-unit:wardens_spearwall_1@3762; play-unit:wardens_spearwall_1@3762; play-unit:wardens_spearwall_1@3762; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1580 cost=1000
- HOLD/PASS score: 0
- Chosen action score: 4304
- Margin over HOLD: 4304
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_watch_captain_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4304}}`
- Result: `{"ok":true,"type":"play","card":"Watch Captain(wardens_watch_captain_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 2, side enemy, HP P/E 10/10
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1, wardens_halberdier_1`
- Top legal scores: play-unit:wardens_spearwall_1@2858; **play-unit:wardens_halberdier_1@2858**; play-unit:wardens_spearwall_1@2578; play-unit:wardens_halberdier_1@2578; play-targeted-effect:wardens_shield_push_1@2080 cost=920; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1580 cost=1000
- HOLD/PASS score: 0
- Chosen action score: 2858
- Margin over HOLD: 2858
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_halberdier_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2858}}`
- Result: `{"ok":true,"type":"play","card":"Halberdier(wardens_halberdier_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_halberdier_1","name":"Halberdier","atk":2,"hp":1,"armor":0,"effectId":"opposing_lane_atk_plus_1"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 3, side enemy, HP P/E 8/8
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1, wardens_hold_the_line_1`
- Top legal scores: **play-unit:wardens_spearwall_1@4042**; play-unit:wardens_spearwall_1@2578; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1580 cost=1000
- HOLD/PASS score: 0
- Chosen action score: 4042
- Margin over HOLD: 4042
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_spearwall_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4042}}`
- Result: `{"ok":true,"type":"play","card":"Spearwall(wardens_spearwall_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_spearwall_1","name":"Spearwall","atk":1,"hp":1,"armor":0,"effectId":"warden_defensive_friction_adjacent"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 4, side enemy, HP P/E 6/6
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`
- Hand before: `wardens_shield_push_1, wardens_stand_firm_1, wardens_hold_the_line_1, wardens_bastion_guard_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@2934**; play-unit:wardens_bastion_guard_1@2719; play-targeted-effect:wardens_shield_push_1@2080 cost=920; play-targeted-effect:wardens_shield_push_1@1880 cost=920; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1580 cost=1000
- HOLD/PASS score: 0
- Chosen action score: 2934
- Margin over HOLD: 2934
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2934}}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 5, side enemy, HP P/E 6/4
- Board before: `[{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":2,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `wardens_shield_push_1, wardens_stand_firm_1, wardens_hold_the_line_1, wardens_sentinel_1`
- Top legal scores: **play-unit:wardens_sentinel_1@4215**; play-unit:wardens_sentinel_1@2826; play-unit:wardens_sentinel_1@2125; play-effect:wardens_hold_the_line_1@164 cost=960; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1580 cost=1000
- HOLD/PASS score: 0
- Chosen action score: 4215
- Margin over HOLD: 4215
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_sentinel_1","slotIndex":1,"placementType":"redeploy","aiEvaluation":{"kind":"replace","meaningful":true,"pressureGain":395,"heroPressureGain":1,"openLaneImprovement":1,"loopKey":"replace:enemy:1:wardens_sentinel_1:wardens_bastion_guard_1","holdScore":0,"marginOverHold":4215}}`
- Result: `{"ok":true,"type":"redeploy","card":"Sentinel(wardens_sentinel_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`


### wardens_shield_push_1 (Shield Push)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Wardens vs Aggro, turn 3, side enemy, HP P/E 6/3
- Board before: `[{"i":0,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":6,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `wardens_bastion_guard_1, wardens_shield_push_1, wardens_halberdier_1, wardens_hold_the_line_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@3439**; play-unit:wardens_halberdier_1@3298; play-targeted-effect:wardens_shield_push_1@2050 cost=920; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3439
- Margin over HOLD: 3439
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3439}}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":6,"owner":"player","id":"aggro_glass_cannon_1","name":"Glass Cannon","atk":3,"hp":1,"armor":0,"effectId":"self_damage_after_attack"},{"i":7,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 2, side enemy, HP P/E 10/10
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `wardens_shield_push_1, wardens_spearwall_1, wardens_stand_firm_1, wardens_halberdier_1`
- Top legal scores: play-unit:wardens_spearwall_1@2858; **play-unit:wardens_halberdier_1@2858**; play-unit:wardens_spearwall_1@2578; play-unit:wardens_halberdier_1@2578; play-targeted-effect:wardens_shield_push_1@2080 cost=920; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1580 cost=1000
- HOLD/PASS score: 0
- Chosen action score: 2858
- Margin over HOLD: 2858
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_halberdier_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2858}}`
- Result: `{"ok":true,"type":"play","card":"Halberdier(wardens_halberdier_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_halberdier_1","name":"Halberdier","atk":2,"hp":1,"armor":0,"effectId":"opposing_lane_atk_plus_1"},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Wardens vs Tank, turn 4, side enemy, HP P/E 6/6
- Board before: `[{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`
- Hand before: `wardens_shield_push_1, wardens_stand_firm_1, wardens_hold_the_line_1, wardens_bastion_guard_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@2934**; play-unit:wardens_bastion_guard_1@2719; play-targeted-effect:wardens_shield_push_1@2080 cost=920; play-targeted-effect:wardens_shield_push_1@1880 cost=920; pass:HOLD@0; play-effect:wardens_stand_firm_1@-1580 cost=1000
- HOLD/PASS score: 0
- Chosen action score: 2934
- Margin over HOLD: 2934
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2934}}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"wardens_watch_captain_1","name":"Watch Captain","atk":2,"hp":2,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_wall_1","name":"Wall","atk":0,"hp":2,"armor":0,"effectId":"cannot_attack"}]`

#### Moment 4: reasonable

- Match: Wardens vs Control, turn 8, side enemy, HP P/E 2/2
- Board before: `[{"i":7,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":8,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"}]`
- Hand before: `wardens_reinforce_line_1, wardens_hold_the_line_1, wardens_brace_1, wardens_shield_push_1, wardens_stand_firm_1`
- Top legal scores: **play-targeted-effect:wardens_shield_push_1@2260 cost=740**; pass:HOLD@0; play-effect:wardens_stand_firm_1@-540 cost=820
- HOLD/PASS score: 0
- Chosen action score: 2260
- Margin over HOLD: 2260
- Utility opportunity cost applied: 740
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-targeted-effect","cardId":"wardens_shield_push_1","targetIndex":7,"targetIndexes":[7,8],"effectId":"swap_adjacent_enemy_units","aiEvaluation":{"kind":"shield-push","meaningful":true,"pressureGain":260,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"utilityOpportunityCost":740,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":2260}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Shield Push(wardens_shield_push_1)"}`
- Board after: `[{"i":7,"owner":"player","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Wardens vs Swarm, turn 4, side enemy, HP P/E 6/8
- Board before: `[{"i":1,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":6,"owner":"player","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"player_flood_token_7_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"player_flood_token_8_1","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null}]`
- Hand before: `wardens_spearwall_1, wardens_brace_1, wardens_shield_push_1, wardens_bastion_guard_1, wardens_stand_firm_1`
- Top legal scores: **play-unit:wardens_bastion_guard_1@2854**; play-unit:wardens_spearwall_1@2713; play-unit:wardens_bastion_guard_1@2634; play-unit:wardens_spearwall_1@2493; play-targeted-effect:wardens_shield_push_1@1915 cost=920; play-targeted-effect:wardens_shield_push_1@1915 cost=920; play-targeted-effect:wardens_brace_1@128 cost=960; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2854
- Margin over HOLD: 2854
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"wardens_bastion_guard_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2854}}`
- Result: `{"ok":true,"type":"play","card":"Bastion Guard(wardens_bastion_guard_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"wardens_sentinel_1","name":"Sentinel","atk":2,"hp":2,"armor":0,"effectId":"warden_defensive_friction_self"},{"i":2,"owner":"enemy","id":"wardens_bastion_guard_1","name":"Bastion Guard","atk":1,"hp":3,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"player_flood_token_7_0","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"player_flood_token_8_1","name":"Token","atk":1,"hp":1,"armor":0,"effectId":null}]`


### control_controller_1 (Controller)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Control vs Tank, turn 3, side enemy, HP P/E 10/8
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_system_override_1`
- Top legal scores: **play-targeted-effect:control_system_override_1@31788 cost=920**; play-targeted-effect:control_system_override_1@31268 cost=920; play-targeted-effect:control_system_override_1@30748 cost=920; play-unit:control_controller_1@3781 cost=680; play-unit:control_controller_1@3661 cost=680; play-unit:control_controller_1@3656 cost=680; play-unit:control_controller_1@3620 cost=680; play-unit:control_controller_1@3611 cost=680
- HOLD/PASS score: 0
- Chosen action score: 31788
- Margin over HOLD: 31788
- Utility opportunity cost applied: 920
- Utility chosen reason: n/a
- Chosen: `{"type":"play-targeted-effect","cardId":"control_system_override_1","targetIndex":8,"targetIndexes":[8],"effectId":"control_enemy_unit_this_turn","aiEvaluation":{"utility":true,"utilityOpportunityCost":920,"utilityReason":null,"utilityThreshold":650,"holdScore":0,"marginOverHold":31788}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"System Override(control_system_override_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 2: reasonable

- Match: Control vs Tank, turn 4, side enemy, HP P/E 7/3
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_sniper_1`
- Top legal scores: **play-unit:control_controller_1@3876 cost=680**; play-unit:control_controller_1@3876 cost=680; play-unit:control_controller_1@3871 cost=680; play-unit:control_controller_1@3843 cost=680; play-unit:control_controller_1@3711 cost=680; play-unit:control_controller_1@3651 cost=680; play-unit:control_controller_1@3623 cost=680; play-unit:control_controller_1@3491 cost=680
- HOLD/PASS score: 0
- Chosen action score: 3876
- Margin over HOLD: 3876
- Utility opportunity cost applied: 680
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":0,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":7,"targetIndexes":[7,8],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":396,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"utilityOpportunityCost":680,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":3876}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":8,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"}]`

#### Moment 3: reasonable

- Match: Control vs Tank, turn 4, side player, HP P/E 2/8
- Board before: `[{"i":0,"owner":"enemy","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_drone_1, control_controller_1, control_pulse_wave_1, control_hacker_1, control_recall_1`
- Top legal scores: **play-unit:control_controller_1@3486 cost=680**; play-unit:control_controller_1@3486 cost=680; play-unit:control_controller_1@3371 cost=680; play-unit:control_controller_1@3371 cost=680; play-unit:control_hacker_1@2746; play-unit:control_drone_1@2543; play-unit:control_hacker_1@2461; play-unit:control_hacker_1@2461
- HOLD/PASS score: 0
- Chosen action score: 3486
- Margin over HOLD: 3486
- Utility opportunity cost applied: 680
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":8,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":0,"targetIndexes":[0,2],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":146,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"utilityOpportunityCost":680,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":3486}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":3,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":1,"owner":"enemy","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":2,"owner":"enemy","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"}]`

#### Moment 4: reasonable

- Match: Control vs Control, turn 5, side enemy, HP P/E 8/6
- Board before: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":7,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"},{"i":8,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`
- Hand before: `control_controller_1, control_recall_1, control_swap_1, control_drone_1`
- Top legal scores: **play-unit:control_controller_1@3591 cost=680**; play-unit:control_controller_1@3486 cost=680; play-unit:control_drone_1@2763; play-unit:control_drone_1@2060; pass:HOLD@0; play-targeted-effect:control_swap_1@0 cost=920; play-targeted-effect:control_recall_1@-1160 cost=1180
- HOLD/PASS score: 0
- Chosen action score: 3591
- Margin over HOLD: 3591
- Utility opportunity cost applied: 680
- Utility chosen reason: meaningful pressure swing
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":2,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":7,"targetIndexes":[7,8],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":301,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"utilityOpportunityCost":680,"utilityReason":"meaningful pressure swing","utilityThreshold":0,"holdScore":0,"marginOverHold":3591}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":2,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":7,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`

#### Moment 5: reasonable

- Match: Control vs Swarm, turn 3, side player, HP P/E 9/11
- Board before: `[{"i":0,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":2,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":7,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"}]`
- Hand before: `control_drone_1, control_swap_1, control_pulse_wave_1, control_controller_1`
- Top legal scores: **play-unit:control_controller_1@3586 cost=680**; play-unit:control_controller_1@3366 cost=680; play-effect:control_pulse_wave_1@2906; play-unit:control_drone_1@2478; play-unit:control_drone_1@2060; pass:HOLD@0; play-targeted-effect:control_swap_1@0 cost=920
- HOLD/PASS score: 0
- Chosen action score: 3586
- Margin over HOLD: 3586
- Utility opportunity cost applied: 680
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":8,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":0,"targetIndexes":[0,2],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":366,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"utilityOpportunityCost":680,"utilityReason":null,"utilityThreshold":650,"holdScore":0,"marginOverHold":3586}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"swarm_brood_1","name":"Brood","atk":1,"hp":2,"armor":0,"effectId":"on_death_summon_grunt"},{"i":2,"owner":"enemy","id":"swarm_spitter_1","name":"Spitter","atk":1,"hp":1,"armor":0,"effectId":"on_play_lane_damage_1"},{"i":7,"owner":"player","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":8,"owner":"player","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"}]`


### control_jam_signal_1 (Jam Signal)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Control vs Aggro, turn 2, side enemy, HP P/E 11/8
- Board before: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":8,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `control_hacker_1, control_drone_1, control_controller_1, control_jam_signal_1`
- Top legal scores: **play-unit:control_hacker_1@3744**; play-unit:control_drone_1@3732; play-unit:control_hacker_1@3106; play-unit:control_drone_1@2903; play-targeted-effect:control_jam_signal_1@1450 cost=920; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3744
- Margin over HOLD: 3744
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_hacker_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3744}}`
- Result: `{"ok":true,"type":"play","card":"Hacker(control_hacker_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":8,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable (held for higher score action)

- Match: Control vs Tank, turn 2, side enemy, HP P/E 11/10
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`
- Hand before: `control_controller_1, control_disruptor_1, control_drone_1, control_jam_signal_1`
- Top legal scores: **play-unit:control_disruptor_1@3744**; play-unit:control_drone_1@3732; play-unit:control_disruptor_1@2551; play-unit:control_drone_1@2543; play-targeted-effect:control_jam_signal_1@1270 cost=920; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 3744
- Margin over HOLD: 3744
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_disruptor_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":3744}}`
- Result: `{"ok":true,"type":"play","card":"Disruptor(control_disruptor_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":2,"owner":"enemy","id":"control_disruptor_1","name":"Disruptor","atk":1,"hp":2,"armor":0,"effectId":"block_enemy_effect_cards_until_combat"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Control vs Tank, turn 3, side enemy, HP P/E 10/8
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_system_override_1`
- Top legal scores: **play-targeted-effect:control_system_override_1@31788 cost=920**; play-targeted-effect:control_system_override_1@31268 cost=920; play-targeted-effect:control_system_override_1@30748 cost=920; play-unit:control_controller_1@3781 cost=680; play-unit:control_controller_1@3661 cost=680; play-unit:control_controller_1@3656 cost=680; play-unit:control_controller_1@3620 cost=680; play-unit:control_controller_1@3611 cost=680
- HOLD/PASS score: 0
- Chosen action score: 31788
- Margin over HOLD: 31788
- Utility opportunity cost applied: 920
- Utility chosen reason: n/a
- Chosen: `{"type":"play-targeted-effect","cardId":"control_system_override_1","targetIndex":8,"targetIndexes":[8],"effectId":"control_enemy_unit_this_turn","aiEvaluation":{"utility":true,"utilityOpportunityCost":920,"utilityReason":null,"utilityThreshold":650,"holdScore":0,"marginOverHold":31788}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"System Override(control_system_override_1)"}`
- Board after: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":2,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":3,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Control vs Tank, turn 4, side enemy, HP P/E 7/3
- Board before: `[{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_controller_1, control_drone_1, control_jam_signal_1, control_sniper_1`
- Top legal scores: **play-unit:control_controller_1@3876 cost=680**; play-unit:control_controller_1@3876 cost=680; play-unit:control_controller_1@3871 cost=680; play-unit:control_controller_1@3843 cost=680; play-unit:control_controller_1@3711 cost=680; play-unit:control_controller_1@3651 cost=680; play-unit:control_controller_1@3623 cost=680; play-unit:control_controller_1@3491 cost=680
- HOLD/PASS score: 0
- Chosen action score: 3876
- Margin over HOLD: 3876
- Utility opportunity cost applied: 680
- Utility chosen reason: prevents lethal
- Chosen: `{"type":"play-unit","cardId":"control_controller_1","slotIndex":0,"placementType":"play","effectId":"swap_two_enemy_units","targetIndex":7,"targetIndexes":[7,8],"aiEvaluation":{"kind":"controller","meaningful":true,"pressureGain":396,"heroPressureGain":0,"openLaneImprovement":0,"utility":true,"utilityOpportunityCost":680,"utilityReason":"prevents lethal","utilityThreshold":0,"holdScore":0,"marginOverHold":3876}}`
- Result: `{"ok":true,"type":"unit-on-play-targeted-effect","card":null}`
- Board after: `[{"i":0,"owner":"enemy","id":"control_controller_1","name":"Controller","atk":1,"hp":2,"armor":0,"effectId":"swap_two_enemy_units"},{"i":1,"owner":"enemy","id":"control_hacker_1","name":"Hacker","atk":1,"hp":1,"armor":0,"effectId":"enemy_lane_atk_minus_1"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"},{"i":8,"owner":"player","id":"tank_guardian_1","name":"Guardian","atk":1,"hp":2,"armor":0,"effectId":"intercept_lane_damage"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Control vs Tank, turn 5, side enemy, HP P/E 7/1
- Board before: `[{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `control_drone_1, control_jam_signal_1, control_sniper_1, control_swap_1`
- Top legal scores: **play-unit:control_sniper_1@2798**; play-unit:control_drone_1@2763; play-unit:control_sniper_1@2578; play-unit:control_drone_1@2543; play-unit:control_sniper_1@2513; play-targeted-effect:control_jam_signal_1@2160 cost=920; play-unit:control_drone_1@2060; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2798
- Margin over HOLD: 2798
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"control_sniper_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2798}}`
- Result: `{"ok":true,"type":"play","card":"Sniper(control_sniper_1)"}`
- Board after: `[{"i":2,"owner":"enemy","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"},{"i":6,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":3,"armor":0,"effectId":null},{"i":7,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`


### attrition_swarm_rise_again_1 (Rise Again)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable (held for higher score action)

- Match: Attrition Swarm vs Aggro, turn 3, side enemy, HP P/E 7/7
- Board before: `[{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`
- Hand before: `attrition_swarm_grave_call_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1`
- Top legal scores: **play-effect:attrition_swarm_grave_call_1@1303 cost=820**; play-effect:attrition_swarm_rise_again_1@1003 cost=1080; pass:HOLD@0; play-effect:attrition_swarm_feast_1@-550 cost=820; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 1303
- Margin over HOLD: 1303
- Utility opportunity cost applied: 820
- Utility chosen reason: meaningful pressure swing
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_grave_call_1","effectId":"grave_call","aiEvaluation":{"utility":true,"utilityOpportunityCost":820,"utilityReason":"meaningful pressure swing","utilityThreshold":0,"holdScore":0,"marginOverHold":1303}}`
- Result: `{"ok":true,"type":"effect","card":"Grave Call(attrition_swarm_grave_call_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"aggro_runner_1","name":"Runner","atk":2,"hp":1,"armor":0,"effectId":"lane_empty_bonus_damage"}]`

#### Moment 2: reasonable

- Match: Attrition Swarm vs Aggro, turn 4, side enemy, HP P/E 6/7
- Board before: `[{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_feast_1, attrition_swarm_infect_1`
- Top legal scores: **play-effect:attrition_swarm_rise_again_1@1802 cost=1080**; pass:HOLD@0; play-effect:attrition_swarm_feast_1@-550 cost=820; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 1802
- Margin over HOLD: 1802
- Utility opportunity cost applied: 1080
- Utility chosen reason: creates clear lane/hero pressure improvement
- Chosen: `{"type":"play-effect","cardId":"attrition_swarm_rise_again_1","effectId":"revive_friendly_1hp","aiEvaluation":{"utility":true,"utilityOpportunityCost":1080,"utilityReason":"creates clear lane/hero pressure improvement","utilityThreshold":0,"holdScore":0,"marginOverHold":1802}}`
- Result: `{"ok":true,"type":"effect","card":"Rise Again(attrition_swarm_rise_again_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"enemy_grave_call_grunt_0_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":2,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"}]`

#### Moment 3: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 3, side enemy, HP P/E 8/10
- Board before: `[{"i":1,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":2,"owner":"enemy","id":"enemy_combat_death_grunt_2_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_infect_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1`
- Top legal scores: **play-unit:attrition_swarm_rotcaller_1@2446**; play-unit:attrition_swarm_rotcaller_1@2078; play-targeted-effect:attrition_swarm_infect_1@1283; play-effect:attrition_swarm_funeral_pyre_1@770; play-targeted-effect:attrition_swarm_infect_1@368; play-effect:attrition_swarm_rise_again_1@273 cost=1260; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 2446
- Margin over HOLD: 2446
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_rotcaller_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":2446}}`
- Result: `{"ok":true,"type":"play","card":"Rotcaller(attrition_swarm_rotcaller_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":2,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":1,"owner":"enemy","id":"attrition_swarm_leech_1","name":"Leech","atk":2,"hp":1,"armor":0,"effectId":"leech_heal_hero_on_attack"},{"i":2,"owner":"enemy","id":"enemy_combat_death_grunt_2_0","name":"Grunt","atk":1,"hp":1,"armor":0,"effectId":null},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":2,"armor":0,"effectId":"lane_armor_aura_1"},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":2,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 4: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 4, side enemy, HP P/E 8/11
- Board before: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":6,"owner":"player","id":"tank_shieldbearer_1","name":"Shieldbearer","atk":1,"hp":1,"armor":0,"effectId":"lane_armor_aura_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_infect_1, attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_abomination_1`
- Top legal scores: **play-targeted-effect:attrition_swarm_infect_1@4955**; play-targeted-effect:attrition_swarm_infect_1@3948; play-unit:attrition_swarm_abomination_1@3126; play-unit:attrition_swarm_abomination_1@2841; play-unit:attrition_swarm_abomination_1@2228; play-effect:attrition_swarm_funeral_pyre_1@770; play-effect:attrition_swarm_rise_again_1@393 cost=1260; play-targeted-effect:attrition_swarm_infect_1@368
- HOLD/PASS score: 0
- Chosen action score: 4955
- Margin over HOLD: 4955
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-targeted-effect","cardId":"attrition_swarm_infect_1","targetIndex":6,"targetIndexes":[6],"effectId":"infect_damage_1_opposite_ally_atk_1","aiEvaluation":{"holdScore":0,"marginOverHold":4955}}`
- Result: `{"ok":true,"type":"targeted-effect","card":"Rotten Gift(attrition_swarm_infect_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`

#### Moment 5: reasonable (held for higher score action)

- Match: Attrition Swarm vs Tank, turn 5, side enemy, HP P/E 7/6
- Board before: `[{"i":0,"owner":"enemy","id":"attrition_swarm_rotcaller_1","name":"Rotcaller","atk":1,"hp":1,"armor":0,"effectId":"rotcaller_adjacent_death_atk_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`
- Hand before: `attrition_swarm_funeral_pyre_1, attrition_swarm_rise_again_1, attrition_swarm_abomination_1, attrition_swarm_feast_1`
- Top legal scores: **play-unit:attrition_swarm_abomination_1@3922**; play-unit:attrition_swarm_abomination_1@2841; play-unit:attrition_swarm_abomination_1@2841; play-effect:attrition_swarm_rise_again_1@393 cost=1260; pass:HOLD@0; play-effect:attrition_swarm_feast_1@-730 cost=1000; play-effect:attrition_swarm_funeral_pyre_1@-2580
- HOLD/PASS score: 0
- Chosen action score: 3922
- Margin over HOLD: 3922
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":0,"placementType":"redeploy","aiEvaluation":{"kind":"replace","meaningful":true,"pressureGain":382,"heroPressureGain":1,"openLaneImprovement":1,"loopKey":"replace:enemy:0:attrition_swarm_abomination_1:attrition_swarm_rotcaller_1","holdScore":0,"marginOverHold":3922}}`
- Result: `{"ok":true,"type":"redeploy","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":7,"owner":"player","id":"tank_heavy_1","name":"Heavy","atk":2,"hp":2,"armor":0,"effectId":null},{"i":8,"owner":"player","id":"tank_bruiser_1","name":"Bruiser","atk":2,"hp":1,"armor":0,"effectId":"gain_atk_when_damaged"}]`


### attrition_swarm_leech_1 (Leech)

Observed 5/5 playable-in-hand moments.

#### Moment 1: reasonable

- Match: Attrition Swarm vs Aggro, turn 1, side enemy, HP P/E 12/12
- Board before: `[{"i":6,"owner":"player","id":"aggro_flanker_1","name":"Flanker","atk":2,"hp":2,"armor":0,"effectId":"empty_adjacent_bonus_atk"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_grave_call_1, attrition_swarm_leech_1, attrition_swarm_funeral_pyre_1`
- Top legal scores: **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769; play-effect:attrition_swarm_grave_call_1@3515 cost=1000; play-unit:attrition_swarm_leech_1@2833; play-unit:attrition_swarm_rotcaller_1@2571; pass:HOLD@0
- HOLD/PASS score: 0
- Chosen action score: 4322
- Margin over HOLD: 4322
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":1,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4322}}`
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
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":2,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4322}}`
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
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4339}}`
- Result: `{"ok":true,"type":"play","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`

#### Moment 4: reasonable

- Match: Attrition Swarm vs Control, turn 2, side enemy, HP P/E 9/11
- Board before: `[{"i":8,"owner":"player","id":"control_sniper_1","name":"Sniper","atk":2,"hp":1,"armor":0,"effectId":"can_hit_any_lane"}]`
- Hand before: `attrition_swarm_rotcaller_1, attrition_swarm_husk_1, attrition_swarm_leech_1, attrition_swarm_grave_call_1`
- Top legal scores: **play-unit:attrition_swarm_leech_1@4322**; play-unit:attrition_swarm_leech_1@4322; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_rotcaller_1@3769; play-unit:attrition_swarm_husk_1@3752; play-unit:attrition_swarm_husk_1@3752; play-effect:attrition_swarm_grave_call_1@3294 cost=1000; play-unit:attrition_swarm_leech_1@2833
- HOLD/PASS score: 0
- Chosen action score: 4322
- Margin over HOLD: 4322
- Utility opportunity cost applied: 0
- Utility chosen reason: n/a
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_leech_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4322}}`
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
- Chosen: `{"type":"play-unit","cardId":"attrition_swarm_abomination_1","slotIndex":0,"placementType":"play","aiEvaluation":{"holdScore":0,"marginOverHold":4339}}`
- Result: `{"ok":true,"type":"play","card":"Abomination(attrition_swarm_abomination_1)"}`
- Board after: `[{"i":0,"owner":"enemy","id":"attrition_swarm_abomination_1","name":"Abomination","atk":2,"hp":2,"armor":0,"effectId":"combat_death_damage_both_heroes_1"},{"i":7,"owner":"player","id":"swarm_rusher_1","name":"Rusher","atk":2,"hp":1,"armor":0,"effectId":null}]`


## Examples of bad/questionable decisions

Questionable moments above are primarily low-score defensive/sacrifice plays or indirect cards chosen without large immediate pressure change. No catastrophic first-legal-target pattern was observed in this sample; target candidates are scored/sorted for Jam Signal, Controller, Feast-like sacrifice, and swaps.

## Whether current balance results are trustworthy

Partially. The simulator AI is good enough to compare straightforward unit tempo and direct damage cards. It is not reliable enough to make confident final balance calls for sacrifice, draw-only, revive, defensive, and control packages because those cards depend on delayed value and hand/slot opportunity cost that the current immediate scorer only approximates.

## Recommended next step

Use this HOLD-margin diagnostic as the baseline before larger Balance Lab simulations; remaining suspicious utility cards should be reviewed by their reported opportunity cost and chosen reason rather than raw finite playability.
