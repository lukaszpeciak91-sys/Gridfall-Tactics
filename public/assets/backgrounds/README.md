# Background Art Assets

Background assets live under this folder so Phaser can load them from `/assets/backgrounds/...` at runtime.

## Start/menu background path

Manually upload the menu background file to this exact repo path:

```text
public/assets/backgrounds/menu-background.webp
```

Runtime URL used by the code:

```text
/assets/backgrounds/menu-background.webp
```

Do not commit generated placeholder art. The expected workflow is for the user/artist to manually upload the final file to the repo/GitHub at the path above.

## Menu background art requirements

- Required filename currently supported by code: `menu-background.webp`.
- Preferred format: WebP.
- Recommended size: 1440 × 2560 px.
- Primary aspect ratio: 9:16 portrait.
- PNG/JPG are acceptable art source formats only if the code is changed to point at a supported `.png` or `.jpg` runtime file.
- Runtime behavior: Start and faction-select scenes attempt to load the WebP; if it is missing or fails to load, both screens fall back to the current solid dark background.
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

## Battle target artwork format

- Primary format: portrait 9:16.
- Recommended master resolution: 1440 × 2560 px.
- Acceptable larger source: 2160 × 3840 px.

Keep source art high enough resolution for mobile portrait screens. The renderer center-crops as needed using a cover scale, so important details should not sit at the extreme crop edges.

## Runtime wiring

Background definitions are in `src/rendering/backgroundArt.js`. The menu background is already wired to:

```js
path: '/assets/backgrounds/menu-background.webp'
```

Future battle image files can be added under this folder, then wired by setting the matching battle asset `path` to a served URL such as:

```js
path: '/assets/backgrounds/default/battlefield.png'
```

If `path` is `null` or the image is not loaded, the relevant scene keeps the safe solid dark fallback.
