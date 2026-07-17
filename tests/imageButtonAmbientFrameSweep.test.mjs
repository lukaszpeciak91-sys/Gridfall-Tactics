import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const imageButtonSource = fs.readFileSync('src/ui/imageButton.js', 'utf8');
const mainMenuSource = fs.readFileSync('src/scenes/MainMenuScene.js', 'utf8');
const gameMenuSource = fs.readFileSync('src/scenes/GameMenuScene.js', 'utf8');
const factionSource = fs.readFileSync('src/scenes/FactionSelectScene.js', 'utf8');
const battleSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const modalControlsSource = fs.readFileSync('src/ui/modalControls.js', 'utf8');
const collectionSource = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
const rulesSource = fs.readFileSync('src/scenes/RulesPanelScene.js', 'utf8');
const settingsSource = fs.readFileSync('src/scenes/SettingsScene.js', 'utf8');

const bodyBetween = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test('ambient frame sweep is explicit opt-in and defaults off', () => {
  assert.match(imageButtonSource, /ambientFrameSweep = false/);
  assert.match(imageButtonSource, /const ambientSweep = ambientFrameSweep\s*\?\s*createAmbientFrameSweep/);
  assert.doesNotMatch(imageButtonSource, /scene\.key|label\.includes/);
});

test('non-opted-in image buttons create no ambient sweep object or animation ownership', () => {
  assert.match(imageButtonSource, /ambientFrameSweep = false/);
  assert.match(imageButtonSource, /ambientFrameSweep: ambientSweep\?\.graphics \?\? null/);
  assert.match(imageButtonSource, /ambientFrameSweepGeometry: ambientSweep\?\.geometry \?\? null/);
  assert.match(imageButtonSource, /ambientFrameSweepTiming: ambientSweep\?\.timing \?\? null/);
});

test('opted-in image buttons create one non-interactive decorative cyan sweep graphics object', () => {
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_COLOR = 0x38d5ff/);
  assert.match(imageButtonSource, /const graphics = scene\.add\.graphics\(\)[\s\S]*\.setDepth\(depth \+ 0\.75\)[\s\S]*\.setVisible\(false\)/);
  assert.match(imageButtonSource, /graphics\.setData\?\.\('imageButtonAmbientFrameSweep', true\)/);
  assert.match(imageButtonSource, /graphics\.disableInteractive\?\.\(\)/);
  assert.match(imageButtonSource, /items: \[shadow, backing, centerGlow, ambientSweep\?\.graphics, text, hitZone\]/);
});

test('ambient sweep geometry derives from resolved dimensions and scales proportionally', () => {
  assert.match(imageButtonSource, /normalizeAmbientFrameSweepGeometry\(\{ width, visualHeight \}\)/);
  assert.match(imageButtonSource, /const inset = Math\.max\(3, Math\.round\(shortestSide \* 0\.075\)\)/);
  assert.match(imageButtonSource, /const radius = Math\.max\(4, Math\.min\(pathHeight \* 0\.42, pathWidth \* 0\.18, shortestSide \* 0\.24\)\)/);
  assert.match(imageButtonSource, /const perimeter = Math\.max\(1, 2 \* \(straightWidth \+ straightHeight\) \+ 2 \* Math\.PI \* radius\)/);
  assert.match(imageButtonSource, /const segmentLength = perimeter \* AMBIENT_FRAME_SWEEP_SEGMENT_RATIO/);
  assert.match(imageButtonSource, /hasButtonTexture && preserveImageAspect[\s\S]*\? Math\.round\(\(width \/ SECONDARY_BUTTON_ASPECT_RATIO\) \* SECONDARY_BUTTON_DISPLAY_HEIGHT_SCALE\)[\s\S]*: height/);
});

test('ambient sweep supports preserveImageAspect true and false without fixed paths', () => {
  assert.match(imageButtonSource, /preserveImageAspect = true/);
  assert.match(factionSource, /preserveImageAspect: false,[\s\S]*ambientFrameSweep: true/);
  assert.doesNotMatch(imageButtonSource, /fixedPixelPath|const path = \[[\s\S]*\{ x: \d+, y: \d+ \}/);
});

test('sweep timing is intermittent deterministic and within intended ranges', () => {
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_SEGMENT_RATIO = 0\.15/);
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_VISIBLE_MS = 1900/);
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_CYCLE_MS = 6400/);
  assert.match(imageButtonSource, /const AMBIENT_FRAME_SWEEP_PHASE_STEP_MS = 730/);
  assert.match(imageButtonSource, /const phaseOffsetMs = \(ambientFrameSweepSequence % 7\) \* AMBIENT_FRAME_SWEEP_PHASE_STEP_MS/);
  assert.match(imageButtonSource, /scene\.time\?\.delayedCall\?\.\(phaseOffsetMs/);
  assert.match(imageButtonSource, /scene\.time\?\.delayedCall\?\.\(AMBIENT_FRAME_SWEEP_CYCLE_MS/);
  assert.doesNotMatch(imageButtonSource, /Math\.random|repeat:\s*-1|yoyo:\s*true/);
});

