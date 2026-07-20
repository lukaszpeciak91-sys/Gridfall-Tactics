import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBattleReportSnapshot } from '../src/systems/battleReport.js';
import { playSfx } from '../src/audio/audioPlayback.js';
import { AUDIO_KEYS } from '../src/audio/audioAssets.js';

const makeScene = (overrides = {}) => ({
  scene: { isActive: () => true, isPaused: () => false },
  sys: { isActive: () => true },
  time: { now: 1000 },
  cache: { audio: { exists: () => true } },
  sound: { mute: false, volume: 1, context: { state: 'running' }, play: () => {} },
  battleReportEvents: [],
  battleReportAudioEvents: [],
  battleReportAudioState: {},
  battleReportStartedAt: Date.now(),
  getBattleReportElapsedMs() { return Math.max(0, Date.now() - this.battleReportStartedAt); },
  normalizeBattleReportEventDetails(details = {}) { return { ...details }; },
  recordBattleReportEvent(name, details = {}) { this.battleReportEvents.push({ t: this.getBattleReportElapsedMs(), name, details }); return true; },
  recordAudioDiagnosticEvent(name, details = {}) {
    const t = this.getBattleReportElapsedMs();
    const key = `${name}:${details.key ?? ''}:${details.source ?? ''}:${details.reason ?? ''}:${details.state ?? ''}`;
    if (this.battleReportLastAudioEvent?.key === key && t - this.battleReportLastAudioEvent.t <= 200) return false;
    this.battleReportAudioEvents.push({ t, name, details });
    while (this.battleReportAudioEvents.length > 12) this.battleReportAudioEvents.shift();
    this.battleReportLastAudioEvent = { key, t };
    if (name === 'audio-sfx-requested') this.battleReportAudioState.lastRequestedSfxKey = details.key;
    if (name === 'audio-sfx-dispatched') this.battleReportAudioState.lastDispatchedSfxKey = details.key;
    if (name === 'audio-sfx-skipped') { this.battleReportAudioState.lastSkippedSfxKey = details.key; this.battleReportAudioState.lastSkipReason = details.reason; }
    if (name === 'audio-outcome-stinger-started') { this.battleReportAudioState.outcomeStingerActive = true; this.battleReportAudioState.outcomeStingerKey = details.key; }
    if (name === 'audio-outcome-stinger-stopped') this.battleReportAudioState.outcomeStingerActive = false;
    if (name === 'audio-context-state') this.battleReportAudioState.audioContextState = details.state;
    this.battleReportAudioState.lastAudioEventAtMs = t;
    return true;
  },
  ...overrides,
});

test('audio section exists, serializes, and tolerates missing audio globals', () => {
  const snapshot = buildBattleReportSnapshot({});
  assert.deepEqual(Object.keys(snapshot.audio), ['settings', 'state', 'recentEvents']);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
  assert.equal(snapshot.audio.state.soundSystemAvailable, false);
  assert.equal(snapshot.audio.state.audioContextState, 'unknown');
});

test('settings summary reports muted/musicVolume/sfxVolume without warninging for valid settings', () => {
  const snapshot = buildBattleReportSnapshot(makeScene());
  assert.equal(typeof snapshot.audio.settings.muted, 'boolean');
  assert.equal(snapshot.audio.settings.musicVolume, 20);
  assert.equal(snapshot.audio.settings.sfxVolume, 40);
  assert.equal(snapshot.warnings.includes('SFX_VOLUME_ZERO'), false);
});

test('SFX request and dispatch are recorded', () => {
  const scene = makeScene();
  assert.equal(playSfx(scene, AUDIO_KEYS.UI_CLICK, { source: 'ui-click', cooldownMs: 0 }), true);
  const snapshot = buildBattleReportSnapshot(scene);
  assert.deepEqual(snapshot.audio.recentEvents.map((e) => e.name), ['audio-sfx-requested', 'audio-sfx-dispatched']);
  assert.equal(snapshot.audio.state.lastRequestedSfxKey, AUDIO_KEYS.UI_CLICK);
  assert.equal(snapshot.audio.state.lastSuccessfullyDispatchedSfxKey, AUDIO_KEYS.UI_CLICK);
});

