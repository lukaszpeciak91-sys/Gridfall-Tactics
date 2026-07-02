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

### Balance Lab temporary custom factions

Balance Lab can append temporary, experiment-local factions without editing `src/data/factions/*.json`:

```bash
node scripts/simulate-battles.mjs --experiment=path/to/experiment.json
```

The experiment may include `matchCount`, `seed`, `telemetry`, existing `changes`/`replaceCard` edits, and `customFactions`. Custom factions are validated before the run, then appended only to the in-memory simulator faction registry. Their ids must not collide with production faction keys or production faction ids, decks must contain exactly 10 schema-compatible cards, card ids/card numbers must be unique, targeting/effect ids must already be supported by production simulator logic, and combat keywords must already exist in production data.

When custom factions are present, the runner prints a temporary-faction summary with production/custom/total faction counts, custom faction ids/names, and custom card ids/names. The full ordered matchup matrix uses all production factions plus the appended custom factions; with the current 6 production factions plus 2 custom factions, that is 8 factions and 64 ordered matchups. Card telemetry and the campaign-intelligence section include custom faction cards when telemetry is enabled. The campaign-intelligence section is an estimate across the current simulated faction set, not a true campaign simulator.
