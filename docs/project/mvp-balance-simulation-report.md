# MVP Balance Simulation Report

Generated from the implemented battle system on 2026-05-13. No gameplay behavior was changed by this report.

## 1. Executive summary

- **Simulation size:** 1000 games per ordered matchup, 36 ordered matchups, 36000 total games.
- **Rules parity:** seeded shuffled decks, current random first-actor initialization, current opening mulligan evaluator, current AI scorer, current combat/no-progress/turn-cap resolution. Base seed: 20260513.
- **Flagged matchup count:** 16 total (9 severe, 6 critical-only, 0 slow/stalling flags).
- **Fastest average matchup:** Aggro vs Aggro at 2.82 turns.
- **Slowest average matchup:** Control vs Control at 9.63 turns.
- **Aggregate overperformers:** none above 60% overall win rate.
- **Aggregate underperformers:** Swarm.

## 2. Matchup table

| Player faction | Enemy faction | Player win % | Enemy win % | Draw % | Avg turns | Median turns | Shortest | Longest | Avg final player HP | Avg final enemy HP | Most common win condition | Player-first P win % | Enemy-first P win % | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aggro | Aggro | 47.6% | 45.6% | 6.8% | 2.82 | 3.0 | 2 | 6 | 1.18 | 1.19 | hero lethal | 49.4% | 45.7% | too fast |
| Aggro | Attrition Swarm | 47.9% | 49.8% | 2.3% | 4.33 | 4.0 | 2 | 8 | 2.07 | 2.00 | hero lethal | 37.8% | 58.0% | ok |
| Aggro | Control | 38.6% | 60.8% | 0.6% | 5.73 | 6.0 | 2 | 10 | 2.23 | 2.49 | hero lethal | 34.1% | 43.1% | critical |
| Aggro | Swarm | 59.4% | 37.2% | 3.4% | 4.75 | 5.0 | 2 | 10 | 2.52 | 1.32 | hero lethal | 50.2% | 68.8% | ok |
| Aggro | Tank | 60.3% | 37.6% | 2.1% | 4.12 | 4.0 | 2 | 9 | 2.78 | 1.28 | hero lethal | 63.3% | 57.2% | critical |
| Aggro | Wardens | 61.3% | 36.8% | 1.9% | 3.63 | 4.0 | 2 | 8 | 2.95 | 1.13 | hero lethal | 59.7% | 62.9% | critical, too fast |
| Attrition Swarm | Aggro | 50.2% | 46.7% | 3.1% | 4.34 | 5.0 | 2 | 8 | 1.97 | 2.02 | hero lethal | 40.5% | 60.3% | ok |
| Attrition Swarm | Attrition Swarm | 44.3% | 47.4% | 8.3% | 6.85 | 7.0 | 4 | 11 | 1.43 | 1.47 | hero lethal | 47.6% | 41.1% | ok |
| Attrition Swarm | Control | 52.0% | 46.6% | 1.4% | 7.56 | 7.0 | 4 | 14 | 2.57 | 2.53 | hero lethal | 47.0% | 57.3% | ok |
| Attrition Swarm | Swarm | 72.6% | 24.2% | 3.2% | 7.84 | 8.0 | 5 | 15 | 3.14 | 0.85 | hero lethal | 70.3% | 74.8% | severe |
| Attrition Swarm | Tank | 43.7% | 53.0% | 3.3% | 7.31 | 7.0 | 4 | 16 | 1.70 | 2.41 | hero lethal | 49.0% | 38.4% | ok |
| Attrition Swarm | Wardens | 39.9% | 56.6% | 3.5% | 6.54 | 6.0 | 4 | 13 | 1.39 | 2.08 | hero lethal | 46.5% | 33.5% | critical |
| Control | Aggro | 58.1% | 40.9% | 1.0% | 5.67 | 6.0 | 2 | 11 | 2.41 | 2.29 | hero lethal | 59.2% | 57.0% | ok |
| Control | Attrition Swarm | 46.0% | 52.5% | 1.5% | 7.63 | 8.0 | 4 | 15 | 2.58 | 2.48 | hero lethal | 42.3% | 49.8% | ok |
| Control | Control | 48.4% | 45.8% | 5.8% | 9.63 | 9.0 | 5 | 17 | 3.07 | 2.89 | hero lethal | 46.5% | 50.3% | ok |
| Control | Swarm | 52.2% | 45.6% | 2.2% | 9.48 | 9.0 | 5 | 17 | 2.75 | 1.90 | hero lethal | 46.8% | 57.5% | ok |
| Control | Tank | 33.1% | 65.8% | 1.1% | 8.04 | 8.0 | 4 | 19 | 1.88 | 4.01 | hero lethal | 46.7% | 20.1% | severe |
| Control | Wardens | 53.0% | 44.4% | 2.6% | 7.50 | 7.0 | 4 | 16 | 2.61 | 2.50 | hero lethal | 53.9% | 52.0% | ok |
| Swarm | Aggro | 39.9% | 56.8% | 3.3% | 4.70 | 5.0 | 2 | 11 | 1.39 | 2.51 | hero lethal | 27.6% | 52.4% | critical |
| Swarm | Attrition Swarm | 23.7% | 73.0% | 3.3% | 7.81 | 8.0 | 4 | 17 | 0.93 | 3.16 | hero lethal | 25.9% | 21.2% | severe |
| Swarm | Control | 47.3% | 50.4% | 2.3% | 9.39 | 9.0 | 4 | 17 | 2.01 | 2.76 | hero lethal | 41.9% | 52.8% | ok |
| Swarm | Swarm | 48.0% | 48.3% | 3.7% | 9.55 | 10.0 | 4 | 19 | 2.33 | 2.56 | hero lethal | 48.9% | 46.8% | ok |
| Swarm | Tank | 26.0% | 72.6% | 1.4% | 7.56 | 7.0 | 4 | 17 | 1.08 | 4.63 | hero lethal | 22.8% | 28.9% | severe |
| Swarm | Wardens | 29.6% | 67.5% | 2.9% | 6.87 | 7.0 | 4 | 14 | 1.18 | 3.44 | hero lethal | 31.2% | 28.1% | severe |
| Tank | Aggro | 36.6% | 60.1% | 3.3% | 4.04 | 4.0 | 2 | 8 | 1.30 | 2.83 | hero lethal | 37.3% | 35.8% | critical |
| Tank | Attrition Swarm | 53.7% | 42.4% | 3.9% | 7.24 | 7.0 | 4 | 14 | 2.55 | 1.67 | hero lethal | 59.7% | 46.8% | ok |
| Tank | Control | 65.1% | 33.7% | 1.2% | 8.01 | 8.0 | 4 | 18 | 3.98 | 1.86 | hero lethal | 77.3% | 53.2% | severe |
| Tank | Swarm | 74.1% | 24.5% | 1.4% | 7.51 | 7.0 | 4 | 15 | 4.77 | 0.99 | hero lethal | 72.0% | 76.3% | severe |
| Tank | Tank | 46.4% | 47.4% | 6.2% | 7.61 | 8.0 | 4 | 15 | 2.40 | 2.22 | hero lethal | 37.4% | 53.4% | ok |
| Tank | Wardens | 41.4% | 54.8% | 3.8% | 6.78 | 7.0 | 4 | 16 | 1.78 | 2.76 | hero lethal | 35.6% | 47.8% | ok |
| Wardens | Aggro | 34.4% | 62.6% | 3.0% | 3.68 | 4.0 | 2 | 9 | 1.20 | 2.83 | hero lethal | 31.4% | 37.6% | severe, too fast |
| Wardens | Attrition Swarm | 55.4% | 41.2% | 3.4% | 6.53 | 6.0 | 4 | 12 | 2.05 | 1.32 | hero lethal | 60.0% | 50.7% | ok |
| Wardens | Control | 44.0% | 52.6% | 3.4% | 7.58 | 8.0 | 4 | 16 | 2.38 | 2.68 | hero lethal | 43.3% | 44.7% | ok |
| Wardens | Swarm | 67.6% | 30.2% | 2.2% | 6.89 | 7.0 | 4 | 13 | 3.46 | 1.13 | hero lethal | 66.2% | 69.0% | severe |
| Wardens | Tank | 54.7% | 41.2% | 4.1% | 6.83 | 7.0 | 4 | 17 | 2.69 | 1.80 | hero lethal | 52.7% | 56.6% | ok |
| Wardens | Wardens | 46.4% | 47.6% | 6.0% | 6.26 | 6.0 | 4 | 11 | 1.93 | 1.96 | hero lethal | 42.3% | 50.5% | ok |

