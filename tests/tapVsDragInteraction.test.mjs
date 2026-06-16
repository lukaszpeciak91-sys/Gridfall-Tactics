import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createTapVsDragInteraction, FACTION_SELECTION_TAP_DRAG_THRESHOLD_PX } from '../src/ui/tapVsDragInteraction.js';

const read = (path) => fs.readFileSync(path, 'utf8');

test('shared faction tap helper accepts clean taps', () => {
  const guard = createTapVsDragInteraction();
  guard.begin({ id: 1, x: 10, y: 20 }, 100);
  assert.equal(guard.end({ id: 1, x: 12, y: 22 }, 100), true);
});

test('shared faction tap helper rejects pointer drag gestures', () => {
  const guard = createTapVsDragInteraction();
  guard.begin({ id: 1, x: 10, y: 20 }, 100);
  guard.update({ id: 1, x: 10, y: 20 + FACTION_SELECTION_TAP_DRAG_THRESHOLD_PX + 1 }, 100);
  assert.equal(guard.end({ id: 1, x: 10, y: 20 + FACTION_SELECTION_TAP_DRAG_THRESHOLD_PX + 1 }, 100), false);
});

test('shared faction tap helper rejects scroll movement during gesture', () => {
  const guard = createTapVsDragInteraction();
  guard.begin({ id: 1, x: 10, y: 20 }, 100);
  guard.update({ id: 1, x: 10, y: 20 }, 100 - FACTION_SELECTION_TAP_DRAG_THRESHOLD_PX - 1);
  assert.equal(guard.end({ id: 1, x: 10, y: 20 }, 89), false);
});

test('FactionSelectScene and CampaignEnemySelectScene both use shared tap-vs-drag helper', () => {
  const factionSource = read('src/scenes/FactionSelectScene.js');
  const enemySource = read('src/scenes/CampaignEnemySelectScene.js');
  assert.match(factionSource, /import \{ createTapVsDragInteraction \} from '\.\.\/ui\/tapVsDragInteraction\.js'/);
  assert.match(enemySource, /import \{ createTapVsDragInteraction \} from '\.\.\/ui\/tapVsDragInteraction\.js'/);
  assert.match(factionSource, /this\.tapVsDrag = createTapVsDragInteraction\(\)/);
  assert.match(enemySource, /this\.tapVsDrag = createTapVsDragInteraction\(\)/);
});
