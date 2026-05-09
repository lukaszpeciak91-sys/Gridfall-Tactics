# Background Safe Zones (9:16 Mobile)

This project is prepared for full-screen portrait illustrations without changing gameplay layout.

## Menu/start background

The start and faction-select scenes are wired to use this exact runtime file when present:

```text
public/assets/backgrounds/menu-background.webp
```

- Runtime URL: `/assets/backgrounds/menu-background.webp`.
- Required filename currently supported by code: `menu-background.webp`.
- Preferred format: WebP.
- Recommended size: 1440 × 2560 px.
- PNG/JPG are acceptable only if the code is updated to load that filename/extension.
- The user/artist will manually upload the final file to the repo/GitHub; do not add generated placeholder images.
- If the file is missing or fails to load, the menu screens use the existing solid dark fallback.
- The image is drawn behind all UI and uses centered cover scaling, so edges may crop safely.

### Menu central UI safe area

- Keep the central ~70% of the image lower contrast for title and button readability.
- Avoid critical focal points behind the title band around the top ~10–25% of the canvas.
- Avoid critical focal points behind the START button band around ~58–65% of screen height.
- Faction select places centered buttons through the middle of the screen, so keep ~25–70% vertically text-friendly.
- Put decorative, high-detail elements closer to side edges or behind naturally darker/vignetted regions.

## Battle background target artwork

- Primary aspect ratio: 9:16 portrait.
- Recommended master: 1440 × 2560 px.
- Acceptable larger source: 2160 × 3840 px.
- Runtime behavior: full-canvas cover scale, centered, rendered behind all board/card/UI layers.

## Gameplay-safe center area

The current game canvas is designed around a 390 × 844 portrait viewport. Gameplay remains centered inside the existing layout margins.

Approximate important center band:

- Horizontal: central ~95% of the canvas contains active UI; avoid high-contrast detail behind readable text/cards in this band.
- Decorative side margins: outer ~0–2.5% per side are safest for edge-only art today, with wider future device margins possible when the 9:16 image is cover-cropped.
- Vertical: keep the full center column readable because the board, hero panels, action button, hand, and utility bar stack vertically.

## Current battle UI occupancy by vertical region

Approximate regions are expressed as percentages of canvas height:

- Enemy hero panel: top ~1–7%.
- 3 × 3 board: upper/middle playfield, roughly ~8–62%.
- Player hero panel: roughly ~63–69%.
- Action/pass/mulligan zone: roughly ~70–75%.
- Player hand: roughly ~76–98%.
- Bottom utility icons: bottom ~95–100%.

## Art direction guidance

- Keep the central board and text regions lower contrast or naturally vignetted for readability.
- Extend non-critical environment details into side margins to visually remove empty side margins.
- Avoid placing faces, logos, faction emblems, or other critical focal points directly under board text, cards, hero HP, action labels, or the player hand.
- Treat the outer edges and upper/lower background behind panels as decorative-only areas.
- Future per-faction, animated, parallax, and theme-swapped backgrounds should keep the same safe-zone assumptions unless the UI layout is intentionally redesigned.
