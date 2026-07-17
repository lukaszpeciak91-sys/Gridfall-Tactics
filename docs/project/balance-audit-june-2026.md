---
status: HISTORY
active_state: balance-context
---

# Gridfall Balance Audit — Executive Summary (June 2026)

## Status

- The AI audit phase is largely complete.
- Previously suspected AI issues were investigated and either fixed or reclassified as card-design / matchup-structure issues.
- Confirmed AI improvements: Flood valuation, Spawn review, Last Stand valuation, Stability valuation, and hidden-information removal from Stability logic.
- Current telemetry has no invalid-action or crash patterns.
- Current conclusion: remaining balance concerns are primarily matchup and faction-identity problems, not major AI failures.

## Current problematic matchups

### Tank vs Swarm

- Repeated result: roughly **64–68% Tank WR**.
- Root cause: Tank's durability shell suppresses Swarm's fragile board-presence strategy.
- Main pattern: Guardian + Shieldbearer + Heavy/Bruiser lets Tank keep medium boards while Swarm bodies fail to stick.
- Classification: **multi-card synergy / faction-identity issue**, not a single overpowered card.
- Safest future experiment slot if adjustment is needed: **Swarm — Substrate**.

### Aggro vs Tank

- Repeated result: roughly **60–62% Aggro WR**.
- Root cause: Aggro wins through early open-lane pressure before Tank's defensive orders become relevant.
- Runner is the strongest single-card leverage point, but the imbalance comes from the broader Aggro burst package rather than Runner alone.
- Classification: **burst-shell vs slow-stabilization matchup issue**.
- Safest future experiment slot if adjustment is needed: **Tank — Fortify**.

### Control vs Swarm

- Repeated result: roughly **64% Swarm WR** in focused runs.
- Pulse Wave usually performs its intended clear role; it is found and played often.
- Root cause: Control creates temporary clear windows but often fails to convert them into pressure before Swarm rebuilds.
- Primary causes: Swarm rebuild efficiency, Control's weak post-clear follow-up pressure, and faction identity mismatch.
- Classification: **follow-up-pressure / faction-identity issue**, not Pulse Wave AI misuse.
- Safest future experiment slots if adjustment is needed: **Control — Recall**, then **Swap**, then **Controller**.

## Cards cleared of major AI suspicion

These cards may still be future redesign candidates, but not because of obvious AI misuse:

- Flood
- Spawn
- Last Stand
- Stability
- Feast
- Funeral Pyre
- Swarm Attack

## Safest future redesign slots

These are not redesign recommendations. They are the lowest-collateral places to test if future balance changes become necessary.

| Faction | Safer slots | Why |
|---|---|---|
| Control | Recall, Swap, Controller | Flexible slots for post-clear pressure; avoid buffing Pulse Wave or nerfing Swarm. |
| Tank | Fortify | Defensive-order slot to help Tank survive Aggro without nerfing Aggro's core identity. |
| Swarm | Substrate | Flexible utility slot to help into durable boards without touching Swarm's core rebuild/payoff engine. |

## Campaign considerations

Current campaign concept:

- Player selects one faction.
- Campaign consists of defeating the remaining factions.
- No between-battle power growth is required.
- Multiple campaign attempts are allowed.

Because the campaign is short and battles average roughly one minute, large permanent progression rewards may distort faction balance more than they help.

Potential low-risk campaign mitigations:

- Multiple campaign attempts.
- Curated opponent ordering.
- Put the chosen faction's hardest matchup later in the campaign.

Campaign viability should be evaluated separately from PvP balance. AI parity does not automatically guarantee campaign fairness.

## Current project position

The project has moved beyond broad AI validation and into matchup / faction tuning.

Next balance phase should focus on:

1. Campaign viability.
2. Matchup severity.
3. Faction identity preservation.
4. Narrow, low-collateral redesign experiments only if needed.

## AI-vs-AI Balance Lab interpretation update (2026-07-15)

After the AI Competent v1 / combat-swing scoring work, Balance Lab should be read as **AI-vs-AI smoke coverage**, not as absolute human-balance truth.

- Keep AI Competent v1 as the current simulator/runtime AI baseline.
- Do not add deck-awareness now; setup/held-card concerns are real, but the smallest future AI improvement should be narrow hold/setup assistance rather than a broad deck-planning system.
- Treat AI campaign smoke as diagnostic. Low AI-only campaign clear rates are not enough, by themselves, to prove the player campaign is unfair.
- Keep current player campaign attempts at 3. The 4-attempt campaign variant improved AI-only completion substantially, but remains a diagnostic variant rather than a production campaign rule.
- Do not rebalance Swarm or Attrition Swarm purely from AI-vs-AI campaign/smoke results without manual sanity testing.

### AI piloting interpretation

- Setup-heavy factions, especially Swarm and Attrition Swarm, may be underplayed by the current AI because their strongest lines depend on holding cards, sequencing setup into payoff, and preserving delayed-value resources.
- Straightforward pressure, control, and durable-body plans are represented more accurately because their value is visible to immediate board/hand/action scoring.
- Balance Lab results are therefore more trustworthy for direct pressure/control/body factions and more pessimistic for setup-heavy or sacrifice/revive sequencing factions.

### Manual campaign sanity notes

Manual sanity checks can override panic caused by AI-only campaign results:

- Swarm campaign was cleared by a human on the first full campaign run under current 3-attempt rules.
- Tank vs Aggro was won manually on the third attempt; the first two attempts were close, suggesting difficult but fair.
- Aggro vs Control was won manually on the second attempt; the first attempt was close and affected by player decision-making.

These checks suggest the current 3-attempt player campaign remains plausible/fair despite harsh AI-only campaign smoke. The project should not convert player campaign attempts from 3 to 4 unless manual testing also shows that 3 attempts is unfair.

## AI placement baseline update (2026-07-17)

The current AI placement behavior is accepted. Exact-score placement ties no longer fall through to the first generated slot; they use deterministic seeded selection. Ally-adjacency formation units now receive positional formation scoring, so Swarm Alpha prefers the middle slot on an otherwise equal empty board because it has two adjacency opportunities. Gap Hunter (`empty_adjacent_bonus_atk`) is excluded from ally-formation scoring and uses normal tactical scoring plus seeded tie-breaking. No generic center preference was added, and slot mapping remains unchanged: enemy `[0,1,2]`, player `[6,7,8]`.

Diagnostics and regression coverage were added for opening placement, tie-breaking, Alpha, Gap Hunter, and slot mapping. The current implementation was validated with 0 invalid actions, 0 crashes, stable pacing, and no first-slot-only behavior.

Accepted 100-match seed-1337 AI baseline for future balance comparisons:

| Faction | Non-draw WR |
|---|---:|
| Aggro | 53.3% |
| Tank | 47.0% |
| Control | 50.7% |
| Swarm | 43.4% |
| Wardens | 50.9% |
| Attrition Swarm | 50.4% |
| Overclock | 54.4% |

All factions remain within the accepted global 40–60% band. This run becomes the new baseline for future balance comparisons; older balance reports from before the placement/tie-break change should not be treated as directly comparable.
