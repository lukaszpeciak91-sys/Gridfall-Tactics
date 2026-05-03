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

## Gameplay Specification Rule
- Codex must read `docs/battle_mvp_v1.md` before implementing gameplay systems.

### GitHub Pages Deploy Rule

- Always deploy Vite projects using `dist/` build.
- Never deploy raw `src/` files to GitHub Pages.
- Use GitHub Actions with build + `upload-pages-artifact`.
