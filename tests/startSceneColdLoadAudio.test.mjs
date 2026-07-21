import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  AUDIO_KEYS,
  MENU_AUDIO_PRELOAD_KEYS,
  preloadMenuAudioAssets,
} from '../src/audio/audioAssets.js';

const read = (path) => fs.readFileSync(path, 'utf8');
const startSource = read('src/scenes/StartScene.js');
const preloadBody = startSource.match(/  preload\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
const initialAssetsSource = read('src/ui/mainMenuInitialAssets.js');

function createAudioScene({ cached = [], withAudioLoader = true } = {}) {
  const cachedKeys = new Set(cached);
  const audioCalls = [];
  return {
    cache: {
      audio: {
        exists: (key) => cachedKeys.has(key),
      },
    },
    load: withAudioLoader
      ? {
          audio: (key, path) => audioCalls.push({ key, path }),
        }
      : {},
    audioCalls,
  };
}

test('StartScene preload keeps startup/menu visuals and uses the narrow menu audio boundary', () => {
  assert.match(preloadBody, /preloadMainMenuFirstFrameVisualAssets\(this\)/);

  assert.match(startSource, /import \{ preloadMainMenuFirstFrameVisualAssets \} from '\.\.\/ui\/mainMenuInitialAssets\.js';/);
  assert.match(startSource, /import \{ preloadMenuAudioAssets \} from '\.\.\/audio\/audioAssets\.js';/);
  assert.match(preloadBody, /preloadMenuAudioAssets\(this\)/);
  assert.doesNotMatch(preloadBody, /preloadAudioAssets\(this\)/);
});

test('StartScene first-frame visual helper queues menu background, logo, and button art', () => {
  assert.match(initialAssetsSource, /preloadMenuBackgroundArt\(scene\)/);
  assert.match(initialAssetsSource, /preloadImageAsset\(scene, GRIDFALL_LOGO_ASSET/);
  assert.match(initialAssetsSource, /preloadSecondaryButtonAsset\(scene\)/);
  assert.match(initialAssetsSource, /Main menu logo failed to load: \${asset\.path}/);
});

test('StartScene first-frame visual helper relies on cache-safe fallback asset helpers', () => {
  assert.match(read('src/rendering/backgroundArt.js'), /if \(!asset\?\.path \|\| !asset\?\.key \|\| scene\.textures\.exists\(asset\.key\)\) \{[\s\S]*?return;/);
  assert.match(read('src/ui/imageButton.js'), /export function preloadSecondaryButtonAsset\(scene\) \{[\s\S]*preloadImageAsset\(scene, SECONDARY_BUTTON_ASSET/);
  assert.match(read('src/audio/audioAssets.js'), /if \(!asset\?\.key \|\| !asset\?\.path \|\| hasCachedAudioAsset\(scene, asset\.key\)\) return;/);
});
test('StartScene menu audio helper queues menu music and UI click only', () => {
  assert.deepEqual(MENU_AUDIO_PRELOAD_KEYS, [AUDIO_KEYS.MENU_MUSIC, AUDIO_KEYS.UI_CLICK]);

  const scene = createAudioScene();
  preloadMenuAudioAssets(scene);

  assert.deepEqual(scene.audioCalls.map((call) => call.key), [AUDIO_KEYS.MENU_MUSIC, AUDIO_KEYS.UI_CLICK]);
  assert.ok(scene.audioCalls.every((call) => typeof call.path === 'string' && call.path.includes('/assets/audio/')));
});

test('StartScene menu audio helper excludes battle and progression-only audio', () => {
  const excludedKeys = [
    AUDIO_KEYS.BATTLE_AMBIENCE,
    AUDIO_KEYS.BATTLE_VICTORY,
    AUDIO_KEYS.BATTLE_DEFEAT,
    AUDIO_KEYS.BATTLE_START,
    AUDIO_KEYS.CARD_DRAW,
    AUDIO_KEYS.CARD_DEPLOY,
    AUDIO_KEYS.SPELL_GENERIC,
    AUDIO_KEYS.ATTACK_IMPACT,
    AUDIO_KEYS.UNIT_DEATH,
    AUDIO_KEYS.BASE_BREAK,
    AUDIO_KEYS.ACHIEVEMENT_UNLOCK,
  ];

  excludedKeys.forEach((key) => assert.equal(MENU_AUDIO_PRELOAD_KEYS.includes(key), false, key));
});

test('StartScene menu audio helper skips cached menu audio and is null-safe without loader support', () => {
  const cachedScene = createAudioScene({ cached: [AUDIO_KEYS.MENU_MUSIC, AUDIO_KEYS.UI_CLICK] });
  preloadMenuAudioAssets(cachedScene);
  assert.deepEqual(cachedScene.audioCalls, []);

  assert.doesNotThrow(() => preloadMenuAudioAssets(createAudioScene({ withAudioLoader: false })));
  assert.doesNotThrow(() => preloadMenuAudioAssets(null));
});

test('MainMenu first render reuses bootstrap helpers instead of starting unrelated asset loads', () => {
  const mainMenuSource = read('src/scenes/MainMenuScene.js');
  const mainMenuPreloadBody = mainMenuSource.match(/  preload\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

  assert.match(mainMenuPreloadBody, /preloadMainMenuFirstFrameVisualAssets\(this\)/);
  assert.match(mainMenuPreloadBody, /preloadMenuAudioAssets\(this\)/);
  assert.doesNotMatch(mainMenuPreloadBody, /preloadAudioAssets\(this\)/);
});

test('StartScene handoff remains independent of audio preload failure and timing constants are unchanged', () => {
  assert.doesNotMatch(startSource, /load\.on\('complete'[\s\S]*playStartTransition/);
  assert.doesNotMatch(startSource, /await\s+preloadMenuAudioAssets|preloadMenuAudioAssets\(this\)\.then/);
  assert.match(startSource, /this\.scene\.launch\('MainMenuScene', \{ revealFromStart: true, awaitSharedLogo: true \}\);/);

  assert.match(startSource, /const START_TRANSITION_MS = 720;/);
  assert.match(startSource, /const START_FEEDBACK_MS = 120;/);
  assert.match(startSource, /const START_MENU_REVEAL_LAG_MS = 90;/);
  assert.match(startSource, /const STARTUP_SPLASH_REMOVE_MS = 180;/);
  assert.match(startSource, /const STARTUP_READY_TEXT_DELAY_MS = 520;/);
  assert.match(startSource, /const STARTUP_VEIL_FADE_MS = 780;/);
  assert.match(startSource, /const STARTUP_SIGNAL_SWEEP_MS = 250;/);
});
