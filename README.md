# Gridfall-Tactics
Simple, mobile-first, tactical, not locked to one setting.

MVP battle loop currently implemented as: **auto-turn** (no END TURN) → player action (`play`, `redeploy`, `swap`, `PASS`) → enemy action → column combat resolution → draw.

Hero health is **12 / 12**, middle row is visual-only, and win/loss is based on hero HP reaching 0.

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

The runner evaluates all faction pairings, applies a 50-turn cap to prevent infinite loops, and reports matchup plus aggregate faction win rates.
