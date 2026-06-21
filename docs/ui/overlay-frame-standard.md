# Overlay / Panel Frame Standard

Status: **CANONICAL** for modern Gridfall overlay and panel chrome.

This document records the current overlay/frame direction so future UI work preserves the accepted premium presentation instead of returning to older prototype panel treatments.

## Current premium overlay / panel frame family

The modern shared overlay family applies to:

- Settings panels
- Battle Menu panels
- Rules / How To Play panel
- Deck / Deck Info modal
- Campaign accordion and faction information panels

Current intended visual language:

- rounded panel corners, not square utility boxes;
- a dark translucent panel body that lets the screen retain atmospheric depth without reducing text legibility;
- cyan / blue premium frame accents as a family, not one-off per-screen strokes;
- a thin outer stroke with subtle glow and a restrained inner highlight for depth;
- consistent chrome, spacing, and dismissal affordances across modern overlays.

Do **not** revert these surfaces to the old flat cyan-stroke prototype panels unless a future explicit design decision supersedes this standard. The accepted direction is a premium broadcast/panel family: dimensional, restrained, translucent, and consistent across entry points.

## Rules panel current canonical behavior

Rules / How To Play is one shared panel presentation across entry points. A Rules button from battle, menus, or any future route should open the same final Rules panel rather than maintaining divergent battle-only or menu-only chrome.

The final Rules presentation should not reintroduce older unwanted artifacts unless a new design reason is documented first:

- no decorative horizontal rails added merely as legacy ornament;
- no lower-left swipe/scroll helper text resurrected as persistent chrome;
- no path-specific Rules panel variants that make battle Rules look different from menu Rules by accident.

Historical notes or screenshots that show rails or scroll-helper text should be treated as older prototype context, superseded by this current standard.

## Translucent overlay artifact debugging lesson

When a translucent overlay appears to show stray lines, helper text, ghosted copy, or other artifacts, do not assume the foreground panel is drawing them. Because modern overlays are translucent and often sit above active scenes, visible artifacts can come from either the overlay or the scene beneath it.

Before changing panel rendering, inspect likely sources in this order:

1. Rules panel chrome: decorative rails, dividers, old ornaments, or stale panel children.
2. Rules scroll affordances: lower-left swipe/scroll helper text, scroll shadows, masks, or hints.
3. Underlying scene objects: BattleScene helper objects, board guide elements, deck info hints, action labels, or other gameplay UI visible through dimming.
4. Entry-point differences: whether the same shared panel behaves differently depending on the route that launched it.

A line or helper visible through a translucent panel may be scene bleed-through rather than a panel bug. Verify object ownership and depth before deleting or restyling panel chrome.

## Battle / generic path pitfall

Not every apparent “Rules panel issue” belongs to `BattleScene`. Before fixing Rules or overlay artifacts, verify:

- which scene owns the button or entry point;
- whether the visible panel is global/shared or battle-specific;
- whether the bug belongs to launch path, shared panel rendering, localized Rules content, or underlying scene bleed-through;
- whether a change must be validated from every Rules entry point, not only the path where the issue was first observed.

This prevents battle-only patches from masking shared overlay problems, and prevents shared panel changes from being made to solve artifacts actually drawn by the underlying scene.

## Future Codex guidance

- Preserve the premium cyan/blue frame family for modern overlays and panels.
- Do not reintroduce old prototype rails or persistent scroll-helper text without an explicit design note.
- When touching shared overlays, verify all entry points that can launch them.
- When debugging translucent overlays, inspect both the foreground panel and underlying scene objects.
- Prefer additive documentation updates when standards evolve: mark older conflicting notes as historical or superseded rather than deleting useful context.
