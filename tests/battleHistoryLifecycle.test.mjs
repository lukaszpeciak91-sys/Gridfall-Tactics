import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  createInitialBattleState,
  drawCards,
  playEffectCard,
  playOrRedeployUnit,
  recordPassAction,
  resolveCombat,
  resolveTargetedEffectCard,
} from '../src/systems/GameState.js';


class BattleHistoryHarness {
  getCurrentBattleHistoryTurnNumber() { return (this.gameState?.turnsCompleted ?? 0) + 1; }
  refreshBattleHistoryPanelIfOpen() { if (this.deckInfoPanel) this.refreshDeckInfoPanelContent(); }
  getOrCreateCurrentBattleHistoryTurn() {
    const turnNumber = this.getCurrentBattleHistoryTurnNumber();
    this.battleHistory ??= [];
    const existing = this.battleHistory.find((entry) => entry?.turnNumber === turnNumber && !entry.completed);
    if (existing) {
      this.currentBattleHistoryTurnNumber = turnNumber;
      existing.actions ??= [];
      existing.resolution ??= [];
      return existing;
    }
    const turnEntry = { turnNumber, actions: [], resolution: [], completed: false };
    this.battleHistory = [...this.battleHistory, turnEntry];
    this.currentBattleHistoryTurnNumber = turnNumber;
    return turnEntry;
  }
  appendBattleHistoryAction(side, action) {
    if (!this.gameState || !action) return null;
    const turnEntry = this.getOrCreateCurrentBattleHistoryTurn();
    const actionEntry = { actingSide: side, action };
    turnEntry.actions = [...(turnEntry.actions ?? []), actionEntry];
    this.pendingBattleHistoryEntries = [];
    this.refreshBattleHistoryPanelIfOpen();
    return actionEntry;
  }
  queueBattleHistoryAction(side, action) { return this.appendBattleHistoryAction(side, action); }
  appendBattleHistoryResolution(combatEvents, snapshot) {
    if (!this.gameState || !Array.isArray(combatEvents) || combatEvents.length === 0) return [];
    const resolution = this.buildResolutionFromCombatEvents(combatEvents, snapshot);
    if (resolution.length === 0) return [];
    const turnEntry = this.getOrCreateCurrentBattleHistoryTurn();
    turnEntry.resolution = [...(turnEntry.resolution ?? []), ...resolution];
    this.refreshBattleHistoryPanelIfOpen();
    return resolution;
  }
  appendImmediateBattleHistoryResolution(immediateCombatFeedback = null) {
    return this.appendBattleHistoryResolution(immediateCombatFeedback?.combatEvents, immediateCombatFeedback?.combatSnapshot);
  }
  getImmediateCombatFeedback(result = null) {
    if (!Array.isArray(result?.combatEvents) || result.combatEvents.length === 0) return null;
    return { combatEvents: result.combatEvents, combatSnapshot: result.combatSnapshot ?? null };
  }
  buildResolutionFromCombatEvents(combatEvents, snapshot) {
    const lines = [];
    const mutualKeys = new Set();
    (combatEvents ?? []).forEach((event) => {
      const attacker = this.getBoardUnitLabelFromSnapshot(snapshot, event.attackerIndex);
      if (!attacker || !event.damage || event.damage <= 0) return;
      if (event.targetType === 'hero') {
        lines.push({ type: 'base_damage', source: attacker, targetSide: event.targetSide, amount: event.damage });
        return;
      }
      const target = this.getBoardUnitLabelFromSnapshot(snapshot, event.targetIndex);
      if (!target) return;
      if (event.lethal) {
        const reverse = (combatEvents ?? []).find((other) => other !== event && other.lethal && other.attackerIndex === event.targetIndex && other.targetIndex === event.attackerIndex);
        if (reverse) {
          const key = [event.attackerIndex, event.targetIndex].sort().join(':');
          if (!mutualKeys.has(key)) {
            mutualKeys.add(key);
            lines.push({ type: 'mutual_kill', unitA: attacker, unitB: target });
          }
          return;
        }
        lines.push({ type: 'kill', attacker, target });
        return;
      }
      lines.push({ type: 'unit_damage', source: attacker, target, amount: event.damage });
    });
    return lines;
  }
  commitBattleHistoryTurn(combatEvents, snapshot) {
    const pendingActions = [...(this.pendingBattleHistoryEntries ?? [])];
    const hasCombatEvents = Array.isArray(combatEvents) && combatEvents.length > 0;
    const turnNumber = this.getCurrentBattleHistoryTurnNumber();
    let turnEntry = (this.battleHistory ?? []).find((entry) => entry?.turnNumber === turnNumber && !entry.completed) ?? null;
    if (!turnEntry && pendingActions.length > 0) {
      turnEntry = this.getOrCreateCurrentBattleHistoryTurn();
      turnEntry.actions = [...(turnEntry.actions ?? []), ...pendingActions];
    }
    if (!turnEntry) { this.pendingBattleHistoryEntries = []; return; }
    if (hasCombatEvents) {
      const resolution = this.buildResolutionFromCombatEvents(combatEvents, snapshot);
      if (resolution.length > 0) turnEntry.resolution = [...(turnEntry.resolution ?? []), ...resolution];
    }
    turnEntry.completed = true;
    this.currentBattleHistoryTurnNumber = null;
    this.pendingBattleHistoryEntries = [];
    this.refreshBattleHistoryPanelIfOpen();
  }
  getBoardUnitLabelFromSnapshot(snapshot, index) { const unit = snapshot?.board?.[index] ?? this.gameState?.board?.[index]; return unit ? { name: unit.name ?? unit.cardId ?? unit.id, side: unit.owner } : null; }
  cardHistoryToken(card) { return { text: card?.name ?? 'Unknown Card' }; }
  getDeckInfoPanelText() {
    const entries = this.battleHistory ?? [];
    if (entries.length === 0) return 'No battle history yet.';
    return entries.map((entry) => ['Turn ' + entry.turnNumber, ...(entry.actions ?? []).map((item) => item.action.card?.name ?? item.action.type)].join('\n')).join('\n\n');
  }
  initializeBattleInfoPanelState() {
    this.battleHistory = [];
    this.pendingBattleHistoryEntries = [];
    this.currentBattleHistoryTurnNumber = null;
  }
}

