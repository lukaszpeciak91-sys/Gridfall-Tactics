#!/usr/bin/env python3
"""Balance Lab temp-copy experiment runner.

This version is intentionally conservative: it runs an unmodified baseline,
copies the repo to a local temp folder, patches only allowed card data in that
copy, runs the existing simulator there, and writes raw outputs to a report.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


ALLOWED_STAT_FIELDS = {"attack", "hp", "armor"}
REQUIRED_REPLACE_CARD_FIELDS = {"id", "name", "type", "targeting", "effectId", "textShort"}
REQUIRED_UNIT_REPLACE_CARD_FIELDS = {"attack", "hp", "armor"}
ALLOWED_TELEMETRY_MODES = {"", "basic", "cards", "ai", "all"}
REQUIRED_REPO_PATHS = [
    Path("package.json"),
    Path("scripts/simulate-battles.mjs"),
    Path("src/data/factions"),
]
FACTIONS_DIR = Path("src/data/factions")
REPORTS_DIR = Path("tools/balance-lab/reports")
TEMP_DIR = Path("tools/balance-lab/temp")
BASELINE_OUTPUT_FILENAME = "baseline-output.txt"
EXPERIMENT_OUTPUT_FILENAME = "experiment-output.txt"
EXPERIMENT_STDERR_FILENAME = "experiment-stderr.txt"
PATCH_SUMMARY_FILENAME = "patch-summary.md"
COMPARISON_REPORT_FILENAME = "comparison-report.md"
CARD_TELEMETRY_BASELINE_FILENAME = "card-telemetry-baseline.txt"
CARD_TELEMETRY_EXPERIMENT_FILENAME = "card-telemetry-experiment.txt"
SUMMARY_FILENAME = "summary.md"
BATCH_SUMMARY_FILENAME = "batch-summary.md"
COPY_EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "test",
    "tests",
}


class BalanceLabError(Exception):
    """A beginner-friendly validation error."""


def repo_root() -> Path:
    return Path.cwd()


def validate_repo_root(root: Path) -> None:
    missing = [path for path in REQUIRED_REPO_PATHS if not (root / path).exists()]
    if missing:
        missing_list = "\n".join(f"  - {path}" for path in missing)
        raise BalanceLabError(
            "Balance Lab must be run from the Gridfall Tactics repo root.\n"
            "Missing required path(s):\n"
            f"{missing_list}\n\n"
            "Try running this command from the folder that contains package.json."
        )


def load_experiment(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise BalanceLabError(f"Experiment file not found: {path}")
    if not path.is_file():
        raise BalanceLabError(f"Experiment path is not a file: {path}")

    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except json.JSONDecodeError as error:
        raise BalanceLabError(f"Experiment JSON is invalid: {error}") from error

    if not isinstance(data, dict):
        raise BalanceLabError("Experiment JSON must be an object at the top level.")
    return data


def require_type(data: dict[str, Any], key: str, expected_type: type) -> Any:
    if key not in data:
        raise BalanceLabError(f"Experiment is missing required field: {key}")
    value = data[key]
    if not isinstance(value, expected_type):
        raise BalanceLabError(f"Experiment field '{key}' must be {expected_type.__name__}.")
    return value


def validate_experiment_shape(data: dict[str, Any]) -> None:
    require_type(data, "name", str)
    require_type(data, "matchCount", int)
    require_type(data, "seed", int)
    telemetry = require_type(data, "telemetry", str)
    changes = require_type(data, "changes", list)
    flags = require_type(data, "flags", dict)

    if data["matchCount"] <= 0:
        raise BalanceLabError("Experiment field 'matchCount' must be greater than 0.")
    if data["seed"] < 0:
        raise BalanceLabError("Experiment field 'seed' must be 0 or greater.")
    if telemetry not in ALLOWED_TELEMETRY_MODES and not is_comma_telemetry_list(telemetry):
        raise BalanceLabError(
            "Experiment field 'telemetry' must be one of: basic, cards, ai, all, "
            "or a comma-separated combination such as basic,cards."
        )

    for flag_name in ("warningDeltaPp", "dangerDeltaPp"):
        if flag_name not in flags:
            raise BalanceLabError(f"Experiment flags are missing required field: {flag_name}")
        if not isinstance(flags[flag_name], (int, float)):
            raise BalanceLabError(f"Experiment flag '{flag_name}' must be a number.")

    for index, change in enumerate(changes, start=1):
        validate_change_shape(change, index)


def validate_change_shape(change: Any, index: int) -> None:
    if not isinstance(change, dict):
        raise BalanceLabError(f"Change #{index} must be an object.")
    for key in ("faction", "cardId"):
        if key not in change:
            raise BalanceLabError(f"Change #{index} is missing required field: {key}")
    if not isinstance(change["faction"], str):
        raise BalanceLabError(f"Change #{index} faction must be a string.")
    if not isinstance(change["cardId"], str):
        raise BalanceLabError(f"Change #{index} cardId must be a string.")
    if "effectParams" in change:
        raise BalanceLabError(f"Change #{index} includes effectParams, which Balance Lab v2-lite does not support.")

    has_stat_patch = "field" in change or "value" in change
    has_replacement = "replaceCard" in change
    if has_stat_patch and has_replacement:
        raise BalanceLabError(f"Change #{index} must use either field/value or replaceCard, not both.")
    if not has_stat_patch and not has_replacement:
        raise BalanceLabError(f"Change #{index} must include either field/value or replaceCard.")

    if has_replacement:
        validate_replace_card_shape(change, index)
        return

    validate_stat_change_shape(change, index)


def validate_stat_change_shape(change: dict[str, Any], index: int) -> None:
    for key in ("field", "value"):
        if key not in change:
            raise BalanceLabError(f"Change #{index} is missing required field: {key}")
    for blocked_key in ("id", "name", "type", "effectId", "text", "textShort"):
        if blocked_key in change:
            raise BalanceLabError(
                f"Change #{index} includes '{blocked_key}', but stat patch mode only supports stat fields."
            )
    if change["field"] not in ALLOWED_STAT_FIELDS:
        allowed = ", ".join(sorted(ALLOWED_STAT_FIELDS))
        raise BalanceLabError(f"Change #{index} field must be one of: {allowed}")
    if not isinstance(change["value"], int):
        raise BalanceLabError(f"Change #{index} value must be an integer.")
    if change["value"] < 0:
        raise BalanceLabError(f"Change #{index} value must be >= 0.")


def validate_replace_card_shape(change: dict[str, Any], index: int) -> None:
    replace_card = change.get("replaceCard")
    if not isinstance(replace_card, dict):
        raise BalanceLabError(f"Change #{index} replaceCard must be an object.")
    if "effectParams" in replace_card:
        raise BalanceLabError(f"Change #{index} replaceCard includes effectParams, which Balance Lab v2-lite does not support.")
    missing_fields = sorted(field for field in REQUIRED_REPLACE_CARD_FIELDS if field not in replace_card)
    if missing_fields:
        raise BalanceLabError(
            f"Change #{index} replaceCard is missing required field(s): {', '.join(missing_fields)}"
        )
    if replace_card.get("id") != change["cardId"]:
        raise BalanceLabError(f"Change #{index} replaceCard.id must match cardId exactly.")
    for key in ("id", "name", "type", "targeting", "effectId", "textShort"):
        if not isinstance(replace_card.get(key), str) or not replace_card.get(key):
            raise BalanceLabError(f"Change #{index} replaceCard.{key} must be a non-empty string.")
    if replace_card["type"] == "unit":
        for key in sorted(REQUIRED_UNIT_REPLACE_CARD_FIELDS):
            value = replace_card.get(key)
            if not isinstance(value, int) or value < 0:
                raise BalanceLabError(f"Change #{index} replaceCard.{key} must be an integer >= 0 for unit cards.")


def is_comma_telemetry_list(value: str) -> bool:
    if not value or " " in value:
        return False
    modes = [mode.strip() for mode in value.split(",")]
    return all(mode in {"basic", "cards", "ai"} for mode in modes)


def load_faction_files(root: Path) -> list[tuple[Path, dict[str, Any]]]:
    faction_dir = root / FACTIONS_DIR
    faction_files: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(faction_dir.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise BalanceLabError(f"Faction JSON is invalid: {path}: {error}") from error
        if not isinstance(data, dict):
            raise BalanceLabError(f"Faction JSON must contain an object: {path}")
        faction_files.append((path, data))
    return faction_files




def collect_known_effect_ids(root: Path) -> set[str]:
    effect_ids: set[str] = set()
    for _path, faction_data in load_faction_files(root):
        deck = faction_data.get("deck")
        if not isinstance(deck, list):
            continue
        for card in deck:
            if isinstance(card, dict) and isinstance(card.get("effectId"), str) and card["effectId"]:
                effect_ids.add(card["effectId"])
    return effect_ids

def find_faction_file(root: Path, faction: str) -> tuple[Path, dict[str, Any]] | None:
    wanted = normalize_key(faction)
    for path, data in load_faction_files(root):
        candidates = {
            normalize_key(path.stem),
            normalize_key(str(data.get("id", ""))),
            normalize_key(str(data.get("name", ""))),
        }
        if wanted in candidates:
            return path, data
    return None


def validate_requested_changes(root: Path, changes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    validated = []
    known_effect_ids = collect_known_effect_ids(root)
    for index, change in enumerate(changes, start=1):
        faction_match = find_faction_file(root, change["faction"])
        if faction_match is None:
            raise BalanceLabError(
                f"Change #{index} faction file was not found for faction '{change['faction']}'."
            )
        source_path, faction_data = faction_match
        deck = faction_data.get("deck")
        if not isinstance(deck, list):
            raise BalanceLabError(f"Faction file has no deck array: {source_path}")
        card = next((entry for entry in deck if isinstance(entry, dict) and entry.get("id") == change["cardId"]), None)
        if card is None:
            raise BalanceLabError(
                f"Change #{index} cardId '{change['cardId']}' was not found in {source_path}."
            )

        if "replaceCard" in change:
            replace_card = dict(change["replaceCard"])
            effect_id = replace_card["effectId"]
            if effect_id not in known_effect_ids:
                raise BalanceLabError(
                    f"Change #{index} replaceCard.effectId '{effect_id}' is not an existing effectId. "
                    "Balance Lab v2-lite cannot add custom effect logic."
                )
            validated.append({
                "index": index,
                "mode": "replaceCard",
                "faction": change["faction"],
                "cardId": change["cardId"],
                "oldCard": card,
                "newCard": replace_card,
                "relativePath": source_path.relative_to(root),
            })
            continue

        old_value = card.get(change["field"], 0)
        if old_value is not None and not isinstance(old_value, int):
            raise BalanceLabError(
                f"Change #{index} old value for {change['field']} on {change['cardId']} is not an integer."
            )
        validated.append({
            "index": index,
            "mode": "stat",
            "faction": change["faction"],
            "cardId": change["cardId"],
            "field": change["field"],
            "oldValue": 0 if old_value is None else old_value,
            "newValue": change["value"],
            "relativePath": source_path.relative_to(root),
        })
    return validated


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def discover_npm_command() -> str:
    executables = ("npm.cmd", "npm") if os.name == "nt" else ("npm", "npm.cmd")
    for executable in executables:
        npm_path = shutil.which(executable)
        if npm_path is not None:
            return npm_path

    raise BalanceLabError(
        "Could not find npm executable. Please confirm Node.js and npm are installed and available in PATH."
    )


def build_simulator_command(data: dict[str, Any], *, verbose: bool = True) -> list[str]:
    npm_command = discover_npm_command()
    if verbose:
        print(f"Resolved npm command: {npm_command}", flush=True)
    command = [
        npm_command,
        "run",
        "simulate:battles",
        "--",
        str(data["matchCount"]),
        str(data["seed"]),
    ]
    telemetry = data["telemetry"]
    if telemetry:
        command.append(f"--telemetry={telemetry}")
    return command


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "experiment"


def create_run_paths(root: Path, experiment_name: str) -> tuple[str, Path, Path]:
    run_name = f"{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}-{slugify(experiment_name)}"
    report_dir = root / REPORTS_DIR / run_name
    temp_copy_dir = root / TEMP_DIR / f"{run_name}-experiment"
    report_dir.mkdir(parents=True, exist_ok=False)
    temp_copy_dir.parent.mkdir(parents=True, exist_ok=True)
    return run_name, report_dir, temp_copy_dir


def print_intro(root: Path, experiment_path: Path, data: dict[str, Any], command: list[str]) -> None:
    flags = data["flags"]

    print("Balance Lab v2-lite local experiment runner", flush=True)
    print("==========================================", flush=True)
    print(f"Repo root: {root}", flush=True)
    print(f"Experiment file: {experiment_path}", flush=True)
    print("", flush=True)
    print("Validation passed:", flush=True)
    print("  ✓ package.json found", flush=True)
    print("  ✓ scripts/simulate-battles.mjs found", flush=True)
    print("  ✓ src/data/factions found", flush=True)
    print("  ✓ experiment JSON loaded", flush=True)
    print("  ✓ requested card changes validated", flush=True)
    print("", flush=True)
    print("Experiment summary:", flush=True)
    print(f"  Name: {data['name']}", flush=True)
    print(f"  Match count per matchup: {data['matchCount']}", flush=True)
    print(f"  Seed: {data['seed']}", flush=True)
    print(f"  Telemetry: {data['telemetry']}", flush=True)
    print(f"  Warning delta: {flags['warningDeltaPp']} percentage points", flush=True)
    print(f"  Danger delta: {flags['dangerDeltaPp']} percentage points", flush=True)
    print("", flush=True)
    print("Requested card changes:", flush=True)
    if data["changes"]:
        for index, change in enumerate(data["changes"], start=1):
            if "replaceCard" in change:
                print(
                    f"  {index}. {change['faction']} / {change['cardId']}: "
                    "replace full card JSON",
                    flush=True,
                )
            else:
                print(
                    f"  {index}. {change['faction']} / {change['cardId']}: "
                    f"set {change['field']} to {change['value']}",
                    flush=True,
                )
    else:
        print("  No card changes listed.", flush=True)
    print("", flush=True)
    print("Safety status for this run:", flush=True)
    print("  The real repo will not be patched.", flush=True)
    print("  All experiment patches happen only inside tools/balance-lab/temp/.", flush=True)
    print("  If the experiment simulation fails, the temp copy and outputs are kept for debugging.", flush=True)
    print("", flush=True)
    print("Simulator command:", flush=True)
    print(f"  {format_command(command)}", flush=True)
    print("", flush=True)


def run_simulation(root: Path, command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=root,
        text=True,
        capture_output=True,
        check=False,
    )


def copy_repo_to_temp(root: Path, temp_copy_dir: Path) -> None:
    def ignore(src: str, names: list[str]) -> set[str]:
        src_path = Path(src).resolve()
        root_path = root.resolve()
        ignored = {name for name in names if name in COPY_EXCLUDE_DIRS}
        try:
            relative = src_path.relative_to(root_path)
        except ValueError:
            relative = Path()
        if relative == Path("tools/balance-lab"):
            ignored.update({"reports", "temp", "__pycache__"})
        return ignored

    shutil.copytree(root, temp_copy_dir, ignore=ignore)


def apply_patches(temp_copy_dir: Path, validated_changes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_path: dict[Path, list[dict[str, Any]]] = {}
    for change in validated_changes:
        by_path.setdefault(change["relativePath"], []).append(change)

    applied = []
    for relative_path, path_changes in by_path.items():
        temp_json_path = temp_copy_dir / relative_path
        data = json.loads(temp_json_path.read_text(encoding="utf-8"))
        deck = data.get("deck", [])
        for change in path_changes:
            card_index = next(
                index for index, entry in enumerate(deck)
                if isinstance(entry, dict) and entry.get("id") == change["cardId"]
            )
            applied_change = dict(change)
            applied_change["tempJsonPath"] = temp_json_path
            if change["mode"] == "replaceCard":
                applied_change["oldCard"] = dict(deck[card_index])
                deck[card_index] = dict(change["newCard"])
            else:
                deck[card_index][change["field"]] = change["newValue"]
            applied.append(applied_change)
        temp_json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return applied


def format_json_block(data: dict[str, Any]) -> list[str]:
    return ["```json", json.dumps(data, indent=2, ensure_ascii=False), "```"]


def write_patch_summary(report_dir: Path, applied_changes: list[dict[str, Any]]) -> Path:
    patch_summary_path = report_dir / PATCH_SUMMARY_FILENAME
    lines = [
        "# Balance Lab Patch Summary",
        "",
        "All patches were applied only inside the temporary experiment copy.",
        "",
    ]
    if not applied_changes:
        lines.append("No card changes were requested.")
        lines.append("")
    else:
        stat_changes = [change for change in applied_changes if change.get("mode") == "stat"]
        replacement_changes = [change for change in applied_changes if change.get("mode") == "replaceCard"]
        if stat_changes:
            lines.extend([
                "## Stat patches",
                "",
                "| # | Faction | Card ID | Field | Old value | New value | Temp source JSON path |",
                "|---:|---|---|---|---:|---:|---|",
            ])
            for change in stat_changes:
                lines.append(
                    f"| {change['index']} | {change['faction']} | {change['cardId']} | "
                    f"{change['field']} | {change['oldValue']} | {change['newValue']} | "
                    f"`{change['tempJsonPath']}` |"
                )
            lines.append("")
        if replacement_changes:
            lines.extend(["## Full card replacements", ""])
            for change in replacement_changes:
                lines.extend([
                    f"### Change #{change['index']}: {change['faction']} / {change['cardId']}",
                    "",
                    f"Temp source JSON path: `{change['tempJsonPath']}`",
                    "",
                    "Old card JSON:",
                    *format_json_block(change["oldCard"]),
                    "",
                    "New card JSON:",
                    *format_json_block(change["newCard"]),
                    "",
                ])
    patch_summary_path.write_text("\n".join(lines), encoding="utf-8")
    return patch_summary_path


def write_report(
    report_dir: Path,
    temp_copy_dir: Path,
    experiment_path: Path,
    data: dict[str, Any],
    command: list[str],
    baseline_result: subprocess.CompletedProcess[str],
    experiment_result: subprocess.CompletedProcess[str],
) -> tuple[Path, Path, Path, Path]:
    baseline_output_path = report_dir / BASELINE_OUTPUT_FILENAME
    experiment_output_path = report_dir / EXPERIMENT_OUTPUT_FILENAME
    experiment_stderr_path = report_dir / EXPERIMENT_STDERR_FILENAME
    summary_path = report_dir / SUMMARY_FILENAME

    baseline_output_path.write_text(baseline_result.stdout, encoding="utf-8")
    experiment_output_path.write_text(experiment_result.stdout, encoding="utf-8")
    experiment_stderr_path.write_text(experiment_result.stderr, encoding="utf-8")

    summary = [
        "# Balance Lab Run Summary",
        "",
        f"Experiment: {data['name']}",
        f"Experiment file: `{experiment_path}`",
        f"Command: `{format_command(command)}`",
        f"Temporary experiment copy: `{temp_copy_dir}`",
        f"Baseline exit code: {baseline_result.returncode}",
        f"Experiment exit code: {experiment_result.returncode}",
        "",
        "The baseline ran in the real repo without patching files.",
        "The experiment ran in the temporary copy after applying the requested JSON card changes only.",
        f"Full card replacement tested: {'yes' if has_full_card_replacement(data) else 'no'}",
        "",
        f"Baseline output: `{BASELINE_OUTPUT_FILENAME}`",
        f"Experiment output: `{EXPERIMENT_OUTPUT_FILENAME}`",
        f"Experiment stderr: `{EXPERIMENT_STDERR_FILENAME}`",
        f"Patch summary: `{PATCH_SUMMARY_FILENAME}`",
        f"Comparison report: `{COMPARISON_REPORT_FILENAME}`",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    return baseline_output_path, experiment_output_path, experiment_stderr_path, summary_path



def parse_console_table_section(text: str, title: str, columns: list[str]) -> list[dict[str, str]]:
    section = extract_named_section(text, title)
    rows: list[dict[str, str]] = []
    for line in section.splitlines():
        if "│" not in line:
            continue
        cells = [cell.strip() for cell in line.split("│")[1:-1]]
        if not cells or cells[0] == "(index)" or not cells[0].isdigit():
            continue
        values = [clean_table_value(cell) for cell in cells[1:]]
        if len(values) < len(columns):
            continue
        rows.append(dict(zip(columns, values)))
    return rows


def extract_named_section(text: str, title: str) -> str:
    start = text.find(title)
    if start < 0:
        return ""
    next_section = re.search(r"\n(?:Balance audit:|Simulator telemetry:|Final recommendation summary:|Audit pacing summary:|Opening mulligan usage by faction:|AI gameplay-action telemetry:|PASS reason counts:|PASS counts by faction:|Simulation parity and validity notes:)", text[start + len(title):])
    if not next_section:
        return text[start:]
    return text[start:start + len(title) + next_section.start()]


def clean_table_value(value: str) -> str:
    if len(value) >= 2 and value[0] == "'" and value[-1] == "'":
        return value[1:-1]
    return value


def number_value(value: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def delta_pp(baseline: str, experiment: str) -> float:
    return number_value(experiment) - number_value(baseline)


def flag_for_delta(delta: float, warning_delta: float, danger_delta: float) -> str:
    absolute_delta = abs(delta)
    if absolute_delta >= danger_delta:
        return "DANGER"
    if absolute_delta >= warning_delta:
        return "WARNING"
    return ""


def stronger_flag(*flags: str) -> str:
    if "DANGER" in flags:
        return "DANGER"
    if "WARNING" in flags:
        return "WARNING"
    return ""


def format_delta(value: float) -> str:
    return f"{value:+.1f}"


def best_of_3_success(non_draw_wr: str) -> float:
    p = max(0.0, min(1.0, number_value(non_draw_wr) / 100.0))
    return 1 - ((1 - p) ** 3)


def format_percent(value: float) -> str:
    return f"{value * 100:.1f}"


def estimate_campaign_success(matchup_rows: list[dict[str, str]]) -> dict[str, dict[str, Any]]:
    factions = sorted({row["faction A"] for row in matchup_rows} | {row["faction B"] for row in matchup_rows})
    estimates: dict[str, dict[str, Any]] = {}
    for faction in factions:
        opponent_successes: list[float] = []
        for row in matchup_rows:
            if row["faction A"] == faction:
                matchup_wr = number_value(row["faction A non-draw WR"])
            elif row["faction B"] == faction:
                matchup_wr = 100 - number_value(row["faction A non-draw WR"])
            else:
                continue
            opponent_successes.append(best_of_3_success(str(matchup_wr)))

        campaign_success = 1.0
        for success in opponent_successes:
            campaign_success *= success
        estimates[faction] = {
            "opponents": len(opponent_successes),
            "success": campaign_success if opponent_successes else 0.0,
        }
    return estimates


def build_patch_summary_sentence(data: dict[str, Any]) -> str:
    changes = data.get("changes", [])
    if not changes:
        return "No card changes requested."
    parts = []
    for change in changes:
        faction = change.get("faction", "unknown faction")
        card_id = change.get("cardId", "unknown card")
        if "replaceCard" in change:
            parts.append(f"{faction}/{card_id} full replacement")
        else:
            parts.append(f"{faction}/{card_id} {change.get('field', 'field')} → {change.get('value', 'value')}")
    return "; ".join(parts)


def top_abs_delta(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not rows:
        return None
    return max(rows, key=lambda row: abs(row["deltaPp"]))


def count_flags(rows: list[dict[str, Any]]) -> tuple[int, int]:
    warnings = sum(1 for row in rows if row.get("flag") == "WARNING")
    dangers = sum(1 for row in rows if row.get("flag") == "DANGER")
    return warnings, dangers


def index_by_key(rows: list[dict[str, str]], key_fields: tuple[str, ...]) -> dict[tuple[str, ...], dict[str, str]]:
    return {tuple(row.get(field, "") for field in key_fields): row for row in rows}


def extract_card_telemetry(output_text: str) -> str:
    return extract_named_section(output_text, "Simulator telemetry: per-card summary").strip() + "\n"


def write_card_telemetry_sections(report_dir: Path, baseline_text: str, experiment_text: str) -> tuple[Path, Path]:
    baseline_path = report_dir / CARD_TELEMETRY_BASELINE_FILENAME
    experiment_path = report_dir / CARD_TELEMETRY_EXPERIMENT_FILENAME
    baseline_section = extract_card_telemetry(baseline_text)
    experiment_section = extract_card_telemetry(experiment_text)
    if not baseline_section.strip():
        baseline_section = "Card telemetry section was not found in the baseline output. Use telemetry=cards or telemetry=all.\n"
    if not experiment_section.strip():
        experiment_section = "Card telemetry section was not found in the experiment output. Use telemetry=cards or telemetry=all.\n"
    baseline_path.write_text(baseline_section, encoding="utf-8")
    experiment_path.write_text(experiment_section, encoding="utf-8")
    return baseline_path, experiment_path


def build_comparison_report(
    report_dir: Path,
    data: dict[str, Any],
    baseline_text: str,
    experiment_text: str,
    patch_summary_path: Path,
) -> tuple[Path, dict[str, Any]]:
    aggregate_columns = [
        "faction",
        "games",
        "win %",
        "non-draw win %",
        "draw %",
        "turn-cap %",
        "avg turns",
        "avg remaining hero HP",
    ]
    matchup_columns = [
        "faction A",
        "faction B",
        "games",
        "faction A wins",
        "faction B wins",
        "draws",
        "faction A all-games WR",
        "faction A non-draw WR",
        "draw %",
        "turn-cap %",
        "avg turns",
    ]
    baseline_factions = parse_console_table_section(baseline_text, "Balance audit: aggregate faction table", aggregate_columns)
    experiment_factions = parse_console_table_section(experiment_text, "Balance audit: aggregate faction table", aggregate_columns)
    baseline_matchups = parse_console_table_section(baseline_text, "Balance audit: combined matchup table across both seats", matchup_columns)
    experiment_matchups = parse_console_table_section(experiment_text, "Balance audit: combined matchup table across both seats", matchup_columns)

    warning_delta = float(data["flags"]["warningDeltaPp"])
    danger_delta = float(data["flags"]["dangerDeltaPp"])

    experiment_factions_by_key = index_by_key(experiment_factions, ("faction",))
    faction_lines = [
        "| Faction | Baseline win % | Experiment win % | Delta pp | Baseline non-draw win % | Experiment non-draw win % | Delta pp | Flag |",
        "|---|---:|---:|---:|---:|---:|---:|---|",
    ]
    faction_delta_rows: list[dict[str, Any]] = []
    for baseline_row in baseline_factions:
        faction = baseline_row["faction"]
        experiment_row = experiment_factions_by_key.get((faction,))
        if not experiment_row:
            continue
        win_delta = delta_pp(baseline_row["win %"], experiment_row["win %"])
        non_draw_delta = delta_pp(baseline_row["non-draw win %"], experiment_row["non-draw win %"])
        flag = flag_for_delta(non_draw_delta, warning_delta, danger_delta)
        faction_lines.append(
            f"| {faction} | {baseline_row['win %']} | {experiment_row['win %']} | {format_delta(win_delta)} | "
            f"{baseline_row['non-draw win %']} | {experiment_row['non-draw win %']} | {format_delta(non_draw_delta)} | {flag or 'OK'} |"
        )
        faction_delta_rows.append({
            "faction": faction,
            "baselineNonDrawWr": baseline_row["non-draw win %"],
            "experimentNonDrawWr": experiment_row["non-draw win %"],
            "deltaPp": non_draw_delta,
            "flag": flag or "OK",
        })

    experiment_matchups_by_key = index_by_key(experiment_matchups, ("faction A", "faction B"))
    matchup_lines = [
        "| Faction A | Faction B | Baseline faction A non-draw WR | Experiment faction A non-draw WR | Delta pp | Flag |",
        "|---|---|---:|---:|---:|---|",
    ]
    matchup_delta_rows: list[dict[str, Any]] = []
    for baseline_row in baseline_matchups:
        key = (baseline_row["faction A"], baseline_row["faction B"])
        experiment_row = experiment_matchups_by_key.get(key)
        if not experiment_row:
            continue
        non_draw_delta = delta_pp(baseline_row["faction A non-draw WR"], experiment_row["faction A non-draw WR"])
        flag = flag_for_delta(non_draw_delta, warning_delta, danger_delta)
        matchup_lines.append(
            f"| {key[0]} | {key[1]} | {baseline_row['faction A non-draw WR']} | "
            f"{experiment_row['faction A non-draw WR']} | {format_delta(non_draw_delta)} | {flag or 'OK'} |"
        )
        matchup_delta_rows.append({
            "factionA": key[0],
            "factionB": key[1],
            "baselineFactionANonDrawWr": baseline_row["faction A non-draw WR"],
            "experimentFactionANonDrawWr": experiment_row["faction A non-draw WR"],
            "deltaPp": non_draw_delta,
            "flag": flag or "OK",
        })

    baseline_campaign = estimate_campaign_success(baseline_matchups)
    experiment_campaign = estimate_campaign_success(experiment_matchups)
    campaign_lines = [
        "| Faction | Opponents | Baseline campaign estimate | Experiment campaign estimate | Delta pp | Flag |",
        "|---|---:|---:|---:|---:|---|",
    ]
    campaign_delta_rows: list[dict[str, Any]] = []
    for faction in sorted(set(baseline_campaign) & set(experiment_campaign)):
        baseline_success = baseline_campaign[faction]["success"]
        experiment_success = experiment_campaign[faction]["success"]
        campaign_delta = (experiment_success - baseline_success) * 100
        flag = flag_for_delta(campaign_delta, warning_delta, danger_delta)
        campaign_lines.append(
            f"| {faction} | {experiment_campaign[faction]['opponents']} | {format_percent(baseline_success)}% | "
            f"{format_percent(experiment_success)}% | {format_delta(campaign_delta)} | {flag or 'OK'} |"
        )
        campaign_delta_rows.append({
            "faction": faction,
            "baselineCampaignPct": format_percent(baseline_success),
            "experimentCampaignPct": format_percent(experiment_success),
            "deltaPp": campaign_delta,
            "flag": flag or "OK",
        })

    all_flag_rows = [*faction_delta_rows, *matchup_delta_rows, *campaign_delta_rows]
    warning_count, danger_count = count_flags(all_flag_rows)
    verdict = "DANGER" if danger_count else "WATCH" if warning_count else "SAFE"
    biggest_faction_delta = top_abs_delta(faction_delta_rows)
    biggest_matchup_delta = top_abs_delta(matchup_delta_rows)
    biggest_campaign_delta = top_abs_delta(campaign_delta_rows)
    if verdict == "DANGER":
        recommendation = "Do not accept as-is; split the change or test a weaker variant."
    elif verdict == "WATCH":
        recommendation = "Review flagged movement and rerun with a larger matchCount before accepting."
    else:
        recommendation = "No threshold-breaking movement was detected; acceptable for balance review, subject to normal sample-size caution."

    reason_parts = []
    if biggest_campaign_delta:
        reason_parts.append(f"{biggest_campaign_delta['faction']} campaign estimate changed by {format_delta(biggest_campaign_delta['deltaPp'])} pp")
    if biggest_matchup_delta:
        reason_parts.append(
            f"{biggest_matchup_delta['factionA']} vs {biggest_matchup_delta['factionB']} changed by "
            f"{format_delta(biggest_matchup_delta['deltaPp'])} pp"
        )
    if not reason_parts and biggest_faction_delta:
        reason_parts.append(f"{biggest_faction_delta['faction']} faction WR changed by {format_delta(biggest_faction_delta['deltaPp'])} pp")
    reason_sentence = " and ".join(reason_parts) + "." if reason_parts else "No comparable rows were parsed."
    biggest_faction_summary = (
        f"{biggest_faction_delta['faction']} {format_delta(biggest_faction_delta['deltaPp'])} pp"
        if biggest_faction_delta else "N/A"
    )
    biggest_matchup_summary = (
        f"{biggest_matchup_delta['factionA']} vs {biggest_matchup_delta['factionB']} "
        f"{format_delta(biggest_matchup_delta['deltaPp'])} pp"
        if biggest_matchup_delta else "N/A"
    )
    biggest_campaign_summary = (
        f"{biggest_campaign_delta['faction']} {format_delta(biggest_campaign_delta['deltaPp'])} pp"
        if biggest_campaign_delta else "N/A"
    )

    top_matchup_rows = sorted(matchup_delta_rows, key=lambda row: abs(row["deltaPp"]), reverse=True)[:5]
    top_matchup_lines = [
        f"- {row['factionA']} vs {row['factionB']}: {format_delta(row['deltaPp'])} pp "
        f"({row['baselineFactionANonDrawWr']} → {row['experimentFactionANonDrawWr']}, {row['flag']})"
        for row in top_matchup_rows
    ] or ["- Not available"]
    paste_faction_lines = [
        f"- {row['faction']}: {format_delta(row['deltaPp'])} pp "
        f"({row['baselineNonDrawWr']} → {row['experimentNonDrawWr']}, {row['flag']})"
        for row in sorted(faction_delta_rows, key=lambda row: row["faction"])
    ] or ["- Not available"]
    paste_campaign_lines = [
        f"- {row['faction']}: {format_delta(row['deltaPp'])} pp "
        f"({row['baselineCampaignPct']}% → {row['experimentCampaignPct']}%, {row['flag']})"
        for row in sorted(campaign_delta_rows, key=lambda row: row["faction"])
    ] or ["- Not available"]
    flagged_rows = [row for row in all_flag_rows if row.get("flag") in {"WARNING", "DANGER"}]
    paste_flag_lines = []
    for row in flagged_rows:
        if "factionA" in row:
            label = f"Matchup {row['factionA']} vs {row['factionB']}"
        elif "baselineCampaignPct" in row:
            label = f"Campaign {row['faction']}"
        else:
            label = f"Faction {row['faction']}"
        paste_flag_lines.append(f"- {row['flag']}: {label} {format_delta(row['deltaPp'])} pp")
    if not paste_flag_lines:
        paste_flag_lines = ["- None"]

    baseline_card_telemetry_present = bool(extract_card_telemetry(baseline_text).strip())
    experiment_card_telemetry_present = bool(extract_card_telemetry(experiment_text).strip())
    baseline_card_path, experiment_card_path = write_card_telemetry_sections(report_dir, baseline_text, experiment_text)
    card_telemetry_line = (
        f"`{baseline_card_path.name}`, `{experiment_card_path.name}`"
        if baseline_card_telemetry_present or experiment_card_telemetry_present
        else "Not present; files contain guidance placeholders."
    )

    comparison_report_path = report_dir / COMPARISON_REPORT_FILENAME
    lines = [
        "# Balance Lab Comparison Report",
        "",
        f"Experiment: {data['name']}",
        f"Match count per matchup: {data['matchCount']}",
        f"Seed: {data['seed']}",
        f"Telemetry: {data['telemetry']}",
        f"Patch summary: `{patch_summary_path}`",
        f"Full card replacement tested: {'yes' if has_full_card_replacement(data) else 'no'}",
        "",
        "## Decision summary",
        "",
        f"Overall verdict: {verdict}",
        f"Reason: {reason_sentence}",
        f"Recommendation: {recommendation}",
        f"Biggest faction delta: {biggest_faction_summary}",
        f"Biggest matchup delta: {biggest_matchup_summary}",
        f"Biggest campaign delta: {biggest_campaign_summary}",
        f"Warning flags: {warning_count}",
        f"Danger flags: {danger_count}",
        "",
        "```yaml",
        f"verdict: {verdict}",
        f"warning_flags: {warning_count}",
        f"danger_flags: {danger_count}",
        f"biggest_faction_delta_pp: {format_delta(biggest_faction_delta['deltaPp']) if biggest_faction_delta else 'N/A'}",
        f"biggest_matchup_delta_pp: {format_delta(biggest_matchup_delta['deltaPp']) if biggest_matchup_delta else 'N/A'}",
        f"biggest_campaign_delta_pp: {format_delta(biggest_campaign_delta['deltaPp']) if biggest_campaign_delta else 'N/A'}",
        "```",
        "",
        "## Big change flag thresholds",
        "",
        f"- WARNING: absolute delta >= {warning_delta:g} percentage points",
        f"- DANGER: absolute delta >= {danger_delta:g} percentage points",
        "",
        "## Faction WR comparison",
        "",
        *faction_lines,
        "",
        "## Matchup comparison across both seats",
        "",
        *matchup_lines,
        "",
        "## Big change flags",
        "",
        f"- Warnings: {warning_count}",
        f"- Dangers: {danger_count}",
        "",
        "## Campaign viability estimate",
        "",
        "This is an estimate from combined matchup non-draw win rates across both seats, not a true campaign simulator.",
        "For each faction and opponent, Balance Lab converts matchup non-draw WR `p` into `1 - (1 - p)^3`, the probability of winning at least 1 game out of 3. It then multiplies those values across all parsed opponents.",
        "",
        *campaign_lines,
        "",
        "## Card telemetry",
        "",
        "Balance Lab stores raw card telemetry sections instead of fully normalizing every console table cell.",
        f"- Baseline raw card telemetry: `{baseline_card_path.name}`",
        f"- Experiment raw card telemetry: `{experiment_card_path.name}`",
        "",
        "## Paste into ChatGPT",
        "",
        "```text",
        "Balance Lab decision report v1",
        f"Experiment: {data['name']}",
        f"Patch summary: {build_patch_summary_sentence(data)}",
        f"Verdict: {verdict} ({warning_count} warnings, {danger_count} dangers)",
        f"Recommendation: {recommendation}",
        "",
        "Faction non-draw WR deltas:",
        *paste_faction_lines,
        "",
        "Campaign estimate deltas:",
        *paste_campaign_lines,
        "",
        "Top 5 matchup non-draw WR deltas:",
        *top_matchup_lines,
        "",
        "Warnings/dangers:",
        *paste_flag_lines,
        "",
        f"Card telemetry files: {card_telemetry_line}",
        "```",
        "",
    ]
    comparison_report_path.write_text("\n".join(lines), encoding="utf-8")
    return comparison_report_path, {
        "factionRows": min(len(baseline_factions), len(experiment_factions)),
        "matchupRows": min(len(baseline_matchups), len(experiment_matchups)),
        "warnings": warning_count,
        "dangers": danger_count,
        "verdict": verdict,
        "topFactionNonDrawWrDeltas": sorted(
            faction_delta_rows,
            key=lambda row: abs(row["deltaPp"]),
            reverse=True,
        )[:3],
    }

def print_finished(
    report_dir: Path,
    temp_copy_dir: Path,
    patch_summary_path: Path,
    comparison_report_path: Path,
    comparison_stats: dict[str, int],
    experiment_output_path: Path,
    experiment_result: subprocess.CompletedProcess[str],
) -> None:
    print("Experiment complete.", flush=True)
    print(f"Report folder: {report_dir}", flush=True)
    print(f"Temporary experiment copy: {temp_copy_dir}", flush=True)
    print(f"Patch summary: {patch_summary_path}", flush=True)
    print(f"Comparison report: {comparison_report_path}", flush=True)
    print(f"Faction rows parsed: {comparison_stats['factionRows']}", flush=True)
    print(f"Matchup rows parsed: {comparison_stats['matchupRows']}", flush=True)
    print(f"Warnings: {comparison_stats['warnings']}", flush=True)
    print(f"Dangers: {comparison_stats['dangers']}", flush=True)
    print(f"Experiment exit code: {experiment_result.returncode}", flush=True)
    print("", flush=True)
    print("First 20 experiment output lines:", flush=True)
    first_lines = experiment_output_path.read_text(encoding="utf-8").splitlines()[:20]
    for line in first_lines:
        print(line, flush=True)


def format_command(command: list[str]) -> str:
    return " ".join(command)


def has_full_card_replacement(data: dict[str, Any]) -> bool:
    return any(isinstance(change, dict) and "replaceCard" in change for change in data.get("changes", []))


def run_one_experiment(root: Path, experiment_path: Path, *, verbose: bool = True) -> dict[str, Any]:
    data = load_experiment(experiment_path)
    validate_experiment_shape(data)
    validated_changes = validate_requested_changes(root, data["changes"])
    command = build_simulator_command(data, verbose=verbose)
    _, report_dir, temp_copy_dir = create_run_paths(root, data["name"])

    if verbose:
        print_intro(root, experiment_path, data, command)
    baseline_result = run_simulation(root, command)
    if verbose:
        print("Baseline complete.", flush=True)

    if baseline_result.returncode != 0:
        raise BalanceLabError("Baseline simulation failed; stopping before creating the experiment copy.")

    copy_repo_to_temp(root, temp_copy_dir)
    if verbose:
        print(f"Temp copy created: {temp_copy_dir}", flush=True)

    applied_changes = apply_patches(temp_copy_dir, validated_changes)
    patch_summary_path = write_patch_summary(report_dir, applied_changes)
    if verbose:
        print(f"Patches applied: {len(applied_changes)}", flush=True)

    experiment_result = run_simulation(temp_copy_dir, command)
    (
        baseline_output_path,
        experiment_output_path,
        _experiment_stderr_path,
        _summary_path,
    ) = write_report(
        report_dir,
        temp_copy_dir,
        experiment_path,
        data,
        command,
        baseline_result,
        experiment_result,
    )
    comparison_report_path, comparison_stats = build_comparison_report(
        report_dir,
        data,
        baseline_output_path.read_text(encoding="utf-8"),
        experiment_output_path.read_text(encoding="utf-8"),
        patch_summary_path,
    )
    if verbose:
        print_finished(
            report_dir,
            temp_copy_dir,
            patch_summary_path,
            comparison_report_path,
            comparison_stats,
            experiment_output_path,
            experiment_result,
        )
    return {
        "name": data["name"],
        "configPath": experiment_path,
        "reportDir": report_dir,
        "simulatorExitCode": experiment_result.returncode,
        "warningCount": comparison_stats["warnings"],
        "dangerCount": comparison_stats["dangers"],
        "topFactionNonDrawWrDeltas": comparison_stats.get("topFactionNonDrawWrDeltas", []),
        "error": "",
        "passed": experiment_result.returncode == 0,
    }


def discover_experiment_files(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]
    if input_path.is_dir():
        return sorted((path for path in input_path.glob("*.json") if path.is_file()), key=lambda path: path.name)
    raise BalanceLabError(f"Experiment path not found: {input_path}")


def create_batch_summary_dir(root: Path) -> Path:
    batch_name = f"{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}-batch-summary"
    batch_summary_dir = root / REPORTS_DIR / batch_name
    batch_summary_dir.mkdir(parents=True, exist_ok=False)
    return batch_summary_dir


def escape_markdown_table_cell(value: Any) -> str:
    return str(value).replace("\n", " ").replace("|", "\\|")


def format_top_faction_deltas(deltas: list[dict[str, Any]]) -> str:
    if not deltas:
        return "Not available"
    return "; ".join(
        f"{row['faction']} {format_delta(row['deltaPp'])} pp "
        f"({row['baselineNonDrawWr']} → {row['experimentNonDrawWr']}, {row['flag']})"
        for row in deltas
    )


def write_batch_summary(batch_summary_dir: Path, results: list[dict[str, Any]]) -> Path:
    summary_path = batch_summary_dir / BATCH_SUMMARY_FILENAME
    passed_count = sum(1 for result in results if result["passed"])
    failed_count = len(results) - passed_count
    lines = [
        "# Balance Lab Batch Summary",
        "",
        f"Experiments found: {len(results)}",
        f"Passed: {passed_count}",
        f"Failed: {failed_count}",
        "",
        "| Experiment | Config file | Report folder | Simulator exit code | Warnings | Dangers | Top faction non-draw WR deltas | Error |",
        "|---|---|---|---:|---:|---:|---|---|",
    ]
    for result in results:
        report_dir = result["reportDir"] or ""
        exit_code = result["simulatorExitCode"]
        warning_count = result["warningCount"]
        danger_count = result["dangerCount"]
        lines.append(
            f"| {escape_markdown_table_cell(result['name'])} | `{escape_markdown_table_cell(result['configPath'])}` | "
            f"`{escape_markdown_table_cell(report_dir)}` | "
            f"{exit_code if exit_code is not None else 'N/A'} | "
            f"{warning_count if warning_count is not None else 'N/A'} | "
            f"{danger_count if danger_count is not None else 'N/A'} | "
            f"{escape_markdown_table_cell(format_top_faction_deltas(result['topFactionNonDrawWrDeltas']))} | "
            f"{escape_markdown_table_cell(result['error'] or '')} |"
        )
    lines.append("")
    summary_path.write_text("\n".join(lines), encoding="utf-8")
    return summary_path


def run_batch(root: Path, input_path: Path, experiment_paths: list[Path]) -> int:
    batch_summary_dir = create_batch_summary_dir(root)
    results: list[dict[str, Any]] = []

    print("Balance Lab batch experiment runner", flush=True)
    print("========================================", flush=True)
    print(f"Experiment folder: {input_path}", flush=True)
    print(f"JSON experiments found: {len(experiment_paths)}", flush=True)
    print(f"Batch summary folder: {batch_summary_dir}", flush=True)
    print("", flush=True)

    for index, experiment_path in enumerate(experiment_paths, start=1):
        print(f"[{index}/{len(experiment_paths)}] Running {experiment_path.name}", flush=True)
        try:
            result = run_one_experiment(root, experiment_path, verbose=False)
        except FileNotFoundError as error:
            message = (
                f"Could not run required command: {error.filename}. "
                "Please confirm Node.js and npm are installed and available in PATH."
            )
            print(f"Balance Lab error:\n{message}", file=sys.stderr)
            result = failed_batch_result(experiment_path, message)
        except BalanceLabError as error:
            print(f"Balance Lab error:\n{error}", file=sys.stderr)
            result = failed_batch_result(experiment_path, str(error))
        except Exception as error:
            message = f"Unexpected experiment failure: {error}"
            print(f"Balance Lab error:\n{message}", file=sys.stderr)
            result = failed_batch_result(experiment_path, message)
        results.append(result)
        status = "passed" if result["passed"] else "failed"
        print(
            f"[{index}/{len(experiment_paths)}] Finished {experiment_path.name}: {status} "
            f"(exit code: {result['simulatorExitCode'] if result['simulatorExitCode'] is not None else 'N/A'})",
            flush=True,
        )
        print("", flush=True)

    summary_path = write_batch_summary(batch_summary_dir, results)
    passed_count = sum(1 for result in results if result["passed"])
    failed_count = len(results) - passed_count
    print("Batch complete.", flush=True)
    print(f"Experiments found: {len(results)}", flush=True)
    print(f"Passed: {passed_count}", flush=True)
    print(f"Failed: {failed_count}", flush=True)
    print(f"Batch summary: {summary_path}", flush=True)
    return 0 if failed_count == 0 else 1


def failed_batch_result(experiment_path: Path, error_message: str) -> dict[str, Any]:
    return {
        "name": experiment_path.stem,
        "configPath": experiment_path,
        "reportDir": None,
        "simulatorExitCode": None,
        "warningCount": None,
        "dangerCount": None,
        "topFactionNonDrawWrDeltas": [],
        "error": error_message.replace("\n", " "),
        "passed": False,
    }


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(
            "Usage: python tools/balance-lab/run_balance_lab.py "
            "tools/balance-lab/experiments/example_experiment.json\n"
            "   or: python tools/balance-lab/run_balance_lab.py tools/balance-lab/experiments/",
            file=sys.stderr,
        )
        return 2

    root = repo_root()
    input_path = Path(argv[1])

    try:
        validate_repo_root(root)
        experiment_paths = discover_experiment_files(input_path)
        if input_path.is_dir():
            return run_batch(root, input_path, experiment_paths)
        if not experiment_paths:
            raise BalanceLabError(f"No experiment JSON files found in folder: {input_path}")
        result = run_one_experiment(root, experiment_paths[0])
    except FileNotFoundError as error:
        print(
            "Balance Lab error:\n"
            f"Could not run required command: {error.filename}\n"
            "Please confirm Node.js and npm are installed and available in PATH.",
            file=sys.stderr,
        )
        return 1
    except BalanceLabError as error:
        print(f"Balance Lab error:\n{error}", file=sys.stderr)
        return 1

    return result["simulatorExitCode"]


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
