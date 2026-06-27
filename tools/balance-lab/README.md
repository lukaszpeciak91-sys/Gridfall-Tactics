# Balance Lab v2-lite local experiment runner

Balance Lab v2-lite is a local wrapper around the existing Gridfall Tactics battle simulator. It runs two simulations for a card-data experiment:

1. **Baseline** — runs the existing simulator in the real repo with no data changes.
2. **Experiment** — copies the repo to `tools/balance-lab/temp/`, patches only allowed card data in that temporary copy, then runs the same simulator command from the temp copy.

It does **not** modify gameplay logic, `scripts/simulate-battles.mjs`, or real repo card JSON files.

For Balance Lab v3 planning, see the controlled Experimental Effect Blocks catalog at [`tools/balance-lab/effect-blocks.md`](effect-blocks.md).


## Supported scope

Balance Lab v2-lite supports two local card-data experiment modes:

1. **Stat patch mode** — changes exactly one allowed numeric stat per change: `attack`, `hp`, or `armor`.
2. **replaceCard mode** — replaces one full card object in the temporary experiment copy only. The replacement must keep the same `id` as `cardId`; `effectId` may be an existing effect id, `null`, or omitted; and the replacement must not include `effectParams`.

Balance Lab v2-lite does **not** add new effect behavior. It does not patch `GameState.js`, create temporary effect variants, run custom effect logic, make permanent card changes, or automatically balance cards for you.

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

## Run Balance Lab with the Windows GUI launcher

For a Windows-friendly, no-command workflow, double-click:

```text
tools/balance-lab/Start Balance Lab.bat
```

The batch file changes to the repository root and starts the Tkinter launcher at:

```text
tools/balance-lab/balance_lab_launcher.py
```

If the GUI cannot start, the batch window stays open and shows the startup error so you can copy it into a bug report.

The GUI detects the repository root automatically, lists every `*.json` experiment file in:

```text
tools/balance-lab/experiments/
```

GUI buttons:

- **Run selected experiment** — runs the highlighted JSON file through the existing Balance Lab command.
- **Run all experiments in folder** — runs every JSON file directly inside the experiments folder.
- **Open reports folder** — opens the folder where Balance Lab writes reports.
- **Open experiments folder** — opens the folder where experiment JSON files live.
- **Refresh list** — reloads the experiment list after files are added, removed, or renamed.

The log panel shows the existing CLI output while Balance Lab runs. The GUI stays responsive during a run. When the run finishes, it shows success or failure, updates the last detected report folder, and keeps the reports button available.

Reports are written under:

```text
tools/balance-lab/reports/
```

Each selected-experiment run creates its own timestamped report folder. Folder-mode runs also create a timestamped batch-summary folder in the same reports location.

## Run Balance Lab from a terminal

From the repository root, run:

```powershell
python tools/balance-lab/run_balance_lab.py tools/balance-lab/experiments/example_experiment.json
```

For the full card replacement example, run:

```powershell
python tools/balance-lab/run_balance_lab.py tools/balance-lab/experiments/example_full_card_replacement.json
```

The script validates that these required paths exist:

- `package.json`
- `scripts/simulate-battles.mjs`
- `src/data/factions/`

It also validates every requested change before copying or patching anything.

## Running many experiments

Balance Lab can also run every experiment JSON file in one folder. From the repository root, pass the experiment folder instead of one JSON file:

```powershell
python tools/balance-lab/run_balance_lab.py tools/balance-lab/experiments/
```

Folder mode finds all direct `*.json` files inside the folder, sorts them by filename using normal lexicographic order, and runs them one by one. It prints compact progress lines such as `[3/64] Running 003_aggro_runner_hp2.json`, which keeps larger 60+ experiment batches readable. Each experiment still gets its own normal timestamped report folder under:

```text
tools/balance-lab/reports/
```

After all experiments finish, folder mode writes exactly one batch summary for the entire run at:

```text
tools/balance-lab/reports/<batch_timestamp>-batch-summary/batch-summary.md
```

**Warning:** folder mode runs every direct `*.json` file in the experiments folder, including replaceCard examples such as `example_full_card_replacement.json`. Move draft or unsupported experiments out of that folder, or give them a non-`.json` extension, before running a batch.

The batch summary lists the number of experiments run, pass/fail counts, each config path, each report folder path, simulator exit codes, warning and danger counts, and the largest faction non-draw win-rate deltas when comparison data is available. If one experiment fails validation, Balance Lab records the error in the batch summary and continues with the next JSON file.

The example experiment uses `matchCount: 100`, which is smoke-test only. It is useful for checking that the runner works and for catching very large balance problems. For serious balance tests, use a higher `matchCount`, such as `1000` or more, because small sample sizes can be noisy.

## Running a small experiment queue

Batch mode already acts as a queue: when you pass Balance Lab a folder, it runs each direct `*.json` file in that folder one by one in filename order. To run only a small selected set of experiments now, put only those experiment JSON files into:

```text
tools/balance-lab/experiments/queue/
```

