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

test('start, main menu, and faction select use optional menu background art with dark fallback', () => {
  const backgroundSource = read('src/rendering/backgroundArt.js');
  const startSource = read('src/scenes/StartScene.js');
  const factionSource = read('src/scenes/FactionSelectScene.js');
  const mainMenuSource = read('src/scenes/MainMenuScene.js');
  const backgroundDocs = read('public/assets/backgrounds/README.md');

  assert.match(backgroundSource, /MENU_BACKGROUND_ASSET = \{[\s\S]*path: '\/assets\/backgrounds\/menu-background\.webp'/);
  assert.match(backgroundSource, /export function createCoverBackground/);
  assert.match(backgroundSource, /Math\.max\(width \/ background\.width, height \/ background\.height\)/);
  assert.match(startSource, /height \* 0\.61/);
  assert.match(startSource, /START_TRANSITION_MS = 320/);
  assert.match(startSource, /this\.scene\.start\('MainMenuScene'\)/);
  assert.match(mainMenuSource, /this\.scene\.start\('FactionSelectScene'\)/);
  assert.match(factionSource, /preloadMenuBackgroundArt\(this\)/);
  assert.match(factionSource, /createCoverBackground\(this, \{/);
  assert.match(backgroundDocs, /public\/assets\/backgrounds\/menu-background\.webp/);
  assert.match(backgroundDocs, /1440 × 2560 px/);
});
