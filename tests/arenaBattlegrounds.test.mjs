import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  ARENA_BATTLEGROUNDS,
  DEFAULT_ARENA_BATTLEGROUND_ID,
  NUMBERED_ARENA_BATTLEGROUNDS,
  getArenaBattlegroundAsset,
  resolveArenaBattlegroundId,
  selectArenaBattlegroundId,
} from '../src/data/arenaBattlegrounds.js';

test('Arena battleground pool currently contains only the default battlefield', () => {
  assert.deepEqual(NUMBERED_ARENA_BATTLEGROUNDS, []);
  assert.equal(ARENA_BATTLEGROUNDS.length, 1);
  assert.equal(ARENA_BATTLEGROUNDS[0].id, DEFAULT_ARENA_BATTLEGROUND_ID);
  assert.equal(ARENA_BATTLEGROUNDS[0].key, 'background.default.battlefield');
  assert.match(ARENA_BATTLEGROUNDS[0].path, /assets\/backgrounds\/default\/battlefield\.webp$/);
  assert.ok(fs.existsSync('public/assets/backgrounds/arena/.gitkeep'));
  assert.equal(fs.readdirSync('public/assets/backgrounds/arena').filter((name) => name.endsWith('.webp')).length, 0);
});

test('Arena battleground selection is deterministic with injected randomness and does not mutate pool', () => {
  const pool = Object.freeze([
    Object.freeze({ id: 'default', key: 'background.default.battlefield', path: './assets/backgrounds/default/battlefield.webp' }),
    Object.freeze({ id: '01', key: 'background.arena.01', path: './assets/backgrounds/arena/01.webp' }),
    Object.freeze({ id: '02', key: 'background.arena.02', path: './assets/backgrounds/arena/02.webp' }),
  ]);

  assert.equal(selectArenaBattlegroundId({ pool, randomFn: () => 0 }), 'default');
  assert.equal(selectArenaBattlegroundId({ pool, randomFn: () => 0.34 }), '01');
  assert.equal(selectArenaBattlegroundId({ pool, randomFn: () => 0.99 }), '02');
  assert.equal(pool.length, 3);
});

test('Arena battleground helper falls back safely for empty or invalid configuration', () => {
  assert.equal(selectArenaBattlegroundId({ pool: [], randomFn: () => 0.7 }), DEFAULT_ARENA_BATTLEGROUND_ID);
  assert.equal(selectArenaBattlegroundId({ pool: [{ id: 'broken' }], randomFn: () => 0.7 }), DEFAULT_ARENA_BATTLEGROUND_ID);
  assert.equal(resolveArenaBattlegroundId('missing'), DEFAULT_ARENA_BATTLEGROUND_ID);
  assert.equal(getArenaBattlegroundAsset('missing').key, 'background.default.battlefield');
});
