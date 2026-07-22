---
status: CANONICAL
active_state: active-policy
---

# Asset Loading and Scene Ownership Policy

## Purpose

Asset loading in Gridfall is part of scene architecture and presentation correctness, not merely a performance optimization. A preload boundary decides what a scene owns, what the player can safely see, which first interactions can respond immediately, and where a loading or transition surface is allowed to hide real preparation.

Central rule:

> A scene should preload everything required for its first complete and reliable presentation, but nothing belonging exclusively to later or unrelated scenes.

Minimum payload size is not the only goal. Smaller preloads are valuable only when they preserve the scene's first complete frame, immediate audio expectations, transition promises, retry behavior, and established UI state.

## Core principles

1. **Complete first presentation**
   - Do not expose incomplete frames, dark intermediate screens, missing controls, silent first interactions, or cards without required art merely to minimize preload size.
   - The first visible frame must be complete for the intended experience.

2. **Scene asset ownership**
   - Each scene owns only the assets it needs immediately or before the next safe loading boundary.
   - Avoid broad "load the entire registry" helpers in lightweight scenes.

3. **Immediate audio readiness**
   - Music and first-interaction SFX expected immediately must already be cached.
   - Audio ownership must follow scene context.
   - Overlay scenes must not accidentally replace menu music or battle ambience.

4. **Optional-content loading**
   - Lazy loading is appropriate only when the UI clearly supports it and the player receives immediate feedback.
   - Do not introduce asynchronous loading complexity merely to reduce a few seconds behind an already appropriate loading panel.

5. **Reliable transitions**
   - Transition scenes may hide real asset preparation but must not claim readiness before required content is ready.
   - Presentation delays and loading delays must remain conceptually separate.

6. **Cache reuse**
   - Always check Phaser texture/audio caches before enqueueing assets.
   - Warm navigation should reuse existing textures and audio.

7. **Fallbacks are resilience, not readiness**
   - Existing fallback art prevents crashes.
   - A fallback must not be treated as proof that a scene was correctly prepared.
   - Required current-scene assets should be verified where missing art would harm presentation.

8. **Conservative optimization**
   - Remove clearly unrelated assets first.
   - Do not aggressively defer required assets without proving the new boundary on real mobile cold loads.
   - Preserve previously approved UI behavior unless a task explicitly changes it.

## Final Gridfall scene ownership decisions

This section records the final accepted ownership model after the preload optimization milestone. Historical experiments and regressions are identified explicitly so future work does not mistake them for approved architecture.

### StartScene / MainMenu bootstrap

StartScene prepares the complete first MainMenu experience:

- menu background;
- logo;
- visible initial button assets;
- menu music;
- immediate UI click SFX.

It does not preload:

- Battle assets;
- Collection card art;
- Tutorial assets;
- Arena battlegrounds;
- battle-only audio.

The temporary logo-only/dark handoff regression showed that minimizing StartScene to its own splash assets was too narrow. The correct boundary is the complete first MainMenu presentation, because StartScene owns the first reliable user-facing handoff into MainMenu, not just the splash graphic.

### Lightweight menu scenes

GameMenu, faction selection, campaign enemy selection, and achievements use narrow menu audio ownership rather than the full audio registry.

They retain:

- menu music where required;
- immediate UI click feedback;
- scene-specific immediate SFX only when actually used.

They do not preload combat, result, or battle ambience audio.

### SettingsScene

Settings is a context-preserving scene:

- from menu, menu music remains active;
- from BattleMenu, battle ambience remains active;
- Settings does not take ownership of either music track;
- Settings preloads only the immediate UI feedback it directly uses.

This is a warning against treating every visually menu-like panel as a menu-audio owner. Overlay or utility scenes must preserve the audio context that launched them unless a task explicitly changes music ownership.

### CollectionScene

Collection uses the final accepted compromise:

- Collection uses its existing full loading panel;
- it preloads all normal collectible card art actually displayed by Collection;
- all faction sections still enter collapsed;
- the first manual expansion is immediate;
- Collection does not load generated tokens, tutorial-only cards, battle backgrounds, faction previews not used there, or battle audio;
- menu music and UI click remain ready.

The attempted per-faction lazy-loading model was rejected. Entry became faster, but the first expansion looked like a freeze. Per-faction loading also introduced more state, redraw, cancellation, and lifecycle complexity. The existing Collection loading panel was the better UX boundary.

Critical lesson: a visible, intentional five-second first load can be preferable to an instant entry followed by unexplained blocking.

