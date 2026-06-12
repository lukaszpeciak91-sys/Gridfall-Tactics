#!/usr/bin/env python3
"""Balance Lab temp-copy experiment runner.

This version is intentionally conservative: it runs an unmodified baseline,
copies the repo to a local temp folder, patches only allowed card data in that
copy, runs the existing simulator there, and writes raw outputs to a report.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


def configure_utf8_stdio() -> None:
    """Prefer UTF-8 for console output on Windows and other non-UTF-8 shells."""
    os.environ.setdefault("PYTHONUTF8", "1")
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except (OSError, ValueError):
            pass


def utf8_subprocess_env() -> dict[str, str]:
    """Return an environment that keeps child Python tools on UTF-8 stdio."""
    env = os.environ.copy()
    env.setdefault("PYTHONUTF8", "1")
    env.setdefault("PYTHONIOENCODING", "utf-8")
    return env


ALLOWED_STAT_FIELDS = {"attack", "hp", "armor"}
REQUIRED_REPLACE_CARD_FIELDS = {"id", "name", "type", "targeting", "textShort"}
REQUIRED_UNIT_REPLACE_CARD_FIELDS = {"attack", "hp", "armor"}
ALLOWED_TELEMETRY_MODES = {"", "basic", "cards", "ai", "all"}
EFFECT_VARIANT_SCHEMA_VERSION = 1
EFFECT_VARIANT_STATUS = "recognized_not_executed"
EFFECT_VARIANT_REGISTRY_GENERATED_STATUS = "registry_generated"
EFFECT_VARIANT_DAMAGE_UNIT_EXECUTED_STATUS = "damage_unit_executed"
EFFECT_VARIANT_STAT_MODIFIER_EXECUTED_STATUS = "stat_modifier_executed"
EFFECT_VARIANT_BASE_DAMAGE_EXECUTED_STATUS = "base_damage_executed"
EFFECT_VARIANT_MIXED_OPERATIONS_EXECUTED_STATUS = "mixed_operations_executed"
EFFECT_VARIANT_REGISTRY_RELATIVE_PATH = Path("src/systems/effectVariantRegistry.generated.js")
EFFECT_VARIANT_SAFE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{2,96}$")
EFFECT_VARIANT_BLOCKED_OPERATION_KEYS = {"code", "script", "function", "eval", "import", "module", "path", "patch"}
PRODUCTION_CARD_BLOCKED_DYNAMIC_KEYS = {
    "effectParams",
    "effectVariant",
    "effectBlocks",
    "script",
    "code",
    "resolver",
    "js",
}
EFFECT_VARIANT_UNIT_SELECTORS = {
    "selectedOpponentUnit",
    "selectedOwnerUnit",
    "firstSelectedAfterBaseEffect",
    "secondSelectedAfterBaseEffect",
    "bothSelectedAfterBaseEffect",
    "allOwnerUnits",
    "allOpponentUnits",
    "opposedOpponentUnit",
    "opposedOwnerUnit",
    "adjacentOwnerUnits",
}
EFFECT_VARIANT_BASE_SELECTORS = {"enemyBase", "playerBase"}
EFFECT_VARIANT_SELECTORS = EFFECT_VARIANT_UNIT_SELECTORS | EFFECT_VARIANT_BASE_SELECTORS

EFFECT_VARIANT_SELECTOR_REPORT_METADATA = {
    "selectedOpponentUnit": "unit selector; preserved selected target identity; requires selected opponent unit",
    "selectedOwnerUnit": "unit selector; preserved selected target identity; requires selected owner unit",
    "firstSelectedAfterBaseEffect": "unit selector; first preserved selected target after base effect",
    "secondSelectedAfterBaseEffect": "unit selector; second preserved selected target after base effect",
    "bothSelectedAfterBaseEffect": "unit selector; both preserved selected targets after base effect",
    "allOwnerUnits": "unit selector; all current board units owned by owner",
    "allOpponentUnits": "unit selector; all current board units owned by opponent",
    "opposedOpponentUnit": "unit selector; opponent unit opposed to owner source lane, or selected owner unit when no source lane exists",
    "opposedOwnerUnit": "unit selector; owner unit opposed to the selected opponent unit",
    "adjacentOwnerUnits": "unit selector; owner units adjacent to owner source/selected owner unit in the same row",
    "enemyBase": "base selector; absolute enemyHP",
    "playerBase": "base selector; absolute playerHP",
}
EFFECT_VARIANT_OPERATION_METADATA = {
    "runBaseEffect": {
        "keys": {"operation"},
        "validation": "exact",
        "executable_group": "runBaseEffect",
        "report_kind": "runBaseEffect",
    },
    "damageUnit": {
        "keys": {"operation", "selector", "amount", "cleanup"},
        "validation": "damageUnit",
        "executable_group": "damageUnit",
        "report_kind": "damageUnit",
    },
    "damageEnemyBase": {
        "keys": {"operation", "selector", "amount"},
        "validation": "baseDamage",
        "required_selector": "enemyBase",
        "base_damaged": "enemyHP",
        "executable_group": "baseDamage",
        "report_kind": "baseDamage",
    },
    "damagePlayerBase": {
        "keys": {"operation", "selector", "amount"},
        "validation": "baseDamage",
        "required_selector": "playerBase",
        "base_damaged": "playerHP",
        "executable_group": "baseDamage",
        "report_kind": "baseDamage",
    },
    "debuffAttack": {
        "keys": {"operation", "selector", "amount", "duration"},
        "validation": "statModifier",
        "executable_group": "statModifier",
        "report_kind": "statModifier",
    },
    "debuffArmor": {
        "keys": {"operation", "selector", "amount", "duration"},
        "validation": "statModifier",
        "executable_group": "statModifier",
        "report_kind": "statModifier",
    },
    "buffAttack": {
        "keys": {"operation", "selector", "amount", "duration"},
        "validation": "statModifier",
        "executable_group": "statModifier",
        "report_kind": "statModifier",
    },
    "buffArmor": {
        "keys": {"operation", "selector", "amount", "duration"},
        "validation": "statModifier",
        "executable_group": "statModifier",
        "report_kind": "statModifier",
    },
    "drawOne": {
        "keys": {"operation"},
        "validation": "exact",
        "report_kind": "unsupported",
    },
}
EFFECT_VARIANT_OPERATIONS = set(EFFECT_VARIANT_OPERATION_METADATA)
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

    mode = change.get("mode")
    if mode is not None and mode != "effectVariant":
        raise BalanceLabError(f"Change #{index} mode must be effectVariant when provided.")

    has_effect_variant = mode == "effectVariant" or "effectVariant" in change
    has_stat_patch = "field" in change or "value" in change
    has_replacement = "replaceCard" in change
    selected_modes = sum(1 for value in (has_stat_patch, has_replacement, has_effect_variant) if value)
    if selected_modes != 1:
        raise BalanceLabError(
            f"Change #{index} must use exactly one mode: stat patch, replaceCard, or effectVariant."
        )

    if has_effect_variant:
        validate_effect_variant_shape(change, index)
        return

    for key in ("faction", "cardId"):
        if key not in change:
            raise BalanceLabError(f"Change #{index} is missing required field: {key}")
    if not isinstance(change["faction"], str):
        raise BalanceLabError(f"Change #{index} faction must be a string.")
    if not isinstance(change["cardId"], str):
        raise BalanceLabError(f"Change #{index} cardId must be a string.")
    if "effectParams" in change:
        raise BalanceLabError(f"Change #{index} includes effectParams, which Balance Lab v2-lite does not support.")

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
    for key in ("id", "name", "type", "targeting", "textShort"):
        if not isinstance(replace_card.get(key), str) or not replace_card.get(key):
            raise BalanceLabError(f"Change #{index} replaceCard.{key} must be a non-empty string.")
    if "effectId" in replace_card:
        effect_id = replace_card["effectId"]
        if effect_id is not None and (not isinstance(effect_id, str) or not effect_id):
            raise BalanceLabError(f"Change #{index} replaceCard.effectId must be a non-empty string, null, or omitted.")
    if replace_card["type"] == "unit":
        for key in sorted(REQUIRED_UNIT_REPLACE_CARD_FIELDS):
            value = replace_card.get(key)
            if not isinstance(value, int) or value < 0:
                raise BalanceLabError(f"Change #{index} replaceCard.{key} must be an integer >= 0 for unit cards.")


def require_non_empty_string(data: dict[str, Any], key: str, context: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise BalanceLabError(f"{context}.{key} must be a non-empty string.")
    return value


def validate_effect_variant_shape(change: dict[str, Any], index: int) -> None:
    if change.get("mode") != "effectVariant":
        raise BalanceLabError(f"Change #{index} effectVariant entries must set mode to 'effectVariant'.")
    variant = change.get("effectVariant")
    if not isinstance(variant, dict):
        raise BalanceLabError(f"Change #{index} effectVariant must be an object.")

    schema_version = variant.get("schemaVersion")
    if schema_version != EFFECT_VARIANT_SCHEMA_VERSION:
        raise BalanceLabError(
            f"Change #{index} effectVariant.schemaVersion must be {EFFECT_VARIANT_SCHEMA_VERSION}."
        )

    variant_id = require_non_empty_string(variant, "variantId", f"Change #{index} effectVariant")
    if not EFFECT_VARIANT_SAFE_ID_PATTERN.fullmatch(variant_id):
        raise BalanceLabError(
            f"Change #{index} effectVariant.variantId must use 3-97 lowercase letters, numbers, hyphens, or underscores, and start with a letter or number."
        )
    require_non_empty_string(variant, "label", f"Change #{index} effectVariant")

    scope = variant.get("scope")
    if not isinstance(scope, dict):
        raise BalanceLabError(f"Change #{index} effectVariant.scope must be an object.")
    for key in ("factionId", "cardId", "baseEffectId"):
        require_non_empty_string(scope, key, f"Change #{index} effectVariant.scope")

    timing = variant.get("timing")
    if timing != "afterBaseEffectBeforeDiscard":
        raise BalanceLabError(
            f"Change #{index} effectVariant.timing must be afterBaseEffectBeforeDiscard."
        )

    sequence = variant.get("sequence")
    if not isinstance(sequence, list) or not sequence:
        raise BalanceLabError(f"Change #{index} effectVariant.sequence must be a non-empty array.")

    run_base_indexes: list[int] = []
    for block_index, operation_block in enumerate(sequence, start=1):
        validate_effect_variant_operation_block(operation_block, index, block_index)
        if operation_block.get("operation") == "runBaseEffect":
            run_base_indexes.append(block_index)

    if len(run_base_indexes) != 1:
        raise BalanceLabError(
            f"Change #{index} effectVariant.sequence must include runBaseEffect exactly once."
        )
    if run_base_indexes[0] != 1:
        raise BalanceLabError(f"Change #{index} effectVariant.sequence must start with runBaseEffect.")

    text_patch = variant.get("textPatch")
    if text_patch is not None:
        if not isinstance(text_patch, dict):
            raise BalanceLabError(f"Change #{index} effectVariant.textPatch must be an object when provided.")
        unsupported_keys = sorted(key for key in text_patch if key != "textShort")
        if unsupported_keys:
            raise BalanceLabError(
                f"Change #{index} effectVariant.textPatch only supports textShort in PR1; unsupported key(s): {', '.join(unsupported_keys)}."
            )
        if "textShort" in text_patch and not isinstance(text_patch["textShort"], str):
            raise BalanceLabError(f"Change #{index} effectVariant.textPatch.textShort must be a string.")

    telemetry_tags = variant.get("telemetryTags")
    if telemetry_tags is not None:
        if not isinstance(telemetry_tags, list) or not all(isinstance(tag, str) for tag in telemetry_tags):
            raise BalanceLabError(f"Change #{index} effectVariant.telemetryTags must be an array of strings when provided.")


def validate_effect_variant_operation_block(operation_block: Any, change_index: int, block_index: int) -> None:
    context = f"Change #{change_index} effectVariant.sequence[{block_index}]"
    if not isinstance(operation_block, dict):
        raise BalanceLabError(f"{context} must be an object.")
    blocked_keys = sorted(EFFECT_VARIANT_BLOCKED_OPERATION_KEYS.intersection(operation_block))
    if blocked_keys:
        raise BalanceLabError(f"{context} contains unsupported code-like key(s): {', '.join(blocked_keys)}.")

    operation = operation_block.get("operation")
    if not isinstance(operation, str) or not operation:
        raise BalanceLabError(f"{context}.operation must be a non-empty string.")
    operation_metadata = EFFECT_VARIANT_OPERATION_METADATA.get(operation)
    if operation_metadata is None:
        allowed = ", ".join(sorted(EFFECT_VARIANT_OPERATIONS))
        raise BalanceLabError(f"{context}.operation '{operation}' is unsupported. Supported operations: {allowed}.")

    validation = operation_metadata["validation"]
    operation_keys = operation_metadata["keys"]
    if validation == "exact":
        require_exact_operation_keys(operation_block, operation_keys, context)
        return
    if validation == "damageUnit":
        require_exact_operation_keys(operation_block, operation_keys, context)
        validate_unit_selector(operation_block.get("selector"), context)
        validate_positive_int(operation_block.get("amount"), f"{context}.amount")
        if operation_block.get("cleanup") != "nonCombat":
            raise BalanceLabError(f"{context}.cleanup must be nonCombat.")
        return
    if validation == "baseDamage":
        require_exact_operation_keys(operation_block, operation_keys, context)
        required_selector = operation_metadata["required_selector"]
        if operation_block.get("selector") != required_selector:
            raise BalanceLabError(f"{context}.selector must be {required_selector} for {operation}.")
        validate_positive_int(operation_block.get("amount"), f"{context}.amount")
        return
    if validation == "statModifier":
        require_allowed_operation_keys(operation_block, operation_keys, context)
        for required_key in ("selector", "amount"):
            if required_key not in operation_block:
                raise BalanceLabError(f"{context}.{required_key} is required for {operation}.")
        validate_unit_selector(operation_block.get("selector"), context)
        validate_positive_int(operation_block.get("amount"), f"{context}.amount")
        if "duration" not in operation_block:
            raise BalanceLabError(f"{context}.duration is required for {operation}.")
        if operation_block.get("duration") != "untilCombatCleanup":
            raise BalanceLabError(f"{context}.duration must be untilCombatCleanup.")
        return


def require_exact_operation_keys(operation_block: dict[str, Any], expected_keys: set[str], context: str) -> None:
    actual_keys = set(operation_block)
    if actual_keys != expected_keys:
        unexpected = sorted(actual_keys - expected_keys)
        missing = sorted(expected_keys - actual_keys)
        details = []
        if missing:
            details.append(f"missing: {', '.join(missing)}")
        if unexpected:
            details.append(f"unsupported: {', '.join(unexpected)}")
        raise BalanceLabError(f"{context} has invalid argument(s) ({'; '.join(details)}).")


def require_allowed_operation_keys(operation_block: dict[str, Any], allowed_keys: set[str], context: str) -> None:
    unexpected = sorted(set(operation_block) - allowed_keys)
    if unexpected:
        raise BalanceLabError(f"{context} has unsupported argument(s): {', '.join(unexpected)}.")


def validate_unit_selector(selector: Any, context: str) -> None:
    if not isinstance(selector, str) or not selector:
        raise BalanceLabError(f"{context}.selector must be a non-empty string.")
    if selector not in EFFECT_VARIANT_SELECTORS:
        allowed = ", ".join(sorted(EFFECT_VARIANT_SELECTORS))
        raise BalanceLabError(f"{context}.selector '{selector}' is unsupported. Supported selectors: {allowed}.")
    if selector not in EFFECT_VARIANT_UNIT_SELECTORS:
        allowed = ", ".join(sorted(EFFECT_VARIANT_UNIT_SELECTORS))
        raise BalanceLabError(f"{context}.selector '{selector}' must resolve to unit target(s). Unit selectors: {allowed}.")


def validate_positive_int(value: Any, context: str) -> None:
    if not isinstance(value, int) or value <= 0:
        raise BalanceLabError(f"{context} must be an integer greater than 0.")


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




def validate_production_card_safety(root: Path) -> None:
    for path, faction_data in load_faction_files(root):
        deck = faction_data.get("deck")
        if not isinstance(deck, list):
            continue
        for card_index, card in enumerate(deck, start=1):
            if not isinstance(card, dict):
                continue
            blocked_keys = sorted(PRODUCTION_CARD_BLOCKED_DYNAMIC_KEYS.intersection(card))
            if blocked_keys:
                card_id = card.get("id", f"deck entry #{card_index}")
                raise BalanceLabError(
                    f"Production card data contains unsupported dynamic effect field(s) in {path} / {card_id}: "
                    f"{', '.join(blocked_keys)}. Balance Lab v3 effect variants must remain temp-copy only."
                )


def find_faction_file_by_id(root: Path, faction_id: str) -> tuple[Path, dict[str, Any]] | None:
    for path, data in load_faction_files(root):
        if data.get("id") == faction_id:
            return path, data
    return None


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
    validate_production_card_safety(root)
    validated = []
    known_effect_ids = collect_known_effect_ids(root)
    seen_variant_ids: set[str] = set()
    seen_variant_scopes: set[tuple[str, str, str]] = set()

    for index, change in enumerate(changes, start=1):
        if is_effect_variant_change(change):
            validated.append(validate_requested_effect_variant(root, change, index))
            variant = validated[-1]["effectVariant"]
            variant_id = variant["variantId"]
            if variant_id in seen_variant_ids:
                raise BalanceLabError(f"Change #{index} effectVariant.variantId '{variant_id}' is duplicated in this experiment.")
            seen_variant_ids.add(variant_id)
            scope = variant["scope"]
            scope_key = (scope["factionId"], scope["cardId"], scope["baseEffectId"])
            if scope_key in seen_variant_scopes:
                raise BalanceLabError(
                    f"Change #{index} effectVariant scope {scope_key[0]} / {scope_key[1]} / {scope_key[2]} is duplicated in this experiment."
                )
            seen_variant_scopes.add(scope_key)
            continue

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
            effect_id = replace_card.get("effectId")
            if effect_id is not None and effect_id not in known_effect_ids:
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


def is_effect_variant_change(change: dict[str, Any]) -> bool:
    return change.get("mode") == "effectVariant" or "effectVariant" in change


def validate_requested_effect_variant(root: Path, change: dict[str, Any], index: int) -> dict[str, Any]:
    variant = dict(change["effectVariant"])
    scope = dict(variant["scope"])
    faction_id = scope["factionId"]
    faction_match = find_faction_file_by_id(root, faction_id)
    if faction_match is None:
        raise BalanceLabError(
            f"Change #{index} effectVariant.scope.factionId '{faction_id}' was not found as a top-level faction id."
        )
    source_path, faction_data = faction_match
    if faction_data.get("id") != faction_id:
        raise BalanceLabError(
            f"Change #{index} effectVariant.scope.factionId '{faction_id}' does not match top-level faction id in {source_path}."
        )
    deck = faction_data.get("deck")
    if not isinstance(deck, list):
        raise BalanceLabError(f"Faction file has no deck array: {source_path}")
    card_id = scope["cardId"]
    card = next((entry for entry in deck if isinstance(entry, dict) and entry.get("id") == card_id), None)
    if card is None:
        raise BalanceLabError(
            f"Change #{index} effectVariant.scope.cardId '{card_id}' was not found in {source_path}."
        )
    base_effect_id = scope["baseEffectId"]
    if card.get("effectId") != base_effect_id:
        raise BalanceLabError(
            f"Change #{index} effectVariant.scope.baseEffectId '{base_effect_id}' does not match current card.effectId "
            f"'{card.get('effectId')}' for {card_id}."
        )

    variant["scope"] = scope
    metadata = effect_variant_runtime_metadata(variant)
    return {
        "index": index,
        "mode": "effectVariant",
        "effectVariant": variant,
        "faction": faction_id,
        "cardId": card_id,
        "oldCard": card,
        "relativePath": source_path.relative_to(root),
        **metadata,
    }


def effect_variant_registry_key(variant: dict[str, Any]) -> str:
    scope = variant["scope"]
    return f"{scope['factionId']}::{scope['cardId']}::{scope['baseEffectId']}"


def is_run_base_effect_only_variant(variant: dict[str, Any]) -> bool:
    sequence = variant.get("sequence")
    return (
        isinstance(sequence, list)
        and len(sequence) == 1
        and isinstance(sequence[0], dict)
        and sequence[0] == {"operation": "runBaseEffect"}
    )


def is_damage_unit_executable_variant(variant: dict[str, Any]) -> bool:
    sequence = variant.get("sequence")
    return (
        isinstance(sequence, list)
        and len(sequence) >= 2
        and isinstance(sequence[0], dict)
        and sequence[0] == {"operation": "runBaseEffect"}
        and all(isinstance(block, dict) and block.get("operation") == "damageUnit" for block in sequence[1:])
    )


def effect_variant_operation_group(block: dict[str, Any]) -> str | None:
    if not isinstance(block, dict):
        return None
    metadata = EFFECT_VARIANT_OPERATION_METADATA.get(block.get("operation"))
    if not metadata:
        return None
    group = metadata.get("executable_group")
    return group if group in {"damageUnit", "statModifier", "baseDamage"} else None


def is_stat_modifier_operation_block(block: dict[str, Any]) -> bool:
    return effect_variant_operation_group(block) == "statModifier"


def is_base_damage_operation_block(block: dict[str, Any]) -> bool:
    return effect_variant_operation_group(block) == "baseDamage"


def is_pr5_executable_operation_block(block: dict[str, Any]) -> bool:
    return effect_variant_operation_group(block) is not None


def is_pr5_legacy_or_new_executable_operation_block(block: dict[str, Any]) -> bool:
    return is_pr5_executable_operation_block(block)


def is_pr5_executable_variant(variant: dict[str, Any]) -> bool:
    sequence = variant.get("sequence")
    return (
        isinstance(sequence, list)
        and len(sequence) >= 2
        and isinstance(sequence[0], dict)
        and sequence[0] == {"operation": "runBaseEffect"}
        and all(is_pr5_executable_operation_block(block) for block in sequence[1:])
    )


def is_stat_modifier_executable_variant(variant: dict[str, Any]) -> bool:
    sequence = variant.get("sequence")
    return is_pr5_executable_variant(variant) and any(is_stat_modifier_operation_block(block) for block in sequence[1:])


def is_base_damage_executable_variant(variant: dict[str, Any]) -> bool:
    sequence = variant.get("sequence")
    return is_pr5_executable_variant(variant) and any(is_base_damage_operation_block(block) for block in sequence[1:])


def has_mixed_executable_operations(variant: dict[str, Any]) -> bool:
    sequence = variant.get("sequence")
    if not is_pr5_executable_variant(variant):
        return False
    operation_groups = set()
    for block in sequence[1:]:
        operation_group = effect_variant_operation_group(block)
        if operation_group:
            operation_groups.add(operation_group)
    return len(operation_groups) > 1


def effect_variant_execution_status(variant: dict[str, Any]) -> str:
    if is_run_base_effect_only_variant(variant):
        return EFFECT_VARIANT_REGISTRY_GENERATED_STATUS
    if has_mixed_executable_operations(variant):
        return EFFECT_VARIANT_MIXED_OPERATIONS_EXECUTED_STATUS
    if is_base_damage_executable_variant(variant):
        return EFFECT_VARIANT_BASE_DAMAGE_EXECUTED_STATUS
    if is_stat_modifier_executable_variant(variant):
        return EFFECT_VARIANT_STAT_MODIFIER_EXECUTED_STATUS
    if is_damage_unit_executable_variant(variant):
        return EFFECT_VARIANT_DAMAGE_UNIT_EXECUTED_STATUS
    return EFFECT_VARIANT_STATUS


def effect_variant_hash(variant: dict[str, Any]) -> str:
    canonical = json.dumps(variant, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def effect_variant_runtime_metadata(variant: dict[str, Any], registry_path: Path | str = EFFECT_VARIANT_REGISTRY_RELATIVE_PATH) -> dict[str, Any]:
    run_base_effect_only = is_run_base_effect_only_variant(variant)
    damage_unit_executable = is_damage_unit_executable_variant(variant)
    stat_modifier_executable = is_stat_modifier_executable_variant(variant)
    base_damage_executable = is_base_damage_executable_variant(variant)
    return {
        "registryKey": effect_variant_registry_key(variant),
        "variantHash": effect_variant_hash(variant),
        "runBaseEffectOnly": run_base_effect_only,
        "damageUnitExecutable": damage_unit_executable,
        "statModifierExecutable": stat_modifier_executable,
        "baseDamageExecutable": base_damage_executable,
        "registryPath": str(registry_path),
        "status": effect_variant_execution_status(variant),
    }

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
    print("  OK package.json found", flush=True)
    print("  OK scripts/simulate-battles.mjs found", flush=True)
    print("  OK src/data/factions found", flush=True)
    print("  OK experiment JSON loaded", flush=True)
    print("  OK requested changes validated", flush=True)
    print("", flush=True)
    print("Experiment summary:", flush=True)
    print(f"  Name: {data['name']}", flush=True)
    print(f"  Match count per matchup: {data['matchCount']}", flush=True)
    print(f"  Seed: {data['seed']}", flush=True)
    print(f"  Telemetry: {data['telemetry']}", flush=True)
    print(f"  Warning delta: {flags['warningDeltaPp']} percentage points", flush=True)
    print(f"  Danger delta: {flags['dangerDeltaPp']} percentage points", flush=True)
    print("", flush=True)
    print("Requested changes:", flush=True)
    if data["changes"]:
        for index, change in enumerate(data["changes"], start=1):
            if is_effect_variant_change(change):
                variant = change["effectVariant"]
                scope = variant["scope"]
                print(
                    f"  {index}. effectVariant {variant['variantId']}: "
                    f"{scope['factionId']} / {scope['cardId']} / {scope['baseEffectId']} "
                    f"({effect_variant_runtime_metadata(variant)['status']})",
                    flush=True,
                )
            elif "replaceCard" in change:
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
        print("  No changes listed.", flush=True)
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
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
        env=utf8_subprocess_env(),
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
    applied = []
    for change in validated_changes:
        if change.get("mode") == "effectVariant":
            recognized_change = dict(change)
            recognized_change["tempJsonPath"] = temp_copy_dir / change["relativePath"]
            recognized_change["registryPath"] = str(temp_copy_dir / EFFECT_VARIANT_REGISTRY_RELATIVE_PATH)
            recognized_change["textPatchApplied"] = False
            recognized_change["behaviorExecuted"] = False
            applied.append(recognized_change)
            continue
        by_path.setdefault(change["relativePath"], []).append(change)

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
    write_effect_variant_registry(temp_copy_dir, applied)
    return applied


def build_effect_variant_registry_entries(applied_changes: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    entries: dict[str, dict[str, Any]] = {}
    for change in applied_changes:
        if change.get("mode") != "effectVariant" or change.get("status") not in {EFFECT_VARIANT_REGISTRY_GENERATED_STATUS, EFFECT_VARIANT_DAMAGE_UNIT_EXECUTED_STATUS, EFFECT_VARIANT_STAT_MODIFIER_EXECUTED_STATUS, EFFECT_VARIANT_BASE_DAMAGE_EXECUTED_STATUS, EFFECT_VARIANT_MIXED_OPERATIONS_EXECUTED_STATUS}:
            continue
        variant = change["effectVariant"]
        scope = variant["scope"]
        registry_key = change["registryKey"]
        entries[registry_key] = {
            "schemaVersion": EFFECT_VARIANT_SCHEMA_VERSION,
            "variantId": variant["variantId"],
            "label": variant["label"],
            "registryKey": registry_key,
            "variantHash": change["variantHash"],
            "runBaseEffectOnly": bool(change.get("runBaseEffectOnly")),
            "damageUnitExecutable": bool(change.get("damageUnitExecutable")),
            "statModifierExecutable": bool(change.get("statModifierExecutable")),
            "baseDamageExecutable": bool(change.get("baseDamageExecutable")),
            "scope": {
                "factionId": scope["factionId"],
                "cardId": scope["cardId"],
                "baseEffectId": scope["baseEffectId"],
            },
            "baseEffectId": scope["baseEffectId"],
            "timing": variant["timing"],
            "sequence": variant["sequence"],
            "telemetryTags": variant.get("telemetryTags", []),
            "status": change.get("status", EFFECT_VARIANT_REGISTRY_GENERATED_STATUS),
        }
    return entries


def write_effect_variant_registry(temp_copy_dir: Path, applied_changes: list[dict[str, Any]]) -> None:
    registry_path = temp_copy_dir / EFFECT_VARIANT_REGISTRY_RELATIVE_PATH
    registry_entries = build_effect_variant_registry_entries(applied_changes)
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry_json = json.dumps(registry_entries, indent=2, ensure_ascii=False)
    registry_path.write_text(
        "export const EFFECT_VARIANT_REGISTRY_SCHEMA_VERSION = 1;\n"
        f"export const ACTIVE_EFFECT_VARIANTS = Object.freeze({registry_json});\n",
        encoding="utf-8",
    )


def format_json_block(data: dict[str, Any]) -> list[str]:
    return ["```json", json.dumps(data, indent=2, ensure_ascii=False), "```"]




def selector_report_detail(selector: Any) -> str:
    if not isinstance(selector, str):
        return "selector metadata unavailable"
    return EFFECT_VARIANT_SELECTOR_REPORT_METADATA.get(selector, "selector metadata unavailable")

def sequence_summary(sequence: list[dict[str, Any]]) -> str:
    parts = []
    for block in sequence:
        operation = block.get("operation", "unknown")
        args = []
        for key in ("selector", "amount", "cleanup", "duration"):
            if key in block:
                args.append(f"{key}={block[key]}")
        parts.append(f"{operation}({', '.join(args)})" if args else operation)
    return " -> ".join(parts)



def effect_variant_operation_telemetry_summary(variant: dict[str, Any], status: str) -> str:
    operation_parts = []
    for block in variant.get("sequence", []):
        operation = block.get("operation")
        metadata = EFFECT_VARIANT_OPERATION_METADATA.get(operation, {"report_kind": "unsupported"})
        report_kind = metadata["report_kind"]
        if report_kind == "runBaseEffect":
            operation_parts.append("runBaseEffect: base effect executed by normal resolver")
        elif report_kind == "damageUnit":
            operation_parts.append(
                "damageUnit: "
                f"selector={block.get('selector')} ({selector_report_detail(block.get('selector'))}), amount={block.get('amount')}, cleanup={block.get('cleanup')}, "
                "targets resolved at runtime by selector semantics (including preserved selected-target identity when applicable), "
                "damage dealt/kills/skips recorded in GameState telemetry, "
                f"status={status}"
            )
        elif report_kind == "baseDamage":
            operation_parts.append(
                f"{operation}: "
                f"selector={block.get('selector')} ({selector_report_detail(block.get('selector'))}), amount={block.get('amount')}, baseDamaged={metadata['base_damaged']}, "
                "absolute base damage recorded in GameState telemetry with damage dealt, "
                f"status={status}"
            )
        elif report_kind == "statModifier":
            operation_parts.append(
                f"{operation}: "
                f"selector={block.get('selector')} ({selector_report_detail(block.get('selector'))}), amount={block.get('amount')}, duration={block.get('duration')}, "
                "targets resolved at runtime by selector semantics (including preserved selected-target identity when applicable), "
                "attack/armor added/reduced and skips recorded in GameState telemetry, "
                f"status={status}"
            )
        else:
            operation_parts.append(f"{operation}: PR5 unsupported for execution; drawOne remains recognized_not_executed/report-only rather than executable; status={status}")
    return " ; ".join(operation_parts)


def effect_variant_operation_report_lines(rows: list[dict[str, Any]]) -> list[str]:
    if not rows:
        return ["No effect variant operations recognized."]
    lines = []
    for row in rows:
        lines.extend([
            f"- `{row['variantId']}` (`{row['registryKey']}`) status `{row['status']}`",
            f"  - Operation telemetry metadata: {row['operationTelemetrySummary']}",
            "  - Runtime counters: damageUnit/stat modifier/base damage execution writes per-operation entries to `state.effectVariantOperationTelemetry`; aggregate report counters are deferred because PR5 does not modify `scripts/simulate-battles.mjs`.",
        ])
    return lines

def effect_variant_report_rows_from_changes(changes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for change in changes:
        if change.get("mode") != "effectVariant":
            continue
        variant = change["effectVariant"]
        scope = variant["scope"]
        metadata = effect_variant_runtime_metadata(variant)
        runtime = change.get("effectVariantRuntime", {})
        registry_key = change.get("registryKey", runtime.get("registryKey", metadata["registryKey"]))
        registry_path = change.get("registryPath", runtime.get("registryPath", metadata["registryPath"]))
        variant_hash = change.get("variantHash", runtime.get("variantHash", metadata["variantHash"]))
        run_base_effect_only = change.get("runBaseEffectOnly", runtime.get("runBaseEffectOnly", metadata["runBaseEffectOnly"]))
        damage_unit_executable = change.get("damageUnitExecutable", runtime.get("damageUnitExecutable", metadata["damageUnitExecutable"]))
        stat_modifier_executable = change.get("statModifierExecutable", runtime.get("statModifierExecutable", metadata["statModifierExecutable"]))
        base_damage_executable = change.get("baseDamageExecutable", runtime.get("baseDamageExecutable", metadata["baseDamageExecutable"]))
        status = change.get("status", runtime.get("status", metadata["status"]))
        rows.append({
            "index": change.get("index", ""),
            "variantId": variant["variantId"],
            "label": variant["label"],
            "factionId": scope["factionId"],
            "cardId": scope["cardId"],
            "registryKey": registry_key,
            "registryPath": str(registry_path),
            "variantHash": variant_hash,
            "runBaseEffectOnly": run_base_effect_only,
            "damageUnitExecutable": damage_unit_executable,
            "statModifierExecutable": stat_modifier_executable,
            "baseDamageExecutable": base_damage_executable,
            "baseEffectId": scope["baseEffectId"],
            "timing": variant["timing"],
            "sequence": sequence_summary(variant["sequence"]),
            "telemetryTags": ", ".join(variant.get("telemetryTags", [])) or "None",
            "status": status,
            "operationTelemetrySummary": effect_variant_operation_telemetry_summary(variant, status),
            "textPatch": variant.get("textPatch", {}).get("textShort", ""),
        })
    return rows


def effect_variant_report_rows_from_data(data: dict[str, Any]) -> list[dict[str, Any]]:
    changes = []
    for index, change in enumerate(data.get("changes", []), start=1):
        if isinstance(change, dict) and is_effect_variant_change(change):
            changes.append({
                "index": index,
                "mode": "effectVariant",
                "effectVariant": change["effectVariant"],
                "effectVariantRuntime": change.get("effectVariantRuntime", {}),
                "status": change.get("effectVariantRuntime", {}).get("status", effect_variant_runtime_metadata(change["effectVariant"])["status"]),
            })
    return effect_variant_report_rows_from_changes(changes)


def annotate_experiment_data_with_effect_variant_runtime(data: dict[str, Any], applied_changes: list[dict[str, Any]]) -> dict[str, Any]:
    annotated = dict(data)
    changes = list(data.get("changes", []))
    applied_by_index = {change.get("index"): change for change in applied_changes if change.get("mode") == "effectVariant"}
    annotated_changes = []
    for index, change in enumerate(changes, start=1):
        if isinstance(change, dict) and is_effect_variant_change(change) and index in applied_by_index:
            applied = applied_by_index[index]
            annotated_change = dict(change)
            annotated_change["effectVariantRuntime"] = {
                "registryKey": applied.get("registryKey", ""),
                "registryPath": applied.get("registryPath", str(EFFECT_VARIANT_REGISTRY_RELATIVE_PATH)),
                "variantHash": applied.get("variantHash", ""),
                "runBaseEffectOnly": bool(applied.get("runBaseEffectOnly")),
                "damageUnitExecutable": bool(applied.get("damageUnitExecutable")),
                "statModifierExecutable": bool(applied.get("statModifierExecutable")),
                "baseDamageExecutable": bool(applied.get("baseDamageExecutable")),
                "status": applied.get("status", EFFECT_VARIANT_STATUS),
            }
            annotated_changes.append(annotated_change)
        else:
            annotated_changes.append(change)
    annotated["changes"] = annotated_changes
    return annotated


def has_effect_variants(data: dict[str, Any]) -> bool:
    return bool(effect_variant_report_rows_from_data(data))


def effect_variant_table_lines(rows: list[dict[str, Any]]) -> list[str]:
    lines = [
        "| # | Variant ID | Label | Faction ID | Card ID | Registry key | Registry path | Base effectId | Timing | Sequence | Telemetry tags | Status |",
        "|---:|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    if not rows:
        lines.append("| N/A | None | None | None | None | None | None | None | None | None | None | none |")
        return lines
    for row in rows:
        lines.append(
            f"| {row['index']} | {row['variantId']} | {escape_markdown_table_cell(row['label'])} | "
            f"{row['factionId']} | {row['cardId']} | {escape_markdown_table_cell(row['registryKey'])} | "
            f"`{escape_markdown_table_cell(row['registryPath'])}` | {row['baseEffectId']} | {row['timing']} | "
            f"{escape_markdown_table_cell(row['sequence'])} | {escape_markdown_table_cell(row['telemetryTags'])} | "
            f"{row['status']} |"
        )
    return lines


def effect_variant_summary_lines(rows: list[dict[str, Any]]) -> list[str]:
    if not rows:
        return ["No effect variants recognized."]
    lines = []
    for row in rows:
        lines.extend([
            f"- `{row['variantId']}` — {row['label']}",
            f"  - Scope: `{row['factionId']}` / `{row['cardId']}` / `{row['baseEffectId']}`",
            f"  - Registry key: `{row['registryKey']}`",
            f"  - Registry path: `{row['registryPath']}`",
            f"  - Variant hash: `{row['variantHash']}`",
            f"  - runBaseEffect-only: `{str(row['runBaseEffectOnly']).lower()}`",
            f"  - damageUnit executable: `{str(row['damageUnitExecutable']).lower()}`",
            f"  - stat modifier executable: `{str(row['statModifierExecutable']).lower()}`",
            f"  - base damage executable: `{str(row['baseDamageExecutable']).lower()}`",
            f"  - Timing: `{row['timing']}`",
            f"  - Sequence: `{row['sequence']}`",
            f"  - Telemetry tags: {row['telemetryTags']}",
            f"  - Status: `{row['status']}`",
            f"  - Operation telemetry metadata: {row['operationTelemetrySummary']}",
        ])
        if row.get("textPatch"):
            lines.append(f"  - Report-only textPatch.textShort: {row['textPatch']}")
    return lines


def effect_variant_paste_lines(rows: list[dict[str, Any]]) -> list[str]:
    if not rows:
        return ["Effect variants: none"]
    lines = ["Effect variants:"]
    for row in rows:
        lines.extend([
            f"- variantId: {row['variantId']}",
            f"  label: {row['label']}",
            f"  scope: {row['factionId']} / {row['cardId']} / {row['baseEffectId']}",
            f"  registryKey: {row['registryKey']}",
            f"  registryPath: {row['registryPath']}",
            f"  variantHash: {row['variantHash']}",
            f"  runBaseEffectOnly: {str(row['runBaseEffectOnly']).lower()}",
            f"  damageUnitExecutable: {str(row['damageUnitExecutable']).lower()}",
            f"  statModifierExecutable: {str(row['statModifierExecutable']).lower()}",
            f"  baseDamageExecutable: {str(row['baseDamageExecutable']).lower()}",
            f"  baseEffectId: {row['baseEffectId']}",
            f"  timing: {row['timing']}",
            f"  sequence: {row['sequence']}",
            f"  telemetryTags: {row['telemetryTags']}",
            f"  status: {row['status']}",
            f"  operationTelemetry: {row['operationTelemetrySummary']}",
        ])
    return lines


def format_patch_value(value: Any) -> str:
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def replacement_delta_lines(old_card: dict[str, Any], new_card: dict[str, Any]) -> list[str]:
    fields = sorted(set(old_card) | set(new_card))
    lines = []
    for field in fields:
        old_value = old_card.get(field) if field in old_card else "(omitted)"
        new_value = new_card.get(field) if field in new_card else "(omitted)"
        if old_value == new_value:
            continue
        lines.append(f"- {field}: {format_patch_value(old_value)} → {format_patch_value(new_value)}")
    return lines or ["- No field-level differences detected."]


def write_patch_summary(report_dir: Path, applied_changes: list[dict[str, Any]]) -> Path:
    patch_summary_path = report_dir / PATCH_SUMMARY_FILENAME
    effect_variant_changes = [change for change in applied_changes if change.get("mode") == "effectVariant"]
    patchable_changes = [change for change in applied_changes if change.get("mode") != "effectVariant"]
    lines = [
        "# Balance Lab Patch Summary",
        "",
        "All executable card-data patches were applied only inside the temporary experiment copy.",
        "Effect Variant entries generate a temp-copy runtime registry for runBaseEffect-only variants, damageUnit executable variants, PR5 stat modifier executable variants, and PR5 base damage executable variants. drawOne remains report-only with recognized_not_executed status and a PR5 unsupported-execution note.",
        "",
    ]
    if not patchable_changes:
        lines.append("No stat patch or full-card replacement changes were requested.")
        lines.append("")
    else:
        stat_changes = [change for change in patchable_changes if change.get("mode") == "stat"]
        replacement_changes = [change for change in patchable_changes if change.get("mode") == "replaceCard"]
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
                    "Changed fields:",
                    *replacement_delta_lines(change["oldCard"], change["newCard"]),
                    "",
                    "Old card JSON:",
                    *format_json_block(change["oldCard"]),
                    "",
                    "New card JSON:",
                    *format_json_block(change["newCard"]),
                    "",
                ])
    lines.extend([
        "## Effect Variant Recognition",
        "",
        "Status `registry_generated` means a temp-copy active registry entry was written for an exactly runBaseEffect-only variant. Status `damage_unit_executed` means a temp-copy active registry entry was written for runBaseEffect followed by one or more damageUnit operations. Status `stat_modifier_executed` means PR5 wrote a temp-copy active registry entry for runBaseEffect followed by one or more stat modifier operations. Status `base_damage_executed` means PR5 wrote a temp-copy active registry entry for runBaseEffect followed by one or more absolute base damage operations. Status `mixed_operations_executed` means PR5 wrote a temp-copy active registry entry for a supported mixed sequence. Status `recognized_not_executed` means the variant remains report-only; PR5 does not execute drawOne.",
        "",
        *effect_variant_table_lines(effect_variant_report_rows_from_changes(effect_variant_changes)),
        "",
        "## Effect Variant Operation Telemetry",
        "",
        *effect_variant_operation_report_lines(effect_variant_report_rows_from_changes(effect_variant_changes)),
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
        "The experiment ran in the temporary copy after applying executable stat patch and replaceCard changes plus a temp-copy effect variant registry for runBaseEffect-only, damageUnit, PR5 stat modifier, and PR5 base damage executable variants.",
        "PR5 executes runBaseEffect-only parity variants, generic damageUnit operations, generic temporary stat modifier operations, and absolute damageEnemyBase/damagePlayerBase operations after the base effect; drawOne remains report-only.",
        f"Full card replacement tested: {'yes' if has_full_card_replacement(data) else 'no'}",
        f"Effect Variant entries recognized: {'yes' if has_effect_variants(data) else 'no'}",
        "",
        "## Effect Variant Recognition",
        "",
        *effect_variant_summary_lines(effect_variant_report_rows_from_data(data)),
        "",
        "## Effect Variant Operation Telemetry",
        "",
        *effect_variant_operation_report_lines(effect_variant_report_rows_from_data(data)),
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
        if isinstance(change, dict) and is_effect_variant_change(change):
            variant = change["effectVariant"]
            scope = variant["scope"]
            metadata = change.get("effectVariantRuntime", effect_variant_runtime_metadata(variant))
            parts.append(f"effectVariant {variant['variantId']} ({scope['factionId']}/{scope['cardId']} {metadata['status']})")
            continue
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



CARD_TELEMETRY_COLUMNS = [
    "faction",
    "card",
    "id",
    "drawn",
    "played",
    "held at defeat",
    "avg turn played",
]


class CardTelemetryParseError(Exception):
    """A non-fatal card telemetry parsing error."""


def markdown_cell(value: Any) -> str:
    return str(value).replace("|", "\\|")


def parse_int_cell(value: str, field: str, row_label: str) -> int:
    try:
        return int(value)
    except ValueError as error:
        raise CardTelemetryParseError(f"{row_label} field '{field}' is not an integer: {value!r}") from error


def parse_float_cell(value: str, field: str, row_label: str) -> float:
    try:
        return float(value)
    except ValueError as error:
        raise CardTelemetryParseError(f"{row_label} field '{field}' is not a number: {value!r}") from error


def console_table_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.split("│")[1:-1]]


def parse_card_telemetry_table(output_text: str, label: str) -> list[dict[str, Any]]:
    section = extract_named_section(output_text, "Simulator telemetry: per-card summary")
    if not section.strip():
        raise CardTelemetryParseError(f"{label} card telemetry section was not found")

    header_columns: list[str] | None = None
    for line in section.splitlines():
        if "│" not in line:
            continue
        cells = [clean_table_value(cell) for cell in console_table_cells(line)]
        if cells and cells[0] == "(index)":
            header_columns = cells[1:]
            break

    if header_columns != CARD_TELEMETRY_COLUMNS:
        raise CardTelemetryParseError(
            f"{label} card telemetry columns were {header_columns or 'not found'}, "
            f"expected {CARD_TELEMETRY_COLUMNS}"
        )

    raw_rows = parse_console_table_section(output_text, "Simulator telemetry: per-card summary", CARD_TELEMETRY_COLUMNS)
    if not raw_rows:
        raise CardTelemetryParseError(f"{label} card telemetry table had no data rows")

    parsed_rows: list[dict[str, Any]] = []
    seen_keys: set[tuple[str, str]] = set()
    for index, row in enumerate(raw_rows, start=1):
        row_label = f"{label} card telemetry row {index}"
        faction = row["faction"]
        card_id = row["id"]
        if not faction:
            raise CardTelemetryParseError(f"{row_label} is missing faction")
        if not card_id:
            raise CardTelemetryParseError(f"{row_label} is missing id")
        key = (faction, card_id)
        if key in seen_keys:
            raise CardTelemetryParseError(f"{label} card telemetry has duplicate key {key}")
        seen_keys.add(key)
        parsed_rows.append({
            "faction": faction,
            "card": row["card"],
            "id": card_id,
            "drawn": parse_int_cell(row["drawn"], "drawn", row_label),
            "played": parse_int_cell(row["played"], "played", row_label),
            "heldAtDefeat": parse_int_cell(row["held at defeat"], "held at defeat", row_label),
            "avgTurnPlayed": parse_float_cell(row["avg turn played"], "avg turn played", row_label),
        })
    return parsed_rows


def format_count_delta(value: int) -> str:
    return f"{value:+d}"


def format_avg_value(value: float) -> str:
    return f"{value:.2f}"


def format_avg_delta(value: float) -> str:
    return f"{value:+.2f}"


def build_card_telemetry_comparison(
    baseline_text: str,
    experiment_text: str,
) -> dict[str, Any]:
    try:
        baseline_rows = parse_card_telemetry_table(baseline_text, "Baseline")
        experiment_rows = parse_card_telemetry_table(experiment_text, "Experiment")
    except CardTelemetryParseError as error:
        warning = f"Card telemetry comparison skipped: {error}. Raw card telemetry files are still available."
        print(f"Warning: {warning}", flush=True)
        return {
            "warning": warning,
            "changedRows": [],
            "baselineOnlyRows": [],
            "experimentOnlyRows": [],
            "pasteLines": ["- Not available; card telemetry parsing failed. See raw card telemetry files."],
        }

    baseline_by_key = {(row["faction"], row["id"]): row for row in baseline_rows}
    experiment_by_key = {(row["faction"], row["id"]): row for row in experiment_rows}
    shared_keys = sorted(set(baseline_by_key) & set(experiment_by_key))

    comparison_rows: list[dict[str, Any]] = []
    for key in shared_keys:
        baseline_row = baseline_by_key[key]
        experiment_row = experiment_by_key[key]
        drawn_delta = experiment_row["drawn"] - baseline_row["drawn"]
        played_delta = experiment_row["played"] - baseline_row["played"]
        held_delta = experiment_row["heldAtDefeat"] - baseline_row["heldAtDefeat"]
        avg_delta = experiment_row["avgTurnPlayed"] - baseline_row["avgTurnPlayed"]
        comparison_rows.append({
            "faction": baseline_row["faction"],
            "card": experiment_row["card"] or baseline_row["card"],
            "id": baseline_row["id"],
            "baselineDrawn": baseline_row["drawn"],
            "experimentDrawn": experiment_row["drawn"],
            "drawnDelta": drawn_delta,
            "baselinePlayed": baseline_row["played"],
            "experimentPlayed": experiment_row["played"],
            "playedDelta": played_delta,
            "baselineHeldAtDefeat": baseline_row["heldAtDefeat"],
            "experimentHeldAtDefeat": experiment_row["heldAtDefeat"],
            "heldAtDefeatDelta": held_delta,
            "baselineAvgTurn": baseline_row["avgTurnPlayed"],
            "experimentAvgTurn": experiment_row["avgTurnPlayed"],
            "avgTurnDelta": avg_delta,
        })

    comparison_rows.sort(
        key=lambda row: (
            -abs(row["playedDelta"]),
            -abs(row["drawnDelta"]),
            row["faction"],
            row["card"],
            row["id"],
        )
    )
    changed_rows = [
        row for row in comparison_rows
        if row["drawnDelta"] != 0
        or row["playedDelta"] != 0
        or row["heldAtDefeatDelta"] != 0
        or round(row["avgTurnDelta"], 2) != 0
    ]

    baseline_only_rows = sorted(
        (baseline_by_key[key] for key in set(baseline_by_key) - set(experiment_by_key)),
        key=lambda row: (row["faction"], row["card"], row["id"]),
    )
    experiment_only_rows = sorted(
        (experiment_by_key[key] for key in set(experiment_by_key) - set(baseline_by_key)),
        key=lambda row: (row["faction"], row["card"], row["id"]),
    )

    paste_rows = changed_rows[:10]
    paste_lines: list[str] = []
    for row in paste_rows:
        paste_lines.extend([
            f"- {row['faction']} / {row['card']} / {row['id']}",
            f"  Played: baseline {row['baselinePlayed']} -> experiment {row['experimentPlayed']} "
            f"(delta {format_count_delta(row['playedDelta'])})",
            f"  Drawn: baseline {row['baselineDrawn']} -> experiment {row['experimentDrawn']} "
            f"(delta {format_count_delta(row['drawnDelta'])})",
            f"  Held at defeat: baseline {row['baselineHeldAtDefeat']} -> experiment {row['experimentHeldAtDefeat']} "
            f"(delta {format_count_delta(row['heldAtDefeatDelta'])})",
            f"  Avg turn: baseline {format_avg_value(row['baselineAvgTurn'])} -> experiment {format_avg_value(row['experimentAvgTurn'])} "
            f"(delta {format_avg_delta(row['avgTurnDelta'])})",
        ])
    if not paste_lines:
        paste_lines = ["- No changed card telemetry rows parsed."]

    return {
        "warning": "",
        "changedRows": changed_rows,
        "baselineOnlyRows": baseline_only_rows,
        "experimentOnlyRows": experiment_only_rows,
        "pasteLines": paste_lines,
    }


def card_comparison_table_lines(rows: list[dict[str, Any]]) -> list[str]:
    lines = [
        "| Faction | Card | ID | Baseline drawn | Experiment drawn | Delta | Baseline played | Experiment played | Delta | Baseline held at defeat | Experiment held at defeat | Delta | Baseline avg turn | Experiment avg turn | Delta |",
        "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    if not rows:
        return [*lines, "| _No changed cards_ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |"]
    for row in rows:
        lines.append(
            f"| {markdown_cell(row['faction'])} | {markdown_cell(row['card'])} | {markdown_cell(row['id'])} | "
            f"{row['baselineDrawn']} | {row['experimentDrawn']} | {format_count_delta(row['drawnDelta'])} | "
            f"{row['baselinePlayed']} | {row['experimentPlayed']} | {format_count_delta(row['playedDelta'])} | "
            f"{row['baselineHeldAtDefeat']} | {row['experimentHeldAtDefeat']} | {format_count_delta(row['heldAtDefeatDelta'])} | "
            f"{format_avg_value(row['baselineAvgTurn'])} | {format_avg_value(row['experimentAvgTurn'])} | {format_avg_delta(row['avgTurnDelta'])} |"
        )
    return lines


def card_presence_table_lines(rows: list[dict[str, Any]], empty_message: str) -> list[str]:
    lines = [
        "| Faction | Card | ID | Drawn | Played | Held at defeat | Avg turn played |",
        "|---|---|---|---:|---:|---:|---:|",
    ]
    if not rows:
        return [*lines, f"| _{empty_message}_ |  |  |  |  |  |  |"]
    for row in rows:
        lines.append(
            f"| {markdown_cell(row['faction'])} | {markdown_cell(row['card'])} | {markdown_cell(row['id'])} | "
            f"{row['drawn']} | {row['played']} | {row['heldAtDefeat']} | {format_avg_value(row['avgTurnPlayed'])} |"
        )
    return lines

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
    card_telemetry_comparison = build_card_telemetry_comparison(baseline_text, experiment_text)
    if card_telemetry_comparison["warning"]:
        card_comparison_lines = ["_Parsed card telemetry comparison table skipped._"]
        baseline_only_card_lines = ["_Skipped because card telemetry parsing failed._"]
        experiment_only_card_lines = ["_Skipped because card telemetry parsing failed._"]
    else:
        card_comparison_lines = card_comparison_table_lines(card_telemetry_comparison["changedRows"])
        baseline_only_card_lines = card_presence_table_lines(
            card_telemetry_comparison["baselineOnlyRows"],
            "No baseline-only cards",
        )
        experiment_only_card_lines = card_presence_table_lines(
            card_telemetry_comparison["experimentOnlyRows"],
            "No experiment-only cards",
        )
    card_telemetry_line = (
        f"`{baseline_card_path.name}`, `{experiment_card_path.name}`"
        if baseline_card_telemetry_present or experiment_card_telemetry_present
        else "Not present; files contain guidance placeholders."
    )
    effect_variant_rows = effect_variant_report_rows_from_data(data)

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
        f"Effect Variant entries recognized: {'yes' if effect_variant_rows else 'no'}",
        "",
        "## Effect Variant Recognition",
        "",
        "Status `registry_generated` means a temp-copy active registry entry was written for an exactly runBaseEffect-only variant. Status `damage_unit_executed` means a temp-copy active registry entry was written for runBaseEffect followed by one or more damageUnit operations. Status `stat_modifier_executed` means PR5 wrote a temp-copy active registry entry for runBaseEffect followed by one or more stat modifier operations. Status `base_damage_executed` means PR5 wrote a temp-copy active registry entry for runBaseEffect followed by one or more absolute base damage operations. Status `mixed_operations_executed` means PR5 wrote a temp-copy active registry entry for a supported mixed sequence. Status `recognized_not_executed` means the variant remains report-only; PR5 does not execute drawOne.",
        "",
        *effect_variant_table_lines(effect_variant_rows),
        "",
        "## Effect Variant Operation Telemetry",
        "",
        *effect_variant_operation_report_lines(effect_variant_rows),
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
        "## Card telemetry comparison",
        "",
        "Rows are matched by `(faction, id)`, not by card name. The table shows changed cards only, sorted by absolute played delta and then absolute drawn delta.",
        f"- Baseline raw card telemetry: `{baseline_card_path.name}`",
        f"- Experiment raw card telemetry: `{experiment_card_path.name}`",
        *( [f"- Warning: {card_telemetry_comparison['warning']}", ""] if card_telemetry_comparison["warning"] else [""] ),
        *card_comparison_lines,
        "",
        "### Baseline only cards",
        "",
        *baseline_only_card_lines,
        "",
        "### Experiment only cards",
        "",
        *experiment_only_card_lines,
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
        *effect_variant_paste_lines(effect_variant_rows),
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
        "Top 10 card telemetry deltas:",
        *card_telemetry_comparison["pasteLines"],
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
    data = annotate_experiment_data_with_effect_variant_runtime(data, applied_changes)
    patch_summary_path = write_patch_summary(report_dir, applied_changes)
    if verbose:
        print(f"Changes processed: {len(applied_changes)}", flush=True)

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
        "effectVariantCount": len(effect_variant_report_rows_from_data(data)),
        "effectVariantIds": [row["variantId"] for row in effect_variant_report_rows_from_data(data)],
        "effectVariantSummaries": [
            f"{row['variantId']} status={row['status']} registryKey={row['registryKey']} registryPath={row['registryPath']}"
            for row in effect_variant_report_rows_from_data(data)
        ],
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
        "| Experiment | Config file | Report folder | Simulator exit code | Effect variants | Warnings | Dangers | Top faction non-draw WR deltas | Error |",
        "|---|---|---|---:|---|---:|---:|---|---|",
    ]
    for result in results:
        report_dir = result["reportDir"] or ""
        exit_code = result["simulatorExitCode"]
        warning_count = result["warningCount"]
        danger_count = result["dangerCount"]
        effect_variant_summaries = result.get("effectVariantSummaries", [])
        effect_variant_ids = result.get("effectVariantIds", [])
        effect_variant_summary = "None" if not effect_variant_summaries else "; ".join(effect_variant_summaries)
        if not effect_variant_summaries and effect_variant_ids:
            effect_variant_summary = ", ".join(effect_variant_ids)
        lines.append(
            f"| {escape_markdown_table_cell(result['name'])} | `{escape_markdown_table_cell(result['configPath'])}` | "
            f"`{escape_markdown_table_cell(report_dir)}` | "
            f"{exit_code if exit_code is not None else 'N/A'} | "
            f"{escape_markdown_table_cell(effect_variant_summary)} | "
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
        "effectVariantCount": 0,
        "effectVariantIds": [],
        "error": error_message.replace("\n", " "),
        "passed": False,
    }


def main(argv: list[str]) -> int:
    configure_utf8_stdio()

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
