# Codex Collaboration Workflow

## Working Rules
- Keep changes in **small, focused PRs**.
- Avoid broad refactors unless explicitly requested.
- Prefer minimal, iterative updates over speculative architecture changes.
- Preserve existing conventions and folder structure.
- Document key assumptions and tradeoffs in PR descriptions.
- Do **not** add or reintroduce visible debug/test labels in playable UI unless explicitly requested (for example: `Battle Test`, debug overlays, temporary scene labels, or hidden/background debug text).

## Repository Memory Rules
- Update `docs/project/decisions.md` when product or technical decisions change.
- Update `docs/project/progress.md` when milestones start, complete, or are re-scoped.
- Update `docs/project/workflow.md` when collaboration rules evolve.
- **Codex must update these files when making significant changes.**


## Achievement Progression Economy Guardrail
- Run a progression-economy review when adding or removing an achievement, changing achievement difficulty, changing point mapping, adding a faction, changing faction achievement templates, adding a mode-specific achievement family, renaming an achievement ID, or renaming a persistence key.
- Checklist: recalculate the total catalogue point pool; review the Level 15 completion percentage; confirm the fixed threshold table still makes sense; verify dynamic faction contribution; update catalogue invariant tests; update PL/EN localization; verify long-title/mobile card layout; verify persistence/backfill; add a migration before renaming IDs or storage keys.

## Gameplay Specification Rule
- Codex must read `docs/battle_mvp_v1.md` before implementing gameplay systems.

### GitHub Pages Deploy Rule

- Always deploy Vite projects using `dist/` build.
- Never deploy raw `src/` files to GitHub Pages.
- Use GitHub Actions with build + `upload-pages-artifact`.


## Rules Parity Guardrail
- Codex must read `docs/rules/mvp-battle-rules.md` before gameplay or card-behavior changes and keep docs in parity with implemented code paths.
