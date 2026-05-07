# Background Art Assets

Battle backgrounds live under this folder so Phaser can load them from `/assets/backgrounds/...` at runtime.

## Current structure

- `default/` — shared battlefield/background art for all battles.
- `factions/` — reserved for later per-faction background variants.

## Target artwork format

- Primary format: portrait 9:16.
- Recommended master resolution: 1440 × 2560 px.
- Acceptable larger source: 2160 × 3840 px.

Keep source art high enough resolution for mobile portrait screens. The renderer center-crops as needed using a cover scale, so important details should not sit at the extreme crop edges.

## Runtime wiring

Background definitions are in `src/rendering/backgroundArt.js`. Add future image files here, then set the matching asset `path` to a served URL such as:

```js
path: '/assets/backgrounds/default/battlefield.png'
```

If `path` is `null` or the image is not loaded, the battle scene keeps the safe solid dark fallback.
