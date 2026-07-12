import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { calculateHandLayoutMetrics, HAND_CARD_ASPECT_RATIO, HAND_CARD_BOTTOM_SAFE_INSET_RATIO, HAND_CARD_EDGE_SAFE_MARGIN_PX, HAND_CARD_MAX_WIDTH_RATIO, HAND_CARD_PRE_POLISH_MAX_WIDTH_RATIO, HAND_CARD_PROPORTIONAL_SCALE, HAND_CARD_ROW_DOWN_SHIFT_PX, HAND_CARD_WIDTH_POLISH_SCALE, MAX_VISIBLE_HAND_CARDS, MIN_HAND_CONTROL_TOUCH_SIZE } from '../src/ui/handLayout.js';

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
  const handBottom = hand.y + hand.h;
  const firstCardLeft = hand.handTrackLeft;
  const lastCardRight = hand.handTrackLeft + hand.cardWidth + hand.step * (hand.cardsVisible - 1);

  assert.equal(hand.cardsVisible, MAX_VISIBLE_HAND_CARDS);
  assert.ok(hand.controlTouchSize >= MIN_HAND_CONTROL_TOUCH_SIZE);
  assert.equal(HAND_CARD_ASPECT_RATIO, 1.86);
  assert.equal(HAND_CARD_PRE_POLISH_MAX_WIDTH_RATIO, 0.28);
  assert.equal(HAND_CARD_MAX_WIDTH_RATIO, 0.29784);
  assert.equal(HAND_CARD_WIDTH_POLISH_SCALE, 1.0608);
  assert.equal(HAND_CARD_PROPORTIONAL_SCALE, 1.02);
  assert.equal(HAND_CARD_BOTTOM_SAFE_INSET_RATIO, 0.1);
  assert.equal(HAND_CARD_ROW_DOWN_SHIFT_PX, 8);
  assert.equal(HAND_CARD_EDGE_SAFE_MARGIN_PX, 8);
  assert.equal(hand.cardRowDownShift, 8);
  assert.equal(hand.trackSafeInset, 8);
  assert.ok(hand.cardHeight >= 170 && hand.cardHeight <= 171, 'mobile hand cards should use the proportional readability polish');
  assert.ok(cardBottom <= handBottom - hand.cardBottomSafeInset + hand.cardHeight * 0.01 + 0.0001);
  assert.ok(firstCardLeft >= HAND_CARD_EDGE_SAFE_MARGIN_PX);
  assert.ok(lastCardRight <= 390 - HAND_CARD_EDGE_SAFE_MARGIN_PX);
  assert.ok(hand.step >= hand.cardWidth * 0.72, 'card overlap should leave most of each card readable');
});

test('shared build marker helper is used by scene UI outside BattleScene gameplay', () => {
  const battleSource = read('src/scenes/BattleScene.js');
  const factionSource = read('src/scenes/FactionSelectScene.js');
  const mainMenuSource = read('src/scenes/MainMenuScene.js');
  const helperSource = read('src/ui/buildMarker.js');

  assert.match(helperSource, /export function createBuildMarker/);
  assert.match(helperSource, /getBuildMarkerText\(\)/);
  assert.match(helperSource, /corner = 'bottom-right'/);
  assert.match(mainMenuSource, /import \{ createBuildMarker \} from '\.\.\/ui\/buildMarker\.js';/);
  assert.match(mainMenuSource, /corner: 'top-right'/);
  assert.match(mainMenuSource, /alpha: 0\.42/);
  assert.match(factionSource, /import \{ createBuildMarker \} from '\.\.\/ui\/buildMarker\.js';/);
  assert.match(factionSource, /const buildMarker = createBuildMarker\(this, \{ width, height \}\);/);
  assert.doesNotMatch(battleSource, /createBuildMarker/);
});

