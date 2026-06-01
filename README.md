# Gridfall-Tactics
Simple, mobile-first, tactical, not locked to one setting.

MVP battle loop currently implemented as: **auto-turn** (no END TURN) with random starting initiative and alternating first actor. Each full turn lets both sides take one action or `PASS`, then resolves column combat, no-progress checks, draw, and the 24-completed-turn fallback cap check.

Base health is **12 / 12** and the middle row is visual-only. Battles end by base defeat, no-progress deadlock, or the 24-completed-turn fallback cap. Simultaneous lethal, no-progress, and turn-cap outcomes use higher base HP as the tiebreaker; equal HP is a draw. There is no repeated-PASS/3-pass stall counter.

## MVP Rules Canonical Source

Frozen MVP battle rules are defined in:
- `docs/rules/mvp-battle-rules.md`

Project notes in `docs/project/*` and `docs/battle_mvp_v1.md` are historical/contextual and non-normative.

## Current UX/Localization Direction (2026-05-18)

- Current polish priority is **readability-first card presentation on mobile** (hand/inspect/collection).
- EN/PL card wording is being normalized toward shorter, clearer effect phrasing without changing rules behavior.
- Battle UX includes explicit feedback for prevention mechanics (including Last Stand prevention) and clearer modified-stat readability to reduce hidden-state confusion.


https://lukaszpeciak91-sys.github.io/Gridfall-Tactics/

https://lukaszpeciak91-sys.github.io/Gridfall-Tactics/?v=999


## Battle Simulation Runner

Run AI-vs-AI batch simulations (no Phaser/UI):

```bash
npm run simulate:battles
```

Optional game count per matchup (default is 100):

```bash
node scripts/simulate-battles.mjs 20
```

The runner evaluates all faction pairings, uses the same opening mulligan, no-progress, and 24-completed-turn remaining-base-HP fallback rule as live battle flow, and reports matchup plus aggregate faction win rates.
