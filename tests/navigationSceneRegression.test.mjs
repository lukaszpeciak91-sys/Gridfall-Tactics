import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readScene = (path) => fs.readFileSync(path, 'utf8');

test('faction selection starts BattleScene without stopping itself or clearing global input listeners', () => {
  const source = readScene('src/scenes/FactionSelectScene.js');

  assert.match(source, /button\.on\('pointerup', \(\) => this\.startBattle\(factionKey\)\)/);
  assert.match(source, /this\.scene\.start\('BattleScene', \{ factionKey \}\)/);
  assert.doesNotMatch(source, /this\.scene\.stop\('FactionSelectScene'\)/);
  assert.doesNotMatch(source, /this\.input\.removeAllListeners\(\)/);
});

test('BattleScene returns to faction select through a single cleanup path and retry stays in BattleScene', () => {
  const source = readScene('src/scenes/BattleScene.js');

  assert.match(source, /leftIcon\.on\('pointerup', \(\) => this\.exitBattleToFactionSelect\(\)\)/);
  assert.match(source, /this\.scene\.start\('FactionSelectScene'\)/);
  assert.match(source, /this\.scene\.restart\(\{ factionKey, enemyFactionKey \}\)/);
  assert.doesNotMatch(source, /this\.scene\.stop\('BattleScene'\)/);
});
