# Gridfall-Tactics
Simple, mobile-first, tactical, not locked to one setting.

MVP battle loop currently implemented as: **auto-turn** (no END TURN) with random starting initiative and alternating first actor. Each full turn lets both sides take one action or `PASS`, then resolves column combat, no-progress checks, draw, and the 50-turn cap check.

Hero health is **12 / 12** and the middle row is visual-only. Battles end by hero death, no-progress deadlock, or the 50 completed-turn cap. Simultaneous lethal, no-progress, and turn-cap outcomes use higher hero HP as the tiebreaker; equal HP is a draw. There is no repeated-PASS/3-pass stall counter.

## MVP Rules Canonical Source

Frozen MVP battle rules are defined in:
- `docs/rules/mvp-battle-rules.md`

Project notes in `docs/project/*` and `docs/battle_mvp_v1.md` are historical/contextual and non-normative.

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

The runner evaluates all faction pairings, uses the same opening mulligan, no-progress, and 50-turn remaining-hero-HP end rules as live battle flow, and reports matchup plus aggregate faction win rates.
