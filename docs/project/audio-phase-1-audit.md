---
status: EXPERIMENTAL
active_state: audio-phase-1-planning
---

# Audio Phase 1 Audit and Implementation Plan

Diagnostic storage note: Codex diagnostic/audit tasks should generally remain read-only and avoid creating repo noise. This document is stored because it is the first audio planning pass and will directly anchor the Audio Phase 1 implementation task. Future diagnostics should only be committed to repo docs when they provide lasting implementation value.

## Scope guardrails

Audio Phase 1 is intentionally small: preload and play a core set of MP3-first sounds through existing Phaser/settings flows with minimal new helpers. It must not implement a large audio architecture rewrite, gameplay changes, scene refactors, or placeholder runtime code.

Final Phase 1 sound scope:

- `UI_CLICK`
- `UI_INVALID`
- `CARD_DRAW`
- `CARD_DEPLOY`
- `SPELL_GENERIC`
- `ATTACK_IMPACT`
- `UNIT_DEATH`
- `BASE_BREAK`
- `BATTLE_VICTORY`
- `BATTLE_DEFEAT`

Optional only if trivial and clean:

- `BASE_HIT`

Explicitly out of scope for Phase 1:

- dedicated buff sounds
- dedicated debuff sounds
- per-card sounds
- faction-specific sounds
- adaptive music
- tutorial audio
- complex/fancy mixer work
- procedural audio systems
- broad audio architecture rewrites

## Current state

### Mute, settings, and persistence

- Settings are persisted as one JSON object under `gridfall:tactics:settings:v1` via `SETTINGS_STORAGE_KEY`.
- `DEFAULT_SETTINGS` already includes `musicVolume: 50`, `sfxVolume: 50`, and `muted: false`.
- `loadSettings()`, `saveSettings()`, and `updateSettings()` normalize and persist the full settings object. `updateSettings()` also emits `gridfall:settings:changed`.
- `applyAudioSettings(scene, settings)` currently maps `muted` to Phaser global `scene.sound.mute` and maps `musicVolume / 100` to Phaser global `scene.sound.volume`. It does not apply `sfxVolume` separately yet.
- The reusable mute button is `createMuteToggleControl()` in `src/ui/navigationControls.js`. It toggles `muted` through `toggleMuted(scene)`, refreshes its speaker icon from settings, and listens for `SETTINGS_CHANGED_EVENT`.
- `SettingsScene` creates the audio panel mute toggle plus Music Volume and SFX Volume sliders. Slider changes call `updateSettings(...)` immediately.
- Existing `docs/ui/settings-notes.md` says these audio controls are future-ready placeholders and do not prove playback exists.

### Audio manager / playback status

- No dedicated audio manager, audio service, audio registry, or audio helper exists today.
- No `scene.load.audio(...)`, `this.sound.add(...)`, or `this.sound.play(...)` callsites were found in `src/`.
- Phaser sound is available through the default game config, but `src/main.js` has no explicit audio config and no explicit mobile unlock helper.

### Asset preload pattern

- Current asset descriptors are small `{ key, path }` objects with preload helpers. `src/rendering/backgroundArt.js` is the best model: it resolves public paths with `resolvePublicAssetPath()`, defines asset descriptors, and preloads through a shared helper.
- Scene `preload()` methods call focused preload helpers. `BattleScene.preload()` already preloads battle background art, hand-back card art, campaign trophy art, secondary button art, and card illustrations.
- Existing settings notes already reserve `public/assets/audio/music/` and `public/assets/audio/sfx/` as future audio paths.

## Recommended minimal architecture

### Proposed files to create or modify in the implementation task

1. Create `src/audio/audioAssets.js`.
   - Own Phase 1 sound keys, asset descriptors, and `preloadAudioAssets(scene)`.
   - Reuse `resolvePublicAssetPath()` for Vite/base-path compatibility.
   - Keep MP3 as the primary file path format.
