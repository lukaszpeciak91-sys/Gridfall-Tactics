import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCardBoardArtPositionY } from '../src/data/presentation/cardArtCropOverrides.js';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

test('board art position accessor returns only explicit boardArtPositionY overrides', () => {
  assert.equal(getCardBoardArtPositionY('aggro_scout_1'), 0.855);
  assert.equal(getCardBoardArtPositionY({ id: 'aggro_scout_1' }), 0.855);

  // aggro_adrenaline_1 has a hand/inspect artPositionY override but no boardArtPositionY.
  assert.equal(getCardBoardArtPositionY('aggro_adrenaline_1'), null);
  assert.equal(getCardBoardArtPositionY('missing_card'), null);
  assert.equal(getCardBoardArtPositionY(null), null);
});

test('BattleScene compact board units pass boardArtPositionY override when present', () => {
  assert.match(battleSource, /import \{ getCardBoardArtPositionY \} from '\.\.\/data\/presentation\/cardArtCropOverrides\.js';/);
  assert.match(battleSource, /const boardOverrideY = getCardBoardArtPositionY\(unit\.cardId \?\? unit\.id\);/);
  assert.match(battleSource, /artPositionY: Number\.isFinite\(boardOverrideY\)\s*\? boardOverrideY\s*: defaultBoardY,/);
});

test('BattleScene compact board units retain player and enemy side defaults without board override', () => {
  assert.match(battleSource, /const BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y = 0\.43;/);
  assert.match(battleSource, /const BOARD_CARD_ARTWORK_ENEMY_CROP_POSITION_Y = 0\.57;/);
  assert.match(battleSource, /const defaultBoardY = isEnemyUnit\s*\? BOARD_CARD_ARTWORK_ENEMY_CROP_POSITION_Y\s*: BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y;/);
});

test('BattleScene compact board units do not use hand artPositionY as board fallback', () => {
  assert.doesNotMatch(battleSource, /getCardArtPositionY\(unit\.cardId \?\? unit\.id\)/);
  assert.doesNotMatch(battleSource, /artPositionY: isEnemyUnit\s*\? BOARD_CARD_ARTWORK_ENEMY_CROP_POSITION_Y\s*: BOARD_CARD_ARTWORK_PLAYER_CROP_POSITION_Y,/);
});
