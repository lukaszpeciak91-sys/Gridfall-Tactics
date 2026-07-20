import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getMaterialBattleStateSignature } from '../src/systems/materialBattleStateSignature.js';

test('material battle-state signature preserves canonical field order, defaults, and normalization', () => {
  const state = {
    playerHP: 7,
    enemyHP: 5,
    board: [
      {
        owner: 'enemy',
        cardId: 'card-alpha',
        id: 'runtime-alpha',
        attack: 3,
        hp: 2,
        maxHp: 4,
        armor: 1,
        quickFixDrawTriggers: [{ owner: 'enemy' }, null, { owner: null, triggered: true }],
      },
      null,
      {
        owner: 'player',
        id: 'runtime-beta',
        attack: 0,
        hp: 1,
        maxHp: 1,
        armor: 0,
        tempAttackMod: -1,
        tempAttackSetToZeroUntilCombat: true,
        tempAttackMaxUntilCombat: 2,
        tempArmorMod: 3,
        tempHpMod: -2,
        ignoreArmorNext: true,
        quickFixDrawTriggers: [{ triggered: true }],
      },
    ],
    cannotDropBelowOneThisTurn: { player: true },
    effectCardsBlockedUntilCombat: { enemy: true },
    immuneMoveDisableThisTurn: { player: true },
    immovableThisTurn: { enemy: true },
    enemyLanePlayBlockedThisTurn: [1],
    playerLanePlayBlockedThisTurn: [7],
    funeralPyreThisCombat: { enemy: 1 },
  };

  const expected = JSON.stringify({
    playerHP: 7,
    enemyHP: 5,
    board: [
      {
        owner: 'enemy',
        id: 'card-alpha',
        attack: 3,
        hp: 2,
        maxHp: 4,
        armor: 1,
        tempAttackMod: 0,
        tempAttackSetToZeroUntilCombat: false,
        tempAttackMaxUntilCombat: null,
        tempArmorMod: 0,
        tempHpMod: 0,
        ignoreArmorNext: false,
        quickFixDrawTriggers: [
          { owner: 'enemy', triggered: false },
          { owner: null, triggered: false },
          { owner: null, triggered: true },
        ],
      },
      null,
      {
        owner: 'player',
        id: 'runtime-beta',
        attack: 0,
        hp: 1,
        maxHp: 1,
        armor: 0,
        tempAttackMod: -1,
        tempAttackSetToZeroUntilCombat: true,
        tempAttackMaxUntilCombat: 2,
        tempArmorMod: 3,
        tempHpMod: -2,
        ignoreArmorNext: true,
        quickFixDrawTriggers: [{ owner: null, triggered: true }],
      },
    ],
    cannotDropBelowOneThisTurn: { player: true },
    effectCardsBlockedUntilCombat: { enemy: true },
    immuneMoveDisableThisTurn: { player: true },
    immovableThisTurn: { enemy: true },
    enemyLanePlayBlockedThisTurn: [1],
    playerLanePlayBlockedThisTurn: [7],
    funeralPyreThisCombat: { enemy: 1 },
  });

  assert.equal(getMaterialBattleStateSignature(state), expected);
  assert.equal(getMaterialBattleStateSignature(null), null);
});

test('AI scoring and Battle Exhausted paths import the shared material signature helper', () => {
  const enemyDecision = readFileSync(new URL('../src/systems/enemyDecision.js', import.meta.url), 'utf8');
  const gameState = readFileSync(new URL('../src/systems/GameState.js', import.meta.url), 'utf8');

  assert.match(enemyDecision, /import \{ getMaterialBattleStateSignature \} from '\.\/materialBattleStateSignature\.js';/);
  assert.match(gameState, /import \{ getMaterialBattleStateSignature \} from '\.\/materialBattleStateSignature\.js';/);
  assert.doesNotMatch(enemyDecision, /function getImmediateBattleImpactSignature/);
  assert.doesNotMatch(gameState, /function getBattleProgressSignature/);
  assert.match(enemyDecision, /getMaterialBattleStateSignature\(state\)/);
  assert.match(gameState, /getMaterialBattleStateSignature\(state\)/);
});
