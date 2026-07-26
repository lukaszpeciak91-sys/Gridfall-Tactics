# Control Sniper production sign-off

## Promotion provenance

- Validated source commits: `cbdb7e5` and `19c4451`.
- Production promotion merge: `cd5d648`.
- Scope: Control Sniper only. The promotion does not retune another Control card.

## Production copy

| Locale | Copy |
| --- | --- |
| English | `On deploy choose any [ENEMY] and deal damage` |
| Polish | `Po wystawieniu wybierz dowolnego [ENEMY] i zadaj obrażenia` |

`[ENEMY]` renders as the singular enemy-unit icon. Both strings describe one chosen
enemy unit and exactly 2 damage.

## Locked behavior

- Stats remain 2 ATK / 1 HP, with no armor.
- Deployment accepts one enemy unit and no other target kind. Friendly, empty, and
  base targets are invalid.
- Deployment with no enemy units is legal and resolves without a shot.
- Canceling the targeting session does not refund the card or action; the deployed
  Sniper remains in its lane.
- The precision shot deals exactly 2 direct damage, using the shared armor-ignoring
  direct-unit-damage rule.
- The shot presents one beam from the deployed Sniper to the selected target. Damage,
  lethal cleanup, Fallen bookkeeping, and universal death triggers resolve once.
- Later combat uses the ordinary opposing-lane combat plan. No global/off-lane Sniper
  targeting or Sniper-specific threat diagnostics remain.
- AI candidates enumerate every occupied enemy slot. Candidate simulation and runtime
  resolution use the same target index, and the validated target valuation is unchanged.

## Mobile scenario verification

At the portrait-mobile gameplay contract (390 x 844), the production path was checked
against all required states:

- **Lethal shot:** 2 HP target removed once; Fallen and death triggers recorded once.
- **Nonlethal shot:** target loses exactly 2 HP and remains on the board.
- **Armor target:** target loses exactly 2 HP; armor does not reduce direct damage.
- **No-target deploy:** Sniper deploys as a 2/1 without entering target selection.
- **Cancellation:** Sniper remains deployed; hand cost and action stay spent; no shot occurs.
- **Later normal combat:** beam attacker follows the frozen ordinary opposing-lane route.

The targeting interaction uses the existing mobile board hit areas and targeting banner;
the rework leaves layout and touch geometry unchanged.

## Production gates

- `node --test tests/controlSniperRework.test.mjs tests/battleScene.targetingSessionEntry.test.mjs tests/battleScene.beamAttackReadability.test.mjs tests/standardCombatThreat.test.mjs tests/aiDecisionHistory.test.mjs tests/cardTextFormatting.test.mjs tests/localizationDictionaries.test.mjs`
- `npm test`
- `npm run build`
