# BASELINE AI v2

_Post Situational Valuation Merge_

This report is the first official AI telemetry baseline after the Situational AI Valuation merge. Future AI work must be compared against this baseline.

## Run Configuration

- Command: `node scripts/simulate-battles.mjs 100 424242 --telemetry=all`
- Date captured: 2026-06-07
- Base seed: `424242`
- Games per ordered matchup: `100`
- Total games: `3600`
- Max turns: `24`
- Deck policy: seeded Fisher-Yates shuffle per game
- First actor policy: seeded random initial actor, then alternating after each full turn
- Tie-break policy: seeded random

## 1. Global Health

| Metric | Count | Rate |
|---|---:|---:|
| Invalid actions | 0 | 0.00 per game |
| Crashes | 0 | 0.0% |
| Draw rate | 88 / 3600 | 2.4% |
| Turn-cap rate | 6 / 3600 | 0.2% |
| No-progress rate | 32 / 3600 | 0.9% |
| Total PASS count | 1286 | — |

## 2. Per-Faction Summary

| Faction | Games | WR | Non-draw WR | Avg turns | PASS count | PASS rate | Avg hand at defeat |
|---|---:|---:|---:|---:|---:|---:|---:|
| Aggro | 1200 | 50.6% | 52.3% | 4.26 | 47 | 0.9% | 3.31 |
| Tank | 1200 | 49.7% | 51.1% | 6.85 | 187 | 2.3% | 2.75 |
| Control | 1200 | 49.6% | 50.3% | 7.99 | 535 | 5.6% | 2.67 |
| Swarm | 1200 | 42.5% | 43.7% | 7.20 | 145 | 1.7% | 2.68 |
| Wardens | 1200 | 47.6% | 48.5% | 6.24 | 249 | 3.3% | 3.25 |
| Attrition Swarm | 1200 | 52.8% | 54.2% | 7.08 | 123 | 1.4% | 2.70 |

## 3. Ordered Matchup Matrix

Each row is ordered as `Player faction` into `Enemy faction`.

| Player faction | Enemy faction | Games | Player WR | Enemy WR | Draw | Avg turns |
|---|---|---:|---:|---:|---:|---:|
| Aggro | Aggro | 100 | 42.0% | 48.0% | 10.0% | 2.78 |
| Aggro | Tank | 100 | 60.0% | 37.0% | 3.0% | 4.18 |
| Aggro | Control | 100 | 48.0% | 52.0% | 0.0% | 5.58 |
| Aggro | Swarm | 100 | 58.0% | 38.0% | 4.0% | 4.61 |
| Aggro | Wardens | 100 | 62.0% | 37.0% | 1.0% | 3.68 |
| Aggro | Attrition Swarm | 100 | 38.0% | 60.0% | 2.0% | 4.65 |
| Tank | Aggro | 100 | 29.0% | 67.0% | 4.0% | 3.98 |
| Tank | Tank | 100 | 44.0% | 52.0% | 4.0% | 7.26 |
| Tank | Control | 100 | 62.0% | 37.0% | 1.0% | 7.89 |
| Tank | Swarm | 100 | 68.0% | 30.0% | 2.0% | 7.32 |
| Tank | Wardens | 100 | 38.0% | 61.0% | 1.0% | 6.69 |
| Tank | Attrition Swarm | 100 | 54.0% | 45.0% | 1.0% | 7.66 |
| Control | Aggro | 100 | 59.0% | 40.0% | 1.0% | 5.76 |
| Control | Tank | 100 | 45.0% | 54.0% | 1.0% | 7.83 |
| Control | Control | 100 | 54.0% | 44.0% | 2.0% | 10.49 |
| Control | Swarm | 100 | 42.0% | 56.0% | 2.0% | 8.49 |
| Control | Wardens | 100 | 61.0% | 37.0% | 2.0% | 7.17 |
| Control | Attrition Swarm | 100 | 43.0% | 55.0% | 2.0% | 7.97 |
| Swarm | Aggro | 100 | 57.0% | 40.0% | 3.0% | 4.79 |
| Swarm | Tank | 100 | 40.0% | 59.0% | 1.0% | 7.50 |
| Swarm | Control | 100 | 53.0% | 43.0% | 4.0% | 8.85 |
| Swarm | Swarm | 100 | 45.0% | 52.0% | 3.0% | 8.12 |
| Swarm | Wardens | 100 | 36.0% | 62.0% | 2.0% | 6.70 |
| Swarm | Attrition Swarm | 100 | 32.0% | 62.0% | 6.0% | 7.71 |
| Wardens | Aggro | 100 | 44.0% | 55.0% | 1.0% | 3.79 |
| Wardens | Tank | 100 | 44.0% | 51.0% | 5.0% | 6.84 |
| Wardens | Control | 100 | 30.0% | 70.0% | 0.0% | 7.25 |
| Wardens | Swarm | 100 | 65.0% | 34.0% | 1.0% | 6.52 |
| Wardens | Wardens | 100 | 45.0% | 54.0% | 1.0% | 6.16 |
| Wardens | Attrition Swarm | 100 | 43.0% | 53.0% | 4.0% | 6.85 |
| Attrition Swarm | Aggro | 100 | 51.0% | 49.0% | 0.0% | 4.60 |
| Attrition Swarm | Tank | 100 | 46.0% | 48.0% | 6.0% | 7.74 |
| Attrition Swarm | Control | 100 | 55.0% | 45.0% | 0.0% | 8.14 |
| Attrition Swarm | Swarm | 100 | 62.0% | 37.0% | 1.0% | 7.66 |
| Attrition Swarm | Wardens | 100 | 47.0% | 49.0% | 4.0% | 7.12 |
| Attrition Swarm | Attrition Swarm | 100 | 45.0% | 52.0% | 3.0% | 7.44 |