Use numeric filename prefixes to control the run order, for example:

```text
001_runner_hp2.json
002_runner_atk3.json
003_shieldbearer_armor1.json
```

Then run Balance Lab on the queue folder from the repository root:

```powershell
python tools/balance-lab/run_balance_lab.py tools/balance-lab/experiments/queue/
```

Balance Lab runs the queued files one by one. If one experiment fails validation or simulation, folder mode records that failure and continues with the next JSON file. The run creates one `batch-summary.md` for the whole queue.

After reviewing results, move completed experiment files to an archive folder manually if desired. Files in `tools/balance-lab/experiments/archive/` are not run by the queue command above; archive files only run if you pass the archive folder directly to Balance Lab.

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

## Supported change modes

Balance Lab patches card data only in:

```text
src/data/factions/*.json
```

### Stat patch mode

Stat patch mode keeps the existing card object and changes exactly one allowed numeric field. Allowed fields are:

- `attack`
- `hp`
- `armor`

Example:

```json
{
  "faction": "Aggro",
  "cardId": "aggro_runner_1",
  "field": "hp",
  "value": 2
}
```

### replaceCard mode

`replaceCard` mode replaces one existing card object with a full `replaceCard` JSON object in the temporary experiment copy only. The replacement card must keep the same `id` as `cardId`; Balance Lab rejects changed ids to keep telemetry and action ids stable.

Required `replaceCard` fields:

- `id`
- `name`
- `type`
- `targeting`
- `textShort`

If `type` is `"unit"`, these fields are also required and must be integers greater than or equal to 0:

- `attack`
- `hp`
- `armor`

Unit replacements may also include optional `combatKeywords`, an array of non-empty strings. The experimental `"overflow"` keyword makes excess combat damage after armor reduction hit the defender owner's base when the defender is killed; direct empty-lane base attacks are unchanged.

Full replacement may update display fields such as `name`, `textShort`, `targeting`, `artAssetId`, and `cardNumber`. When present, `replaceCard.effectId` must be either an existing effectId already present in the repo card data or `null` for a vanilla/no-effect card. Omitting `effectId` is also allowed for replacement objects that intentionally have no effect field. Balance Lab v2-lite does not add new effect logic, does not support `effectParams`, and does not make unknown custom effects work. New effect behavior still requires the normal repo implementation path in gameplay code and AI support.

Example:

```json
{
  "faction": "Aggro",
  "cardId": "aggro_runner_1",
  "replaceCard": {
    "id": "aggro_runner_1",
    "cardNumber": 1,
    "artAssetId": "aggro_01",
    "name": "Runner Test",
    "type": "unit",
    "targeting": "lane",
    "effectId": "lane_empty_bonus_damage",
    "textShort": "Open line: enemy base loses 2 HP.",
    "attack": 2,
    "hp": 2,
    "armor": 0
  }
}
```

## Output

Each run creates a timestamped report folder under:

```text
tools/balance-lab/reports/
```

The report folder contains:

- `baseline-output.txt` — raw stdout from the unmodified baseline simulator run
- `experiment-output.txt` — raw stdout from the temp-copy experiment simulator run
- `experiment-stderr.txt` — raw stderr from the temp-copy experiment simulator run
- `patch-summary.md` — each applied stat patch and replaceCard changes; replacement entries include old and new card JSON blocks
- `comparison-report.md` — readable baseline vs experiment comparison for faction win rates, matchup win rates, campaign viability estimates, validated card telemetry comparisons, decision verdicts, Paste into ChatGPT summary block, big-change flags, and whether replaceCard mode was tested
- `card-telemetry-baseline.txt` — raw extracted baseline card telemetry section when available
- `card-telemetry-experiment.txt` — raw extracted experiment card telemetry section when available
- `summary.md` — short run metadata and file list

Generated report folders are intentionally ignored by git. The placeholder `reports/.gitkeep` remains tracked so the folder exists in fresh checkouts.

## Comparison report

`comparison-report.md` parses the simulator console tables for:

- aggregate faction results
- combined matchup results across both seats
- per-card telemetry when `telemetry` includes `cards` or `all`

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

## Campaign viability estimate

Balance Lab does not run a real campaign or gauntlet simulator. It estimates campaign viability from the combined matchup table across both seats:

1. For each faction, read its non-draw win rate against each other faction. When the faction appears as `faction B`, Balance Lab uses `100 - faction A non-draw WR`.
2. Convert each matchup non-draw win rate `p` into the estimated chance to win at least 1 game out of 3: `1 - (1 - p)^3`.
3. Multiply those best-of-3 success values across all parsed opponents.

The report shows baseline campaign %, experiment campaign %, and delta pp for each faction. This is still only an estimate from matchup win rates, not a true campaign simulator, so treat it as a balance-review signal rather than final campaign proof.

## Decision verdicts

The decision summary at the top of `comparison-report.md` rolls faction non-draw WR deltas, matchup non-draw WR deltas, and campaign estimate deltas into one verdict:

