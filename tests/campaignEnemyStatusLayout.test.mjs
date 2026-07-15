import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { getCampaignEnemyStatusBadgeLayout } from '../src/ui/campaignEnemyStatusLayout.js';

const read = (path) => fs.readFileSync(path, 'utf8');
const CARD_HEIGHT = 196;
const CARD_WIDTH = 382;
const CARD_Y = 230;
const EXPECTED_ACTIVE_ATTEMPT_LAYOUT = Object.freeze({
  centerX: 136,
  centerY: 350,
  panelWidth: 82,
  panelHeight: 42,
  indicatorWidth: 58,
  indicatorHeight: 28,
  x: 95,
  y: 329,
});

test('campaign enemy status badge preserves unfinished attempts position', () => {
  assert.deepEqual(
    getCampaignEnemyStatusBadgeLayout({ y: CARD_Y, cardWidth: CARD_WIDTH, cardHeight: CARD_HEIGHT }),
    EXPECTED_ACTIVE_ATTEMPT_LAYOUT,
  );
});

test('campaign enemy completed badge reuses attempts x y width and height', () => {
  const unfinished = getCampaignEnemyStatusBadgeLayout({ y: CARD_Y, cardWidth: CARD_WIDTH, cardHeight: CARD_HEIGHT });
  const completed = getCampaignEnemyStatusBadgeLayout({ y: CARD_Y, cardWidth: CARD_WIDTH, cardHeight: CARD_HEIGHT });

  assert.equal(completed.x, unfinished.x);
  assert.equal(completed.y, unfinished.y);
  assert.equal(completed.panelWidth, unfinished.panelWidth);
  assert.equal(completed.panelHeight, unfinished.panelHeight);
  assert.equal(completed.centerX, unfinished.centerX);
  assert.equal(completed.centerY, unfinished.centerY);
});

test('campaign enemy select completed state does not use separate lower offset', () => {
  const source = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(source, /getCampaignEnemyStatusBadgeLayout\(\{ y, cardWidth, cardHeight: CARD_HEIGHT \}\)/);
  assert.doesNotMatch(source, /indicatorBottomMargin/);
  assert.doesNotMatch(source, /ATTEMPT_INDICATOR_BOTTOM_MARGIN/);
});

test('campaign enemy title and campaign state logic remain unchanged by status layout', () => {
  const cardSource = read('src/ui/factionCards.js');
  const sceneSource = read('src/scenes/CampaignEnemySelectScene.js');
  const campaignStateSource = read('src/systems/campaignState.js');

  assert.match(cardSource, /posterY \+ posterHeight - POSTER_TITLE_BOTTOM_PADDING/);
  assert.match(cardSource, /drawFactionTags\(scene, content, details\.tags/);
  assert.match(sceneSource, /drawFactionCardVisual\(this, content, enemy\.factionKey, \{ y, cardWidth, cardHeight: CARD_HEIGHT, alpha: enemy\.defeated \? 0\.62 : 1, completed: enemy\.defeated \}\)/);
  assert.match(campaignStateSource, /enemy\.attemptsRemaining = Math\.max\(0, enemy\.attemptsRemaining - 1\)/);
  assert.match(campaignStateSource, /enemy\.defeated = true/);
});
