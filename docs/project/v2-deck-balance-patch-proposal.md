# V2 Deck Balance Patch Proposal

Date: 2026-05-06
Source audit: `npm run simulate:battles -- --total=1000 1337`
Scope: card-only proposal; no new systems, Hero HP changes, deck size changes, or UI changes.

## Latest 1000-Game Audit Snapshot

The latest 1000-game seeded audit used shuffled decks, random initial initiative, alternating first actor after each completed turn, and the shared 50-turn remaining-hero-HP cap rule.

### Aggregate faction results

| Faction | Games | Win % | Draw % | Turn-cap % | Turn-cap win % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Aggro | 502 | 25.5 | 7.8 | 1.4 | 0.6 |
| Control | 502 | 51.4 | 3.4 | 1.0 | 0.0 |
| Swarm | 498 | 52.4 | 3.2 | 11.4 | 5.2 |
| Tank | 498 | 61.8 | 3.6 | 1.0 | 0.2 |

### Key matchup and pacing signals

| Signal | Audit result | Balance read |
| --- | ---: | --- |
| Aggro vs Swarm, both seats combined | Aggro won 11.5% of non-draw games sampled across the two seatings | Aggro pressure is not converting before Swarm refills lanes. |
| Aggro vs Tank, both seats combined | Aggro won 26.3% of non-draw games sampled across the two seatings | Tank durability is suppressing Aggro's intended clock. |
| Tank aggregate win rate | 61.8% | Tank is the only clearly overperforming aggregate faction. |
| Swarm vs Swarm turn-cap rate | 41.9% | The turn-cap HP rule prevents many true draws, but mirror pacing remains too slow. |
| Total draw rate | 4.5% | Draws are acceptable globally; the remaining issue is long Swarm mirrors rather than universal stall. |
| Non-Swarm turn-cap rate | 1.1% | Do not solve this with global rules; the fix should be card-local. |
| Aggro chip timeout win rate | 0.6% | Aggro is not winning by slow HP tiebreaks; it needs earlier combat conversion. |

## 1. Root Cause Analysis

### Must fix now

1. **Aggro has too many low-impact cards for a faction that must end games early.** Runner, Striker, Glass Cannon, and Full Attack carry most of the proactive identity, but Scout's lane-play block is narrow and Quick Fix spends a card on a defensive heal that does not reliably convert into lethal pressure. That leaves Aggro behind once opponents establish any refill or durability loop.
2. **Tank's non-attacking stall tools are doing too much aggregate work.** Tank should be durable, but a 0-attack Wall with 4 HP is converting too many turns into safe stabilization, especially against Aggro's fragile units. The Tank audit result is high without needing more system-level changes.
3. **Swarm mirrors are paced by refill density, not by unresolved draw rules.** The remaining-HP turn cap reduced true mirror draws, but Flood still adds too much replacement board material in a mirror where both sides already have Spawn, Regrow, Brood death replacement, and Recycle.

### Watch later

- **Control is not a must-fix target.** Control is close to the desired band overall and has only a mild seat-sensitive advantage in Control mirrors; changing Control now risks masking the Aggro/Tank/Swarm signals.
- **Tank sustain cards may still need attention after Wall is reduced.** Repair Kit and Reinforce are watch-list cards, but nerfing sustain and Wall together may overcorrect Tank before a new audit confirms whether the Wall change is sufficient.
- **Swarm vs Tank may become fragile if Flood is reduced too far.** Tank already beats Swarm heavily, so the next audit must verify that Swarm does not collapse in that matchup.

## 2. Proposed Card Changes

This proposal uses exactly four card changes. They are intentionally small, card-local, and aimed at weak/decorative or stall-heavy cards rather than replacing faction identities.

### Must fix now

| # | Faction | Card | Current | Proposed | Reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | Aggro | Scout | `1/1`, blocks enemy unit play in this lane this turn | `2/1`, same lane-block text/effect | Turns a narrow tactical card into real pressure while preserving the disruptive raider identity. |
| 2 | Aggro | Quick Fix | Heal a friendly unit 2; it gets +1 ATK this turn | Heal a friendly unit 1; it gets +2 ATK this turn | Reworks a decorative defensive utility into an Aggro tempo finisher without adding a new UI or changing deck size. |
| 3 | Tank | Wall | `0/4`, cannot attack | `0/3`, cannot attack | Reduces Tank's passive stall ceiling while preserving the literal wall identity and non-attacking role. |
| 4 | Swarm | Flood | Summon up to 2 Grunts/Tokens in empty friendly slots | Summon up to 1 Grunt/Token in an empty friendly slot | Cuts the mirror's largest burst refill lever without touching Spawn, Regrow, Brood, or Alpha identity. |

### Watch later, not in v2 patch

