import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { calculateHandLayoutMetrics, MAX_VISIBLE_HAND_CARDS, MIN_HAND_CONTROL_TOUCH_SIZE } from '../src/ui/handLayout.js';

const read = (path) => fs.readFileSync(path, 'utf8');

test('hand layout keeps cards above the control row with readable spacing on portrait mobile', () => {
  const hand = calculateHandLayoutMetrics({
    contentWidth: 370,
    margin: 10,
    handY: 642,
    handHeight: 194,
    viewportHeight: 844,
    maxHandSize: 5,
  });

  const cardBottom = hand.cardCenterY + hand.cardHeight / 2;
  const controlRowTop = hand.y + hand.cardRowHeight;
  const firstCardLeft = hand.handTrackLeft;
  const lastCardRight = hand.handTrackLeft + hand.cardWidth + hand.step * (hand.cardsVisible - 1);

  assert.equal(hand.cardsVisible, MAX_VISIBLE_HAND_CARDS);
  assert.ok(hand.controlTouchSize >= MIN_HAND_CONTROL_TOUCH_SIZE);
  assert.ok(cardBottom <= controlRowTop - hand.cardControlGap + 0.0001);
  assert.ok(firstCardLeft >= 10);
  assert.ok(lastCardRight <= 380);
  assert.ok(hand.step >= hand.cardWidth * 0.72, 'card overlap should leave most of each card readable');
});

test('shared build marker helper is used by scene UI instead of duplicating marker styling', () => {
  const battleSource = read('src/scenes/BattleScene.js');
  const factionSource = read('src/scenes/FactionSelectScene.js');
  const helperSource = read('src/ui/buildMarker.js');

  assert.match(helperSource, /export function createBuildMarker/);
  assert.match(helperSource, /getBuildMarkerText\(\)/);
  assert.match(battleSource, /import \{ createBuildMarker \} from '\.\.\/ui\/buildMarker\.js';/);
  assert.match(factionSource, /import \{ createBuildMarker \} from '\.\.\/ui\/buildMarker\.js';/);
  assert.match(battleSource, /createBuildMarker\(this, \{ width, height \}\);/);
  assert.match(factionSource, /const buildMarker = createBuildMarker\(this, \{ width, height \}\);/);
});

test('UI implementation notes cover the mobile regression checklist and remaining risk report', () => {
  const notes = read('docs/ui/mobile-ui-implementation-notes.md');
  const requiredChecklistItems = [
    'faction select → battle',
    'Mulligan select/unselect/confirm',
    'post-Mulligan card select/play',
    'PASS',
    'fullscreen enter/exit',
    'retry/back',
    'win/loss modal',
  ];

  assert.match(notes, /Mobile portrait assumptions/);
  assert.match(notes, /Safe gameplay zone/);
  assert.match(notes, /Background\/art safe zone/);
  assert.match(notes, /Hand\/card interaction rules/);
  assert.match(notes, /Controls behavior/);
  assert.match(notes, /Remaining UI risks/);
  requiredChecklistItems.forEach((item) => assert.match(notes, new RegExp(item)));
});


