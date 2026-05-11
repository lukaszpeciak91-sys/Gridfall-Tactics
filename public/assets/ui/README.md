# UI Assets

Place the shared StartScene and MainMenuScene logo at:

```text
public/assets/ui/gridfall-logo.webp
```

It is loaded at runtime from:

```text
assets/ui/gridfall-logo.webp
```

The logo file is intentionally not committed here so it can be supplied manually. When present, StartScene renders it as the large centered title treatment, and MainMenuScene renders the same asset as the smaller top title treatment; if it is missing, both scenes keep their localized text fallback.