test('muted and zero-volume skips are represented distinctly', () => {
  const muted = makeScene();
  globalThis.window = { localStorage: { getItem: () => JSON.stringify({ muted: true, musicVolume: 20, sfxVolume: 40 }) } };
  assert.equal(playSfx(muted, AUDIO_KEYS.UI_CLICK, { source: 'ui-click', cooldownMs: 0 }), false);
  assert.equal(buildBattleReportSnapshot(muted).audio.state.lastBlockOrSkipReason, 'MUTED');
  const zero = makeScene();
  globalThis.window = { localStorage: { getItem: () => JSON.stringify({ muted: false, musicVolume: 20, sfxVolume: 0 }) } };
  assert.equal(playSfx(zero, AUDIO_KEYS.UI_CLICK, { source: 'ui-click', cooldownMs: 0 }), false);
  assert.equal(buildBattleReportSnapshot(zero).audio.state.lastBlockOrSkipReason, 'SFX_VOLUME_ZERO');
  delete globalThis.window;
});

test('cooldown, missing key, unloaded asset, and context states are compact', () => {
  const scene = makeScene();
  assert.equal(playSfx(scene, AUDIO_KEYS.UI_INVALID, { source: 'invalid-action', cooldownMs: 160 }), true);
  scene.time.now = 1050;
  assert.equal(playSfx(scene, AUDIO_KEYS.UI_INVALID, { source: 'invalid-action', cooldownMs: 160 }), false);
  assert.equal(buildBattleReportSnapshot(scene).audio.state.lastBlockOrSkipReason, 'COOLDOWN_ACTIVE');

  const missing = makeScene();
  assert.equal(playSfx(missing, 'missing.key', { source: 'unknown' }), false);
  assert.equal(buildBattleReportSnapshot(missing).audio.state.lastBlockOrSkipReason, 'KEY_MISSING');

  const unloaded = makeScene({ cache: { audio: { exists: () => false } } });
  assert.equal(playSfx(unloaded, AUDIO_KEYS.CARD_DRAW, { source: 'card-draw' }), false);
  assert.equal(buildBattleReportSnapshot(unloaded).audio.state.lastBlockOrSkipReason, 'ASSET_NOT_LOADED');

  const suspended = makeScene({ sound: { context: { state: 'suspended' }, play: () => {} } });
  const snap = buildBattleReportSnapshot(suspended);
  assert.equal(snap.audio.state.audioContextState, 'suspended');
  assert.ok(snap.warnings.includes('AUDIO_CONTEXT_SUSPENDED_WHILE_ACTIVE'));
});

test('reveal SFX states and outcome stingers are distinguishable', () => {
  assert.equal(buildBattleReportSnapshot(makeScene()).reveal.revealSfxPathReached, false);

  const requested = makeScene({ openingRevealSfxPathReached: true, openingRevealSfxDispatchCalled: false });
  assert.ok(buildBattleReportSnapshot(requested).warnings.includes('REVEAL_SFX_REQUESTED_NOT_DISPATCHED'));

  const dispatched = makeScene({ openingRevealSfxPathReached: true, openingRevealSfxDispatchCalled: true });
  assert.equal(buildBattleReportSnapshot(dispatched).warnings.includes('REVEAL_SFX_REQUESTED_NOT_DISPATCHED'), false);

  dispatched.recordAudioDiagnosticEvent('audio-outcome-stinger-started', { key: AUDIO_KEYS.BATTLE_VICTORY });
  let snapshot = buildBattleReportSnapshot(dispatched);
  assert.equal(snapshot.audio.state.outcomeStingerActive, true);
  assert.equal(snapshot.audio.state.outcomeStingerKey, AUDIO_KEYS.BATTLE_VICTORY);
  dispatched.recordAudioDiagnosticEvent('audio-outcome-stinger-stopped', { key: AUDIO_KEYS.BATTLE_VICTORY });
  snapshot = buildBattleReportSnapshot(dispatched);
  assert.equal(snapshot.audio.state.outcomeStingerActive, false);
});

test('recent audio events are bounded, deduplicated, and full report remains compact', () => {
  const scene = makeScene();
  for (let i = 0; i < 20; i += 1) scene.recordAudioDiagnosticEvent('audio-sfx-requested', { key: `k${i}`, source: 'unknown' });
  scene.recordAudioDiagnosticEvent('audio-sfx-skipped', { key: 'same', source: 'unknown', reason: 'MUTED' });
  scene.recordAudioDiagnosticEvent('audio-sfx-skipped', { key: 'same', source: 'unknown', reason: 'MUTED' });
  const snapshot = buildBattleReportSnapshot(scene);
  assert.equal(snapshot.audio.recentEvents.length, 12);
  assert.equal(snapshot.audio.recentEvents.filter((e) => e.details.key === 'same').length, 1);
  assert.ok(JSON.stringify(snapshot).length < 15_000);
});
