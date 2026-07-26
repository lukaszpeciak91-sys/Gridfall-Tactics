# Control Sniper follow-up validation

## Paired Smoke 100

Both runs used `node scripts/simulate-battles.mjs 100`, seed 1337, the same 49 ordered matchups, shuffled decks, alternating seeded initiative, and the same codebase/settings other than Sniper. The old run used parent commit `3dd79b7`; the new run used the follow-up working tree.

| Control result | Old global-route Sniper | New deploy-shot Sniper | Delta |
|---|---:|---:|---:|
| All-games WR | 25.9% | 45.9% | +20.0 pp |
| Non-draw WR / campaign estimate | 27.6% | 49.8% | +22.2 pp |
| Draw rate | 6.1% | 7.7% | +1.6 pp |
| Average turns | 7.80 | 6.85 | -0.95 |

### Paired faction meta table

Ranks use aggregate non-draw WR; Control and Attrition Swarm are tied for fourth after the rework. Each “largest matchup shift” is the faction's non-draw WR change in its most affected combined-seat matchup.

| Faction | All-games WR old → new (Δ) | Non-draw WR old → new (Δ) | Draw rate old → new (Δ) | Rank before → after | Largest matchup shift |
|---|---:|---:|---:|---:|---|
| Aggro | 45.4% → 41.4% (-4.0 pp) | 55.8% → 51.5% (-4.3 pp) | 18.6% → 19.7% (+1.1 pp) | 2 → 3 | vs Control: -27.8 pp |
| Tank | 50.8% → 48.3% (-2.5 pp) | 55.2% → 52.7% (-2.5 pp) | 7.9% → 8.4% (+0.5 pp) | 3 → 2 | vs Control: -16.0 pp |
| Control | 25.9% → 45.9% (+20.0 pp) | 27.6% → 49.8% (+22.2 pp) | 6.1% → 7.7% (+1.6 pp) | 7 → T-4 | vs Attrition Swarm: +34.5 pp |
| Swarm | 42.4% → 38.8% (-3.6 pp) | 46.4% → 42.7% (-3.7 pp) | 8.8% → 9.2% (+0.4 pp) | 6 → 7 | vs Control: -24.9 pp |
| Wardens | 47.9% → 43.9% (-4.0 pp) | 53.9% → 49.4% (-4.5 pp) | 11.3% → 11.1% (-0.2 pp) | 5 → 6 | vs Control: -29.3 pp |
| Attrition Swarm | 50.0% → 45.3% (-4.7 pp) | 54.9% → 49.8% (-5.1 pp) | 8.9% → 9.0% (+0.1 pp) | 4 → T-4 | vs Control: -34.5 pp |
| Overclock | 50.4% → 47.3% (-3.1 pp) | 57.9% → 54.4% (-3.5 pp) | 13.1% → 13.1% (0.0 pp) | 1 → 1 | vs Control: -22.3 pp |

- **Strongest before / after:** Overclock remained strongest by non-draw WR, moving from 57.9% to 54.4%.
- **Weakest before / after:** Control was weakest before at 27.6%; Swarm was weakest after at 42.7%.
- **Highest-to-lowest non-draw spread:** 30.3 pp before (57.9% minus 27.6%) and 11.7 pp after (54.4% minus 42.7%), an 18.6 pp contraction.
- **Non-Control global movement over 3 pp:** yes. By non-draw WR, Aggro (-4.3 pp), Swarm (-3.7 pp), Wardens (-4.5 pp), Attrition Swarm (-5.1 pp), and Overclock (-3.5 pp) moved by more than 3 pp; Tank (-2.5 pp) did not. These global changes are dilution effects from each faction's two ordered Control matchups—the other non-Control pairings are identical between runs.

### Control matchup table (combined seats)

| Opponent | Old all-games WR | New all-games WR | Delta | Old non-draw WR | New non-draw WR | Delta |
|---|---:|---:|---:|---:|---:|---:|
| Aggro | 22.5% | 43.0% | +20.5 pp | 25.3% | 53.1% | +27.8 pp |
| Tank | 16.0% | 30.5% | +14.5 pp | 16.6% | 32.6% | +16.0 pp |
| Swarm | 25.5% | 47.5% | +22.0 pp | 27.0% | 51.9% | +24.9 pp |
| Wardens | 31.5% | 60.0% | +28.5 pp | 33.2% | 62.5% | +29.3 pp |
| Attrition Swarm | 22.0% | 54.0% | +32.0 pp | 23.3% | 57.8% | +34.5 pp |
| Overclock | 17.5% | 38.5% | +21.0 pp | 18.4% | 40.7% | +22.3 pp |