2. Create `src/audio/audioPlayback.js`.
   - Own tiny playback helpers such as `playSfx(scene, key, options = {})` and optionally `playMusic(scene, key, options = {})` only if music playback is actually introduced.
   - Read settings at play time so mute and SFX volume changes apply without scene-specific wiring.
   - Include simple per-key cooldown support.
3. Modify `src/systems/settingsState.js` minimally.
   - Keep `muted` mapped to global `scene.sound.mute`.
   - Do not let `musicVolume` globally scale SFX once SFX playback exists. Prefer global volume `1`, per-SFX volume from `sfxVolume`, and per-music-instance volume from `musicVolume`.
4. Modify preload callsites only where sounds can play.
   - Safest low-risk route: call `preloadAudioAssets(this)` in `StartScene.preload()` and `BattleScene.preload()`; add other menu scenes only when they gain UI click hooks.
   - `preloadAudioAssets(scene)` should skip keys already in Phaser's audio cache.
5. Modify only clean interaction/action boundaries for sound hooks.
   - Do not scatter sound calls through low-level pointer plumbing if a successful semantic action method exists.

### Proposed asset folder structure

```text
public/assets/audio/
  sfx/
    ui-click.mp3
    ui-invalid.mp3
    card-draw.mp3
    card-deploy.mp3
    spell-generic.mp3
    attack-impact.mp3
    unit-death.mp3
    base-break.mp3
    battle-victory.mp3
    battle-defeat.mp3
    base-hit.mp3        # optional only if implemented
  music/
    main-theme.mp3      # reserved; not required for Phase 1
```

Avoid WAV as the main shipped format. Avoid OGG-only because mobile browser compatibility is less convenient.

### Proposed sound key naming

```js
export const AUDIO_KEYS = Object.freeze({
  UI_CLICK: 'ui.click',
  UI_INVALID: 'ui.invalid',
  CARD_DRAW: 'card.draw',
  CARD_DEPLOY: 'card.deploy',
  SPELL_GENERIC: 'spell.generic',
  ATTACK_IMPACT: 'attack.impact',
  UNIT_DEATH: 'unit.death',
  BASE_BREAK: 'base.break',
  BATTLE_VICTORY: 'battle.victory',
  BATTLE_DEFEAT: 'battle.defeat',
  BASE_HIT: 'base.hit',
});
```

### Proposed registry format

```js
export const AUDIO_ASSETS = Object.freeze({
  [AUDIO_KEYS.UI_CLICK]: {
    key: AUDIO_KEYS.UI_CLICK,
    path: resolvePublicAssetPath('assets/audio/sfx/ui-click.mp3'),
    category: 'sfx',
    cooldownMs: 45,
  },
  [AUDIO_KEYS.UI_INVALID]: {
    key: AUDIO_KEYS.UI_INVALID,
    path: resolvePublicAssetPath('assets/audio/sfx/ui-invalid.mp3'),
    category: 'sfx',
    cooldownMs: 160,
  },
  // Remaining Phase 1 sounds follow the same shape.
});
```

`preloadAudioAssets(scene)` should iterate the registry and call `scene.load.audio(asset.key, asset.path)` only when the key is not already cached, likely through `scene.cache.audio.exists(asset.key)`.

### Settings connection

- `muted`: continue to apply globally through `scene.sound.mute`.
- SFX: `playSfx()` should return early when muted and play with `volume: (settings.sfxVolume / 100) * optionalVolume`.
- Music: no adaptive music or broad music system in Phase 1. If a basic music track is later added, use a single managed looping instance and apply `settings.musicVolume / 100` to that instance, not to all game sound.
- Settings changes: SFX can read settings per call; any long-lived music instance can listen to `SETTINGS_CHANGED_EVENT` later.

## Semantic sound rules

### UI click reuse rule