test('BattleScene derives Decoy Hare offline visuals from gameplay reservations, not fake board units', () => {
  const battleSource = read('src/scenes/BattleScene.js');
  assert.match(battleSource, /isBoardUnitOffline/);
  assert.match(battleSource, /OFFLINE_UNIT_ALPHA = 0\.38/);
  assert.match(battleSource, /OFFLINE_UNIT_FADE_IN_MS = 160/);
  assert.match(battleSource, /OFFLINE_UNIT_FADE_OUT_MS = 190/);
  assert.match(battleSource, /createBoardUnitView\(cell, unit, \{ offline: offline \|\| wasOffline \}\)/);
  assert.match(battleSource, /unit && unit\.offlineReservedSlot !== true/);
  assert.match(battleSource, /applyOfflineBoardUnitVisual/);
});

test('GameState keeps Decoy Hare offline reservations out of the renderable board array', () => {
  const gameStateSource = read('src/systems/GameState.js');
  assert.match(gameStateSource, /export function isBoardUnitOffline/);
  assert.match(gameStateSource, /export function normalizeOfflineReservations/);
  assert.doesNotMatch(gameStateSource, /state\.board\[enemyIndex\] = \{ offlineReservedSlot: true, reservationId: reservation\.id \};/);
  assert.match(gameStateSource, /state\.board\[entry\.reservedIndex\] = entry\.reservedUnit \?\? null;/);
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
  assert.match(startSource, /START_HOVER_SCALE = 1\.04/);
  assert.match(startSource, /START_PRESS_SCALE = 0\.965/);
  assert.match(startSource, /START_HIT_MIN_WIDTH = 320/);
  assert.match(startSource, /START_HIT_MIN_HEIGHT = 120/);
  assert.match(startSource, /START_HIT_HEIGHT_MULTIPLIER = 1\.45/);
  assert.doesNotMatch(startSource, /titleGlow/);
  assert.doesNotMatch(startSource, /START_LOGO_GLOW_DEPTH/);
  assert.doesNotMatch(startSource, /startLogoIdleMotion/);
  assert.match(logoLayoutSource, /centerYRatio: 0\.39/);
  assert.match(logoLayoutSource, /maxWidthRatio: 1\.22/);
  assert.match(logoLayoutSource, /maxHeightRatio: 0\.76/);
  assert.match(logoLayoutSource, /maxDisplayHeight: 920/);
  assert.match(logoLayoutSource, /getTextureSourceSize\(scene, GRIDFALL_LOGO_ASSET\.key\)/);
  assert.match(logoLayoutSource, /Math\.min\(maxLogoWidth \/ sourceSize\.width, maxLogoHeight \/ sourceSize\.height\)/);
  assert.match(logoLayoutSource, /setCrispLogoDisplaySize\(scene, logo, GRIDFALL_LOGO_ASSET\.key, displaySize\.width, displaySize\.height, 'start-hero'\)/);
  assert.match(startSource, /this\.scale\.on\('resize', this\.layoutStartScene, this\)/);
  assert.match(startSource, /calculateMainMenuLogoDisplaySize\(this, this\.scale\.width, this\.scale\.height\)/);
  assert.match(startSource, /x: mainMenuPosition\.x/);
  assert.match(startSource, /y: mainMenuPosition\.y/);
  assert.match(startSource, /alpha: 0\.18/);
  assert.match(startSource, /this\.scene\.launch\('MainMenuScene', \{ revealFromStart: true, awaitSharedLogo: true \}\)/);
  assert.match(startSource, /this\.scene\.bringToTop\('StartScene'\)/);
  assert.match(startSource, /completeStartLogoTransition/);

  assert.match(mainMenuSource, /preloadImageAsset\(this, GRIDFALL_LOGO_ASSET/);
  assert.match(mainMenuSource, /Main menu logo failed to load: \$\{asset\.path}/);
  assert.match(mainMenuSource, /this\.textures\.exists\(GRIDFALL_LOGO_ASSET\.key\)/);
  assert.match(mainMenuSource, /this\.title = this\.createTitle\(width, height\)/);
  assert.match(mainMenuSource, /create\(data = \{\}\)/);
  assert.match(mainMenuSource, /const revealFromStart = Boolean\(data\.revealFromStart\)/);
  assert.match(mainMenuSource, /const awaitSharedLogo = Boolean\(data\.awaitSharedLogo\)/);
  assert.match(mainMenuSource, /this\.prepareSharedLogoReveal\(\)/);
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
  assert.match(backgroundSource, /export function createAnimatedMenuBackground/);
  assert.match(backgroundSource, /duration = 12000/);
  assert.match(backgroundSource, /x: 14/);
  assert.match(backgroundSource, /y: -36/);
  assert.match(backgroundSource, /duration: 12000/);
  assert.match(backgroundSource, /scaleMultiplier: 1\.08/);
  assert.match(backgroundSource, /calculateDriftSafeCoverScale\(background, nextWidth, nextHeight, driftOptions\)/);
  assert.match(startSource, /START_TRANSITION_MS = 720/);
  assert.match(startSource, /this\.scene\.launch\('MainMenuScene', \{ revealFromStart: true, awaitSharedLogo: true \}\)/);
  assert.match(startSource, /createAnimatedMenuBackground\(this, \{/);
  assert.match(mainMenuSource, /this\.scene\.start\('GameMenuScene'\)/);
  assert.match(mainMenuSource, /createAnimatedMenuBackground\(this, \{/);
  assert.match(factionSource, /preloadMenuBackgroundArt\(this\)/);
  assert.match(factionSource, /createAnimatedMenuBackground\(this, \{/);
  assert.match(factionSource, /lightSweepOptions: \{/);
  assert.match(backgroundDocs, /public\/assets\/backgrounds\/menu-background\.webp/);
  assert.match(backgroundDocs, /1440 × 2560 px/);
});

test('BattleScene renders clean base transmission screens without decorative emitters', () => {
  const battleSource = read('src/scenes/BattleScene.js');
  const baseDocs = read('public/assets/ui/bases/README.md');

  assert.ok(fs.existsSync('public/assets/ui/bases/base.webp'));
  assert.doesNotMatch(battleSource, /BASE_BACKDROP_ASSET/);
  assert.doesNotMatch(battleSource, /preloadImageAsset\(this, BASE_BACKDROP_ASSET/);
  assert.doesNotMatch(battleSource, /drawBaseBackdrops/);
  assert.doesNotMatch(battleSource, /setDepth\(BASE_BACKDROP_DEPTH\)/);
  assert.match(battleSource, /const BASE_SCREEN_FILL = 0x0a1728;/);
  assert.match(battleSource, /const BASE_FRAME_OVERLOAD_MS = 135;/);
  assert.match(battleSource, /const BASE_FRAME_GRAPHICS_DEPTH = 112;/);
  assert.match(battleSource, /const BASE_TERMINAL_TEXT_DEPTH = 123;/);
  assert.match(battleSource, /const BASE_CRACK_OVERLAY_DEPTH = 123\.5;/);
  assert.match(battleSource, /const BASE_GLASS_REFLECTION_DEPTH = 124;/);
  assert.match(battleSource, /const FLOATING_FEEDBACK_DEPTH = 250;/);
  assert.match(battleSource, /createBaseBroadcastFrame\('enemy', enemyPanel, panelWidth, topHero\.h\);/);
  assert.match(battleSource, /createBaseBroadcastFrame\('player', playerPanel, panelWidth, playerHero\.h\);/);
  assert.match(battleSource, /slightly brighter center/);
  assert.match(battleSource, /scanlineStep/);
  assert.match(battleSource, /BASE_SCREEN_GLITCH_RED/);
  assert.match(battleSource, /const crackGraphics = this\.add\.graphics\(\);/);
  assert.match(battleSource, /crackGraphics\.setDepth\(BASE_CRACK_OVERLAY_DEPTH\);/);
  assert.match(battleSource, /const glassGraphics = this\.add\.graphics\(\);/);
  assert.match(battleSource, /this\.renderBaseBroadcastCracks\(frameView, screenMetrics\);/);
  assert.match(battleSource, /this\.renderBaseBroadcastGlass\(frameView, screenMetrics\);/);
  assert.match(battleSource, /renderBaseBroadcastCracks\(frameView, screenMetrics\)/);
  assert.match(battleSource, /renderBaseBroadcastGlass\(frameView, screenMetrics\)/);
  assert.match(battleSource, /return Number\.isFinite\(hp\) && hp < BASE_MAX_HP;/);
  assert.match(battleSource, /getBaseCrackDamageLevel\(hp\)/);
  assert.match(battleSource, /getBaseCrackSegmentsForDamage\(damageLevel\)/);
  assert.match(battleSource, /beaconOrigins/);
  assert.match(battleSource, /const BASE_TERMINAL_TEXT_PLAYER_GLOW = 'rgba\(56, 189, 248, 0\.42\)';/);
  assert.match(battleSource, /const BASE_BEACON_ENEMY_ACTIVE = 0xef4444;/);
  assert.match(battleSource, /const BASE_BEACON_ENEMY_DAMAGE_REACTION_INTENSITY = 0\.78;/);
  assert.match(battleSource, /const BASE_TERMINAL_TEXT_ENEMY_GLOW = 'rgba\(239, 68, 68, 0\.66\)';/);
  assert.match(battleSource, /safeZone =/);
  assert.match(battleSource, /originOrder/);
  assert.match(battleSource, /crackGraphics\.lineStyle\(2, BASE_FRAME_SHADOW, 0\.42\);/);
  assert.match(battleSource, /crackGraphics\.lineStyle\(1, BASE_SCREEN_REFLECTION, 0\.62\);/);
  assert.doesNotMatch(battleSource, /fillCircle\(leftNodeX/);
  assert.doesNotMatch(battleSource, /if \(!isBlocked\) this\.shakeHeroPanel\(side\)/);
  assert.match(baseDocs, /ui\.baseBackdrop\.base/);
});

test('BattleScene preloads and renders the default battlefield background with dark fallback', () => {
  const backgroundSource = read('src/rendering/backgroundArt.js');
  const battleSource = read('src/scenes/BattleScene.js');
  const backgroundDocs = read('public/assets/backgrounds/README.md');

  assert.ok(fs.existsSync('public/assets/backgrounds/default/battlefield.webp'));
  assert.match(backgroundSource, /DEFAULT_BATTLE_BACKGROUND_PUBLIC_PATH = 'assets\/backgrounds\/default\/battlefield\.webp'/);
  assert.match(backgroundSource, /key: 'background\.default\.battlefield'/);
  assert.match(backgroundSource, /path: resolvePublicAssetPath\(DEFAULT_BATTLE_BACKGROUND_PUBLIC_PATH\)/);
  assert.match(backgroundSource, /Battle background failed to load: \$\{failedAsset\.path}/);
  assert.match(battleSource, /preloadBattleBackgroundArt\(this\)/);
  assert.match(battleSource, /createCoverBackground\(this, \{/);
  assert.match(battleSource, /asset: this\.backgroundArtAsset/);
  assert.match(battleSource, /fallbackColor: BATTLE_BACKGROUND_FALLBACK_COLOR/);
  assert.match(battleSource, /depth: -1000/);
  assert.match(battleSource, /BATTLE_FRAME_OVERLAY_ALPHA = 0\.26/);
  assert.match(battleSource, /BATTLE_FRAME_OVERLAY_COLOR, BATTLE_FRAME_OVERLAY_ALPHA/);
  assert.match(battleSource, /BATTLEFIELD_CENTER_LIGHT_ALPHA = 0\.14/);
  assert.match(battleSource, /drawBattlefieldCenterLight\(\)/);
  assert.match(battleSource, /setDepth\(BATTLEFIELD_CENTER_LIGHT_DEPTH\)/);
  assert.match(battleSource, /setBlendMode\(Phaser\.BlendModes\.ADD\)/);
  assert.match(battleSource, /Math\.max\(board\.height \* 1\.24, height \* 0\.44\)/);
  assert.match(backgroundDocs, /public\/assets\/backgrounds\/default\/battlefield\.webp/);
  assert.match(backgroundDocs, /assets\/backgrounds\/default\/battlefield\.webp/);
});


test('BattleScene renders Last Stand prevention as distinct combat feedback', () => {
  const battleSource = read('src/scenes/BattleScene.js');

  assert.match(battleSource, /showLastStandPreventionFeedback\(targetIndex, event\.prevention\)/);
  assert.match(battleSource, /LAST STAND\\n\$\{finalHp\} HP/);
  assert.match(battleSource, /event\.prevention\?\.prevented \? 0x06b6d4/);
  assert.match(battleSource, /getUnitCombatTextLabel\(event\)/);
});
