import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const readSource = (path) => fs.readFileSync(path, 'utf8');

test('faction selection click path remains recoverable while starting BattleScene', () => {
  const source = readSource('src/scenes/FactionSelectScene.js');

  assert.match(source, /button\.on\('pointerup', \(\) => this\.startBattle\(factionKey\)\)/);
  assert.match(source, /this\.scene\.start\('BattleScene', \{ factionKey \}\)/);
  assert.match(source, /this\.time\.delayedCall\(250, \(\) => \{/);
  assert.doesNotMatch(source, /this\.scene\.stop\('FactionSelectScene'\)/);
  assert.doesNotMatch(source, /this\.input\.removeAllListeners\(\)/);
  assert.doesNotMatch(source, /disableInteractive/);
});

test('all faction-select return paths use cleanup and repeated starts stay on fresh scene lifecycle', () => {
  const battleSource = readSource('src/scenes/BattleScene.js');
  const startSource = readSource('src/scenes/StartScene.js');

  const cycle = [
    'launch -> faction select -> battle',
    'battle bottom bar exit -> faction select -> battle',
    'battle result exit -> faction select -> battle',
    'retry -> exit -> faction select -> battle',
  ];

  for (let loop = 0; loop < 5; loop += 1) {
    for (const flow of cycle) {
      assert.match(startSource, /this\.scene\.start\('FactionSelectScene'\)/, flow);
      assert.match(battleSource, /leftIcon\.on\('pointerup', \(\) => this\.exitBattleToFactionSelect\(\)\)/, flow);
      assert.match(battleSource, /\(\) => this\.exitBattleToFactionSelect\(\)/, flow);
      assert.match(battleSource, /this\.scene\.start\('FactionSelectScene'\)/, flow);
      assert.match(battleSource, /this\.scene\.restart\(\{ factionKey, enemyFactionKey \}\)/, flow);
      assert.match(battleSource, /this\.resetTransientInputState\(\)/, flow);
      assert.match(battleSource, /this\.clearBattleResultTimer\(\)/, flow);
    }
  }

  assert.doesNotMatch(battleSource, /this\.scene\.stop\('BattleScene'\)/);
});

test('development hot reload destroys stale Phaser games instead of stacking input canvases', () => {
  const source = readSource('src/main.js');

  assert.match(source, /globalThis\.__GRIDFALL_TACTICS_GAME__/);
  assert.match(source, /existingGame\.destroy\(true\)/);
  assert.match(source, /import\.meta\.hot\.dispose/);
  assert.match(source, /game\.destroy\(true\)/);
});
