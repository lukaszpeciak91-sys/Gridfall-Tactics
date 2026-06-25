import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('MENU_MUSIC is registered as looping music under the music asset path', () => {
  const source = read('src/audio/audioAssets.js');
  assert.match(source, /MENU_MUSIC: 'music\.menu'/);
  assert.match(source, /const musicPath = \(filename\) => resolvePublicAssetPath\(`assets\/audio\/music\/\$\{filename\}`\);/);
  assert.match(source, /\[AUDIO_KEYS\.MENU_MUSIC\]: Object\.freeze\(\{ key: AUDIO_KEYS\.MENU_MUSIC, path: musicPath\('menu-music\.mp3'\), category: 'music', loop: true \}\)/);
});

test('managed music helpers are separate from SFX cooldown playback', () => {
  const source = read('src/audio/audioPlayback.js');
  assert.match(source, /export function playMusic\(scene, key, options = \{\}\) \{/);
  assert.match(source, /if \(!asset \|\| asset\.category !== 'music' \|\| !scene\?\.sound\?\.add\) return null;/);
  assert.match(source, /activeMusic\?\.key === asset\.key/);
  assert.match(source, /export function updateMusicVolume\(settings = loadSettings\(\)\) \{/);
  assert.match(source, /settings\.musicVolume \/ 100/);
  assert.match(source, /export const MUSIC_BUS_VOLUME = 0\.25;/);
  assert.match(source, /settingsVolume \* assetVolume \* optionVolume \* MUSIC_BUS_VOLUME/);
  assert.doesNotMatch(source.slice(source.indexOf('function getSfxPlaybackVolume'), source.indexOf('function getMusicPlaybackVolume')), /MUSIC_BUS_VOLUME/);
  assert.doesNotMatch(source.slice(source.indexOf('export function playMusic')), /lastPlayedAtByKey/);
  assert.match(source, /export function stopMusic\(scene, \{ fadeMs = 300 \} = \{\}\) \{/);
});

test('menu music scene whitelist gates SettingsScene and RulesPanelScene origins', () => {
  const source = read('src/audio/menuMusic.js');
  ['MainMenuScene', 'GameMenuScene', 'FactionSelectScene', 'CampaignEnemySelectScene', 'CollectionScene', 'TutorialScene'].forEach((sceneKey) => {
    assert.match(source, new RegExp(`'${sceneKey}'`));
  });
  assert.match(source, /export function playMenuMusicForReturnScene\(scene, returnSceneKey, options = \{\}\) \{/);
  assert.match(read('src/scenes/SettingsScene.js'), /playMenuMusicForReturnScene\(this, this\.musicReturnSceneKey\);/);
  assert.match(read('src/scenes/RulesPanelScene.js'), /playMenuMusicForReturnScene\(this, musicReturnSceneKey\);/);
});

test('whitelisted menu-flow scenes start or continue the managed menu loop', () => {
  [
    'src/scenes/MainMenuScene.js',
    'src/scenes/GameMenuScene.js',
    'src/scenes/FactionSelectScene.js',
    'src/scenes/CampaignEnemySelectScene.js',
    'src/scenes/CollectionScene.js',
    'src/scenes/TutorialScene.js',
  ].forEach((path) => {
    const source = read(path);
    assert.match(source, /playMenuMusic\(this\);/);
    assert.match(source, /preloadAudioAssets\(this\);/);
  });
});

test('battle entry paths stop menu music and BattleScene defensively stops it on entry', () => {
  assert.match(read('src/scenes/FactionSelectScene.js'), /stopMusic\(this\);\s*this\.scene\.start\('BattleScene', \{ factionKey \}\);/);
  assert.match(read('src/scenes/CampaignEnemySelectScene.js'), /stopMusic\(this\);\s*this\.scene\.start\('BattleScene', \{/);
  assert.match(read('src/scenes/BattleMenuScene.js'), /stopMusic\(this\);\s*this\.scene\.start\('BattleScene'/);
  assert.match(read('src/scenes/BattleScene.js'), /create\(data\) \{\s*this\.cleanupSceneObjects\(\);\s*stopMusic\(this, \{ fadeMs: 0 \}\);/);
});
