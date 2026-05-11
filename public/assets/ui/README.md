# UI Assets

Place the shared StartScene and MainMenuScene logo at:

```text
public/assets/ui/gridfall-logo.png
```

It is loaded at runtime from:

```text
assets/ui/gridfall-logo.png
```

When present, StartScene renders it as the large centered title treatment, and MainMenuScene renders the same asset as the smaller top title treatment. If the PNG asset is missing or fails to load, both scenes keep their localized text fallback and their buttons remain usable.

## Manual logo export rules

Use these settings when uploading or replacing `public/assets/ui/gridfall-logo.png`:

- Export as a transparent PNG with a transparent background.
- Crop tightly around the visible logo.
- Keep minimal empty padding so in-game width scaling is not wasted on transparent pixels.
- Use a recommended source/export width of 1600–2400 px.
- Do not use lossy compression.
- Avoid blur or resampling artifacts, especially around logo text and sharp edges.
