import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canPlayOrRedeploy,
  createInitialBattleState,
  getUnitAttack,
  playEffectCard,
  isOwnerSlotAvailableForUnitPlacement,
  playOrRedeployUnit,
  recordPassAction,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const makeState = () => createInitialBattleState({ name: 'Test', deck: [] });

const unitCard = (id, overrides = {}) => ({
  id,
  name: id,
  type: 'unit',
  targeting: 'lane',
  attack: 1,
  hp: 1,
  armor: 0,
  effectId: null,
  ...overrides,
});

const effectCard = (id, effectId) => ({
  id,
  name: id,
  type: 'order',
  targeting: 'all_friendly_units',
  effectId,
  textShort: '',
});

const boardUnit = (owner, overrides = {}) => ({
  id: `${owner}-unit`,
  cardId: `${owner}-unit`,
  name: `${owner} Unit`,
  type: 'unit',
  owner,
  attack: 1,
  hp: 2,
  maxHp: 2,
  armor: 0,
  effectId: null,
  ...overrides,
});

test('Scout played before opponent action blocks only matching enemy unit lane until that action resolves', () => {
  const state = makeState();
  state.player.hand.push(unitCard('scout', { attack: 2, hp: 1, effectId: 'block_enemy_lane_play_this_turn' }));
  state.enemy.hand.push(unitCard('enemy-lane-0'), unitCard('enemy-lane-1'), unitCard('enemy-lane-0-after'));

  assert.equal(playOrRedeployUnit(state, 'player', 'scout', 6).ok, true);

  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-lane-0', 0).ok, false);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-lane-1', 1).ok, true);

  const otherLaneResult = playOrRedeployUnit(state, 'enemy', 'enemy-lane-1', 1);
  assert.equal(otherLaneResult.ok, true);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-lane-0-after', 0).ok, true);
});

test('Scout block permits legal effects and clears after the opponent action opportunity', () => {
  const state = makeState();
  state.player.hand.push(unitCard('scout', { attack: 2, hp: 1, effectId: 'block_enemy_lane_play_this_turn' }));
  state.enemy.hand.push(effectCard('enemy-effect', 'heal_all_1'), unitCard('enemy-after-effect'));

  assert.equal(playOrRedeployUnit(state, 'player', 'scout', 6).ok, true);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-after-effect', 0).ok, false);

  const effectResult = playEffectCard(state, 'enemy', 'enemy-effect');
  assert.equal(effectResult.ok, true);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-after-effect', 0).ok, true);
});

test('Scout played after opponent already acted persists through combat into their next action opportunity', () => {
  const state = makeState();
  state.enemy.hand.push(unitCard('enemy-first'), unitCard('enemy-blocked'));
  state.player.hand.push(unitCard('scout', { attack: 2, hp: 1, effectId: 'block_enemy_lane_play_this_turn' }));

  assert.equal(playOrRedeployUnit(state, 'enemy', 'enemy-first', 1).ok, true);
  assert.equal(playOrRedeployUnit(state, 'player', 'scout', 6).ok, true);

  resolveCombat(state);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-blocked', 0).ok, false);

  recordPassAction(state, 'enemy');
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-blocked', 0).ok, true);
});

test('Scout block does not persist indefinitely after an opponent pass opportunity', () => {
  const state = makeState();
  state.player.hand.push(unitCard('scout', { attack: 2, hp: 1, effectId: 'block_enemy_lane_play_this_turn' }));
  state.enemy.hand.push(unitCard('enemy-after-pass'));

  assert.equal(playOrRedeployUnit(state, 'player', 'scout', 6).ok, true);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-after-pass', 0).ok, false);

  recordPassAction(state, 'enemy');
  resolveCombat(state);
  assert.equal(canPlayOrRedeploy(state, 'enemy', 'enemy-after-pass', 0).ok, true);
});

