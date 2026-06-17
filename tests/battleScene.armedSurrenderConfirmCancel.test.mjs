import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const method = (name) => source.match(new RegExp(`  ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`))?.[0] ?? '';

test('armed SURRENDER tap confirms through surrender flow before normal PASS', () => {
  const onPlayerBasePointerUp = method('onPlayerBasePointerUp');
  const surrenderIndex = onPlayerBasePointerUp.indexOf('if (this.playerSurrenderArmed)');
  const passIndex = onPlayerBasePointerUp.indexOf('this.resolvePassTurn();');
  assert.ok(surrenderIndex > -1, 'base pointer up checks armed surrender');
  assert.ok(passIndex > -1, 'base pointer up still resolves normal PASS');
  assert.ok(surrenderIndex < passIndex, 'armed surrender is handled before normal PASS');
  assert.match(onPlayerBasePointerUp, /if \(this\.playerSurrenderArmed\) \{[\s\S]*this\.resolvePlayerHoldToSurrender\(\);[\s\S]*return;/);
});

test('long press only arms surrender and confirmed surrender sets enemy result reason and flow value', () => {
  const onPlayerBasePointerDown = method('onPlayerBasePointerDown');
  const armPlayerSurrender = method('armPlayerSurrender');
  const resolvePlayerHoldToSurrender = method('resolvePlayerHoldToSurrender');
  assert.match(onPlayerBasePointerDown, /this\.armPlayerSurrender\(\);/);
  assert.doesNotMatch(onPlayerBasePointerDown, /resolvePlayerHoldToSurrender|winner = 'enemy'|completeBattleFlow\(0\)/);
  assert.match(armPlayerSurrender, /this\.playerSurrenderArmed = true;[\s\S]*this\.updatePlayerBaseActionState\(\);/);
  assert.match(resolvePlayerHoldToSurrender, /this\.gameState\.winner = 'enemy';/);
  assert.match(resolvePlayerHoldToSurrender, /this\.gameState\.endingReason = 'player_hold_surrender';/);
  assert.match(resolvePlayerHoldToSurrender, /this\.completeBattleFlow\(0\);/);
  assert.doesNotMatch(resolvePlayerHoldToSurrender, /resolvePassTurn|recordPassAction/);
});

test('outside tap cancels armed surrender, restores base label, and is guarded from chained gameplay', () => {
  const cancelOutside = method('cancelArmedPlayerSurrenderFromOutsideTap');
  const scenePointerUp = method('onScenePointerUp');
  const onCardPointerDown = method('onCardPointerDown');
  const onBoardCellPointerDown = method('onBoardCellPointerDown');
  assert.match(cancelOutside, /if \(!this\.playerSurrenderArmed\) return false;/);
  assert.match(cancelOutside, /if \(this\.isPointerInsidePlayerBaseAction\(pointer, currentlyOver\)\) return false;/);
  assert.match(cancelOutside, /this\.cancelPassHoldToSurrender\(\);[\s\S]*this\.disarmPlayerSurrender\(\);[\s\S]*this\.guardPointerEvent\(pointer\);[\s\S]*return true;/);
  assert.match(scenePointerUp, /if \(this\.playerSurrenderArmed\) \{[\s\S]*this\.cancelArmedPlayerSurrenderFromOutsideTap\(pointer\);[\s\S]*return;/);
  assert.match(onCardPointerDown, /if \(this\.playerSurrenderArmed\) \{[\s\S]*this\.disarmPlayerSurrender\(\);[\s\S]*this\.guardPointerEvent\(\);[\s\S]*return;/);
  assert.match(onBoardCellPointerDown, /if \(this\.playerSurrenderArmed\) \{[\s\S]*this\.disarmPlayerSurrender\(\);[\s\S]*this\.guardPointerEvent\(\);[\s\S]*return;/);
});

test('normal PASS and HP threshold eligibility remain unchanged', () => {
  const resolvePassTurn = method('resolvePassTurn');
  const canHoldPassToSurrender = method('canHoldPassToSurrender');
  assert.match(resolvePassTurn, /recordPassAction\(this\.gameState, 'player'\);[\s\S]*this\.completePlayerAction\(\);/);
  assert.match(source, /const PLAYER_SURRENDER_HP_THRESHOLD = 10;/);
  assert.match(canHoldPassToSurrender, /return \(this\.gameState\.playerHP \?\? 0\) < PLAYER_SURRENDER_HP_THRESHOLD;/);
  assert.doesNotMatch(canHoldPassToSurrender, /isVerySafeConcedableState|firstActor/);
});