const unit = (id, overrides = {}) => ({ id, name: overrides.name ?? id, type: 'unit', attack: overrides.attack ?? 1, hp: overrides.hp ?? 2, ...overrides });
const effect = (id, effectId, overrides = {}) => ({ id, name: overrides.name ?? id, type: 'order', effectId, ...overrides });

function makeState(playerDeck = [], enemyDeck = []) {
  const state = createInitialBattleState(
    { id: 'player-test', name: 'Player Test', deck: playerDeck },
    { id: 'enemy-test', name: 'Enemy Test', deck: enemyDeck },
    { shuffle: false },
  );
  drawCards(state.player, 10);
  drawCards(state.enemy, 10);
  return state;
}

function makeScene(gameState) {
  const scene = new BattleHistoryHarness();
  scene.gameState = gameState;
  scene.battleHistory = [];
  scene.pendingBattleHistoryEntries = [];
  scene.currentBattleHistoryTurnNumber = null;
  scene.deckInfoPanel = null;
  scene.refreshCount = 0;
  scene.refreshDeckInfoPanelContent = () => { scene.refreshCount += 1; };
  scene.createCardRef = (card, side) => ({ name: card?.name ?? card?.id ?? 'Card', side });
  return scene;
}

function cardRef(card, side) {
  return { name: card?.name ?? card?.id ?? 'Card', side };
}