Largest shifts are Attrition Swarm, Wardens, and Aggro. Despite the large improvement over the weak old fixed-seed baseline, the new Control aggregate is essentially neutral at 49.8% non-draw WR. No stat or damage tuning is warranted from Smoke 100.

The new run recorded 0 invalid actions, 0 crashes, and 0 turn-cap games.

## Target decision samples

With the same lane placement and a choice between killing a 1 HP / 0 ATK trivial unit or dealing 2 to a 3 HP / 6 ATK unit, scores were **6150** and **6608** respectively: the tactically superior nonlethal shot won. The sole target-ranking component appeared once (`precisionShotTargetValue`: 100 vs 2300); generic kill valuation appeared once only on the lethal action.

With two lethal targets (2 HP / 1 ATK and 2 HP / 6 ATK), scores were **7508** and **10258**. Existing pressure changes plus the single target-value component rank the valuable lethal above the trivial lethal. There is no separate `precisionShotLethal` component and therefore no duplicate removal bonus.

## Exact semantics

- **Zero targets:** deploying Sniper is legal. AI produces the three normal lane-placement candidates with no target payload. Player UI does not enter targeting when no enemy unit exists; the deployed 2/1 remains and the spent action completes without a shot.
- **Cancellation:** once Sniper is deployed and targeting begins, cancellation uses the existing unit-on-play finalization path. It does not refund the card/action or remove Sniper; no damage is dealt.
- **Damage:** the shot uses current direct unit damage, so it subtracts exactly 2 HP and ignores armor. Last Stand-style minimum-1 protection still applies through the shared damage helper.
- **Targets:** only occupied enemy-unit board indexes are legal. Friendly, empty, and base-like targets are rejected; hero HP cannot be changed by the deploy resolver.
- **Cleanup:** lethal damage enters the normal HP-death cleanup once, records Fallen once, and executes current universal death triggers once.
- **Combat/presentation:** Sniper subsequently attacks only its opposing lane. Its beam presentation remains presentation-only; standard threat output has no Sniper-specific schema.

## Initial failing-test inventory and disposition

| Failing legacy coverage | Disposition |
|---|---|
| Nine `gameState.combatEvents` tests for lowest-HP, ATK ties, off-lane attacks, and off-lane cleanup | Removed obsolete routing assertions; deploy cleanup/death-trigger coverage moved to `controlSniperRework`, while generic frozen-plan/death-wave tests remain neutral. |
| Combined combat-modifier test's Sniper retarget modifier | Removed only the deleted `LOWEST HP` modifier section; Halberdier, Flanker, Runner, Pierce, and Guardian coverage remains. |
| Two `gameState.standardCombatSnapshot` tests using Sniper as an off-lane fixture | Converted to neutral same-lane attackers, preserving frozen entitlement, summon timing, and non-retargeting coverage. |
| Six `standardCombatThreat` Sniper prediction/routing tests | Replaced with neutral armor, lethality, open-lane, blocking, canonical-plan, and deleted-schema assertions. |
| Beam readability off-lane probe | Converted to ordinary opposing-lane beam probes for both owners. |
| AI decision-history Sniper fields | Converted to generic compact combat-prediction persistence plus an assertion that no Sniper keys survive. |
| Controller source-shape targeting assertion | Updated to recognize both supported unit-on-play targeted effects while retaining the Hacker non-targeting guard. |

No test was skipped or blanket-disabled. Final `npm test`: 1675 passed, 0 failed, 0 skipped.

## Dead-code audit

Runtime search confirms there are no remaining `can_hit_any_lane`, `findSniper*`, `globalSniperRoute`, `sniperAttacks`, `sniperDiagnostics`, `selectedSniperTarget*`, or Sniper-specific decision-history fields under `src/` or `scripts/`.