- `SAFE` means no faction, matchup, or campaign estimate delta reached `flags.warningDeltaPp`.
- `WATCH` means at least one faction, matchup, or campaign estimate delta reached `flags.warningDeltaPp`, but none reached `flags.dangerDeltaPp`.
- `DANGER` means at least one faction, matchup, or campaign estimate delta reached `flags.dangerDeltaPp`.

The summary also lists the biggest faction delta, biggest matchup delta, biggest campaign delta, total warning flags, total danger flags, and a short recommendation.

## Paste into ChatGPT

At the end of `comparison-report.md`, Balance Lab writes a compact `Paste into ChatGPT` block for balance-review conversations. It includes the experiment name, patch summary, verdict, faction WR deltas, campaign deltas, top 5 matchup deltas, matchup leverage, global card leverage, warning/danger flags, top 10 card telemetry deltas when parsing succeeds, and raw card telemetry file names when telemetry is present.

## Card telemetry

If simulator card telemetry is present, Balance Lab extracts the raw card telemetry sections into text files and also tries to build a validated card telemetry comparison table in `comparison-report.md`. Use `telemetry: "all"` or `telemetry: "cards"` to include these sections.

The comparison table matches baseline and experiment card rows by `(faction, id)`, not by card name. Card names remain display text only, which keeps matching stable when an experiment changes a card name as part of a full-card replacement.

The card telemetry comparison shows changed cards by default. A card is changed when drawn, played, held-at-defeat, or average-turn-played values differ after parsing. Rows are sorted by largest absolute played delta first, then largest absolute drawn delta. The report also lists baseline-only and experiment-only cards when a card id appears on only one side.

Card telemetry parsing is reporting-only and non-fatal. If the simulator table format changes, required columns are missing, numeric conversions fail, or duplicate `(faction, id)` keys are found, Balance Lab prints a warning, keeps the run successful, keeps writing `card-telemetry-baseline.txt` and `card-telemetry-experiment.txt`, and skips only the parsed card comparison table for that report.

## Matchup leverage analytics

When card telemetry parses successfully, `comparison-report.md` adds reporting-only leverage sections after the card intelligence tables:

- **Matchup Leverage** lists every matchup whose non-draw WR delta has `abs(delta) >= 3 pp`, then shows up to five positive and five negative cards for the Faction A side of that matchup.
- **Most Influential Cards Overall** ranks cards across the whole experiment by the same leverage score.
- **Campaign Movers** ranks cards within each faction by their association with the faction campaign-estimate direction.

Leverage formula per card:

```text
0.60 * Play Impact
+ 0.25 * Draw Impact
+ 0.10 * Carry Score
- 0.05 * Dead Card Score
```

For matchup leverage, Balance Lab multiplies that card score by the sign of the matchup delta, so positive cards are aligned with the direction of the matchup move and negative cards point against it. For campaign movers, Balance Lab multiplies by the sign of the faction campaign-estimate delta. Generated-token rows that were never drawn are excluded so leverage focuses on deck cards and generated units do not dominate low-sample carry scores. This uses only existing drawn/played/win-loss/dead-card/carry telemetry. It is an aggregate association score for relative ranking and audit triage, not exact percentage-point attribution, because current card telemetry is not isolated by matchup.

## Safety smoke checks for invalid configs

Balance Lab rejects unsupported changes before it creates a temp copy or patches any JSON. These cases are intentionally unsupported:

- `field: "effectId"` stat patches. Use `replaceCard` for existing-effect full card replacement in the temp copy instead.
- negative stat values, such as `field: "hp"` with `value: -1`.
- `replaceCard.id` that differs from `cardId`.
- `replaceCard.effectParams`.
- empty-string `replaceCard.effectId`.
- non-string/non-null `replaceCard.effectId` values such as numbers, objects, or arrays.
- string `replaceCard.effectId` values that do not already exist in repo card data.
- unknown `cardId` values that do not exist in the selected faction deck.
- unknown `faction` values that do not match a file in `src/data/factions/`.

If one of these appears in an experiment JSON, the command should stop with a `Balance Lab error` before the baseline run, temp-copy creation, or patching step.

## Current safety behavior

Balance Lab does **not** change the real repository.

It does not:

- patch real card data
- write into real `src/`
- edit `scripts/simulate-battles.mjs`
- change gameplay logic
- add new effect behavior
- patch `GameState.js` or other gameplay files
- create temporary effect variants
- run custom effect logic
- support `effectParams`
- support deck replacement
- make permanent card changes
- automatically balance cards

If validation fails, the script stops before patching. If the experiment simulation fails, the temp folder and output files remain for debugging.

## Example experiment

See:

```text
tools/balance-lab/experiments/example_experiment.json
tools/balance-lab/experiments/example_full_card_replacement.json
```

The example includes:

- `name`
- `matchCount`
- `seed`
- `telemetry`
- `changes`
- `flags.warningDeltaPp`
- `flags.dangerDeltaPp`
