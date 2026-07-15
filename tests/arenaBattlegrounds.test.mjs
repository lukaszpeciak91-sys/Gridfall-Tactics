import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  ARENA_BATTLEGROUNDS,
  DEFAULT_ARENA_BATTLEGROUND_ID,
  NUMBERED_ARENA_BATTLEGROUNDS,
  createNumberedArenaBattleground,
  getArenaBattlegroundAsset,
  isNumberedArenaBattlegroundId,
  resolveArenaBattlegroundId,
  selectArenaBattlegroundId,
} from '../src/data/arenaBattlegrounds.js';

test('Arena battleground pool contains the default battlefield and production Arena battlegrounds', () => {
  const numberedIds = Array.from({ length: 9 }, (_value, index) => `b${String(index + 1).padStart(2, '0')}`);

  assert.deepEqual(NUMBERED_ARENA_BATTLEGROUNDS.map((battleground) => battleground.id), numberedIds);
  assert.deepEqual(ARENA_BATTLEGROUNDS.map((battleground) => battleground.id), [
    DEFAULT_ARENA_BATTLEGROUND_ID,
    ...numberedIds,
  ]);
  assert.equal(ARENA_BATTLEGROUNDS[0].key, 'background.default.battlefield');
  assert.match(ARENA_BATTLEGROUNDS[0].path, /assets\/backgrounds\/default\/battlefield\.webp$/);
  assert.ok(fs.existsSync('public/assets/backgrounds/arena/.gitkeep'));

  for (const battlegroundId of numberedIds) {
    const battleground = getArenaBattlegroundAsset(battlegroundId);
    assert.equal(battleground.key, `background.arena.${battlegroundId}`);
    assert.match(battleground.path, new RegExp(`assets/backgrounds/arena/${battlegroundId}\\.webp$`));
    assert.ok(fs.existsSync(`public/assets/backgrounds/arena/${battlegroundId}.webp`));
  }
});

test('Arena battleground selection is deterministic with injected randomness and does not mutate pool', () => {
  const pool = Object.freeze([
    Object.freeze({ id: 'default', key: 'background.default.battlefield', path: './assets/backgrounds/default/battlefield.webp' }),
    createNumberedArenaBattleground('b01'),
    createNumberedArenaBattleground('b02'),
  ]);

  assert.equal(selectArenaBattlegroundId({ pool, randomFn: () => 0 }), 'default');
  assert.equal(selectArenaBattlegroundId({ pool, randomFn: () => 0.34 }), 'b01');
  assert.equal(selectArenaBattlegroundId({ pool, randomFn: () => 0.99 }), 'b02');
  assert.equal(pool.length, 3);
});

test('Numbered Arena battleground helper uses b-prefixed ids, keys, and paths', () => {
  assert.equal(isNumberedArenaBattlegroundId('b01'), true);
  assert.equal(isNumberedArenaBattlegroundId('b02'), true);
  assert.equal(isNumberedArenaBattlegroundId('01'), false);

  assert.deepEqual(createNumberedArenaBattleground('b01'), {
    id: 'b01',
    key: 'background.arena.b01',
    path: './assets/backgrounds/arena/b01.webp',
  });
  assert.deepEqual(createNumberedArenaBattleground('b02'), {
    id: 'b02',
    key: 'background.arena.b02',
    path: './assets/backgrounds/arena/b02.webp',
  });
  assert.throws(() => createNumberedArenaBattleground('01'), /bNN convention/);
});

test('Arena battleground helper falls back safely for empty or invalid configuration', () => {
  assert.equal(selectArenaBattlegroundId({ pool: [], randomFn: () => 0.7 }), DEFAULT_ARENA_BATTLEGROUND_ID);
  assert.equal(selectArenaBattlegroundId({ pool: [{ id: 'broken' }], randomFn: () => 0.7 }), DEFAULT_ARENA_BATTLEGROUND_ID);
  assert.equal(resolveArenaBattlegroundId('missing'), DEFAULT_ARENA_BATTLEGROUND_ID);
  assert.equal(resolveArenaBattlegroundId('01'), DEFAULT_ARENA_BATTLEGROUND_ID);
  assert.equal(getArenaBattlegroundAsset('missing').key, 'background.default.battlefield');
});
