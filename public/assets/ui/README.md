# UI Assets

Place the shared StartScene and MainMenuScene logo at:

```text
public/assets/ui/gridfall-logo.webp
```

It is loaded at runtime from:

```text
assets/ui/gridfall-logo.webp
```

When present, StartScene renders it as the large centered title treatment, and MainMenuScene renders the same asset as the smaller top title treatment. If the asset is missing or fails to load, both scenes keep their localized text fallback.

## Manual logo export rules

Use these settings when uploading or replacing `public/assets/ui/gridfall-logo.webp`:

- Export with a transparent background.
- Crop tightly around the visible logo.
- Keep minimal empty padding so in-game width scaling is not wasted on transparent pixels.
- Use a recommended source/export width of 1200–1800 px.
- Use WebP quality: 90–95 for logo assets.
- Avoid lossy low-quality compression for text/logos because it can create visible lettering artifacts.
- If WebP text artifacts remain visible at quality 90–95, PNG is acceptable for logo assets.
