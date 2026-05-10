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
  assert.match(source, /const SPEAKER_ICON = '🔊'/);
  assert.match(source, /const MUTED_ICON = '🔇'/);

  assert.match(source, /SETTINGS_STORAGE_KEY = 'gridfall:tactics:settings:v1'/);
  assert.match(source, /storage\.getItem\(SETTINGS_STORAGE_KEY\)/);
  assert.match(source, /storage\.setItem\(SETTINGS_STORAGE_KEY, JSON\.stringify\(this\.settings\)\)/);
  assert.match(source, /this\.scene\.start\('MainMenuScene'\)/);
});

test('settings notes document current settings shell behavior and future audio paths', () => {
  const notes = read('docs/ui/settings-notes.md');

  assert.match(notes, /dropdown\/select-style menu/);
  assert.match(notes, /English \(`en`\)/);
  assert.match(notes, /Polish \(`pl`\)/);
  assert.match(notes, /Music Volume/);
  assert.match(notes, /SFX Volume/);
  assert.match(notes, /Speaker icon means audio is active/);
  assert.match(notes, /Crossed speaker icon means audio is muted/);
  assert.match(notes, /public\/assets\/audio\/music\//);
  assert.match(notes, /public\/assets\/audio\/sfx\//);
});