test('existing hover pressed feedback hit zones and callbacks remain on their current paths', () => {
  assert.match(imageButtonSource, /const hitZone = scene\.add\.zone\(x, y, width, hitHeight\)/);
  assert.match(imageButtonSource, /tweenVisualState\('pressed', \{ duration: 65, ease: 'Quad\.easeOut' \}\)/);
  assert.match(imageButtonSource, /return \{ scale: downScale, alpha: 0\.9, textAlpha: 0\.96/);
  assert.match(imageButtonSource, /return \{ scale: hoverScale, alpha: hasButtonTexture \? 1 : 0\.96/);
  assert.match(imageButtonSource, /playSfx\(scene, AUDIO_KEYS\.UI_CLICK\);\s*onPointerUp\(pointer\);/);
});

test('destroy and shutdown cleanup own all sweep timers tweens and objects', () => {
  assert.match(imageButtonSource, /ambientSweep\?\.cleanup\?\.\(\)/);
  assert.match(imageButtonSource, /sweepTween\?\.stop\?\.\(\)/);
  assert.match(imageButtonSource, /sweepTween\?\.remove\?\.\(\)/);
  assert.match(imageButtonSource, /sweepTimer\?\.remove\?\.\(false\)/);
  assert.match(imageButtonSource, /graphics\.setData\?\.\('imageButtonAmbientFrameSweepCleanup', cleanup\)/);
  assert.match(imageButtonSource, /scene\.events\?\.once\?\.\('shutdown', cleanupFeedback\)/);
  assert.match(imageButtonSource, /export function destroyImageButton\(button\)[\s\S]*button\?\.items\?\.forEach/);
});

test('approved Phase 1 call sites opt in explicitly', () => {
  assert.match(mainMenuSource, /createMenuButton\([\s\S]*createImageButton\(this, \{[\s\S]*ambientFrameSweep: true/);
  assert.match(gameMenuSource, /continueButton = this\.createMenuButton\([\s\S]*\}, \{ ambientFrameSweep: true \}\)/);
  assert.match(gameMenuSource, /ui\.gameMenu\.arena[\s\S]*\}, \{ ambientFrameSweep: true \}\)/);
  assert.match(gameMenuSource, /createMenuButton\(x, y, width, label, onPointerUp, \{ ambientFrameSweep = false \} = \{\}\)/);
  assert.match(gameMenuSource, /ambientFrameSweep,\s*\}\);/);
  assert.match(factionSource, /label: translateActive\('ui\.factionSelect\.campaignAccordion\.select', 'SELECT'\)[\s\S]*ambientFrameSweep: true/);
});

test('excluded shared-image consumers do not opt in', () => {
  const newGameModal = bodyBetween(gameMenuSource, 'showNewGameConfirmation()', 'closeNewGameConfirmation()');
  const surrenderButton = bodyBetween(battleSource, 'createSurrenderConfirmationButton', 'confirmPlayerMenuSurrender');
  const resultButton = bodyBetween(battleSource, 'createResultModalButton', 'destroyBattleResultModal');

  assert.doesNotMatch(newGameModal, /ambientFrameSweep: true/);
  assert.doesNotMatch(surrenderButton, /ambientFrameSweep: true/);
  assert.doesNotMatch(resultButton, /ambientFrameSweep: true/);
  assert.doesNotMatch(modalControlsSource, /ambientFrameSweep: true/);
  assert.doesNotMatch(collectionSource, /ambientFrameSweep: true/);
  assert.doesNotMatch(rulesSource, /ambientFrameSweep: true/);
  assert.doesNotMatch(settingsSource, /ambientFrameSweep: true|createImageButton|createModalBackButton/);
});

test('no binary assets are introduced for the ambient sweep', () => {
  const ambientImplementation = bodyBetween(imageButtonSource, 'function createAmbientFrameSweep', 'export function calculateSecondaryButtonHeight');
  assert.doesNotMatch(ambientImplementation, /load\.image|assets\/ui|\.png['\"]/);
  assert.match(ambientImplementation, /scene\.add\.graphics\(\)/);
});