test('Bruiser damage survival after attacking carries +1 ATK into the next combat damage calculation', () => {
  const state = makeState();
  state.board[6] = boardUnit('player', { id: 'bruiser', attack: 2, hp: 3, maxHp: 3, effectId: 'gain_atk_when_damaged' });
  state.board[0] = boardUnit('enemy', { id: 'target', attack: 1, hp: 5, maxHp: 5 });

  resolveCombat(state);

  assert.equal(state.board[6].hp, 2);
  assert.equal(state.board[0].hp, 3);
  assert.equal(getUnitAttack(state.board[6]), 3);

  state.board[0].attack = 0;
  const nextEvents = resolveCombat(state);

  assert.equal(nextEvents.find((event) => event.attackerSide === 'player')?.damage, 3);
  assert.equal(state.board[0], null);
  assert.equal(getUnitAttack(state.board[6]), 2);
});

test('Bruiser carried bonus clears after being available for next combat even if it does not kill', () => {
  const state = makeState();
  state.board[6] = boardUnit('player', { id: 'bruiser', attack: 2, hp: 3, maxHp: 3, effectId: 'gain_atk_when_damaged' });
  state.board[0] = boardUnit('enemy', { id: 'durable-target', attack: 1, hp: 8, maxHp: 8 });

  resolveCombat(state);
  assert.equal(getUnitAttack(state.board[6]), 3);

  state.board[0].attack = 0;
  resolveCombat(state);

  assert.equal(state.board[0].hp, 3);
  assert.equal(getUnitAttack(state.board[6]), 2);
});

test('Bruiser pending attack bonus is capped at +1 across repeated pre-combat damage survival', () => {
  const state = makeState();
  state.board[6] = boardUnit('player', { id: 'bruiser', attack: 2, hp: 3, maxHp: 3, effectId: 'gain_atk_when_damaged' });
  state.enemy.hand.push(
    { ...effectCard('ping-1', 'ignore_armor_next_attack'), targeting: 'enemy_unit' },
    { ...effectCard('ping-2', 'ignore_armor_next_attack'), targeting: 'enemy_unit' },
  );

  assert.equal(resolveTargetedEffectCard(state, 'enemy', 'ping-1', 6).ok, true);
  assert.equal(resolveTargetedEffectCard(state, 'enemy', 'ping-2', 6).ok, true);

  assert.equal(state.board[6].hp, 1);
  assert.equal(getUnitAttack(state.board[6]), 3);
});

const emptyFaction = { id: 'test-faction', name: 'Test', deck: [] };

function makeBlockedPlacementState(card) {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true });
  state.player.hand.push(card);
  state.playerLanePlayBlockedThisTurn = [true, false, false];
  return state;
}

function placementEffectCard(id, effectId) {
  return {
    id,
    name: id,
    type: 'order',
    targeting: 'none',
    effectId,
    textShort: '',
  };
}

function fallenUnit(id = 'fallen-unit') {
  return {
    id,
    name: id,
    type: 'unit',
    attack: 1,
    hp: 2,
    armor: 0,
    effectId: null,
  };
}

function addSummonTokenVariant(state, cardId, effectId = 'heal_2', token = 'grunt', temporary = undefined, tokenStats = undefined) {
  const registryKey = `test-faction::${cardId}::${effectId}`;
  state.effectVariantRegistry = {
    [registryKey]: {
      schemaVersion: 1,
      registryKey,
      variantId: `${cardId}_summon_token_variant`,
      label: `${cardId} summon token variant`,
      baseEffectId: effectId,
      timing: 'afterBaseEffectBeforeDiscard',
      sequence: [
        { operation: 'runBaseEffect' },
        {
          operation: 'summonToken',
          selector: 'firstEmptyOwnerSlot',
          token,
          ...(temporary === undefined ? {} : { temporary }),
          ...(tokenStats === undefined ? {} : { tokenStats }),
        },
      ],
    },
  };
}