test('player unit play is canonical immediately and standard combat completes same turn without duplicates', () => {
  const state = makeState([unit('player-unit', { attack: 2 })], [unit('enemy-unit')]);
  const scene = makeScene(state);
  const result = playOrRedeployUnit(state, 'player', 'player-unit', 6);
  assert.equal(result.ok, true);

  scene.queueBattleHistoryAction('player', { type: 'play_unit', card: cardRef(result.card, 'player') });

  assert.equal(scene.battleHistory.length, 1);
  assert.equal(scene.battleHistory[0].actions.length, 1);
  assert.equal(scene.battleHistory[0].actions[0].action.type, 'play_unit');
  assert.deepEqual(scene.pendingBattleHistoryEntries, []);

  playOrRedeployUnit(state, 'enemy', 'enemy-unit', 0);
  const snapshot = { board: state.board.map((entry) => entry ? { ...entry } : null) };
  const combatEvents = resolveCombat(state);
  scene.commitBattleHistoryTurn(combatEvents, snapshot);

  assert.equal(scene.battleHistory.length, 1);
  assert.equal(scene.battleHistory[0].actions.length, 1);
  assert.equal(scene.battleHistory[0].completed, true);
});

test('player effect and PASS are canonical immediately; invalid actions remain unrecorded', () => {
  const state = makeState([effect('heal', 'heal_1')]);
  state.board[6] = { ...unit('ally'), owner: 'player', cardId: 'ally', hp: 1, maxHp: 2 };
  const scene = makeScene(state);

  const bad = playOrRedeployUnit(state, 'player', 'missing-unit', 6);
  assert.equal(bad.ok, false);
  assert.equal(scene.battleHistory.length, 0);

  const result = playEffectCard(state, 'player', 'heal');
  assert.equal(result.ok, true);
  scene.queueBattleHistoryAction('player', { type: 'play_effect', card: cardRef(result.card, 'player') });
  assert.equal(scene.battleHistory[0].actions[0].action.type, 'play_effect');

  recordPassAction(state, 'player');
  scene.queueBattleHistoryAction('player', { type: 'pass' });
  assert.deepEqual(scene.battleHistory[0].actions.map((entry) => entry.action.type), ['play_effect', 'pass']);
});

test('AI unit, effect, and PASS entries are canonical immediately in chronological order', () => {
  const state = makeState([], [unit('enemy-unit'), effect('enemy-heal', 'heal_1')]);
  state.board[0] = { ...unit('enemy-ally'), owner: 'enemy', cardId: 'enemy-ally', hp: 1, maxHp: 2 };
  const scene = makeScene(state);

  const unitResult = playOrRedeployUnit(state, 'enemy', 'enemy-unit', 1);
  assert.equal(unitResult.ok, true);
  scene.queueBattleHistoryAction('enemy', { type: 'play_unit', card: cardRef(unitResult.card, 'enemy') });

  const effectResult = playEffectCard(state, 'enemy', 'enemy-heal');
  assert.equal(effectResult.ok, true);
  scene.queueBattleHistoryAction('enemy', { type: 'play_effect', card: cardRef(effectResult.card, 'enemy') });

  recordPassAction(state, 'enemy');
  scene.queueBattleHistoryAction('enemy', { type: 'pass' });

  assert.deepEqual(scene.battleHistory[0].actions.map((entry) => `${entry.actingSide}:${entry.action.type}`), [
    'enemy:play_unit',
    'enemy:play_effect',
    'enemy:pass',
  ]);
});

