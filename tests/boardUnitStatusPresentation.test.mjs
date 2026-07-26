import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import tank from '../src/data/factions/tank.json' with { type: 'json' };
import wardens from '../src/data/factions/wardens.json' with { type: 'json' };
import {
  BOARD_UNIT_STATUS_KIND,
  createBoardUnitStatusMarker,
  getBoardUnitStatusMarkerGeometry,
  getBoardUnitStatusPresentation,
  getBoardUnitStatusPresentations,
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

const rectsIntersect = (a, b) => !(
  a.x + a.width <= b.x || b.x + b.width <= a.x
  || a.y + a.height <= b.y || b.y + b.height <= a.y
);

const markerBounds = (geometry) => ({
  x: geometry.x - geometry.cornerSize / 2,
  y: geometry.y - geometry.cornerSize / 2,
  width: geometry.cornerSize,
  height: geometry.cornerSize,
});

test('audited board markers mirror by canonical owner and stay inside art away from stats', () => {
  const width = 112;
  const height = 154;
  const enemyArt = { x: -52, y: -73, width: 104, height: 105 };
  const enemyStats = { x: -48, y: 37, width: 96, height: 22 };
  const playerStats = { x: -48, y: -70, width: 96, height: 22 };
  const playerArt = { x: -52, y: -43, width: 104, height: 105 };

  for (const [owner, artRect, statsRect] of [
    ['enemy', enemyArt, enemyStats],
    ['player', playerArt, playerStats],
  ]) {
    for (const markerIndex of [0, 1]) {
      const geometry = getBoardUnitStatusMarkerGeometry(width, height, { artRect, owner, markerIndex });
      const bounds = markerBounds(geometry);
      assert.ok(bounds.x >= artRect.x && bounds.x + bounds.width <= artRect.x + artRect.width);
      assert.ok(bounds.y >= artRect.y && bounds.y + bounds.height <= artRect.y + artRect.height);
      assert.equal(rectsIntersect(bounds, statsRect), false);
      const edgeInset = owner === 'enemy'
        ? artRect.y + artRect.height - (bounds.y + bounds.height)
        : bounds.y - artRect.y;
      assert.equal(owner === 'enemy'
        ? geometry.y > artRect.y + artRect.height / 2
        : geometry.y < artRect.y + artRect.height / 2, true);
      assert.ok(edgeInset >= 5 && edgeInset <= 8);
    }
  }
});

test('simultaneous audited markers stack right-to-left without collision', () => {
  const state = {
    cannotDropBelowOneThisTurn: { player: true },
    immuneMoveDisableThisTurn: { player: true },
  };
  const presentations = getBoardUnitStatusPresentations(unit('player', 'any-faction-card'), state);
  assert.deepEqual(presentations.map(({ kind }) => kind), [
    BOARD_UNIT_STATUS_KIND.HP_FLOOR,
    BOARD_UNIT_STATUS_KIND.MOVE_DISABLE_IMMUNITY,
  ]);

  const artRect = { x: -52, y: -43, width: 104, height: 105 };
  const right = markerBounds(getBoardUnitStatusMarkerGeometry(112, 154, { artRect, owner: 'player', markerIndex: 0 }));
  const left = markerBounds(getBoardUnitStatusMarkerGeometry(112, 154, { artRect, owner: 'player', markerIndex: 1 }));
  assert.ok(left.x + left.width < right.x);
  assert.equal(rectsIntersect(left, right), false);
});

test('board placement is driven by owner while legacy inspect geometry is unchanged', () => {
  const artRect = { x: -52, y: -43, width: 104, height: 105 };
  const player = getBoardUnitStatusMarkerGeometry(112, 154, { artRect, owner: 'player' });
  const enemy = getBoardUnitStatusMarkerGeometry(112, 154, { artRect, owner: 'enemy' });
  assert.equal(player.x, enemy.x);
  assert.ok(player.y < enemy.y);

  const legacy = getBoardUnitStatusMarkerGeometry(112, 154, { inspect: true });
  const expectedInset = Math.max(4, Math.round(112 * 0.026));
  const expectedSize = Math.max(12, Math.round(112 * 0.11));
  assert.deepEqual(legacy, {
    inset: expectedInset,
    cornerSize: expectedSize,
    x: 56 - expectedInset - expectedSize / 2,
    y: -77 + expectedInset + expectedSize / 2,
  });
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
