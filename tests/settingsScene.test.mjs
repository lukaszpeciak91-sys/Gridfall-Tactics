import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('SettingsScene exposes future-ready language, audio, and persistence controls', () => {
  const source = read('src/scenes/SettingsScene.js');

  assert.match(source, /const LANGUAGE_OPTIONS = \[/);
  assert.match(source, /\{ value: 'en', label: 'English' \}/);
  assert.match(source, /\{ value: 'pl', label: 'Polish' \}/);
  assert.match(source, /const navMetrics = getBottomNavigationMetrics\(this\)/);
  assert.match(source, /const contentTop = Math\.max\(126, height \* 0\.21\)/);
  assert.match(source, /const languagePanelHeight = Phaser\.Math\.Clamp\(Math\.round\(availablePanelHeight \* 0\.34\), 124, 146\)/);
  assert.match(source, /this\.createLanguageSelect\(width \/ 2, languageSelectY, panelWidth - 74\)/);
  assert.doesNotMatch(source, /createChoiceButton\(width \/ 2 - 76[\s\S]*English/);

  assert.match(source, /musicVolume: 50/);
  assert.match(source, /sfxVolume: 50/);
  assert.match(source, /muted: false/);
  assert.match(source, /const audioTitleY = audioPanelY - audioPanelHeight \/ 2 \+ 22/);
  assert.match(source, /createMuteToggle\(width \/ 2, audioTitleY \+ 38\)/);
  assert.match(source, /createVolumeSlider\(width \/ 2, audioPanelY - 15, panelWidth - 76, 'Music Volume', 'musicVolume'\)/);
  assert.match(source, /createVolumeSlider\(width \/ 2, audioPanelY \+ audioPanelHeight \/ 2 - 70, panelWidth - 76, 'SFX Volume', 'sfxVolume'\)/);
  assert.match(source, /const muteButtonSize = 50/);
  assert.match(source, /this\.muteButtonControls = createFloatingControl\([\s\S]*x,[\s\S]*y,[\s\S]*muteButtonSize/);
  assert.match(source, /this\.muteToggleHitArea = this\.muteButtonControls\.backing/);
  assert.match(source, /this\.muteIconGraphic = this\.add\.graphics\(\)\.setDepth\(201\)/);
  assert.match(source, /drawMuteIcon\(this\.muteToggleIconPosition\.x, this\.muteToggleIconPosition\.y, muted\)/);
  assert.match(source, /this\.muteIconGraphic\.lineTo\(x \+ 28, y - 17\)/);
  assert.doesNotMatch(source, /toggleWidth|toggleHeight|muteStatusText|Sound Enabled|Sound Muted/);
  assert.doesNotMatch(source, /backgroundColor: '#93c5fd'/);

  assert.match(source, /SETTINGS_STORAGE_KEY = 'gridfall:tactics:settings:v1'/);
  assert.match(source, /storage\.getItem\(SETTINGS_STORAGE_KEY\)/);
  assert.match(source, /storage\.setItem\(SETTINGS_STORAGE_KEY, JSON\.stringify\(this\.settings\)\)/);
  assert.match(source, /createFloatingControl\(this, backX, centerY, touchSize, '←', \(\) => this\.scene\.start\('MainMenuScene'\)\)/);
});

test('settings notes document current settings shell behavior and future audio paths', () => {
  const notes = read('docs/ui/settings-notes.md');

  assert.match(notes, /dropdown\/select-style menu/);
  assert.match(notes, /English \(`en`\)/);
  assert.match(notes, /Polish \(`pl`\)/);
  assert.match(notes, /Music Volume/);
  assert.match(notes, /SFX Volume/);
  assert.match(notes, /compact centered mute button/);
  assert.match(notes, /speaker icon means audio is active/);
  assert.match(notes, /slashed speaker icon means audio is muted/);
  assert.match(notes, /button remains tappable/);
  assert.match(notes, /public\/assets\/audio\/music\//);
  assert.match(notes, /public\/assets\/audio\/sfx\//);
});
