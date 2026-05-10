import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('SettingsScene exposes future-ready language, audio, and persistence controls', () => {
  const source = read('src/scenes/SettingsScene.js');

  assert.match(source, /const LANGUAGE_OPTIONS = \[/);
  assert.match(source, /\{ value: 'en', label: 'English' \}/);
  assert.match(source, /\{ value: 'pl', label: 'Polish' \}/);
  assert.match(source, /createLanguageSelect\(width \/ 2, height \* 0\.29, panelWidth - 74\)/);
  assert.doesNotMatch(source, /createChoiceButton\(width \/ 2 - 76[\s\S]*English/);

  assert.match(source, /musicVolume: 50/);
  assert.match(source, /sfxVolume: 50/);
  assert.match(source, /muted: false/);
  assert.match(source, /createVolumeSlider\(width \/ 2, height \* 0\.49, panelWidth - 76, 'Music Volume', 'musicVolume'\)/);
  assert.match(source, /createVolumeSlider\(width \/ 2, height \* 0\.61, panelWidth - 76, 'SFX Volume', 'sfxVolume'\)/);
  assert.match(source, /const MUTE_ON_STATE = 'Audio ON'/);
  assert.match(source, /const MUTE_MUTED_STATE = 'Muted'/);
  assert.match(source, /this\.createMuteToggle\(width \/ 2, height \* 0\.41\)/);
  assert.match(source, /const toggleSize = 52/);
  assert.match(source, /createFloatingControl\(this, x, y, toggleSize, '', toggleMute\)/);
  assert.match(source, /this\.muteIconGraphic = this\.add\.graphics\(\)\.setDepth\(201\)/);
  assert.match(source, /drawMuteIcon\(this\.muteToggleIconPosition\.x, this\.muteToggleIconPosition\.y, muted\)/);
  assert.match(source, /this\.muteIconGraphic\.lineTo\(x \+ 28, y - 18\)/);
  assert.doesNotMatch(source, /backgroundColor: '#93c5fd'/);

  assert.match(source, /SETTINGS_STORAGE_KEY = 'gridfall:tactics:settings:v1'/);
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
  assert.match(notes, /compact centered mute toggle/);
  assert.match(notes, /`Audio ON` means audio is active/);
  assert.match(notes, /`Muted` means audio is muted/);
  assert.match(notes, /Sliders remain visible and keep their stored values/);
  assert.match(notes, /public\/assets\/audio\/music\//);
  assert.match(notes, /public\/assets\/audio\/sfx\//);
});


test('SettingsScene uses shared full-screen bottom navigation controls', () => {
  const source = read('src/scenes/SettingsScene.js');

  assert.match(source, /import \{ createBuildMarker \} from '\.\.\/ui\/buildMarker\.js';/);
  assert.match(source, /import \{ createBottomNavigationControls, createFloatingControl, requestPortraitOrientationLock, toggleSceneFullscreen \} from '\.\.\/ui\/navigationControls\.js';/);
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
