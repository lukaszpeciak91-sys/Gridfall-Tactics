# UI Screenshot Workflow (Local Only)

This workflow captures deterministic mobile-portrait UI screenshots for visual review.

## Prerequisites

1. Install dependencies:
   - `npm install`
2. Install Playwright Chromium locally (one-time):
   - `npx playwright install chromium`

## Run

```bash
npm run screenshots
```

The script starts a local Vite dev server and captures six screenshots at `390x844`.

## Output

Screenshots are written to:

- `artifacts/screenshots/<timestamp>/`

Generated artifacts are intentionally local-only and gitignored.

## Captured scenarios

1. `mixed-faction-board`
2. `mixed-faction-inspect`
3. `dark-artwork-board`
4. `dark-artwork-inspect`
5. `bright-artwork-board`
6. `bright-artwork-inspect`

## Notes

- The workflow is tooling-only and runs only when explicitly invoking `npm run screenshots`.
- No gameplay/input logic is changed by this workflow.