### BattleScene

BattleScene preloads:

- the current player faction's required card art;
- the selected enemy faction's required card art;
- generated art for those active factions;
- the selected battleground plus approved fallback;
- card back and required battle UI;
- battle-owned audio needed during the match/result flow.

It does not preload:

- unrelated factions;
- unused Arena battlegrounds;
- menu music;
- unrelated Tutorial art outside Tutorial mode.

### Arena-specific readiness

The confirmed Arena issue was mode-specific. Arena originally resolved the enemy too late or too implicitly relative to the optimized loading boundary. The selected Arena enemy is now finalized before BattleScene launch and included explicitly in the payload. Arena verifies selected-enemy art readiness before visual-ready. Only exact missing Arena enemy assets may be repaired. Campaign and Tutorial were intentionally not changed because they did not reproduce the issue.

Rule:

> When an optimization creates a mode-specific readiness regression, fix the mode-specific ownership/order boundary rather than broadening every battle path.

### Tutorial

Tutorial remains intentionally conservative:

- its menu-to-battle flow is specialized;
- it was excluded from generic lightweight audio cleanup;
- do not optimize its preload boundary without a separate audit and real-device validation.

This is a remaining intentional exception, not an oversight. Treat Tutorial's mode-specific data, launch path, and preload expectations as separate from normal Arena/Campaign cleanup until a task explicitly scopes that audit.

## The preload saga

### Original state

- Collection and BattleScene loaded broad card, audio, and background sets.
- Cold payloads were approximately 35-38 MiB.
- First entries were noticeably slow.
- Repeated visits looked better because Phaser/browser caches hid the cold-load issue.

### First optimizations

- Collection faction-lazy loading.
- Battle current-match-only loading.
- Start/menu audio narrowing.
- Lightweight-scene audio ownership cleanup.

### Regressions and lessons

- StartScene became too narrow, causing a dark/logo-only MainMenu handoff.
- Collection lazy loading made first faction expansion look frozen.
- Arena current-match loading exposed missing enemy board art on cold entry.
- Fallback refresh alone did not solve incorrect Arena readiness/order.
- Preload plans must be verified against real runtime reports, not only static probes.

### Final state

- Normal navigation avoids unnecessary long black screens.
- Start/MainMenu, Settings, and Battle entry are substantially faster.
- Collection accepts a deliberate first cold load behind a proper loading panel.
- Arena explicitly resolves and prepares its enemy assets.
- Cache reuse makes repeat visits fast.

## Diagnostic and verification requirements

Future asset-loading changes must follow this workflow:

1. Audit before modification.
2. Distinguish cold browser load from warm in-session load.
3. Test real mobile/incognito paths.
4. Record scene, mode, faction, texture key, cache presence, and visual-ready order.
5. Verify first frame, first interaction, audio, transition, retry, fullscreen, and lifecycle.
6. Compare Campaign, Arena, Tutorial, and retry paths independently.
7. Use Battle Report evidence for BattleScene asset failures.
8. Do not declare success solely because unit tests or static preload-key probes pass.

## Mandatory task guardrail

> Preserve all previously approved scene behavior unless the task explicitly authorizes changing it.

Examples:

- optimizing Collection preload must not auto-expand factions;
- optimizing StartScene must not alter the complete MainMenu handoff;
- audio cleanup must not change music ownership;
- Battle optimization must not change Campaign or Tutorial unless explicitly scoped;
- fallback behavior must remain available after readiness improvements.

This rule is reusable beyond asset loading. Optimization work must preserve approved UI states, navigation semantics, interaction affordances, audio ownership, and fallback resilience unless the task explicitly authorizes changing them.

## Checklist for future scenes

- What must be visible in the first complete frame?
- What audio must work on the first interaction?
- Which scene owns current music?
- Which assets belong only to later content?
- Is there a safe visible loading boundary?
- Are cache checks used?
- Can the scene be entered directly?
- Can loading fail without blocking navigation?
- Does fullscreen/lifecycle interruption leave stale callbacks?
- Has cold mobile/incognito behavior been tested?
- Are previously approved UI states preserved?

## Reusable Skill Extraction Notes

These concepts should be reusable as source material for a future Gridfall development skill without depending on Gridfall-specific filenames:

- scene-owned preload boundaries;
- complete-first-frame principle;
- immediate-audio readiness;
- conservative lazy loading;
- mode-specific readiness;
- fallback-versus-readiness distinction;
- cold/warm/mobile validation;
- preserve-established-behavior guardrail.
