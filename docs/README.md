# Gridfall-Tactics Documentation Index

## Purpose

This index defines where authoritative documentation lives, how to read historical context safely, and how to handle experiments without introducing gameplay/rules drift.

## Status taxonomy

Use these status labels in docs when relevant:

- **CANONICAL** — single source of truth for a domain.
- **WORKFLOW** — process and collaboration rules.
- **HISTORY** — timeline/changelog context; not normative behavior source.
- **EXPERIMENTAL** — active or exploratory notes that may change.
- **ARCHIVED** — retained for reference; not active guidance.
- **SUPERSEDED** — replaced by newer authoritative doc(s).

## Canonical/source-of-truth docs

- **Gameplay rules (CANONICAL):** `docs/rules/mvp-battle-rules.md`
- **Project collaboration workflow (WORKFLOW):** `docs/project/workflow.md`
- **Faction/data ownership alignment (CANONICAL):** `docs/project/faction-source-of-truth.md`
- **Card wording/style reference (CANONICAL for wording):** `docs/CARD_LANGUAGE_GUIDE.md`
- **Premium UI typography (CANONICAL):** `docs/ui/premium-typography-standard.md`

If any gameplay-rule conflict appears, `docs/rules/mvp-battle-rules.md` wins.

## Project memory triad (keep separate)

These three docs are intentionally separate and should not be collapsed:

- `docs/project/workflow.md` — how contributors/agents should work.
- `docs/project/progress.md` — milestone/progress log.
- `docs/project/decisions.md` — decision history.

## Historical/context docs

- `docs/battle_mvp_v1.md` — historical battle spec retained for context (**SUPERSEDED** by canonical rules).
- `docs/project/progress.md` — timeline context (**HISTORY**).
- `docs/project/decisions.md` — decision chronology (**HISTORY**).

## Documentation archive strategy

- Archive policy and status semantics: `docs/archive/README.md` (**WORKFLOW/REFERENCE**).

## Experimental/diagnostic docs

- `docs/experiments/card-art-framing-debug.md` — experiment postmortem (**EXPERIMENTAL**, currently postponed).
- `docs/art/art-framing-tool-v2-prototype-plan.md` — prototype plan (**EXPERIMENTAL**, planning only).
- `docs/art/card-art-rendering-diagnostic.md` — renderer/crop diagnostic reference (diagnostic source for art framing behavior).

## How future agents should use docs

1. **Start with workflow + canonical docs first** before implementing changes:
   - `docs/project/workflow.md`
   - `docs/rules/mvp-battle-rules.md`
2. **Use HISTORY docs for context only**, not as implementation authority.
3. **Treat EXPERIMENTAL docs as non-binding** unless a newer decision explicitly promotes them.
4. When changing gameplay behavior, update canonical rules + project memory docs in parity.
5. When conflicting guidance exists, prioritize:
   1) canonical domain doc,
   2) workflow/process doc,
   3) history/experimental notes.

## Recommended future archive moves (no move performed in this change)

Candidates for future `docs/archive/` move once replacement context is fully stable:

- `docs/battle_mvp_v1.md` (already superseded and historical).
- `docs/experiments/card-art-framing-debug.md` (postponed experiment summary).
- `docs/art/art-framing-tool-v2-prototype-plan.md` (prototype planning artifact if no active implementation resumes).