test('immediate-combat history orders action before immediate consequence before later standard combat', () => {
  const state = makeState([effect('quick', 'quick_strike', { name: 'Quick Strike' })]);
  state.board[6] = { ...unit('ally', { attack: 1, hp: 3 }), owner: 'player', cardId: 'ally' };
  state.board[0] = { ...unit('enemy', { attack: 1, hp: 3 }), owner: 'enemy', cardId: 'enemy' };
  const scene = makeScene(state);

  const result = resolveTargetedEffectCard(state, 'player', 'quick', 6, [6]);
  assert.equal(result.ok, true);
  assert.ok(result.combatEvents.length > 0);
  scene.queueBattleHistoryAction('player', { type: 'play_effect', card: cardRef(result.card, 'player') });
  scene.appendImmediateBattleHistoryResolution(scene.getImmediateCombatFeedback(result));

  assert.equal(scene.battleHistory[0].actions[0].action.type, 'play_effect');
  const immediateResolutionCount = scene.battleHistory[0].resolution.length;
  assert.ok(immediateResolutionCount > 0);

  const standardSnapshot = { board: state.board.map((entry) => entry ? { ...entry } : null) };
  scene.commitBattleHistoryTurn(resolveCombat(state), standardSnapshot);

  assert.equal(scene.battleHistory.length, 1);
  assert.equal(scene.battleHistory[0].actions.length, 1);
  assert.ok(scene.battleHistory[0].resolution.length >= immediateResolutionCount);
  assert.equal(scene.battleHistory[0].completed, true);
});

test('base damage and death-trigger-derived resolution keep combat event order', () => {
  const state = makeState([]);
  state.board[6] = { ...unit('striker', { attack: 3, hp: 1 }), owner: 'player', cardId: 'striker' };
  state.board[0] = null;
  state.board[1] = { ...unit('fragile-enemy', { attack: 1, hp: 1 }), owner: 'enemy', cardId: 'fragile-enemy' };
  state.board[7] = { ...unit('killer', { attack: 2, hp: 2 }), owner: 'player', cardId: 'killer' };
  const scene = makeScene(state);
  scene.queueBattleHistoryAction('player', { type: 'pass' });
  const snapshot = { board: state.board.map((entry) => entry ? { ...entry } : null) };
  const combatEvents = resolveCombat(state);
  const expectedTypes = scene.buildResolutionFromCombatEvents(combatEvents, snapshot).map((entry) => entry.type);
  scene.commitBattleHistoryTurn(combatEvents, snapshot);

  const types = scene.battleHistory[0].resolution.map((entry) => entry.type);
  assert.ok(types.includes('base_damage'));
  assert.ok(types.includes('kill'));
  assert.deepEqual(types, expectedTypes);
});

test('open history panel refreshes on canonical mutation and closed panel text reads updated history', () => {
  const state = makeState([unit('player-unit')]);
  const scene = makeScene(state);
  scene.deckInfoPanel = { open: true };
  scene.queueBattleHistoryAction('player', { type: 'play_unit', card: { name: 'Player Unit', side: 'player' } });
  assert.equal(scene.refreshCount, 1);

  scene.deckInfoPanel = null;
  assert.match(scene.getDeckInfoPanelText(), /Player Unit/);
});

test('battle restart/init clears canonical, pending, and incomplete history state', () => {
  const scene = makeScene(makeState());
  scene.battleHistory = [{ turnNumber: 1, actions: [{ actingSide: 'player', action: { type: 'pass' } }], resolution: [] }];
  scene.pendingBattleHistoryEntries = [{ actingSide: 'enemy', action: { type: 'pass' } }];
  scene.currentBattleHistoryTurnNumber = 1;

  scene.initializeBattleInfoPanelState();

  assert.deepEqual(scene.battleHistory, []);
  assert.deepEqual(scene.pendingBattleHistoryEntries, []);
  assert.equal(scene.currentBattleHistoryTurnNumber, null);
});

test('DECK/TALIA isFlowResolving open guard remains unchanged', () => {
  const source = fs.readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
  const openDeckInfoPanel = source.slice(source.indexOf('  openDeckInfoPanel() {'), source.indexOf('  bindDeckInfoScrollHandlers'));
  assert.match(openDeckInfoPanel, /if \(!this\.gameState\?\.player \|\| this\.battleResultModalShown \|\| this\.isFlowResolving\) return;/);
});
