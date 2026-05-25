# Documentation Archive Strategy

This folder preserves non-canonical documentation artifacts for historical context without presenting them as active implementation guidance.

## What belongs in archive

Archive candidates are docs that are still useful for traceability, but should no longer read as active guidance:

- one-off debug reports after conclusions were captured elsewhere,
- prototype plans that are paused indefinitely or replaced,
- migration notes whose implementation path is no longer current,
- docs with implementation assumptions that conflict with canonical docs.

## Status label meanings

Use these labels consistently:

- **HISTORY**
  - Timeline/context memory (what happened and when).
  - Not implementation truth by itself.
  - Usually remains in-place when it is part of project memory logs.

- **SUPERSEDED**
  - Replaced by a newer authoritative doc.
  - Must explicitly point to the replacement canonical doc.
  - May remain outside archive if still frequently used for transition context.

- **EXPERIMENTAL**
  - Exploration/prototype/debug notes that may still be revisited.
  - Not authoritative unless formally promoted.
  - Must include active state (`active`, `planning-only`, `postponed`, etc.).

- **ARCHIVED**
  - Retained reference artifact; no active implementation guidance.
  - Should include a short reason and pointer(s) to canonical replacements.

## Archive vs preserve-standalone

Keep docs standalone (outside `docs/archive/`) when they are still part of active navigation or operational memory:

- canonical docs,
- workflow/process docs,
- project progress/decisions logs,
- active diagnostics used by current contributors.

Archive docs when they are non-authoritative and likely to confuse implementation decisions if read without context.

## Required cross-links for archived/experimental docs

When a doc is experimental, superseded, or archived, include explicit pointers to:

- Canonical input behavior: `docs/battle/input-flow.md` (when interaction/input behavior is discussed),
- Canonical gameplay rules: `docs/rules/mvp-battle-rules.md` (for gameplay assumptions),
- Current diagnostic/canonical replacement doc(s) for that domain.

## Future Agent Guidance

1. Start implementation from canonical docs first (rules/input/workflow), then read history/experiments.
2. Treat `docs/project/progress.md` and `docs/project/decisions.md` as historical context, not direct implementation truth.
3. Treat experiments/debug notes as non-authoritative unless a newer decision promotes them.
4. If an older doc conflicts with canonical docs, update status labeling and add replacement links instead of silently leaving ambiguity.
