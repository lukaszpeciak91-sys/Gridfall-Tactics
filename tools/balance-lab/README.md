# Balance Lab v1

Balance Lab is a local wrapper around the existing Gridfall Tactics battle simulator. V1 runs two simulations for a simple card-stat experiment:

1. **Baseline** — runs the existing simulator in the real repo with no data changes.
2. **Experiment** — copies the repo to `tools/balance-lab/temp/`, patches only allowed card stats in that temporary copy, then runs the same simulator command from the temp copy.

It does **not** modify gameplay logic or `scripts/simulate-battles.mjs`.

## Requirements

You need both Node.js and Python installed.

Recommended minimums:

- Node.js 20 or newer
- Python 3.10 or newer

On Windows PowerShell, check your versions with:

```powershell
node --version
npm --version
python --version
```

If `python --version` does not work on Windows, try:

```powershell
py --version
```

## Install game dependencies

From the repository root, install Node dependencies if you have not already:

```powershell
npm ci
```

The repository root is the folder that contains `package.json`.

## Run Balance Lab v1

From the repository root, run:

```powershell
python tools/balance-lab/run_balance_lab.py tools/balance-lab/experiments/example_experiment.json
```

The script validates that these required paths exist:

- `package.json`
- `scripts/simulate-battles.mjs`
- `src/data/factions/`

It also validates every requested change before copying or patching anything.

## Baseline vs experiment

The baseline run uses the real repo exactly as-is. No files are patched before the baseline.

The experiment run uses a temporary copied repo under:

```text
tools/balance-lab/temp/<timestamp-safe-name>-experiment/
```

The copy excludes heavy or generated folders:

- `.git`
- `node_modules`
- `dist`
- `build`
- `coverage`
- `test` / `tests`
- `tools/balance-lab/reports`
- `tools/balance-lab/temp`

All experiment patches happen only inside that temp copy.

## Supported v1 fields

Balance Lab v1 only supports simple JSON card stat changes in:

```text
src/data/factions/*.json
```

Allowed fields:

- `attack`
- `hp`
- `armor`

V1 does not support effect changes, card ID/name/type changes, text changes, deck replacement, card replacement, or faction registration changes.

## Output

Each run creates a timestamped report folder under:

```text
tools/balance-lab/reports/
```

The report folder contains:

- `baseline-output.txt` — raw stdout from the unmodified baseline simulator run
- `experiment-output.txt` — raw stdout from the temp-copy experiment simulator run
- `experiment-stderr.txt` — raw stderr from the temp-copy experiment simulator run
- `patch-summary.md` — each applied stat patch, including card ID, faction, field, old value, new value, and temp-copy JSON path
- `comparison-report.md` — readable baseline vs experiment comparison for faction win rates, matchup win rates, big-change flags, and v1 campaign viability
- `card-telemetry-baseline.txt` — raw extracted baseline card telemetry section when available
- `card-telemetry-experiment.txt` — raw extracted experiment card telemetry section when available
- `summary.md` — short run metadata and file list

Generated report folders are intentionally ignored by git. The placeholder `reports/.gitkeep` remains tracked so the folder exists in fresh checkouts.

## Comparison report

`comparison-report.md` parses the simulator console tables for:

- aggregate faction results
- combined matchup results across both seats

The report compares baseline vs experiment win-rate values and adds a flag when a change is large enough:

- `WARNING` when the absolute delta is greater than or equal to `flags.warningDeltaPp` from the experiment JSON
- `DANGER` when the absolute delta is greater than or equal to `flags.dangerDeltaPp` from the experiment JSON

## How to read comparison-report.md

`comparison-report.md` is meant to be a quick, readable balance summary for non-programmers. A few terms are important:

- `pp` means **percentage points**. For example, moving from 50% to 55% is a +5 pp change, not a 5% relative increase.
- `WARNING` means the experiment caused noticeable balance movement compared with the baseline. It is a signal to inspect the change, not an automatic rejection.
- `DANGER` means the experiment caused major balance movement compared with the baseline. Treat it as a strong signal that the change may be too large or needs a narrower follow-up test.
- `OK` does **not** mean perfect balance. It only means that row did not move by a large amount versus the baseline thresholds in the experiment JSON.
- `100` games per matchup is smoke-test only. It is useful for checking that the tool works and for spotting very large problems.
- Serious balance tests should use a higher `matchCount`, such as `1000` or more, because small sample sizes can be noisy.

## V1 campaign viability heuristic

Balance Lab v1 does not run a real campaign or gauntlet simulator. It includes a simple heuristic based only on aggregate faction non-draw win rate:

- 45% to 55%: `stable`
- 40% to <45% or >55% to 60%: `watch`
- below 40% or above 60%: `danger`

Treat this as a quick balance smell test, not a final campaign-readiness verdict.

## Card telemetry in v1

If simulator card telemetry is present, Balance Lab v1 extracts the raw card telemetry sections into text files. It does not fully normalize card telemetry into comparison tables yet. Use `telemetry: "all"` or `telemetry: "cards"` to include these sections.

## Safety smoke checks for invalid configs

Balance Lab v1 should reject unsupported changes before it creates a temp copy or patches any JSON. These cases are intentionally unsupported:

- `field: "effectId"` — effect changes are not supported in v1.
- `field: "name"` — card name/text changes are not supported in v1.
- negative stat values, such as `field: "hp"` with `value: -1`.
- unknown `cardId` values that do not exist in the selected faction deck.
- unknown `faction` values that do not match a file in `src/data/factions/`.

If one of these appears in an experiment JSON, the command should stop with a `Balance Lab error` before the baseline run, temp-copy creation, or patching step.

## Current safety behavior

Balance Lab v1 does **not** change the real repository.

It does not:

- patch real card data
- write into real `src/`
- edit `scripts/simulate-battles.mjs`
- change gameplay logic
- support effect changes
- support deck or card replacement

If validation fails, the script stops before patching. If the experiment simulation fails, the temp folder and output files remain for debugging.

## Example experiment

See:

```text
tools/balance-lab/experiments/example_experiment.json
```

The example includes:

- `name`
- `matchCount`
- `seed`
- `telemetry`
- `changes`
- `flags.warningDeltaPp`
- `flags.dangerDeltaPp`
