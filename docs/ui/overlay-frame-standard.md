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
- Achievements accordion/panel

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

## Shared scene transition overlay

`SceneTransitionOverlayScene` is the shared production loading cover for scene-to-scene transitions where the destination may need a real creation/render boundary before its UI is safe to reveal. It owns only the visual cover, input blocker, readiness listener, ordering protection, fade-out, and cleanup. Navigation remains owned by the launching scene/helper so the overlay cannot duplicate destination starts.

Current production users are:

- the Main Menu → `CollectionScene` route;
- post-battle routes to `FactionSelectScene`, `CampaignEnemySelectScene`, and `GameMenuScene`.

The overlay starts hidden and uses a short delayed-show threshold. Fast transitions that emit readiness before that threshold complete without a visible loader flash. Slow transitions show the Gridfall logo and loading ring and keep them visible during the real destination loading period. Completion is controlled by destination readiness, not elapsed time.

### Readiness contract

A destination scene using the shared overlay must:

1. finish its initial UI setup;
2. wait for the required render boundary, currently the `POST_RENDER` path with a guarded fallback callback for lifecycle resilience;
3. emit `SCENE_TRANSITION_VISUALLY_READY_EVENT` through `emitSceneTransitionVisuallyReady()` with the matching transition ID;
4. never rely on a timeout as proof of readiness.

Normal completion requires both a matching transition ID and the expected destination scene key. The overlay also reconciles the registry state so a ready event emitted before the overlay listener path observes it can still complete exactly once. Mismatched transition IDs or destination keys are ignored.

Currently integrated destination scenes are:

- `CollectionScene`;
- `FactionSelectScene`;
- `CampaignEnemySelectScene`;
- `GameMenuScene`.

The normal lifecycle is: the source creates a transition ID and registry entry, subscribes to the destination readiness event, launches the overlay, starts the destination with `sceneTransitionOverlay` metadata, reconciles overlay ordering after queued scene operations, the destination builds its initial UI and emits matching readiness after the render boundary, the overlay marks readiness/registry reconciliation, removes the waiting-frame ordering guard before fade-out, fades once, cleans listeners/timers/input blocker/tweens, clears registry state, and stops itself.

### Failsafe lesson

The confirmed production bug was caused by treating elapsed time as readiness. The old failsafe could fade and stop the overlay while registry readiness was still false. If destination creation was slow, that premature cleanup exposed a long plain dark screen before the destination UI became renderable.

The corrected behavior keeps the overlay active and visible when the failsafe threshold is reached but matching readiness is still absent. The hard emergency timeout is explicitly separate from normal readiness and marks an emergency failure state without fabricating readiness or taking the normal fade-out path.

**A timeout is not destination readiness.**

### Render-order protection

The overlay reasserts top ordering because Phaser scene operations may be queued and destination startup can temporarily alter scene order. While the overlay is visible and pending, it must remain above the destination. The bounded waiting-frame ordering guard exists only during the waiting phase and is removed before fade-out so cleanup follows a single normal path.

Destination create/background ordering checkpoints should remain in integrated destination scenes. They are production ordering recovery points, not temporary trace labels.

### Maintenance troubleshooting

If the loader flashes and disappears before destination UI appears, inspect in this order:

1. matching readiness event transition ID and destination key;
2. registry readiness for the active transition;
3. failsafe or hard emergency timeout behavior;
4. overlay active/visible state;
5. scene render order.

Do not immediately add arbitrary delays or repeated `bringToTop` calls without runtime evidence. Preserve the delayed-show behavior, matching readiness validation, registry reconciliation, corrected failsafe behavior, bounded waiting-frame ordering guard, lifecycle/fullscreen/resize/resume recovery, and single fade-out/cleanup path when maintaining this overlay.
