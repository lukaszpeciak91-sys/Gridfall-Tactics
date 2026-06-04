---
status: CANONICAL
owner: premium-ui
updated: 2026-06-04
---

# Premium UI Typography Standard

## Approved premium UI font stack

Gridfall premium UI typography uses one global font stack across every locale:

```text
Segoe UI, Arial, sans-serif
```

This stack is the approved premium UI identity for Polish, English, and all future locales. Do not introduce language-specific premium font stacks for premium UI.

## Applies to

Use the approved premium UI font stack for premium UI text paths, including:

- premium buttons
- shared premium image button helpers
- broadcast-style UI chrome
- menu screens
- result screens
- premium overlays

Current runtime premium button and broadcast-style text should flow through `PREMIUM_BROADCAST_FONT_STACK` in `src/ui/imageButton.js` unless there is a scoped reason to create a new shared premium UI helper.

## Does not apply to

This typography standard is intentionally limited to premium UI surfaces. It does not apply to:

- card renderer
- card titles
- card descriptions
- Collection cards
- Inspect cards
- gameplay HUD
- gameplay text renderer
- Rules panel
- localization content

Those systems already render correctly and have separate renderer/layout requirements.

## Locale rule

Gridfall uses a single premium typography identity across all locales.

Do not introduce language-specific premium font stacks for premium UI. If text needs locale-specific sizing or wrapping, solve that as a layout issue without changing the premium font family by locale.

## Validation words

Before adopting future premium typography changes, validate rendering against the Polish diacritic stress words that drove this decision:

```text
PORAŻKA
WYJDŹ
PONÓW
PUBLICZNOŚĆ
PRZEJĘCIE
ZAKŁÓCENIE
ZEWRZEĆ
```

The approved stack was selected because the in-game premium typography preview showed stronger Polish diacritic rendering for these words while preserving English readability and the intended premium UI feel. The underlying issue was the previous premium broadcast styling and spacing, not the localization system.
