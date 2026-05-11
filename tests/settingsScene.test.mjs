import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('SettingsScene exposes future-ready language, audio, and persistence controls', () => {
  const source = read('src/scenes/SettingsScene.js');

  assert.match(source, /import \{ SETTINGS_STORAGE_KEY, getSupportedLocales, normalizeLocale, setActiveLocale, translateActive, translate \} from '\.\.\/localization\/localeService\.js';/);
  assert.match(source, /function getLanguageOptions\(displayLocale\)/);
  assert.match(source, /translate\(`ui\.settings\.languages\.\$\{locale\}`/);
  assert.match(source, /text\(width \/ 2, height \* 0\.1, translateActive\('ui\.settings\.title', 'SETTINGS'\)/);
  assert.match(source, /text\(width \/ 2, height \* 0\.15, translateActive\('ui\.settings\.subtitle', 'Preferences are saved locally'\)/);
  assert.match(source, /createLanguageSelect\(width \/ 2, height \* 0\.32, panelWidth - 74\)/);
  assert.doesNotMatch(source, /createChoiceButton\(width \/ 2 - 76[\s\S]*English/);

  assert.match(source, /musicVolume: 50/);
  assert.match(source, /sfxVolume: 50/);
  assert.match(source, /muted: false/);
  assert.match(source, /const audioPanelHeight = 300/);
  assert.match(source, /const audioPanelTop = height \* 0\.44/);
  assert.match(source, /const muteToggleY = audioPanelTop \+ 70/);
  assert.match(source, /const musicSliderY = audioPanelTop \+ 132/);
  assert.match(source, /const sfxSliderY = audioPanelTop \+ 222/);
  assert.match(source, /addPanel\(width \/ 2, audioPanelY, panelWidth, audioPanelHeight, translateActive\('ui\.settings\.audioPanel', 'AUDIO'\)\)/);
  assert.match(source, /createMuteToggle\(width \/ 2, muteToggleY, 44\)/);
  assert.match(source, /createVolumeSlider\(width \/ 2, musicSliderY, panelWidth - 76, translateActive\('ui\.settings\.musicVolume', 'Music Volume'\), 'musicVolume'\)/);
  assert.match(source, /createVolumeSlider\(width \/ 2, sfxSliderY, panelWidth - 76, translateActive\('ui\.settings\.sfxVolume', 'SFX Volume'\), 'sfxVolume'\)/);
  assert.match(source, /createMuteToggle\(x, y, size\) \{/);
  assert.match(source, /drawSpeakerIcon\(icon, size, isMuted\)/);
  assert.match(source, /this\.settings\.muted = !this\.settings\.muted/);
  assert.match(source, /this\.settings\.language = setActiveLocale\(option\.value\)/);
  assert.match(source, /normalizeLocale\(settings\.language\)/);
  assert.match(source, /this\.saveSettings\(\)/);
  assert.doesNotMatch(source, /Audio ON/);
  assert.doesNotMatch(source, /backgroundColor: '#93c5fd'/);

  assert.match(source, /SETTINGS_STORAGE_KEY/);
  assert.match(source, /storage\.getItem\(SETTINGS_STORAGE_KEY\)/);
  assert.match(source, /storage\.setItem\(SETTINGS_STORAGE_KEY, JSON\.stringify\(this\.settings\)\)/);
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
  assert.match(source, /import \{ createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
  assert.match(source, /const SETTINGS_PANEL_DEPTH = 0/);
  assert.match(source, /const buildMarker = createBuildMarker\(this, \{ width, height \}\);/);
  assert.match(source, /this\.drawNavigationControls\(\);/);
  assert.match(source, /drawNavigationControls\(\) \{[\s\S]*createBottomNavigationControls\(this, \{[\s\S]*onBack: \(\) => this\.returnToMainMenu\(\),[\s\S]*onRules: \(\) => this\.openRulesPanel\(\),[\s\S]*onFullscreen: \(\) => this\.toggleFullscreen\(\),[\s\S]*\}\)/);
  assert.match(source, /returnToMainMenu\(\) \{[\s\S]*this\.scene\.start\('MainMenuScene'\)/);
  assert.match(source, /openRulesPanel\(\) \{[\s\S]*this\.scene\.launch\('RulesPanelScene', \{ returnSceneKey: 'SettingsScene' \}\);[\s\S]*this\.scene\.pause\(\);[\s\S]*\}/);
  assert.match(source, /resumeFromRulesPanel\(\) \{[\s\S]*this\.scene\.resume\(\);[\s\S]*\}/);
  assert.match(source, /toggleFullscreen\(\) \{[\s\S]*toggleSceneFullscreen\(this\);[\s\S]*\}/);
  assert.match(source, /onFullscreenChanged\(\) \{[\s\S]*this\.scale\.isFullscreen[\s\S]*requestPortraitOrientationLock\(\);[\s\S]*this\.scene\.restart\(\);[\s\S]*\}/);
  assert.doesNotMatch(source, /createModalBackButton/);
  assert.doesNotMatch(source, /createBackButton/);
  assert.doesNotMatch(source, /BACK DEBUG/);
  assert.doesNotMatch(source, /SETTINGS_BACK_/);
  assert.doesNotMatch(source, /SETTINGS DEBUG/);
  assert.doesNotMatch(source, /SETTINGS RUNTIME DEBUG/);
});
