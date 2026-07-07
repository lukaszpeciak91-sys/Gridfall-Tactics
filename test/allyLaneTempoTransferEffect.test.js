import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createInitialBattleState, getEffectiveBoardAttack, getUnitArmor, resolveCombat, resolveTargetedEffectCard } from '../src/systems/GameState.js';
import { buildActionCandidates } from '../src/systems/enemyDecision.js';
import { getTargetingStateForEffect } from '../src/systems/cardTargeting.js';

const EFFECT_ID = 'ally_atk_plus_1_opposing_enemy_atk_minus_1_until_combat';

function effectCard(id = 'mercy_lane_tempo') {
  return {
    id,
    name: 'Overclock Mercy',
    type: 'utility',
    targeting: 'friendly_unit',
    effectId: EFFECT_ID,
    textShort: 'Selected [ALLY] gets +1 ATK. Opposing [ENEMY] gets -1 ATK until combat.',
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

test('targeting uses one friendly unit only', () => {
  assert.deepEqual(getTargetingStateForEffect(EFFECT_ID, 'c'), { cardId: 'c', targetType: 'friendly-unit', requiredTargets: 1, targetIndexes: [] });
});

test('selected ally gets +1 ATK and opposing enemy gets -1 ATK until combat without stat JSON or defense mutation', () => {
  const state = makeState('player');
  const enemy = state.board[0];
  const ally = state.board[6];
  const sourceCard = state.player.hand[0];
  const original = { enemyAttack: enemy.attack, allyAttack: ally.attack, enemyHp: enemy.hp, allyHp: ally.hp, enemyArmor: enemy.armor, allyArmor: ally.armor };

  const result = resolveTargetedEffectCard(state, 'player', 'mercy_lane_tempo', 6, [6]);

  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 6), original.allyAttack + 1);
  assert.equal(getEffectiveBoardAttack(state, 0), original.enemyAttack - 1);
  assert.equal(enemy.attack, original.enemyAttack);
  assert.equal(ally.attack, original.allyAttack);
  assert.equal(enemy.hp, original.enemyHp);
  assert.equal(ally.hp, original.allyHp);
  assert.equal(getUnitArmor(enemy), original.enemyArmor);
  assert.equal(getUnitArmor(ally), original.allyArmor);
  assert.equal(sourceCard.attack, undefined);
  assert.equal(sourceCard.tempAttackMod, undefined);

  resolveCombat(state);

  assert.equal(getEffectiveBoardAttack(state, 6), original.allyAttack);
  assert.equal(getEffectiveBoardAttack(state, 0), original.enemyAttack);
  assert.equal(enemy.tempAttackMod, undefined);
  assert.equal(ally.tempAttackMod, undefined);
});

test('empty opposing lane still buffs ally and does not crash', () => {
  const state = makeState('player');
  state.board[0] = null;

  const result = resolveTargetedEffectCard(state, 'player', 'mercy_lane_tempo', 6, [6]);

  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 6), 3);
  assert.doesNotThrow(() => resolveCombat(state));
});

test('opposing enemy ATK cannot go below 0', () => {
  const state = makeState('player');
  const result = resolveTargetedEffectCard(state, 'player', 'mercy_lane_tempo', 7, [7]);
  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 1), 0);
});

test('works for enemy owner and cleanup tolerates units leaving board', () => {
  const state = makeState('enemy');
  const result = resolveTargetedEffectCard(state, 'enemy', 'mercy_lane_tempo', 0, [0]);
  assert.equal(result.ok, true);
  assert.equal(getEffectiveBoardAttack(state, 0), 5);
  assert.equal(getEffectiveBoardAttack(state, 6), 1);
  state.board[0] = null;
  state.board[6] = null;
  assert.doesNotThrow(() => resolveCombat(state));
});

test('AI produces a legal one-target lane tempo action without invalid spam', () => {
  const state = makeState('enemy');
  const telemetry = {};
  const actions = buildActionCandidates(state, 'enemy', state.enemy.hand, telemetry);
  const tempoActions = actions.filter((action) => action.effectId === EFFECT_ID);
  assert.ok(tempoActions.length >= 1);
  assert.ok(tempoActions.every((action) => state.board[action.targetIndex]?.owner === 'enemy'));
  assert.ok(tempoActions.every((action) => action.targetIndexes.length === 1));
  assert.equal(telemetry.invalidActions ?? 0, 0);
});

test('Balance Lab validation accepts lane tempo transfer and rejects unknown effects', () => {
  const faction = {
    id: 'ally-lane-tempo-test',
    name: 'Ally Lane Tempo Test',
    deck: Array.from({ length: 10 }, (_, index) => ({
      id: `ally_lane_tempo_${index}`,
      name: `Tempo ${index}`,
      type: 'utility',
      targeting: index === 0 ? 'friendly_unit' : 'none',
      effectId: index === 0 ? EFFECT_ID : 'draw_1',
      textShort: 'x',
    })),
  };
  const script = `import importlib.util, json\nfrom pathlib import Path\nspec = importlib.util.spec_from_file_location('bl', '${process.cwd()}/tools/balance-lab/run_balance_lab.py')\nbl = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(bl)\nroot = Path(${JSON.stringify(process.cwd())})\nvalidated = bl.validate_custom_factions(root, json.loads(${JSON.stringify(JSON.stringify([faction]))}))\nassert validated[0]['deck'][0]['effectId'] == '${EFFECT_ID}'\nreplace_card = dict(validated[0]['deck'][0])\nreplace_card['id'] = 'aggro_quick_fix_1'\nchanges = bl.validate_requested_changes(root, [{'faction':'Aggro','cardId':'aggro_quick_fix_1','replaceCard': replace_card}])\nassert changes[0]['newCard']['effectId'] == '${EFFECT_ID}'\nbad = json.loads(${JSON.stringify(JSON.stringify([{ ...faction, id: 'bad-ally-lane-tempo-test', deck: faction.deck.map((card, i) => (i == 0 ? { ...card, effectId: 'unknown_effect' } : card)) }]))})\ntry:\n    bl.validate_custom_factions(root, bad)\nexcept bl.BalanceLabError:\n    pass\nelse:\n    raise AssertionError('unknown effect was accepted')\n`;
  execFileSync('python3', ['-c', script], { stdio: 'pipe' });
});
