# Wardens Move-Lock Balance Lab — 2026-06-27

Mode: balance experiment only. Production faction JSON was not edited; the simulator applies temporary in-memory card overrides only when `--balance-lab=wardens-movelock` is passed.

## Temporary experiment overrides

- `wardens_brace_1` / Bone Shields: `targeting: none`, `effectId: grave_call`, with an effectVariant that skips the base effect and summons a temporary `bone_shields` token into the first empty owner slot with `tokenStats: 0/0/1`.
- `wardens_reinforce_line_1` / Reinforce Line: `targeting: none`, reuses existing effectId `friendly_immovable_this_turn`, text `Allied units cannot move until combat.`
- `wardens_hold_the_line_1` / Hold The Line: unchanged.
- `swarm_rusher_1` / Lichencrawler: `2/1/0`, `combatKeywords: ["ignoreArmor"]`, text `This unit ignores [ARM].`
- `swarm_grunt_1` / Grunt: HP increased from 1 to 2 for this experiment.

## Run setup

- Current experiment command: `node scripts/simulate-battles.mjs 100 1337 --telemetry=all --balance-lab=wardens-movelock --only='Swarm:Aggro,Swarm:Tank,Swarm:Control,Swarm:Wardens,Swarm:Attrition Swarm,Wardens:Aggro,Wardens:Tank,Wardens:Control,Wardens:Swarm,Wardens:Attrition Swarm'`
- Previous Crawler-only ignoreArmor comparison command: `node scripts/simulate-battles.mjs 100 1337 --telemetry=all --balance-lab=crawler-ignorearmor --only='Swarm:Aggro,Swarm:Tank,Swarm:Control,Swarm:Wardens,Swarm:Attrition Swarm,Wardens:Aggro,Wardens:Tank,Wardens:Control,Wardens:Swarm,Wardens:Attrition Swarm'`
- Each listed ordered matchup ran 100 games with seed `1337` and `telemetry=all`.

## Acceptance smoke results

| Check | Result |
| --- | ---: |
| Invalid actions | 0 |
| Crashes | 0 |
| Bone Shields token stats | 0/0/1 |
| Bone Shields summons | 398 |
| Reinforce Line played | 11 |
| Existing move-lock effect applied / played (`friendly_immovable_this_turn`) | 23 total uses, including Stand Firm |
| Lichencrawler played normally | 570 plays |
| Grunt HP 2 in experiment | Confirmed by in-memory override; Grunt drew 566 times and played 570 times |

## Comparison against previous Crawler-only ignoreArmor smoke

| Metric | Previous | Current | Delta |
| --- | ---: | ---: | ---: |
| Swarm global non-draw WR | 44.2% | 46.5% | +2.3 pp |
| Swarm vs Wardens non-draw WR | 34.7% | 30.8% | -3.9 pp |
| Swarm vs Tank non-draw WR | 29.9% | 30.6% | +0.7 pp |
| Wardens global non-draw WR | 53.5% | 57.5% | +4.0 pp |
| Wardens vs Aggro non-draw WR | 40.4% | 40.0% | -0.4 pp |
| Wardens vs Control non-draw WR | 42.4% | 45.0% | +2.6 pp |
| Wardens vs Swarm non-draw WR | 65.3% | 69.2% | +3.9 pp |

## Card telemetry focus

| Card | Previous | Current | Notes |
| --- | ---: | ---: | --- |
| Reinforce Line | 117 plays, 70.1% WR when played | 11 plays, 36.4% WR when played | Reusing `friendly_immovable_this_turn` made it much less attractive to AI than the old adjacent ARM setup. |
| Hold The Line | 113 plays, 74.3% WR when played | 109 plays, 74.3% WR when played | Left unchanged; play profile stayed effectively stable. |
| Lichencrawler / Rusher | 585 plays, 29.4% WR when played | 570 plays, 41.2% WR when played | Played normally in both runs. |
| Grunt | 508 plays, 42.3% WR when played | 570 plays, 45.4% WR when played | HP 2 version saw more play and a modest played-WR lift. |

## Readout

The Wardens package became stronger overall in the focused smoke, rising from 53.5% to 57.5% non-draw WR across the sampled Wardens seats. The main matchup movement is Wardens gaining further into Swarm, while Swarm's global sample still improves because Grunt HP 2 helps outside the Wardens pairing. Reinforce Line itself was played far less often after moving from adjacent ARM to the existing move-lock effect, so the Wardens lift appears more tied to Bone Shields token bodies plus Grunt/Rusher context than to Reinforce Line carrying games directly.