test('StartScene uses optional logo art as the primary CTA with shared responsive layout', () => {
  const startSource = read('src/scenes/StartScene.js');
  const mainMenuSource = read('src/scenes/MainMenuScene.js');
  const logoLayoutSource = read('src/ui/menuLogoLayout.js');
  const logoDocs = read('public/assets/ui/README.md');

  assert.match(logoLayoutSource, /GRIDFALL_LOGO_PUBLIC_PATH = 'assets\/ui\/gridfall-logo\.png'/);
  assert.match(logoLayoutSource, /path: resolvePublicAssetPath\(GRIDFALL_LOGO_PUBLIC_PATH\)/);
  assert.match(startSource, /preloadImageAsset\(this, GRIDFALL_LOGO_ASSET/);
  assert.match(startSource, /Start logo failed to load: \$\{asset\.path}/);
  assert.match(startSource, /this\.textures\.exists\(GRIDFALL_LOGO_ASSET\.key\)/);
  assert.match(startSource, /this\.title = this\.createTitle\(width, height\)/);
  assert.match(startSource, /this\.configureLogoActivation\(\)/);
  assert.match(startSource, /this\.logoHitArea = this\.add\.zone/);
  assert.match(startSource, /this\.logoHitArea\.setInteractive\(\{ useHandCursor: true \}\)/);
  assert.match(startSource, /this\.logoHitArea\.on\('pointerover', \(\) => this\.setLogoHoverState\(true\)\)/);
  assert.match(startSource, /this\.logoHitArea\.on\('pointerup', \(\) => this\.playStartTransition\(\)\)/);
  assert.doesNotMatch(startSource, /this\.startButton/);
  assert.doesNotMatch(startSource, /translateActive\('ui\.start\.start', 'START'\)/);
  assert.match(logoLayoutSource, /GRIDFALL_LOGO_TEXT = 'GRIDFALL TACTICS'/);
  assert.match(logoLayoutSource, /translateActive\(translationKey, GRIDFALL_LOGO_TEXT\)/);
  assert.match(startSource, /START_TITLE_DEPTH = 5/);
  assert.match(startSource, /START_HOVER_SCALE = 1\.035/);
  assert.match(startSource, /START_PRESS_SCALE = 0\.975/);
  assert.match(startSource, /START_HIT_MIN_WIDTH = 320/);
  assert.match(startSource, /START_HIT_MIN_HEIGHT = 120/);
  assert.match(startSource, /START_HIT_HEIGHT_MULTIPLIER = 1\.45/);
  assert.doesNotMatch(startSource, /titleGlow/);
  assert.doesNotMatch(startSource, /START_LOGO_GLOW_DEPTH/);
  assert.doesNotMatch(startSource, /startLogoIdleMotion/);
  assert.match(logoLayoutSource, /centerYRatio: 0\.4/);
  assert.match(logoLayoutSource, /maxWidthRatio: 0\.98/);
  assert.match(logoLayoutSource, /maxHeightRatio: 0\.62/);
  assert.match(logoLayoutSource, /maxDisplayHeight: 720/);
  assert.match(logoLayoutSource, /getTextureSourceSize\(scene, GRIDFALL_LOGO_ASSET\.key\)/);
  assert.match(logoLayoutSource, /Math\.min\(maxLogoWidth \/ sourceSize\.width, maxLogoHeight \/ sourceSize\.height\)/);
  assert.match(logoLayoutSource, /setCrispLogoDisplaySize\(scene, logo, GRIDFALL_LOGO_ASSET\.key, displaySize\.width, displaySize\.height, 'start-hero'\)/);
  assert.match(startSource, /this\.scale\.on\('resize', this\.layoutStartScene, this\)/);
  assert.match(startSource, /calculateMainMenuLogoDisplaySize\(this, this\.scale\.width, this\.scale\.height\)/);
  assert.match(startSource, /x: mainMenuPosition\.x/);
  assert.match(startSource, /y: mainMenuPosition\.y/);
  assert.match(startSource, /alpha: 0/);
  assert.match(startSource, /this\.scene\.start\('MainMenuScene', \{ revealFromStart: true \}\)/);

  assert.match(mainMenuSource, /preloadImageAsset\(this, GRIDFALL_LOGO_ASSET/);
  assert.match(mainMenuSource, /Main menu logo failed to load: \$\{asset\.path}/);
  assert.match(mainMenuSource, /this\.textures\.exists\(GRIDFALL_LOGO_ASSET\.key\)/);
  assert.match(mainMenuSource, /this\.title = this\.createTitle\(width, height\)/);
  assert.match(mainMenuSource, /create\(data = \{\}\)/);
  assert.match(mainMenuSource, /const revealFromStart = Boolean\(data\.revealFromStart\)/);
  assert.match(mainMenuSource, /this\.revealMenuButtons\(\)/);
  assert.match(mainMenuSource, /MAIN_MENU_TITLE_DEPTH = 5/);
  assert.match(mainMenuSource, /logo\.disableInteractive\(\)/);
  assert.match(logoLayoutSource, /maxWidthRatio: 0\.75/);
  assert.match(logoLayoutSource, /maxHeightRatio: 0\.23/);
  assert.match(logoLayoutSource, /maxDisplayHeight: 220/);
  assert.match(logoLayoutSource, /minButtonGap: 18/);
  assert.match(logoLayoutSource, /safeLogoHeight/);
  assert.match(logoLayoutSource, /setCrispLogoDisplaySize\(scene, logo, GRIDFALL_LOGO_ASSET\.key, displaySize\.width, displaySize\.height, 'main-menu'\)/);
  assert.match(mainMenuSource, /this\.scale\.on\('resize', this\.layoutMainMenuScene, this\)/);

  assert.match(logoDocs, /public\/assets\/ui\/gridfall-logo\.png/);
  assert.match(logoDocs, /assets\/ui\/gridfall-logo\.png/);
  assert.match(logoDocs, /transparent background/);
  assert.match(logoDocs, /Crop tightly around the visible logo/);
  assert.match(logoDocs, /1600–2400 px/);
  assert.match(logoDocs, /Do not use lossy compression/);
  assert.match(logoDocs, /Avoid blur or resampling artifacts/);
});

test('start, main menu, and faction select use optional menu background art with dark fallback', () => {
  const backgroundSource = read('src/rendering/backgroundArt.js');
  const startSource = read('src/scenes/StartScene.js');
  const factionSource = read('src/scenes/FactionSelectScene.js');
  const mainMenuSource = read('src/scenes/MainMenuScene.js');
  const backgroundDocs = read('public/assets/backgrounds/README.md');

  assert.match(backgroundSource, /MENU_BACKGROUND_PUBLIC_PATH = 'assets\/backgrounds\/menu-background\.webp'/);
  assert.match(backgroundSource, /path: resolvePublicAssetPath\(MENU_BACKGROUND_PUBLIC_PATH\)/);
  assert.match(backgroundSource, /Menu background failed to load: \${asset\.path}/);
  assert.match(backgroundSource, /export function createCoverBackground/);
  assert.match(backgroundSource, /export function createMenuArenaLightSweep/);
  assert.match(backgroundSource, /duration = 12000/);
  assert.match(backgroundSource, /Math\.max\(width \/ background\.width, height \/ background\.height\)/);
  assert.match(startSource, /START_TRANSITION_MS = 680/);
  assert.match(startSource, /this\.scene\.start\('MainMenuScene', \{ revealFromStart: true \}\)/);
  assert.match(startSource, /createMenuArenaLightSweep\(this, \{ width, height \}\)/);
  assert.match(mainMenuSource, /this\.scene\.start\('FactionSelectScene'\)/);
  assert.match(mainMenuSource, /createMenuArenaLightSweep\(this, \{ width, height \}\)/);
  assert.match(factionSource, /preloadMenuBackgroundArt\(this\)/);
  assert.match(factionSource, /createCoverBackground\(this, \{/);
  assert.match(factionSource, /createMenuArenaLightSweep\(this, \{/);
  assert.match(backgroundDocs, /public\/assets\/backgrounds\/menu-background\.webp/);
  assert.match(backgroundDocs, /1440 × 2560 px/);
});