test('Tea Courier lane block makes Flood skip blocked placement slots', () => {
  const state = makeBlockedPlacementState(placementEffectCard('flood', 'fill_empty_slots_0_1'));
  state.board[7] = boardUnit('player', { id: 'existing-player-unit' });

  const result = playEffectCard(state, 'player', 'flood');

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.board[8]?.temporaryFloodToken, true);
  assert.equal(state.board.filter((unit) => unit?.temporaryFloodToken).length, 1);
});

test('Tea Courier lane block can reduce Flood to zero tokens when every empty slot is blocked', () => {
  const state = makeBlockedPlacementState(placementEffectCard('flood', 'fill_empty_slots_0_1'));
  state.playerLanePlayBlockedThisTurn = [true, true, true];

  const result = playEffectCard(state, 'player', 'flood');

  assert.equal(result.ok, true);
  assert.equal(state.board.filter((unit) => unit?.temporaryFloodToken).length, 0);
  assert.deepEqual(state.board.slice(6, 9), [null, null, null]);
});

test('Tea Courier lane block invalidates blocked revive_friendly_1hp target and allows selected legal slot', () => {
  const state = makeBlockedPlacementState(placementEffectCard('revive', 'revive_friendly_1hp'));
  state.player.fallen.push({ card: fallenUnit('revived-unit') });

  const blockedResult = resolveTargetedEffectCard(state, 'player', 'revive', 6, [6]);
  assert.equal(blockedResult.ok, false);
  assert.equal(state.player.fallen.length, 1);

  const result = resolveTargetedEffectCard(state, 'player', 'revive', 7, [7]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.board[7]?.id, 'revived-unit');
  assert.equal(state.board[7]?.hp, 1);
});

test('Tea Courier lane block makes Grave Call skip blocked placement slots', () => {
  const state = makeBlockedPlacementState(placementEffectCard('grave-call', 'grave_call'));

  const result = playEffectCard(state, 'player', 'grave-call');

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.match(state.board[7]?.id, /grave_call_grunt/);
  assert.match(state.board[8]?.id, /grave_call_grunt/);
});

test('summon_grunt_empty_slot targeted resolution uses selected legal slot instead of first free', () => {
  const state = makeBlockedPlacementState(placementEffectCard('spawn', 'summon_grunt_empty_slot'));

  assert.equal(isOwnerSlotAvailableForUnitPlacement(state, 'player', 7), true);
  const result = resolveTargetedEffectCard(state, 'player', 'spawn', 8, [8]);

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.board[7], null);
  assert.match(state.board[8]?.id, /summoned_grunt/);
});

test('summon_grunt_empty_slot targeted resolution rejects blocked selected slots without consumption', () => {
  const state = makeBlockedPlacementState(placementEffectCard('spawn', 'summon_grunt_empty_slot'));

  const result = resolveTargetedEffectCard(state, 'player', 'spawn', 6, [6]);

  assert.equal(result.ok, false);
  assert.equal(state.player.hand.length, 1);
  assert.equal(state.player.discard.length, 0);
  assert.equal(state.board[6], null);
});

test('Tea Courier lane block makes effectVariant summonToken skip blocked placement slots', () => {
  const state = makeBlockedPlacementState(placementEffectCard('variant-card', 'heal_2'));
  addSummonTokenVariant(state, 'variant-card');

  const result = playEffectCard(state, 'player', 'variant-card');

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.match(state.board[7]?.id, /effect_variant_grunt/);
  assert.equal(state.effectVariantOperationTelemetry[0].tokensSummoned, 1);
});

