import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInitialBattleState, getEffectiveBoardAttack, resolveCombat } from '../src/systems/GameState.js';

function unit(id, owner, attack, effectId = null) {
  return { id, cardId: id, name: id, type: 'unit', owner, attack, hp: 3, maxHp: 3, armor: 0, effectId };
}

function makeState() {
  return createInitialBattleState({ id: 'p', name: 'P', deck: [] }, { id: 'e', name: 'E', deck: [] }, { firstActor: 'player' });
}

test('existing lane_empty_bonus_damage remains +2 on open lanes', () => {
  const state = makeState();
  state.board[6] = unit('runner', 'player', 2, 'lane_empty_bonus_damage');
  assert.equal(getEffectiveBoardAttack(state, 6), 4);
});

test('lane_empty_bonus_damage_1 gives +1 only on open lanes', () => {
  const state = makeState();
  state.board[6] = unit('overclock_probe', 'player', 2, 'lane_empty_bonus_damage_1');
  assert.equal(getEffectiveBoardAttack(state, 6), 3);
});

test('lane_empty_bonus_damage_1 does not trigger when opposing lane is occupied', () => {
  const state = makeState();
  state.board[6] = unit('overclock_probe', 'player', 2, 'lane_empty_bonus_damage_1');
  state.board[0] = unit('blocker', 'enemy', 1);
  assert.equal(getEffectiveBoardAttack(state, 6), 2);
});

test('lane_empty_bonus_damage_1 works for both player and enemy owners in base hits', () => {
  const playerState = makeState();
  playerState.board[6] = unit('player_probe', 'player', 2, 'lane_empty_bonus_damage_1');
  resolveCombat(playerState);
  assert.equal(playerState.enemyHP, 9);

  const enemyState = makeState();
  enemyState.board[0] = unit('enemy_probe', 'enemy', 2, 'lane_empty_bonus_damage_1');
  resolveCombat(enemyState);
  assert.equal(enemyState.playerHP, 9);
});

test('Balance Lab custom faction validation accepts lane_empty_bonus_damage_1 without effectParams', () => {
  const root = mkdtempSync(join(tmpdir(), 'gridfall-effects-'));
  try {
    mkdirSync(join(root, 'src/data/factions'), { recursive: true });
    const customFaction = {
      id: 'overclock-test',
      name: 'Overclock Test',
      deck: Array.from({ length: 10 }, (_, index) => ({
        id: `overclock_test_${index + 1}`,
        name: `Probe ${index + 1}`,
        type: 'unit',
        targeting: 'none',
        effectId: index === 0 ? 'lane_empty_bonus_damage_1' : null,
        textShort: index === 0 ? 'Open lane: +1 ATK' : 'No effect',
        attack: 1,
        hp: 1,
        armor: 0,
        cardNumber: index + 1,
      })),
    };
    const replacementChange = [{
      faction: 'aggro',
      cardId: 'aggro_runner_1',
      replaceCard: {
        id: 'aggro_runner_1',
        name: 'Runner Test',
        type: 'unit',
        targeting: 'none',
        effectId: 'lane_empty_bonus_damage_1',
        textShort: 'Open lane: +1 ATK',
        attack: 1,
        hp: 1,
        armor: 0,
      },
    }];
    writeFileSync(join(root, 'src/data/factions/aggro.json'), JSON.stringify({
      id: 'aggro',
      name: 'Aggro',
      deck: [{ id: 'aggro_runner_1', name: 'Runner', type: 'unit', targeting: 'none', effectId: 'lane_empty_bonus_damage', textShort: 'Open lane: +2 ATK', attack: 2, hp: 1, armor: 0 }],
    }));
    const code = `import importlib.util, json\nfrom pathlib import Path\nspec = importlib.util.spec_from_file_location('bl', '${process.cwd()}/tools/balance-lab/run_balance_lab.py')\nbl = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(bl)\nroot = Path(${JSON.stringify(root)})\nvalidated = bl.validate_custom_factions(root, json.loads(${JSON.stringify(JSON.stringify([customFaction]))}))\nassert validated[0]['deck'][0]['effectId'] == 'lane_empty_bonus_damage_1'\nchanges = bl.validate_requested_changes(root, json.loads(${JSON.stringify(JSON.stringify(replacementChange))}))\nassert changes[0]['newCard']['effectId'] == 'lane_empty_bonus_damage_1'\n`;
    const result = spawnSync('python3', ['-c', code], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