## 3. Faction strength ranking

| Faction | Overall win % | Average turns | Draw rate | Games |
| --- | --- | --- | --- | --- |
| Tank | 52.9% | 6.89 | 3.2% | 12000 |
| Aggro | 52.3% | 4.22 | 3.1% | 12000 |
| Wardens | 50.8% | 6.28 | 3.6% | 12000 |
| Attrition Swarm | 50.7% | 6.74 | 3.8% | 12000 |
| Control | 48.4% | 7.99 | 2.4% | 12000 |
| Swarm | 35.4% | 7.66 | 2.8% | 12000 |

### Matchups outside acceptable range

| Player faction | Enemy faction | Player win % | Enemy win % | Draw % | Avg turns | Median turns | Shortest | Longest | Avg final player HP | Avg final enemy HP | Most common win condition | Player-first P win % | Enemy-first P win % | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aggro | Aggro | 47.6% | 45.6% | 6.8% | 2.82 | 3.0 | 2 | 6 | 1.18 | 1.19 | hero lethal | 49.4% | 45.7% | too fast |
| Aggro | Control | 38.6% | 60.8% | 0.6% | 5.73 | 6.0 | 2 | 10 | 2.23 | 2.49 | hero lethal | 34.1% | 43.1% | critical |
| Aggro | Tank | 60.3% | 37.6% | 2.1% | 4.12 | 4.0 | 2 | 9 | 2.78 | 1.28 | hero lethal | 63.3% | 57.2% | critical |
| Aggro | Wardens | 61.3% | 36.8% | 1.9% | 3.63 | 4.0 | 2 | 8 | 2.95 | 1.13 | hero lethal | 59.7% | 62.9% | critical, too fast |
| Attrition Swarm | Swarm | 72.6% | 24.2% | 3.2% | 7.84 | 8.0 | 5 | 15 | 3.14 | 0.85 | hero lethal | 70.3% | 74.8% | severe |
| Attrition Swarm | Wardens | 39.9% | 56.6% | 3.5% | 6.54 | 6.0 | 4 | 13 | 1.39 | 2.08 | hero lethal | 46.5% | 33.5% | critical |
| Control | Tank | 33.1% | 65.8% | 1.1% | 8.04 | 8.0 | 4 | 19 | 1.88 | 4.01 | hero lethal | 46.7% | 20.1% | severe |
| Swarm | Aggro | 39.9% | 56.8% | 3.3% | 4.70 | 5.0 | 2 | 11 | 1.39 | 2.51 | hero lethal | 27.6% | 52.4% | critical |
| Swarm | Attrition Swarm | 23.7% | 73.0% | 3.3% | 7.81 | 8.0 | 4 | 17 | 0.93 | 3.16 | hero lethal | 25.9% | 21.2% | severe |
| Swarm | Tank | 26.0% | 72.6% | 1.4% | 7.56 | 7.0 | 4 | 17 | 1.08 | 4.63 | hero lethal | 22.8% | 28.9% | severe |
| Swarm | Wardens | 29.6% | 67.5% | 2.9% | 6.87 | 7.0 | 4 | 14 | 1.18 | 3.44 | hero lethal | 31.2% | 28.1% | severe |
| Tank | Aggro | 36.6% | 60.1% | 3.3% | 4.04 | 4.0 | 2 | 8 | 1.30 | 2.83 | hero lethal | 37.3% | 35.8% | critical |
| Tank | Control | 65.1% | 33.7% | 1.2% | 8.01 | 8.0 | 4 | 18 | 3.98 | 1.86 | hero lethal | 77.3% | 53.2% | severe |
| Tank | Swarm | 74.1% | 24.5% | 1.4% | 7.51 | 7.0 | 4 | 15 | 4.77 | 0.99 | hero lethal | 72.0% | 76.3% | severe |
| Wardens | Aggro | 34.4% | 62.6% | 3.0% | 3.68 | 4.0 | 2 | 9 | 1.20 | 2.83 | hero lethal | 31.4% | 37.6% | severe, too fast |
| Wardens | Swarm | 67.6% | 30.2% | 2.2% | 6.89 | 7.0 | 4 | 13 | 3.46 | 1.13 | hero lethal | 66.2% | 69.0% | severe |

