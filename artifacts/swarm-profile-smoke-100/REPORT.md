# Swarm alpha-width-v1 — Current Deck Smoke 100

## Configuration

Both variants used production Current Decks, seven dynamically discovered factions, all 49 ordered matchups, 100 games/matchup (4,900 games/variant), base seed `1337`, seeded Fisher–Yates decks, random-initial/alternating initiative, seeded-random exact-score ties, and production immediate-attack policy `standard-80-lethal-1200`. Only `swarmProfile` changed (`off` vs `alpha-width-v1`, window 80).

## Aggregate faction results

| Faction | Baseline non-draw WR | Profile non-draw WR | Delta pp | Baseline draw | Profile draw | Baseline avg turns | Profile avg turns |
|---|---:|---:|---:|---:|---:|---:|---:|
| Aggro | 51.3 | 51.1 | -0.2 | 18.4 | 18.1 | 4.22 | 4.22 |
| Tank | 51.9 | 51.9 | 0.0 | 7.9 | 8.0 | 6.63 | 6.62 |
| Control | 44.9 | 44.9 | 0.0 | 5.2 | 5.3 | 7.92 | 7.91 |
| **Swarm** | **44.5** | **45.7** | **+1.2** | **8.9** | **9.3** | **7.09** | **7.10** |
| Wardens | 50.1 | 49.7 | -0.4 | 10.9 | 11.1 | 6.15 | 6.16 |
| Attrition Swarm | 51.2 | 51.0 | -0.2 | 8.6 | 8.6 | 6.66 | 6.66 |
| Overclock | 56.6 | 56.4 | -0.2 | 12.9 | 13.1 | 5.17 | 5.17 |

Each faction has 1,400 seat appearances. Global results comprise 4,900 games. Swarm PASS changed 221→223; all-faction PASS changed 3,126→3,142. Immediate-threat changes remained 285 in each variant (7 ordinary-window, 278 possible-lethal-window); its tiny opportunity count difference, 2,335→2,334, is downstream of changed games, not policy interference.

## Swarm combined matchups (both seats)

| Opponent | Baseline Swarm W-L-D | Profile Swarm W-L-D | Non-draw WR delta pp | Draw delta pp | Avg-turn delta |
|---|---:|---:|---:|---:|---:|
| Aggro | 100-70-30 | 104-70-26 | +1.0 | -2.0 | +0.03 |
| Tank | 67-122-11 | 67-121-12 | -0.2 | +0.5 | -0.04 |
| Control | 113-74-13 | 113-73-14 | +0.4 | +0.5 | -0.04 |
| Wardens | 53-126-21 | 57-119-24 | +2.8 | +1.5 | +0.12 |
| Attrition Swarm | 79-109-12 | 82-105-13 | +1.9 | +0.5 | 0.00 |
| Overclock | 65-115-20 | 66-111-23 | +1.2 | +1.5 | -0.01 |

No combined matchup crossed the ±8 pp warning. Largest positive movement was Wardens (+2.8 pp); largest negative was Tank (-0.2 pp).

## Ordered seat results (Swarm win %, opponent win %, draw %)

| Ordered matchup | Baseline | Profile |
|---|---|---|
| Aggro→Swarm | 45 / 38 / 17 | 48 / 38 / 14 |
| Swarm→Aggro | 55 / 32 / 13 | 56 / 32 / 12 |
| Tank→Swarm | 35 / 60 / 5 | 35 / 60 / 5 |
| Swarm→Tank | 32 / 62 / 6 | 32 / 61 / 7 |
| Control→Swarm | 59 / 35 / 6 | 59 / 34 / 7 |
| Swarm→Control | 54 / 39 / 7 | 54 / 39 / 7 |
| Swarm→Swarm | 40 / 51 / 9 | 41 / 50 / 9 |
| Swarm→Wardens | 24 / 63 / 13 | 24 / 61 / 15 |
| Wardens→Swarm | 29 / 63 / 8 | 33 / 58 / 9 |
| Swarm→Attrition Swarm | 34 / 61 / 5 | 37 / 57 / 6 |
| Attrition Swarm→Swarm | 45 / 48 / 7 | 45 / 48 / 7 |
| Swarm→Overclock | 32 / 61 / 7 | 33 / 59 / 8 |
| Overclock→Swarm | 33 / 54 / 13 | 33 / 52 / 15 |

## Profile telemetry and review

* 9,911 Swarm decisions; 3,284 multi-action shortlist evaluations; 180 meaningful opportunities and 180 changes (1.8% of all decisions).
* Sacrificed base score: average 33.12, median 32.50, maximum 80 (the configured hard limit).
* Changed reasons: 61 formation, 106 width, 13 Alpha preservation. Twelve changed decisions converted a likely Alpha death to likely survival.
* Bypasses/unchanged: 6,295 outside-window, 3,104 base winner already preferred, 54 critical-policy precedence, 278 no meaningful difference.
* Alpha next-combat survival among decisions where Alpha remained present: 88.0%. Slot distribution stayed effectively flat (baseline 2,067/2,491/2,192 vs profile 2,066/2,495/2,182), providing no evidence of an unconditional center preference.
* Width telemetry recorded 174 immediate width increases. PASS remained close (+2 Swarm passes); game length was flat (+0.01 turns).
* Candidate diagnostics attached to every evaluated selected action retain the full shortlist, base scores, ranks, post-action Alpha metrics, and width metrics. The aggregate runner does not retain per-decision board snapshots, so this smoke artifact cannot honestly label individual changes as wins/losses or provide visual examples; focused deterministic tests cover selection invariants. A follow-up bounded sampler is warranted before promotion.
* No repeated movement/suspicious center skew appeared in aggregate slot/PASS telemetry. Maximum-window sacrifices occurred, so those cases deserve manual sample review. No profile decision overrode threat awareness; 54 evaluations explicitly reported critical precedence.

## Older baseline

No older report is used for causal attribution. The paired current-production baseline is authoritative. Broader faction movement versus historical reports could include immediate-threat awareness, zero-impact fixes, or other merged AI changes and must not be attributed to this profile.

## Recommendation

**KEEP EXPERIMENTAL / ADJUST WINDOW.** Quantitative warning thresholds are clear (1.8% decision change, +1.2 pp global Swarm non-draw WR, no >8 pp combined matchup movement), but promotion should wait for a bounded changed-decision snapshot sampler and manual review of max-window/losing-game decisions.