## 4. Top Held-at-Defeat Cards

| Faction | Rank | Card | Held at defeat | Played |
|---|---:|---|---:|---:|
| Aggro | 1 | Rush | 400 | 29 |
| Aggro | 2 | Full Attack | 372 | 97 |
| Aggro | 3 | Quick Fix | 312 | 204 |
| Aggro | 4 | Scout | 245 | 340 |
| Aggro | 5 | Adrenaline | 128 | 671 |
| Tank | 1 | Fortify | 400 | 221 |
| Tank | 2 | Stability | 386 | 476 |
| Tank | 3 | Last Stand | 360 | 303 |
| Tank | 4 | Reinforce | 220 | 390 |
| Tank | 5 | Reactive Plating | 100 | 755 |
| Control | 1 | Recall | 412 | 356 |
| Control | 2 | Swap | 400 | 515 |
| Control | 3 | Drone | 164 | 1013 |
| Control | 4 | Jam Signal | 147 | 717 |
| Control | 5 | Controller | 132 | 0 |
| Swarm | 1 | Substrate | 429 | 219 |
| Swarm | 2 | Flood | 367 | 534 |
| Swarm | 3 | Swarm Attack | 313 | 718 |
| Swarm | 4 | Regrow | 274 | 644 |
| Swarm | 5 | Spawn | 157 | 689 |
| Wardens | 1 | Reinforce Line | 479 | 252 |
| Wardens | 2 | Hold The Line | 472 | 237 |
| Wardens | 3 | Shield Push | 460 | 137 |
| Wardens | 4 | Stand Firm | 233 | 396 |
| Wardens | 5 | Brace | 194 | 528 |
| Attrition Swarm | 1 | Funeral Pyre | 435 | 109 |
| Attrition Swarm | 2 | Feast | 367 | 191 |
| Attrition Swarm | 3 | Rise Again | 285 | 460 |
| Attrition Swarm | 4 | Grave Call | 129 | 832 |
| Attrition Swarm | 5 | Rotcaller | 71 | 1125 |

## 5. Most Played Cards

| Faction | Rank | Card | Played | Held at defeat |
|---|---:|---|---:|---:|
| Aggro | 1 | Runner | 949 | 25 |
| Aggro | 2 | Glass Cannon | 857 | 16 |
| Aggro | 3 | Flanker | 722 | 113 |
| Aggro | 4 | Berserker | 696 | 106 |
| Aggro | 5 | Adrenaline | 671 | 128 |
| Tank | 1 | Guardian | 1188 | 25 |
| Tank | 2 | Shieldbearer | 1169 | 33 |
| Tank | 3 | Bruiser | 1137 | 1 |
| Tank | 4 | Heavy | 1126 | 0 |
| Tank | 5 | Wall | 990 | 45 |
| Control | 1 | Disruptor | 1271 | 77 |
| Control | 2 | Hacker | 1265 | 77 |
| Control | 3 | Sniper | 1123 | 31 |
| Control | 4 | System Override | 1114 | 12 |
| Control | 5 | Drone | 1013 | 164 |
| Swarm | 1 | Alpha | 1171 | 54 |
| Swarm | 2 | Spitter | 1153 | 27 |
| Swarm | 3 | Rusher | 1144 | 7 |
| Swarm | 4 | Brood | 1142 | 44 |
| Swarm | 5 | Grunt | 1024 | 84 |
| Wardens | 1 | Bastion Guard | 1233 | 80 |
| Wardens | 2 | Watch Captain | 1103 | 2 |
| Wardens | 3 | Sentinel | 1086 | 4 |
| Wardens | 4 | Halberdier | 1085 | 8 |
| Wardens | 5 | Spearwall | 1081 | 36 |
| Attrition Swarm | 1 | Carrier | 1194 | 22 |
| Attrition Swarm | 2 | Abomination | 1167 | 4 |
| Attrition Swarm | 3 | Leech | 1126 | 6 |
| Attrition Swarm | 4 | Rotcaller | 1125 | 71 |
| Attrition Swarm | 5 | Husk | 1039 | 58 |

## 6. AI Health Snapshot

| Snapshot | Faction | Value |
|---|---|---:|
| Highest PASS faction | Control | 535 PASS actions |
| Lowest WR faction | Swarm | 42.5% WR |
| Longest average game faction | Control | 7.99 turns |
| Shortest average game faction | Aggro | 4.26 turns |

## 7. Red Flag Snapshot

Only the requested red-flag criteria are reported here.

| Criterion | Result |
|---|---|
| Faction WR below 42% | None |
| Faction WR above 58% | None |
| Ordered matchup WR below 30% | Tank as player vs Aggro: 29.0% player WR |
| Ordered matchup WR above 70% | None |
| Turn-cap above 1% | None; global turn-cap rate is 0.2% |
| Invalid actions above 0 | None; invalid actions are 0 |

## Source Output Notes

The simulator also reported these validity notes:

- `baseSeed: 424242`
- `decks shuffled: yes (seeded Fisher-Yates per game)`
- `first actor policy: random-initial-then-alternating (seeded random at battle start, toggles after each full turn)`
- `tie-break policy: seeded-random`
- Previous deterministic reports are invalid because fixed deck order and fixed first actor introduced structural bias.