`UI_CLICK` is intentionally reused in Phase 1 for generic UI buttons, PASS, mulligan interactions, clicking cards in hand, and clicking cards on board / board-selection interactions as appropriate. Implementation callsites should still remain semantically separated enough that later sounds can be split into dedicated `PASS`, `MULLIGAN`, `HAND_CARD_CLICK`, and `BOARD_CARD_CLICK` keys without rewriting gameplay flow.

### Deploy vs spell rule

`CARD_DEPLOY` means a unit card or redeploy is placed onto the board. `SPELL_GENERIC` means an effect-card cast, effect sweep, or targeted effect resolution. Effect cards should not also fire deploy audio unless they truly use a board-deploy flow and the existing game logic makes that intentional.

### Battle outcome rule

`BATTLE_VICTORY` is used in Phase 1 for both normal battle victory and campaign victory. `BATTLE_DEFEAT` is used in Phase 1 for both normal battle defeat and campaign defeat. Hook sites should be selected so the later split to `CAMPAIGN_VICTORY` and `CAMPAIGN_DEFEAT` can happen at battle-result/campaign-result boundaries without rewriting the battle result flow.

## Hook map

| Sound key | Trigger | Likely owner | Hook quality | Notes |
| --- | --- | --- | --- | --- |
| `UI_CLICK` | Successful generic UI buttons, PASS, mulligan select/confirm, hand-card selection, board selection | `createFloatingControl()`, `createMuteToggleControl()`, `BattleScene.createUtilityMenuButton()`, `onCardPointerDown()` / `onCardPointerUp()`, `onBoardCellTap()`, `onPlayerBasePointerUp()`, `toggleOpeningMulliganCard()`, `confirmOpeningMulligan()` | Clean but broad | Hook at successful semantic interactions, not every pointer event. Keep PASS/mulligan/hand/board callsites separately identifiable for later dedicated sounds. |
| `UI_INVALID` | Disallowed or blocked actions | `BattleScene.showInvalidActionFeedback()` | Clean | Central battle invalid-feedback hook. Add 150-200 ms cooldown. Some currently silent no-op returns can stay silent unless UX explicitly wants invalid feedback. |
| `CARD_DRAW` | Card reveal / arrival into hand / effect draw feedback | End-of-turn `drawCards(...)` block in `finishTurnAfterBothActions()`; `playActionFeedback()` for `type === 'draw'`; opening/mulligan hand reveal only if clean | Needs care | Avoid double-playing when an effect both reports draw feedback and redraws the hand. |
| `CARD_DEPLOY` | Unit play or redeploy onto board | `onBoardCellTap()` after successful `playOrRedeployUnit(...)`; enemy `revealAndApplyEnemyAction()` after successful `play-unit` | Clean | Unit/redeploy only. Do not play for normal effect-card casts. |
| `SPELL_GENERIC` | Effect-card cast, effect sweep, targeted effect resolution | `startPlayerEffectCast()`, targeted-effect branch in `onBoardCellTap()`, enemy effect branch in `revealAndApplyEnemyAction()`, `playEffectCastSweep()` | Clean | Best central visual sync is `playEffectCastSweep()` for flows that already use it; direct targeted effects may need a success-path call. |
| `ATTACK_IMPACT` | Unit combat impact and generic base impact | `playCombatEventFeedback(events)` | Clean with cooldown | Play for positive-damage combat events. Aggregate or throttle simultaneous events to avoid machine-gun playback. |
| `UNIT_DEATH` | Unit/card destroyed | `playCombatDeathOverlay(overlay)` for combat deaths; `showRemoveFeedback(index, label, kind)` or action-feedback `remove` path for effect removals | Clean | Add cooldown for simultaneous deaths. |
| `BASE_BREAK` | Base destroyed | First winner resolution from base HP reaching zero, near `completeBattleFlow(...)` / result scheduling | Needs one-shot guard | Fire once per battle, not every result modal render. Use a guard such as `baseBreakSoundPlayed`. |
| `BATTLE_VICTORY` | Player victory result presentation | Battle result/campaign result transition path after winner is known | Clean with boundary care | Phase 1 uses this for arena and campaign victories. Keep hook close enough to result context to later split `CAMPAIGN_VICTORY`. |
| `BATTLE_DEFEAT` | Player defeat result presentation | Battle result/campaign result transition path after winner is known | Clean with boundary care | Phase 1 uses this for arena and campaign defeats. Keep hook close enough to result context to later split `CAMPAIGN_DEFEAT`. |
| `BASE_HIT` | Non-lethal base damage only | `playVisualFeedbackEvents()` for `hero-text` damage; hero branch in `playCombatEventFeedback()` | Optional | Add only if the non-lethal check is trivial. Otherwise skip Phase 1. |

