# Background Art Assets

Background assets live under this folder so Phaser can load them from the Vite public asset URL at runtime.

## Start/menu background path

Manually upload the menu background file to this exact repo path:

```text
public/assets/backgrounds/menu-background.webp
```

Runtime URL used by the code:

```text
./assets/backgrounds/menu-background.webp
```

Do not commit generated placeholder art. The expected workflow is for the user/artist to manually upload the final file to the repo/GitHub at the path above.

## Menu background art requirements

- Required filename currently supported by code: `menu-background.webp`.
- Preferred format: WebP.
- Recommended size: 1440 × 2560 px.
- Primary aspect ratio: 9:16 portrait.
- PNG/JPG are acceptable art source formats only if the code is changed to point at a supported `.png` or `.jpg` runtime file.
- Runtime behavior: Start, main menu, and faction-select scenes attempt to load the WebP; if it is missing or fails to load, all three screens fall back to the current solid dark background.
- Scaling behavior: full-canvas cover scale, centered, rendered behind all UI. Edge content may be cropped on non-9:16 viewports.

## Central UI safe area guidance

Keep the central column clear and readable because title/buttons are centered over the art:

- Horizontal: keep the central ~70% lower contrast; place busy decorative details closer to the outer edges.
- Vertical: avoid high-contrast focal points behind the title area around the top ~10–25% of the canvas.
- Vertical: avoid critical detail behind the START button around ~58–65% of screen height.
- Faction select also uses centered buttons through the middle of the screen, so keep the central ~25–70% vertically text-friendly.
- Favor subtle vignetting, soft gradients, or naturally darker center values behind UI text.

## Battle background structure

- `default/` — shared battlefield/background art for all battles.
- `factions/` — reserved for later per-faction background variants.

## Battle background path

Manually upload the default battle background file to this exact repo path:

```text
public/assets/backgrounds/default/battlefield.webp
```

Runtime URL used by the code:

```text
./assets/backgrounds/default/battlefield.webp
```

If this file is missing or fails to load, battles keep the safe solid dark fallback instead of crashing.

## Battle target artwork format

- Primary format: portrait 9:16.
- Recommended master resolution: 1440 × 2560 px.
- Acceptable larger source: 2160 × 3840 px.

Keep source art high enough resolution for mobile portrait screens. The renderer center-crops as needed using a cover scale, so important details should not sit at the extreme crop edges.

## Runtime wiring

Background definitions are in `src/rendering/backgroundArt.js`. The menu background is already wired to:

```js
path: './assets/backgrounds/menu-background.webp'
```

Battle background art is wired to the default battlefield WebP:

```js
path: './assets/backgrounds/default/battlefield.webp'
```

The leading `./` is produced from Vite's `base: './'` setting so GitHub Pages repo-path deployments resolve the URL under the current page path instead of the domain root. If the image is not loaded or fails to load, the relevant scene keeps the safe solid dark fallback.

## Arena battleground rotation

Arena mode uses a manually maintained battleground pool. The existing default battle background is part of that pool, remains stored at `public/assets/backgrounds/default/battlefield.webp`, and must not be duplicated into the Arena folder.

Future Arena-only battleground illustrations must be copied manually into:

```text
public/assets/backgrounds/arena/
```

The Arena folder is intentionally not auto-discovered at runtime. To add a battleground:

1. Export a portrait WebP illustration.
2. Use the recommended size `1440 × 2560` px and 9:16 portrait composition.
3. Copy the WebP manually into `public/assets/backgrounds/arena/`.
4. Name files sequentially with two digits: `01.webp`, `02.webp`, `03.webp`, and continue with `04.webp`, `05.webp`, `06.webp`, `07.webp`, `08.webp`, etc.
5. Add exactly one configuration entry in `src/data/arenaBattlegrounds.js` with a stable id, texture key, and asset path.
6. Never rename an existing battleground id after release; future achievement progress should derive from the currently enabled Arena battleground ids.
7. Never use filesystem auto-discovery for the Arena pool.

Numbered Arena battleground texture keys follow this convention:

```text
01.webp -> background.arena.01
02.webp -> background.arena.02
03.webp -> background.arena.03
```

There is no maximum number of Arena battlegrounds. Missing or invalid Arena battleground ids safely fall back to the default battleground asset.