## 4. Problem cards suspected from game logs

These are suspicions from action frequency and representative logs, not implemented balance changes.

| Card | Uses |
| --- | --- |
| Disruptor (control_disruptor_1) | 12932 |
| Controller (control_controller_1) | 12885 |
| Bastion Guard (wardens_bastion_guard_1) | 12575 |
| Guardian (tank_guardian_1) | 12080 |
| Alpha (swarm_alpha_1) | 11953 |
| Brood (swarm_brood_1) | 11889 |
| Spitter (swarm_spitter_1) | 11718 |
| Shieldbearer (tank_shieldbearer_1) | 11697 |
| Hacker (control_hacker_1) | 11687 |
| Rusher (swarm_rusher_1) | 11536 |
| Abomination (attrition_swarm_abomination_1) | 11527 |
| Carrier (attrition_swarm_carrier_1) | 11524 |
| Sniper (control_sniper_1) | 11519 |
| Leech (attrition_swarm_leech_1) | 11325 |
| Bruiser (tank_bruiser_1) | 11268 |
| Heavy (tank_heavy_1) | 11257 |
| Drone (control_drone_1) | 11158 |
| Watch Captain (wardens_watch_captain_1) | 11040 |

- High-frequency proactive units/effects in severe matchups should be reviewed first, especially cards that repeatedly created open-lane damage or resilient board stalls.
- Stalling flags should focus review on defensive HP/armor, zero-attack units, revive/summon effects, and no-progress tiebreak patterns before changing global rules.

