import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import tank from '../src/data/factions/tank.json' with { type: 'json' };
import wardens from '../src/data/factions/wardens.json' with { type: 'json' };
import {
  BOARD_UNIT_STATUS_KIND,
  createBoardUnitStatusMarker,
  getBoardUnitStatusPresentation,
} from '../src/rendering/boardUnitStatusPresentation.js';
import {
  createInitialBattleState,
  playEffectCard,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';

const card = (faction, id) => ({ ...faction.deck.find((entry) => entry.id === id) });
const unit = (owner, id) => ({ id, cardId: id, name: id, type: 'unit', owner, attack: 0, armor: 0, hp: 3, maxHp: 3 });
const stateWithUnits = () => {
  const state = createInitialBattleState({ name: 'Status Test', deck: [] });
  state.board[6] = unit('player', 'player-a');
  state.board[7] = unit('player', 'player-b');
  state.board[0] = unit('enemy', 'enemy-a');
  return state;
};

test('Last Legion status follows owner state for current and later board units, then clears with combat', () => {
  const state = stateWithUnits();
  state.player.hand.push(card(tank, 'tank_last_stand_1'));

  assert.equal(playEffectCard(state, 'player', 'tank_last_stand_1').ok, true);
  assert.equal(getBoardUnitStatusPresentation(state.board[6], state).kind, BOARD_UNIT_STATUS_KIND.HP_FLOOR);
  assert.equal(getBoardUnitStatusPresentation(state.board[7], state).kind, BOARD_UNIT_STATUS_KIND.HP_FLOOR);
  assert.equal(getBoardUnitStatusPresentation(state.board[0], state), null);

  state.board[8] = unit('player', 'later-player-unit');
  assert.equal(getBoardUnitStatusPresentation(state.board[8], state).kind, BOARD_UNIT_STATUS_KIND.HP_FLOOR);

  resolveCombat(state);
  assert.equal(getBoardUnitStatusPresentation(state.board[8], state), null);
});

test('owner-scoped presentation marks only the equivalent enemy units', () => {
  const state = stateWithUnits();
  state.cannotDropBelowOneThisTurn.enemy = true;

  assert.equal(getBoardUnitStatusPresentation(state.board[0], state).kind, BOARD_UNIT_STATUS_KIND.HP_FLOOR);
  assert.equal(getBoardUnitStatusPresentation(state.board[6], state), null);
});

test('Emperor’s Will and Lock the Line resolve to the same distinct immunity descriptor', () => {
  const tankState = stateWithUnits();
  tankState.player.hand.push(card(tank, 'tank_stability_1'));
  assert.equal(playEffectCard(tankState, 'player', 'tank_stability_1').ok, true);

  const wardensState = stateWithUnits();
  wardensState.player.hand.push(card(wardens, 'wardens_reinforce_line_1'));
  assert.equal(playEffectCard(wardensState, 'player', 'wardens_reinforce_line_1').ok, true);

  const tankMarker = getBoardUnitStatusPresentation(tankState.board[6], tankState);
  const wardensMarker = getBoardUnitStatusPresentation(wardensState.board[6], wardensState);
  assert.equal(tankMarker.kind, BOARD_UNIT_STATUS_KIND.MOVE_DISABLE_IMMUNITY);
  assert.strictEqual(wardensMarker, tankMarker);
  assert.notEqual(tankMarker.kind, BOARD_UNIT_STATUS_KIND.HP_FLOOR);
  assert.notEqual(tankMarker.cue, 'shield');

  resolveCombat(wardensState);
  assert.equal(getBoardUnitStatusPresentation(wardensState.board[6], wardensState), null);
});

test('immediate-combat snapshot preserves owner status maps without delaying cleanup', () => {
  const state = stateWithUnits();
  state.cannotDropBelowOneThisTurn.player = true;
  const quickStrike = { id: 'status-snapshot-strike', name: 'Quick Strike', type: 'special', targeting: 'friendly_unit', effectId: 'quick_strike' };
  state.player.hand.push(quickStrike);

  const result = resolveTargetedEffectCard(state, 'player', quickStrike.id, 6);
  assert.equal(result.combatSnapshot.cannotDropBelowOneThisTurn.player, true);
  assert.equal(getBoardUnitStatusPresentation(result.combatSnapshot.board[6], result.combatSnapshot).kind, BOARD_UNIT_STATUS_KIND.HP_FLOOR);
  assert.equal(state.cannotDropBelowOneThisTurn.player, true);
});

test('marker geometry keeps owner frame external and gives statuses different non-color cues', () => {
  const created = [];
  const chain = (value = {}) => Object.assign(value, {
    setStrokeStyle() { return this; }, setPosition() { return this; },
  });
  const scene = { add: {
    container: () => chain({ children: [], add(items) { this.children.push(...items); return this; } }),
    rectangle: () => chain({ type: 'rectangle' }),
    circle: () => chain({ type: 'circle' }),
    graphics: () => chain({ type: 'graphics', operations: [], lineStyle() { return this; }, beginPath() { this.operations.push('begin'); }, moveTo() {}, lineTo() {}, closePath() { this.operations.push('close'); }, strokePath() { this.operations.push('stroke'); } }),
  } };
  const baseState = { cannotDropBelowOneThisTurn: { player: true }, immuneMoveDisableThisTurn: {} };
  const hp = getBoardUnitStatusPresentation(unit('player', 'hp'), baseState);
  const immunity = getBoardUnitStatusPresentation(unit('player', 'immune'), { cannotDropBelowOneThisTurn: {}, immuneMoveDisableThisTurn: { player: true } });
  const hpMarker = createBoardUnitStatusMarker(scene, 100, 140, hp);
  const immunityMarker = createBoardUnitStatusMarker(scene, 100, 140, immunity);
  created.push(hpMarker, immunityMarker);

  assert.equal(created[0].statusKind, BOARD_UNIT_STATUS_KIND.HP_FLOOR);
  assert.equal(created[1].statusKind, BOARD_UNIT_STATUS_KIND.MOVE_DISABLE_IMMUNITY);
  assert.notDeepEqual(created[0].children[2].operations, created[1].children[2].operations);
});

test('production effect flow retains the one-action guard before either status can be played again', () => {
  const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  const start = source.indexOf('  async startPlayerEffectCast(');
  const end = source.indexOf('\n  beginPlayerTargetingSession(', start);
  const effectFlow = source.slice(start, end);

  assert.match(effectFlow, /this\.playerActionUsed\) return/);
  assert.match(effectFlow, /playEffectCard\(this\.gameState, 'player', card\.id\)/);
  assert.match(effectFlow, /this\.completePlayerAction\(/);
});
