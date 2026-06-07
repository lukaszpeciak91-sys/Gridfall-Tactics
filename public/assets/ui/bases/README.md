# Base Backdrop Assets

This folder is reserved for future decorative player/enemy base backdrop art. The asset is intended to sit underneath the existing base panel, HP text, base labels, utility controls, combat feedback, banners, hand/cards, and inspect overlays.

## Final asset path

Manually upload the active base backdrop asset to:

```text
public/assets/ui/bases/
```

Runtime URLs should be resolved from the Vite public asset root as:

```text
assets/ui/bases/base.webp
```

## Active prototype filename

The repository currently supports one active prototype backdrop asset:

```text
base.webp
```

The currently supported workflow is manual A/B testing by replacing `base.webp` with different concept variants.

Future concepts such as Broadcast Node or Transmission Screen should reuse this same filename during prototyping, so swapping candidate artwork does not require code changes.

## Runtime asset key

Use this stable, namespaced Phaser texture key for the active base backdrop:

```text
ui.baseBackdrop.base
```

## Format contract

- Preferred runtime format: transparent WebP (`.webp`).
- The source art should include alpha transparency and soft edge fade/bleed.
- Do not commit generated placeholder images.
- Keep the artwork neutral enough to support future player/enemy tinting.
- The same `base.webp` file must be reused for both player and enemy bases; do not introduce side-specific files for orientation.

## Future preload contract

Base backdrop assets are not loaded yet. A future rendering implementation should explicitly register `base.webp` during `BattleScene.preload()` before creating any image objects.

Use the existing image preload path style used by other public assets: define an asset descriptor with `key: 'ui.baseBackdrop.base'` and a `path` resolved from `assets/ui/bases/base.webp`, then pass it through the shared image preload helper before rendering.

## Future render location recommendation

When rendering is implemented later, keep the backdrop decorative and non-interactive. It should render underneath the existing base UI so the current panel, HP text, labels, utility controls, combat feedback, banners, hand/cards, and inspect overlays keep their current behavior and visual priority.

## Orientation contract

Player base rendering should use the asset's default orientation. Enemy base rendering should reuse the same texture with a vertical mirror transform, or an equivalent transform that produces arena-facing symmetry.

Do not add separate player/enemy asset files solely for orientation; future implementation should handle this in rendering transforms while keeping `base.webp` as the single source asset.

## Naming convention

Current prototyping convention:

```text
base.webp -> ui.baseBackdrop.base
```

Longer-term concept-specific filenames or keys should only be introduced if the project needs multiple base backdrop assets available at the same time.