| Faction | Card | Potential future action | Why not now |
| --- | --- | --- | --- |
| Tank | Repair Kit | Heal 3 -> Heal 2 | Only if Tank remains above target after Wall loses 1 HP; doing both immediately may overcorrect Tank vs Control and Swarm. |
| Tank | Reinforce | Heal all 1 -> narrower heal target | Same sustain concern as Repair Kit; keep Tank's team durability identity until Wall data returns. |
| Swarm | Swarm Attack | +1 ATK -> conditional mirror accelerant | Buffing Swarm Attack would speed mirrors but risks worsening Aggro's already poor Swarm matchup. |
| Control | Jam Signal / Pulse Wave | No change | Control is not the current outlier and should be left as a stable reference faction. |

## 3. Expected Impact Per Faction

### Aggro

- **Improves viability immediately** by giving Scout enough attack to matter and by making Quick Fix a burst/tempo card instead of a mostly defensive patch.
- Expected to raise Aggro's aggregate win rate from the mid-20s toward the low-to-mid 30s in the next audit, with the largest gains against Tank and Control.
- Should improve Aggro's ability to punish empty lanes and finish before Swarm/Tank refill loops become decisive.

### Tank

- **Reduces overperformance without deleting identity.** Wall remains a non-attacking blocker, but 3 HP should create more realistic breakpoints for 2-attack Aggro units, Full Attack turns, Pulse Wave follow-up, and Swarm boards.
- Expected to move Tank down from the low 60s aggregate toward the mid-to-high 50s. If Tank remains above target after this, Repair Kit is the next sustain knob.

### Swarm

- **Improves mirror pacing** by reducing Flood's maximum refill from two bodies to one body.
- Expected to lower Swarm mirror turn-cap frequency materially while preserving Swarm's identity through Spawn, Brood, Regrow, Alpha, and normal cheap units.
- Expected side effect: Swarm loses some cushion against Tank and some overwhelming board refill against Aggro. This is acceptable only if Swarm remains broadly viable.

### Control

- No direct card changes.
- Control becomes the reference midpoint for the next audit. Its matchup into the buffed Aggro should tighten, and its matchup into nerfed Tank may improve slightly.

## 4. Risk of Overcorrection

| Risk | Severity | What would indicate overcorrection | Mitigation |
| --- | --- | --- | --- |
| Aggro burst becomes too swingy | Medium | Aggro mirrors fall below 5 average turns or Aggro vs Control jumps above 50% in both seats | Revert Quick Fix to +1 ATK before reverting Scout. |
| Tank drops too far vs Control or Swarm | Medium | Tank aggregate falls below 48% or Tank vs Control drops below 42% in both seats | Restore Wall to 4 HP or instead test Repair Kit as the sustain knob. |
| Swarm loses all resilience into Tank | High | Swarm vs Tank falls below 15% in both seats, or Swarm aggregate falls below 45% | Restore Flood to 2 summons and pursue a mirror-only lethality buff later. |
| Swarm mirror still reaches the cap too often | Medium | Swarm mirror turn-cap remains above 30% | Watch Recycle/Flood sequencing and consider a future card-local Recycle draw reduction. |
| Scout invalidates lane play too often | Low | Cancelled/pass rates spike due to blocked lanes and Aggro gains mostly by denied actions, not damage | Keep Scout at 2/1 but shorten or replace lane-block text in a later card-only pass. |

## 5. Metrics To Verify In Next 1000-Game Run

Run the same audit command after implementing the four card changes:

```sh
npm run simulate:battles -- --total=1000 1337
```

Primary pass/fail metrics:

1. **Aggro aggregate win rate:** target at least 33%; investigate if still below 30%.
2. **Tank aggregate win rate:** target below 58%; investigate if still at or above 60%.
3. **Swarm mirror turn-cap rate:** target below 25%; investigate if still above 30%.
4. **Swarm aggregate win rate:** keep at least 45%; revert or soften Flood nerf if below 45%.
5. **Aggro vs Swarm, both seats:** target meaningful improvement from the current 11.5% non-draw combined Aggro share; investigate if still below 28%.
6. **Aggro vs Tank, both seats:** target meaningful improvement from the current 26.3% non-draw combined Aggro share; investigate if still below 32%.
7. **Global draw rate:** keep below 7%; do not accept lower win-rate spread by reintroducing draw/stall problems.
8. **Average turns by matchup:** confirm Aggro mirrors do not become ultra-short and Swarm mirrors actually shorten.
9. **PASS/cancelled counts:** compare with the latest audit's 3861 pass and 89 cancelled actions to ensure Scout changes are not creating action-denial artifacts.
10. **Seat spread:** review both directional rows for every changed faction pair; do not judge only aggregate faction win rate.