test('effectVariant summonToken can create temporary Bone Shields and clean them up after combat', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true });
  state.player.hand.push(placementEffectCard('bone-shields-card', 'heal_2'));
  addSummonTokenVariant(state, 'bone-shields-card', 'heal_2', 'bone_shields', true);

  const result = playEffectCard(state, 'player', 'bone-shields-card');

  assert.equal(result.ok, true);
  const token = state.board[6];
  assert.match(token.id, /bone_shields_token/);
  assert.equal(token.name, 'Bone Shields');
  assert.equal(token.namePl, 'Kościane Tarcze');
  assert.equal(token.attack, 0);
  assert.equal(token.armor, 1);
  assert.equal(token.hp, 1);
  assert.equal(token.maxHp, 1);
  assert.equal(token.effectId, 'cannot_attack');
  assert.equal(getUnitAttack(token), 0);
  assert.equal(token.temporaryFloodToken, true);
  assert.equal(state.effectVariantOperationTelemetry[0].token, 'bone_shields');
  assert.equal(state.effectVariantOperationTelemetry[0].temporary, true);
  assert.equal(state.effectVariantOperationTelemetry[0].tokensSummoned, 1);

  resolveCombat(state);

  assert.equal(state.board[6], null);
});



test('effectVariant summonToken tokenStats overrides only the summoned Bone Shields instance', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true });
  state.player.hand.push(placementEffectCard('bone-shields-card', 'heal_2'));
  addSummonTokenVariant(state, 'bone-shields-card', 'heal_2', 'bone_shields', true, { atk: 0, arm: 0, hp: 1 });

  const result = playEffectCard(state, 'player', 'bone-shields-card');

  assert.equal(result.ok, true);
  const token = state.board[6];
  assert.equal(token.attack, 0);
  assert.equal(token.armor, 0);
  assert.equal(token.hp, 1);
  assert.equal(token.maxHp, 1);
  assert.equal(token.effectId, 'cannot_attack');
  assert.equal(token.temporaryFloodToken, true);
  assert.deepEqual(state.effectVariantOperationTelemetry[0].tokenStats, { atk: 0, arm: 0, hp: 1 });
  assert.deepEqual(state.effectVariantOperationTelemetry[0].summonedTokenStats, { atk: 0, arm: 0, hp: 1 });

  const nextState = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true });
  nextState.player.hand.push(placementEffectCard('bone-shields-card', 'heal_2'));
  addSummonTokenVariant(nextState, 'bone-shields-card', 'heal_2', 'bone_shields', true);
  assert.equal(playEffectCard(nextState, 'player', 'bone-shields-card').ok, true);
  assert.equal(nextState.board[6].armor, 1);
});


test('effectVariant summonToken rejects malformed tokenStats without summoning', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true });
  state.player.hand.push(placementEffectCard('bad-token-stats-card', 'heal_2'));
  addSummonTokenVariant(state, 'bad-token-stats-card', 'heal_2', 'bone_shields', true, { atk: 0, armor: 0, hp: 1 });

  const result = playEffectCard(state, 'player', 'bad-token-stats-card');

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.effectVariantOperationTelemetry, undefined);
});

test('effectVariant summonToken rejects unknown token IDs without summoning', () => {
  const state = createInitialBattleState(emptyFaction, emptyFaction, { skipInitialDraw: true });
  state.player.hand.push(placementEffectCard('unknown-token-card', 'heal_2'));
  addSummonTokenVariant(state, 'unknown-token-card', 'heal_2', 'mystery_token', true);

  const result = playEffectCard(state, 'player', 'unknown-token-card');

  assert.equal(result.ok, true);
  assert.equal(state.board[6], null);
  assert.equal(state.effectVariantOperationTelemetry, undefined);
});

test('Tea Courier lane block expiration lets targeted Spawn use the formerly blocked slot again', () => {
  const state = makeBlockedPlacementState(placementEffectCard('spawn', 'summon_grunt_empty_slot'));

  recordPassAction(state, 'player');
  const result = resolveTargetedEffectCard(state, 'player', 'spawn', 6, [6]);

  assert.equal(result.ok, true);
  assert.match(state.board[6]?.id, /summoned_grunt/);
});
