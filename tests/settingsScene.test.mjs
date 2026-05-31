import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('SettingsScene exposes future-ready language, audio, and persistence controls', () => {
  const source = read('src/scenes/SettingsScene.js');
  const settingsState = read('src/systems/settingsState.js');
  const navigationControls = read('src/ui/navigationControls.js');

  assert.match(source, /import \{ getSupportedLocales, setActiveLocale, translateActive, translate \} from '\.\.\/localization\/localeService\.js';/);
  assert.match(source, /import \{ DEFAULT_SETTINGS, applyAudioSettings, loadSettings, saveSettings, updateSettings \} from '\.\.\/systems\/settingsState\.js';/);
  assert.match(source, /function getLanguageOptions\(displayLocale\)/);
  assert.match(source, /translate\(`ui\.settings\.languages\.\$\{locale\}`/);
  assert.match(source, /text\(width \/ 2, height \* 0\.1, translateActive\('ui\.settings\.title', 'SETTINGS'\)/);
  assert.match(source, /text\(width \/ 2, height \* 0\.15, translateActive\('ui\.settings\.subtitle', 'Preferences are saved locally'\)/);
  assert.match(source, /createLanguageSelect\(width \/ 2, height \* 0\.32, panelWidth - 74\)/);
  assert.doesNotMatch(source, /createChoiceButton\(width \/ 2 - 76[\s\S]*English/);

  assert.match(settingsState, /musicVolume: 50/);
  assert.match(settingsState, /sfxVolume: 50/);
  assert.match(settingsState, /muted: false/);
  assert.match(source, /const audioPanelHeight = 300/);
  assert.match(source, /const audioPanelTop = height \* 0\.44/);
  assert.match(source, /const muteToggleY = audioPanelTop \+ 70/);
  assert.match(source, /const musicSliderY = audioPanelTop \+ 132/);
  assert.match(source, /const sfxSliderY = audioPanelTop \+ 222/);
  assert.match(source, /addPanel\(width \/ 2, audioPanelY, panelWidth, audioPanelHeight, translateActive\('ui\.settings\.audioPanel', 'AUDIO'\)\)/);
  assert.match(source, /createMuteToggleControl\(this, width \/ 2, muteToggleY, 44/);
  assert.match(source, /createVolumeSlider\(width \/ 2, musicSliderY, panelWidth - 76, translateActive\('ui\.settings\.musicVolume', 'Music Volume'\), 'musicVolume'\)/);
  assert.match(source, /createVolumeSlider\(width \/ 2, sfxSliderY, panelWidth - 76, translateActive\('ui\.settings\.sfxVolume', 'SFX Volume'\), 'sfxVolume'\)/);
  assert.match(navigationControls, /createMuteToggleControl\(scene, x, y, size/);
  assert.match(navigationControls, /drawSpeakerIcon\(icon, size, isMuted\)/);
  assert.match(settingsState, /setMuted\(scene, muted\)/);
  assert.match(settingsState, /toggleMuted\(scene\)/);
  assert.match(source, /this\.settings\.language = setActiveLocale\(option\.value\)/);
  assert.match(settingsState, /normalizeLocale\(settings\.language\)/);
  assert.match(source, /this\.saveSettings\(\)/);
  assert.doesNotMatch(source, /Audio ON/);
  assert.doesNotMatch(source, /backgroundColor: '#93c5fd'/);

  assert.match(settingsState, /SETTINGS_STORAGE_KEY/);
  assert.match(settingsState, /storage\.getItem\(SETTINGS_STORAGE_KEY\)/);
  assert.match(settingsState, /storage\.setItem\(SETTINGS_STORAGE_KEY, JSON\.stringify\(normalizedSettings\)\)/);
  assert.match(source, /returnToMainMenu\(\) \{[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
});

test('settings notes document current settings shell behavior and future audio paths', () => {
  const notes = read('docs/ui/settings-notes.md');

  assert.match(notes, /dropdown\/select-style menu/);
  assert.match(notes, /English \(`en`\)/);
  assert.match(notes, /Polish \(`pl`\)/);
  assert.match(notes, /Music Volume/);
  assert.match(notes, /SFX Volume/);
  assert.match(notes, /compact icon button centered directly below the `AUDIO` title/);
  assert.match(notes, /crossed speaker icon with a subtle active highlight/);
  assert.match(notes, /balanced top, middle, and bottom padding/);
  assert.match(notes, /Sliders and the mute button remain visible and keep their stored values/);
  assert.match(notes, /public\/assets\/audio\/music\//);
  assert.match(notes, /public\/assets\/audio\/sfx\//);
});


test('SettingsScene uses shared full-screen bottom navigation controls', () => {
  const source = read('src/scenes/SettingsScene.js');

  assert.match(source, /import \{ createBuildMarker \} from '\.\.\/ui\/buildMarker\.js';/);
  assert.match(source, /import \{ createBottomNavigationControls, createMuteToggleControl, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(source, /const SETTINGS_PANEL_DEPTH = 0/);
  assert.match(source, /const buildMarker = createBuildMarker\(this, \{ width, height \}\);/);
  assert.match(source, /this\.drawNavigationControls\(\);/);
  assert.match(source, /drawNavigationControls\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.returnToMainMenu\(\),[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.match(source, /returnToMainMenu\(\) \{[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
  assert.match(source, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'SettingsScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(source, /resumeFromRulesPanel\(\) \{[\s\S]*this\.scene\.resume\(\);[\s\S]*\}/);
  assert.match(source, /toggleFullscreen\(\) \{[\s\S]*toggleSceneFullscreen\(this\);[\s\S]*\}/);
  assert.match(source, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.scene\.restart\(\{ returnSceneKey: this\.returnSceneKey \}\);[\s\S]*\}/);
  assert.doesNotMatch(source, /createModalBackButton/);
  assert.doesNotMatch(source, /createBackButton/);
  assert.doesNotMatch(source, /BACK DEBUG/);
  assert.doesNotMatch(source, /SETTINGS_BACK_/);
  assert.doesNotMatch(source, /SETTINGS DEBUG/);
  assert.doesNotMatch(source, /SETTINGS RUNTIME DEBUG/);
});


test('battle-launched settings resumes the existing paused battle while menu-launched settings returns to main menu', () => {
  const battleSource = read('src/scenes/BattleScene.js');
  const settingsSource = read('src/scenes/SettingsScene.js');

  assert.match(battleSource, /openSettingsScene\(\) \{[\s\S]*this\.prepareUtilityMenuNavigation\(\{ preserveBattleFlow: true \}\)[\s\S]*this\.scene\.launch\('SettingsScene', \{ returnSceneKey: 'BattleScene' \}\);[\s\S]*this\.scene\.pause\(\);/);
  assert.match(battleSource, /resumeFromSettings\(\) \{[\s\S]*this\.scene\.resume\(\);[\s\S]*this\.recoverFromLifecycle\('settings-return'\);/);
  assert.match(settingsSource, /this\.returnSceneKey = typeof data\?\.returnSceneKey === 'string'/);
  assert.match(settingsSource, /returnToMainMenu\(\) \{[\s\S]*const returnSceneKey = this\.returnSceneKey;[\s\S]*this\.scene\.stop\(\);[\s\S]*returnScene\?\.resumeFromSettings[\s\S]*this\.scene\.start\('MainMenuScene'\);/);
  assert.match(settingsSource, /this\.scene\.restart\(\{ returnSceneKey: this\.returnSceneKey \}\);/);
});
