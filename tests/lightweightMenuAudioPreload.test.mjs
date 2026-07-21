import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { AUDIO_KEYS, preloadMenuAudioAssets } from '../src/audio/audioAssets.js';

const read = (path) => fs.readFileSync(path, 'utf8');
const preloadBody = (source) => source.match(/  preload\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

const SCOPED_SCENES = Object.freeze({
  GameMenuScene: 'src/scenes/GameMenuScene.js',
  FactionSelectScene: 'src/scenes/FactionSelectScene.js',
  CampaignEnemySelectScene: 'src/scenes/CampaignEnemySelectScene.js',
  AchievementsScene: 'src/scenes/AchievementsScene.js',
});

const BATTLE_AUDIO_KEY_NAMES = Object.freeze([
  'BATTLE_AMBIENCE',
  'BATTLE_VICTORY',
  'BATTLE_DEFEAT',
  'BATTLE_START',
  'CARD_DRAW',
  'CARD_DEPLOY',
  'SPELL_GENERIC',
  'ATTACK_IMPACT',
  'UNIT_DEATH',
  'BASE_BREAK',
]);

function makeAudioScene({ cached = [], withAudioLoader = true } = {}) {
  const cachedKeys = new Set(cached);
  const audioCalls = [];
  return {
    cache: { audio: { exists: (key) => cachedKeys.has(key) } },
    load: withAudioLoader ? { audio: (key, path) => audioCalls.push({ key, path }) } : {},
    audioCalls,
  };
}

test('scoped lightweight menu scenes use the narrow menu audio preload boundary', () => {
  Object.entries(SCOPED_SCENES).forEach(([sceneName, path]) => {
    const source = read(path);
    const body = preloadBody(source);

    assert.match(source, /import \{(?: AUDIO_KEYS,)? preloadMenuAudioAssets \} from '\.\.\/audio\/audioAssets\.js';/, sceneName);
    assert.match(body, /preloadMenuAudioAssets\(this\);/, sceneName);
    assert.doesNotMatch(body, /preloadAudioAssets\(this\)/, sceneName);
    assert.match(source, /playMenuMusic\(this\);/, sceneName);
  });
});

test('scoped lightweight menu scenes keep click audio but exclude invalid, achievement, and battle-owned audio', () => {
  Object.entries(SCOPED_SCENES).forEach(([sceneName, path]) => {
    const source = read(path);
    const body = preloadBody(source);

    assert.match(body, /preloadMenuAudioAssets\(this\);/, `${sceneName} queues MENU_MUSIC and UI_CLICK via shared helper`);
    assert.doesNotMatch(body, /AUDIO_KEYS\.UI_INVALID/, `${sceneName} does not preload invalid SFX`);
    assert.doesNotMatch(body, /AUDIO_KEYS\.ACHIEVEMENT_UNLOCK/, `${sceneName} does not preload achievement unlock SFX`);
    BATTLE_AUDIO_KEY_NAMES.forEach((keyName) => {
      assert.doesNotMatch(body, new RegExp(`AUDIO_KEYS\\.${keyName}`), `${sceneName} excludes ${keyName}`);
    });
  });
});

test('AchievementsScene displays achievement state without awarding unlock audio while active', () => {
  const source = read(SCOPED_SCENES.AchievementsScene);
  assert.match(source, /loadAchievementState/);
  assert.match(source, /calculateAchievementProgression/);
  assert.doesNotMatch(source, /awardAchievement|recordAchievementUnlock|ACHIEVEMENT_UNLOCK|playSfx/);
});

test('explicitly excluded scenes and established scene ownership boundaries remain unchanged', () => {
  assert.match(preloadBody(read('src/scenes/SettingsScene.js')), /preloadAudioAssets\(this\);/);
  assert.match(preloadBody(read('src/scenes/TutorialScene.js')), /preloadAudioAssets\(this\);/);
  assert.match(preloadBody(read('src/scenes/StartScene.js')), /preloadMenuAudioAssets\(this\);/);
  assert.match(preloadBody(read('src/scenes/MainMenuScene.js')), /preloadMenuAudioAssets\(this\);/);
  assert.match(preloadBody(read('src/scenes/CollectionScene.js')), /preloadAudioAssetsByKey\(this, \[AUDIO_KEYS\.MENU_MUSIC, AUDIO_KEYS\.UI_CLICK\]\);/);
  assert.match(preloadBody(read('src/scenes/BattleScene.js')), /preloadAudioAssetsByKey\(this, BATTLE_SCENE_PRELOAD_AUDIO_KEYS\);/);
});

test('shared menu audio helper still queues only menu music and click, skips cache, and is null-safe', () => {
  const scene = makeAudioScene();
  preloadMenuAudioAssets(scene);
  assert.deepEqual(scene.audioCalls.map((call) => call.key), [AUDIO_KEYS.MENU_MUSIC, AUDIO_KEYS.UI_CLICK]);

  const cachedScene = makeAudioScene({ cached: [AUDIO_KEYS.MENU_MUSIC, AUDIO_KEYS.UI_CLICK] });
  preloadMenuAudioAssets(cachedScene);
  assert.deepEqual(cachedScene.audioCalls, []);

  assert.doesNotThrow(() => preloadMenuAudioAssets(makeAudioScene({ withAudioLoader: false })));
  assert.doesNotThrow(() => preloadMenuAudioAssets(null));
});