### Representative extreme-game log summaries

- **Swarm vs Attrition Swarm, game 0, seed 2151791410:** player won by hero lethal in 6 turns. Key sequence: P plays Brood (swarm_brood_1) to lane 1 → E plays Grave Call (attrition_swarm_grave_call_1) → E plays Leech (attrition_swarm_leech_1) to lane 3 → P plays Spitter (swarm_spitter_1) to lane 3 → P plays Alpha (swarm_alpha_1) to lane 2 → E plays Abomination (attrition_swarm_abomination_1) to lane 3 → E plays Rotcaller (attrition_swarm_rotcaller_1) to lane 3.
- **Swarm vs Attrition Swarm, game 1, seed 572010977:** enemy won by hero lethal in 6 turns. Key sequence: P plays Rusher (swarm_rusher_1) to lane 2 → E plays Grave Call (attrition_swarm_grave_call_1) → E plays Abomination (attrition_swarm_abomination_1) to lane 3 → P plays Alpha (swarm_alpha_1) to lane 2 → P plays Grunt (swarm_grunt_1) to lane 3 → E plays Infect (attrition_swarm_infect_1) targeting 8 → E redeploys Leech (attrition_swarm_leech_1) to lane 1.
- **Swarm vs Attrition Swarm, game 2, seed 3302010768:** player won by hero lethal in 8 turns. Key sequence: E plays Grave Call (attrition_swarm_grave_call_1) → P plays Spitter (swarm_spitter_1) to lane 2 → P plays Alpha (swarm_alpha_1) to lane 3 → E plays Infect (attrition_swarm_infect_1) targeting 7 → E plays Carrier (attrition_swarm_carrier_1) to lane 2 → P plays Brood (swarm_brood_1) to lane 1 → P plays Swarm Attack (swarm_swarm_attack_1).
- **Tank vs Swarm, game 0, seed 1015008536:** player won by hero lethal in 8 turns. Key sequence: P plays Bruiser (tank_bruiser_1) to lane 3 → E plays Brood (swarm_brood_1) to lane 1 → E plays Alpha (swarm_alpha_1) to lane 2 → P plays Heavy (tank_heavy_1) to lane 2 → P plays Wall (tank_wall_1) to lane 1 → E plays Spitter (swarm_spitter_1) to lane 2 → E plays Grunt (swarm_grunt_1) to lane 2.
- **Tank vs Swarm, game 1, seed 2653308875:** enemy won by hero lethal in 9 turns. Key sequence: E plays Grunt (swarm_grunt_1) to lane 3 → P plays Bruiser (tank_bruiser_1) to lane 1 → P plays Guardian (tank_guardian_1) to lane 2 → E plays Spitter (swarm_spitter_1) to lane 1 → E plays Regrow (swarm_regrow_1) → P plays Reactive Plating (tank_repair_kit_1) targeting 7 → E plays Alpha (swarm_alpha_1) to lane 1.
- **Tank vs Swarm, game 2, seed 2028919226:** player won by hero lethal in 5 turns. Key sequence: E plays Rusher (swarm_rusher_1) to lane 2 → P plays Heavy (tank_heavy_1) to lane 3 → P plays Bruiser (tank_bruiser_1) to lane 1 → E plays Brood (swarm_brood_1) to lane 1 → E plays Swarm Attack (swarm_swarm_attack_1) → P plays Shieldbearer (tank_shieldbearer_1) to lane 2 → P plays Fortify (tank_fortify_1).
- **Swarm vs Tank, game 0, seed 1924272216:** player won by hero lethal in 7 turns. Key sequence: E plays Bruiser (tank_bruiser_1) to lane 1 → P plays Brood (swarm_brood_1) to lane 2 → P plays Alpha (swarm_alpha_1) to lane 3 → E plays Shieldbearer (tank_shieldbearer_1) to lane 2 → E plays Wall (tank_wall_1) to lane 2 → P plays Swarm Attack (swarm_swarm_attack_1) → P plays Grunt (swarm_grunt_1) to lane 1.
- **Swarm vs Tank, game 1, seed 3505101451:** enemy won by hero lethal in 9 turns. Key sequence: E plays Wall (tank_wall_1) to lane 1 → P plays Brood (swarm_brood_1) to lane 3 → P plays Grunt (swarm_grunt_1) to lane 2 → E redeploys Bruiser (tank_bruiser_1) to lane 1 → E plays Heavy (tank_heavy_1) to lane 2 → P plays Regrow (swarm_regrow_1) → P plays Spitter (swarm_spitter_1) to lane 2.
- **Swarm vs Tank, game 2, seed 908264698:** enemy won by hero lethal in 5 turns. Key sequence: P plays Brood (swarm_brood_1) to lane 3 → E plays Heavy (tank_heavy_1) to lane 2 → E plays Bruiser (tank_bruiser_1) to lane 1 → P plays Alpha (swarm_alpha_1) to lane 1 → P redeploys Rusher (swarm_rusher_1) to lane 3 → E plays Guardian (tank_guardian_1) to lane 3 → E plays Reinforce (tank_reinforce_1).
- **Attrition Swarm vs Swarm, game 0, seed 862796018:** no-progress HP tiebreak resolved at P 2 HP vs E 1 HP in 10 turns. Key sequence: E plays Brood (swarm_brood_1) to lane 3 → P plays Abomination (attrition_swarm_abomination_1) to lane 1 → P plays Carrier (attrition_swarm_carrier_1) to lane 2 → E plays Spitter (swarm_spitter_1) to lane 1 → E plays Rusher (swarm_rusher_1) to lane 1 → P redeploys Leech (attrition_swarm_leech_1) to lane 2 → P plays Carrier (attrition_swarm_carrier_1) to lane 1.
- **Attrition Swarm vs Swarm, game 1, seed 2436149793:** player won by hero lethal in 7 turns. Key sequence: P plays Grave Call (attrition_swarm_grave_call_1) → E plays Alpha (swarm_alpha_1) to lane 3 → E plays Spitter (swarm_spitter_1) to lane 1 → P plays Rotcaller (attrition_swarm_rotcaller_1) to lane 1 → P plays Carrier (attrition_swarm_carrier_1) to lane 3 → E plays Brood (swarm_brood_1) to lane 2 → E redeploys Rusher (swarm_rusher_1) to lane 2.
- **Attrition Swarm vs Swarm, game 2, seed 2013015120:** player won by hero lethal in 12 turns. Key sequence: P plays Abomination (attrition_swarm_abomination_1) to lane 2 → E plays Alpha (swarm_alpha_1) to lane 1 → E plays Brood (swarm_brood_1) to lane 3 → P plays Rotcaller (attrition_swarm_rotcaller_1) to lane 3 → P plays Carrier (attrition_swarm_carrier_1) to lane 1 → E plays Rusher (swarm_rusher_1) to lane 2 → E plays Grunt (swarm_grunt_1) to lane 2.
- **Swarm vs Wardens, game 0, seed 1487606116:** player won by hero lethal in 8 turns. Key sequence: E plays Sentinel (wardens_sentinel_1) to lane 1 → P plays Alpha (swarm_alpha_1) to lane 2 → P plays Spitter (swarm_spitter_1) to lane 3 → E plays Watch Captain (wardens_watch_captain_1) to lane 3 → E plays Halberdier (wardens_halberdier_1) to lane 3 → P plays Grunt (swarm_grunt_1) to lane 3 → P plays Rusher (swarm_rusher_1) to lane 3.
- **Swarm vs Wardens, game 1, seed 4210203575:** enemy won by hero lethal in 7 turns. Key sequence: E plays Sentinel (wardens_sentinel_1) to lane 3 → P plays Alpha (swarm_alpha_1) to lane 1 → P plays Brood (swarm_brood_1) to lane 2 → E plays Halberdier (wardens_halberdier_1) to lane 2 → E plays Brace (wardens_brace_1) targeting 2 → P plays Spitter (swarm_spitter_1) to lane 3 → P redeploys Rusher (swarm_rusher_1) to lane 2.
- **Swarm vs Wardens, game 2, seed 473564614:** enemy won by hero lethal in 5 turns. Key sequence: P plays Brood (swarm_brood_1) to lane 2 → E plays Sentinel (wardens_sentinel_1) to lane 1 → E plays Halberdier (wardens_halberdier_1) to lane 3 → P plays Spitter (swarm_spitter_1) to lane 3 → P plays Swarm Attack (swarm_swarm_attack_1) → E plays Bastion Guard (wardens_bastion_guard_1) to lane 3 → E redeploys Watch Captain (wardens_watch_captain_1) to lane 3.
- **Wardens vs Swarm, game 0, seed 1939875044:** player won by hero lethal in 8 turns. Key sequence: E plays Brood (swarm_brood_1) to lane 1 → P plays Halberdier (wardens_halberdier_1) to lane 3 → P plays Spearwall (wardens_spearwall_1) to lane 2 → E plays Alpha (swarm_alpha_1) to lane 3 → E plays Grunt (swarm_grunt_1) to lane 3 → P redeploys Sentinel (wardens_sentinel_1) to lane 2 → P plays Spearwall (wardens_spearwall_1) to lane 3.
- **Wardens vs Swarm, game 1, seed 3522801207:** player won by hero lethal in 8 turns. Key sequence: P plays Halberdier (wardens_halberdier_1) to lane 2 → E plays Spitter (swarm_spitter_1) to lane 2 → E plays Rusher (swarm_rusher_1) to lane 3 → P plays Watch Captain (wardens_watch_captain_1) to lane 1 → P plays Bastion Guard (wardens_bastion_guard_1) to lane 3 → E plays Swarm Attack (swarm_swarm_attack_1) → E plays Brood (swarm_brood_1) to lane 3.
- **Wardens vs Swarm, game 2, seed 925970502:** player won by hero lethal in 5 turns. Key sequence: P plays Sentinel (wardens_sentinel_1) to lane 3 → E plays Alpha (swarm_alpha_1) to lane 2 → E plays Grunt (swarm_grunt_1) to lane 1 → P plays Watch Captain (wardens_watch_captain_1) to lane 2 → P plays Bastion Guard (wardens_bastion_guard_1) to lane 1 → E plays Regrow (swarm_regrow_1) → E plays Flood (swarm_flood_1).
- **Control vs Tank, game 0, seed 1465320793:** enemy won by hero lethal in 6 turns. Key sequence: E plays Bruiser (tank_bruiser_1) to lane 2 → P plays Controller (control_controller_1) to lane 3 → P plays Disruptor (control_disruptor_1) to lane 1 → E plays Guardian (tank_guardian_1) to lane 3 → E plays Reactive Plating (tank_repair_kit_1) targeting 1 → P plays Hacker (control_hacker_1) to lane 2 → P plays Pulse Wave (control_pulse_wave_1).
- **Control vs Tank, game 1, seed 4111372170:** enemy won by hero lethal in 5 turns. Key sequence: P plays Controller (control_controller_1) to lane 1 → E plays Bruiser (tank_bruiser_1) to lane 3 → E plays Wall (tank_wall_1) to lane 1 → P plays Disruptor (control_disruptor_1) to lane 2 → P plays Pulse Wave (control_pulse_wave_1) → E plays Heavy (tank_heavy_1) to lane 1 → E plays Fortify (tank_fortify_1).
- **Control vs Tank, game 2, seed 331747835:** enemy won by hero lethal in 8 turns. Key sequence: E plays Bruiser (tank_bruiser_1) to lane 3 → P plays Sniper (control_sniper_1) to lane 2 → P plays Disruptor (control_disruptor_1) to lane 1 → E plays Heavy (tank_heavy_1) to lane 2 → E plays Guardian (tank_guardian_1) to lane 3 → P plays Hacker (control_hacker_1) to lane 2 → P plays Controller (control_controller_1) to lane 2.
- **Wardens vs Aggro, game 0, seed 2525799510:** player won by hero lethal in 4 turns. Key sequence: E plays Flanker (aggro_flanker_1) to lane 3 → P plays Sentinel (wardens_sentinel_1) to lane 2 → P plays Halberdier (wardens_halberdier_1) to lane 1 → E plays Adrenaline (aggro_adrenaline_1) targeting 2 → E redeploys Runner (aggro_runner_1) to lane 3 → P plays Bastion Guard (wardens_bastion_guard_1) to lane 3 → P plays Hold The Line (wardens_hold_the_line_1).
- **Wardens vs Aggro, game 1, seed 886386309:** enemy won by hero lethal in 2 turns. Key sequence: P plays Spearwall (wardens_spearwall_1) to lane 3 → E plays Runner (aggro_runner_1) to lane 2 → E plays Adrenaline (aggro_adrenaline_1) targeting 1 → P plays Watch Captain (wardens_watch_captain_1) to lane 1.
- **Wardens vs Aggro, game 2, seed 3525161204:** enemy won by hero lethal in 2 turns. Key sequence: P plays Sentinel (wardens_sentinel_1) to lane 2 → E plays Runner (aggro_runner_1) to lane 3 → E plays Adrenaline (aggro_adrenaline_1) targeting 2 → P plays Spearwall (wardens_spearwall_1) to lane 1.

## 5. Recommended balance changes (not implemented)

1. Prioritize severe ordered matchups first; do not tune around mirrors until asymmetric seats are within the 40–60% critical band.
2. For overperforming fast decks, reduce the most repeated open-lane damage/buff payoff by one point or add a stricter setup condition.
3. For underperforming decks, improve early-unit quality or mulligan-safe low-cost units before buffing late/stall tools.
4. For slow/stalling decks, reduce repeatable defensive friction, revive, or summon loops rather than raising the turn cap.
5. Re-run this exact report after each balance patch and compare matchup deltas before stacking additional changes.
