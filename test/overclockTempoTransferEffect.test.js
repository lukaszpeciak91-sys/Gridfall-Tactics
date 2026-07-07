import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createInitialBattleState, getUnitArmor, getUnitAttack, resolveCombat, resolveTargetedEffectCard } from '../src/systems/GameState.js';
import { buildActionCandidates } from '../src/systems/enemyDecision.js';
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';

const EFFECT_ID = 'enemy_atk_to_0_ally_atk_plus_1_until_combat';

function effectCard(id = 'mercy_tempo') {
  return {
    id,
    name: 'Overclock Mercy',
    type: 'utility',
    targeting: 'enemy_and_friendly_unit',
    effectId: EFFECT_ID,
    textShort: 'Selected [ENEMY] gets 0 ATK. Selected [ALLY] gets +1 ATK until combat.',
  };
}

function unit(id, owner, attack = 1, hp = 5, armor = 0) {
  return { id, cardId: id, name: id, type: 'unit', owner, attack, hp, maxHp: hp, armor, effectId: null };
}

function makeState(owner = 'player') {
  const state = createInitialBattleState({ id: 'p', name: 'P', deck: [] }, { id: 'e', name: 'E', deck: [] }, { firstActor: owner });
  state.player.hand = owner === 'player' ? [effectCard()] : [];
  state.enemy.hand = owner === 'enemy' ? [effectCard()] : [];
  state.board[0] = unit('enemy_left', 'enemy', 4, 6, 2);
  state.board[1] = unit('enemy_mid', 'enemy', 0, 6, 1);
  state.board[6] = unit('player_left', 'player', 2, 6, 3);
  state.board[7] = unit('player_mid', 'player', 1, 6, 0);
  return state;
}

function snapshot(state) {
  return JSON.stringify({ board: state.board, playerHand: state.player.hand, playerDiscard: state.player.discard, enemyHand: state.enemy.hand, enemyDiscard: state.enemy.discard });
}

test('targeting uses enemy then friendly unit mode', () => {
  assert.deepEqual(getTargetingStateForEffect(EFFECT_ID, 'c'), { cardId: 'c', targetType: 'enemy-and-friendly-unit', requiredTargets: 2, targetIndexes: [] });
});

test('applies enemy ATK set to 0 and ally +1 ATK until combat without mutating base stats or defenses', () => {
  const state = makeState('player');
  const enemy = state.board[0];
  const ally = state.board[6];
  const originalEnemyAttack = enemy.attack;
  const originalAllyAttack = ally.attack;
  const originalEnemyHp = enemy.hp;
  const originalAllyHp = ally.hp;
  const originalEnemyArmor = enemy.armor;
  const originalAllyArmor = ally.armor;

  const result = resolveTargetedEffectCard(state, 'player', 'mercy_tempo', 0, [0, 6]);

  assert.equal(result.ok, true);
  assert.equal(getUnitAttack(enemy), 0);
  assert.equal(getUnitAttack(ally), originalAllyAttack + 1);
  assert.equal(enemy.attack, originalEnemyAttack);
  assert.equal(ally.attack, originalAllyAttack);
  assert.equal(enemy.hp, originalEnemyHp);
  assert.equal(ally.hp, originalAllyHp);
  assert.equal(getUnitArmor(enemy), originalEnemyArmor);
  assert.equal(getUnitArmor(ally), originalAllyArmor);
  assert.equal(enemy.tempAttackSetToZeroUntilCombat, true);
  assert.equal(ally.tempAttackMod, 1);

  resolveCombat(state);

  assert.equal(getUnitAttack(enemy), originalEnemyAttack);
  assert.equal(getUnitAttack(ally), originalAllyAttack);
  assert.equal(enemy.tempAttackSetToZeroUntilCombat, undefined);
  assert.equal(ally.tempAttackMod, undefined);
});

test('invalid target combinations do not partially resolve', () => {
  const state = makeState('player');
  const before = snapshot(state);
  const result = resolveTargetedEffectCard(state, 'player', 'mercy_tempo', 0, [0, 1]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /friendly/i);
  assert.equal(snapshot(state), before);
});

test('works for enemy owner with owner-relative enemy and friendly targets', () => {
  const state = makeState('enemy');
  const playerTarget = state.board[6];
  const enemyAlly = state.board[0];
  const result = resolveTargetedEffectCard(state, 'enemy', 'mercy_tempo', 6, [6, 0]);
  assert.equal(result.ok, true);
  assert.equal(getUnitAttack(playerTarget), 0);
  assert.equal(getUnitAttack(enemyAlly), 5);
});

test('combat damage uses the temporary ATK changes and cleanup tolerates missing targets', () => {
  const state = makeState('player');
  const result = resolveTargetedEffectCard(state, 'player', 'mercy_tempo', 0, [0, 6]);
  assert.equal(result.ok, true);
  const enemyHpBeforeCombat = state.enemyHP;
  state.board[0] = null;
  resolveCombat(state);
  assert.equal(state.enemyHP, enemyHpBeforeCombat - 3);
});

test('AI produces a legal tempo-transfer pair without invalid spam', () => {
  const state = makeState('enemy');
  const telemetry = {};
  const actions = buildActionCandidates(state, 'enemy', state.enemy.hand, telemetry);
  const tempoActions = actions.filter((action) => action.effectId === EFFECT_ID);
  assert.ok(tempoActions.length >= 1);
  assert.ok(tempoActions.every((action) => state.board[action.targetIndexes[0]]?.owner === 'player'));
  assert.ok(tempoActions.every((action) => state.board[action.targetIndexes[1]]?.owner === 'enemy'));
  assert.equal(telemetry.invalidActions ?? 0, 0);
});

test('Balance Lab custom faction validation accepts tempo transfer but rejects unknown effects', () => {
  const faction = {
    id: 'tempo-transfer-test',
    name: 'Tempo Transfer Test',
    deck: Array.from({ length: 10 }, (_, index) => ({
      id: `tempo_transfer_${index}`,
      name: `Tempo ${index}`,
      type: 'utility',
      targeting: index === 0 ? 'enemy_and_friendly_unit' : 'none',
      effectId: index === 0 ? EFFECT_ID : 'draw_1',
      textShort: 'x',
    })),
  };
  const script = `import importlib.util, json\nfrom pathlib import Path\nspec = importlib.util.spec_from_file_location('bl', '${process.cwd()}/tools/balance-lab/run_balance_lab.py')\nbl = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(bl)\nroot = Path(${JSON.stringify(process.cwd())})\nvalidated = bl.validate_custom_factions(root, json.loads(${JSON.stringify(JSON.stringify([faction]))}))\nassert validated[0]['deck'][0]['effectId'] == '${EFFECT_ID}'\nbad = json.loads(${JSON.stringify(JSON.stringify([{ ...faction, id: 'bad-tempo-transfer-test', deck: faction.deck.map((card, i) => (i == 0 ? { ...card, effectId: 'unknown_effect' } : card)) }]))})\ntry:\n    bl.validate_custom_factions(root, bad)\nexcept bl.BalanceLabError:\n    pass\nelse:\n    raise AssertionError('unknown effect was accepted')\n`;
  execFileSync('python3', ['-c', script], { stdio: 'pipe' });
});