## Risks and mitigations

- **Mobile audio unlock:** no explicit unlock helper exists. Phaser usually unlocks after a user gesture, but the first sound can fail or be delayed on mobile if attempted too early. Phase 1 should play only from user/action paths or add a tiny `ensureAudioUnlocked(scene)` if needed.
- **Repeated SFX spam:** `UI_INVALID`, `UI_CLICK`, impacts, and deaths can fire rapidly. Put cooldowns in `playSfx()` rather than scattered gameplay code. Suggested defaults: `UI_CLICK` 40-60 ms, `UI_INVALID` 150-200 ms, `ATTACK_IMPACT` 50-90 ms, `UNIT_DEATH` 80-140 ms.
- **Missing preload:** `scene.sound.play()` on an unloaded key will fail. Preload Phase 1 sounds before any scene can call `playSfx()` and cache-check to avoid duplicate loads.
- **Settings persistence regression:** keep the existing settings object and storage key. Do not introduce a second audio settings store.
- **Music/SFX volume conflict:** current global `scene.sound.volume = musicVolume / 100` would also scale SFX. Fix before adding SFX playback.
- **Duplicate click sounds:** hand-card pointerdown/pointerup and scene pointerup can observe the same gesture. Hook only one successful owner per gesture.
- **Duplicate battle sounds:** immediate combat, normal combat, and effect feedback share visual helpers. Use central hooks, cooldowns, and one-shot guards for `BASE_BREAK` / outcome sounds.

## Proposed implementation order

1. Add `src/audio/audioAssets.js` with `AUDIO_KEYS`, `AUDIO_ASSETS`, and `preloadAudioAssets(scene)`.
2. Add `src/audio/audioPlayback.js` with `playSfx(scene, key, options)` using mute, SFX volume, cache checks, and cooldowns.
3. Preload Phase 1 sounds in `StartScene.preload()` and `BattleScene.preload()`.
4. Adjust `applyAudioSettings()` so mute remains global but `musicVolume` no longer scales all SFX.
5. Add `UI_INVALID` only through `BattleScene.showInvalidActionFeedback()` and verify mute/SFX volume.
6. Add `UI_CLICK` to successful semantic UI/PASS/mulligan/hand-card/board-selection paths while keeping callsites separable.
7. Add `CARD_DEPLOY` for successful unit play/redeploy paths.
8. Add `SPELL_GENERIC` for successful effect cast/sweep/targeted resolution paths.
9. Add `CARD_DRAW` to explicit draw feedback and end-of-turn draw paths, guarding against double playback.
10. Add `ATTACK_IMPACT` and `UNIT_DEATH` through central combat/death visual-feedback hooks with cooldowns.
11. Add `BASE_BREAK` with a one-shot battle guard.
12. Add `BATTLE_VICTORY` and `BATTLE_DEFEAT` at result boundaries that can later split campaign-specific outcome sounds cleanly.
13. Add optional `BASE_HIT` only if non-lethal base damage is trivial to detect.
14. Run `npm test` and `npm run build`; manually smoke-test mute, SFX volume, Settings persistence, invalid action, deploy, effect cast, draw, combat, death, base break, victory, and defeat on a mobile browser.
