import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { getNavigationIconGeometry, NAVIGATION_ICON_TYPES } from '../src/ui/navigationControls.js';

const read = (path) => fs.readFileSync(path, 'utf8');
const helperSource = () => read('src/ui/navigationControls.js');

function assertCenteredBounds(bounds, tolerance) {
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  assert.ok(Math.abs(centerX) <= tolerance, `expected centered x bounds, got ${centerX}`);
  assert.ok(Math.abs(centerY) <= tolerance, `expected centered y bounds, got ${centerY}`);
}

test('bottom navigation back, help, and fullscreen controls use vector graphics instead of Text glyph icons', () => {
  const source = helperSource();
  const floatingControlSource = source.slice(source.indexOf('export function createFloatingControl'), source.indexOf('export function drawSpeakerIcon'));
  const bottomControlsSource = source.slice(source.indexOf('export function createBottomNavigationControls'), source.indexOf('export function requestPortraitOrientationLock'));

  assert.doesNotMatch(floatingControlSource, /scene\.add\.text/);
  assert.doesNotMatch(bottomControlsSource, /'←'|'\?'|'⛶'/);
  assert.match(floatingControlSource, /const icon = scene\.add\.graphics\(\)\.setPosition\(x, y\)\.setDepth\(200\)/);
  assert.match(floatingControlSource, /drawNavigationIcon\(icon, size, iconType\)/);
  assert.match(bottomControlsSource, /NAVIGATION_ICON_TYPES\.BACK/);
  assert.match(bottomControlsSource, /NAVIGATION_ICON_TYPES\.HELP/);
  assert.match(bottomControlsSource, /NAVIGATION_ICON_TYPES\.FULLSCREEN/);
});

test('navigation vector icon geometry is centered and scales from control size', () => {
  for (const iconType of Object.values(NAVIGATION_ICON_TYPES)) {
    const small = getNavigationIconGeometry(44, iconType);
    const large = getNavigationIconGeometry(58, iconType);

    assert.ok(small.strokeWidth >= 3);
    assert.equal(large.unit / small.unit, 58 / 44);
    assert.equal(large.strokeWidth / small.strokeWidth, 58 / 44);
    assertCenteredBounds(small.bounds, small.unit * 1.25);
    assertCenteredBounds(large.bounds, large.unit * 1.25);
  }
});

test('bottom navigation positions, touch size, callbacks, fullscreen, and mute behavior stay on the shared paths', () => {
  const source = helperSource();
  const bottomControlsSource = source.slice(source.indexOf('export function createBottomNavigationControls'), source.indexOf('export function requestPortraitOrientationLock'));
  const muteSource = source.slice(source.indexOf('export function createMuteToggleControl'), source.indexOf('export function createBottomNavigationControls'));
  const fullscreenSource = source.slice(source.indexOf('export function toggleSceneFullscreen'));

  assert.match(source, /const resolvedTouchSize = touchSize \?\? Math\.max\(48, Math\.min\(58, height \* 0\.066\)\)/);
  assert.match(bottomControlsSource, /const fullscreenX = metrics\.width - metrics\.margin - metrics\.touchSize \/ 2/);
  assert.match(bottomControlsSource, /const backX = metrics\.margin \+ metrics\.touchSize \/ 2/);
  assert.match(bottomControlsSource, /back: onBack \? createFloatingControl\(scene, backX, metrics\.centerY, metrics\.touchSize, NAVIGATION_ICON_TYPES\.BACK, onBack\)/);
  assert.match(bottomControlsSource, /rules: middleAction \? createFloatingControl\(scene, metrics\.width \* 0\.5, metrics\.centerY, metrics\.touchSize, NAVIGATION_ICON_TYPES\.HELP, middleAction\)/);
  assert.match(bottomControlsSource, /fullscreen: onFullscreen \? createFloatingControl\(scene, fullscreenX, metrics\.centerY, metrics\.touchSize, NAVIGATION_ICON_TYPES\.FULLSCREEN, onFullscreen\)/);
  assert.match(fullscreenSource, /if \(!scene\.scale\.fullscreen\.available\) \{[\s\S]*return;[\s\S]*\}/);
  assert.match(fullscreenSource, /scene\.scale\.stopFullscreen\(\)/);
  assert.match(fullscreenSource, /scene\.scale\.startFullscreen\(\)/);
  assert.match(muteSource, /toggleMuted\(scene\)/);
  assert.match(muteSource, /onToggle\?\.\(settings\)/);
});

test('no binary assets are introduced for navigation icons and shared consumers remain wired to helpers', () => {
  const helper = helperSource();
  const battle = read('src/scenes/BattleScene.js');
  const consumers = [
    'src/scenes/MainMenuScene.js',
    'src/scenes/GameMenuScene.js',
    'src/scenes/FactionSelectScene.js',
    'src/scenes/CampaignEnemySelectScene.js',
    'src/scenes/AchievementsScene.js',
    'src/scenes/SettingsScene.js',
    'src/scenes/TutorialScene.js',
    'src/scenes/StartScene.js',
  ];

  for (const path of consumers) {
    assert.match(read(path), /createBottomNavigationControls\(this, \{/);
  }

  assert.match(battle, /createFloatingControl\(this, panelX \+ 28, rowY, 42, NAVIGATION_ICON_TYPES\.FULLSCREEN/);
  assert.doesNotMatch(helper, /\.png|\.webp|\.svg|fontFamily: 'Arial, sans-serif'/);
  assert.doesNotMatch(helper, /scene\.add\.text\(x, y, label/);
});
