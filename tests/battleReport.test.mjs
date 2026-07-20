import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildBattleReportSnapshot } from '../src/systems/battleReport.js';
import { createInitialBattleState } from '../src/systems/GameState.js';

const unit = (owner, overrides = {}) => ({
  id: `${owner}-unit`, cardId: `${owner}-card`, type: 'unit', attack: 2, armor: 1, hp: 3, maxHp: 4, owner, effectId: null, ...overrides,
});

const makeScene = () => ({
  battleContext: { mode: 'arena' }, factionKey: 'player_faction', enemyFactionKey: 'enemy_faction',
  gameState: createInitialBattleState({ name: 'Player', deck: [] }, { name: 'Enemy', deck: [] }, { firstActor: 'player' }),
  scene: { isActive: () => true, isPaused: () => false },
});

test('BattleScene exposes a thin public battle report snapshot wrapper', () => {
  const source = readFileSync('src/scenes/BattleScene.js', 'utf8');
  assert.match(source, /import \{ buildBattleReportSnapshot \} from '\.\.\/systems\/battleReport\.js';/);
  assert.match(source, /buildBattleReportSnapshot\(\) \{\s*return buildBattleReportSnapshot\(this\);\s*\}/);
});

test('collector returns stable JSON-serializable shape without mutating scene or GameState', () => {
  const scene = makeScene();
  scene.gameState.player.hand = [{ id: 'secret-card' }];
  scene.gameState.player.deck = [{ id: 'deck-card' }];
  scene.gameState.player.discard = [{ id: 'discard-card' }];
  scene.gameState.board[6] = unit('player');
  const beforeState = JSON.stringify(scene.gameState);
  const beforeSceneKeys = Object.keys(scene).sort();

  const snapshot = buildBattleReportSnapshot(scene);
  assert.equal(snapshot.version, 1);
  assert.match(snapshot.capturedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(Object.keys(snapshot).sort(), ['battle', 'board', 'capturedAt', 'environment', 'flow', 'reveal', 'version', 'warnings'].sort());
  assert.doesNotThrow(() => JSON.stringify(snapshot));
  assert.equal(JSON.stringify(scene.gameState), beforeState);
  assert.deepEqual(Object.keys(scene).sort(), beforeSceneKeys);
  assert.equal(snapshot.battle.playerHandCount, 1);
  assert.equal(JSON.stringify(snapshot).includes('secret-card'), false);
  assert.equal(JSON.stringify(snapshot).includes('deck-card'), false);
});

test('collector tolerates missing browser globals, partial scenes, and completed winner states', () => {
  assert.doesNotThrow(() => buildBattleReportSnapshot({}));
  const scene = makeScene();
  scene.gameState.winner = 'player';
  scene.gameState.endingReason = 'hero_death';
  assert.doesNotThrow(() => buildBattleReportSnapshot(scene));
  assert.equal(buildBattleReportSnapshot(scene).battle.winner, 'player');
});

test('board always returns six ordered compact slots and reports effective aura/modifier stats', () => {
  const scene = makeScene();
  scene.gameState.board[6] = unit('player', { effectId: 'atk_plus_per_other_ally', attack: 1, tempAttackMod: 2 });
  scene.gameState.board[7] = unit('player', { effectId: 'adjacent_allies_atk_plus_1_ignore_armor_1', attack: 1 });
  scene.gameState.board[8] = unit('player', { effectId: 'lane_armor_aura_1', armor: 0, tempArmorMod: 1, tempAttackMaxUntilCombat: 2 });
  scene.gameState.board[0] = unit('enemy', { tempAttackSetToZeroUntilCombat: true, attack: 5 });

  const snapshot = buildBattleReportSnapshot(scene);
  assert.deepEqual(snapshot.board.map((slot) => slot.index), [0, 1, 2, 6, 7, 8]);
  assert.equal(snapshot.board.length, 6);
  assert.deepEqual(snapshot.board[1], { index: 1, occupied: false });
  const kwoka = snapshot.board.find((slot) => slot.index === 6);
  assert.equal(kwoka.liveAttack, 6); // base 1 + temp 2 + two other allies + Alpha aura.
  assert.equal(kwoka.liveArmor, 1);
  const alpha = snapshot.board.find((slot) => slot.index === 7);
  assert.equal(alpha.liveArmor, 2);
  const capped = snapshot.board.find((slot) => slot.index === 8);
  assert.equal(capped.attackCap, 2);
  const zero = snapshot.board.find((slot) => slot.index === 0);
  assert.equal(zero.liveAttack, 0);
  assert.equal(zero.attackSetToZero, true);
});

test('display and presentation mismatch warnings require reliable displayed values and are gated in transient phases', () => {
  const scene = makeScene();
  scene.gameState.board[6] = unit('player', { attack: 2 });
  scene.displayedBoardStats = { 6: { attack: 9, armor: 1, health: 3 } };
  scene.currentBoardRenderStats = { 6: { attack: 8, armor: 1, health: 3 } };
  let snapshot = buildBattleReportSnapshot(scene);
  assert.equal(snapshot.board.find((slot) => slot.index === 6).displayAttackMismatch, true);
  assert.ok(snapshot.warnings.includes('DISPLAY_ATTACK_DIFFERS_FROM_LIVE'));
  assert.ok(snapshot.warnings.includes('PRESENTATION_ATTACK_DIFFERS_FROM_LIVE'));

  scene.isFlowResolving = true;
  snapshot = buildBattleReportSnapshot(scene);
  assert.equal(snapshot.board.find((slot) => slot.index === 6).displayAttackMismatch, true);
  assert.equal(snapshot.warnings.includes('DISPLAY_ATTACK_DIFFERS_FROM_LIVE'), false);
});

test('opening reveal, flow blocker, PASS, Battle Exhausted, surrender, and result warnings are compact', () => {
  const scene = makeScene();
  scene.gameState.playerHP = 3;
  scene.gameState.battleExhausted = { pendingPassOwner: 'player', fullPassRounds: 1 };
  scene.playerActionUsed = false;
  scene.targetingState = { cardId: 'effect', effectId: 'damage', targetIndexes: [], validTargetIndexes: [] };
  scene.isEffectCastResolving = true;
  scene.openingMulliganRevealPending = true;
  scene.openingMulliganRevealVisibleCount = 0;
  scene.getOpeningMulliganRevealCardCount = () => 2;
  scene.getOpeningMulliganRetainedBackControllers = () => [{ type: 'back' }];
  scene.collectOpeningRevealDiagnosticSnapshot = () => ({ retainedBackCount: 1, revealControllerCount: 1, invalidHiddenFrontCount: 2 });
  scene.utilityMenuPanel = { open: true };
  scene.surrenderConfirmationModal = { open: true };

  const snapshot = buildBattleReportSnapshot(scene);
  assert.equal(snapshot.battle.passSurrender.battleExhaustedEligible, true);
  assert.equal(snapshot.battle.passSurrender.pendingPassOwner, 'player');
  assert.equal(snapshot.battle.passSurrender.menuSurrenderConfirmationOpen, true);
  assert.equal(snapshot.flow.targetingActive, true);
  assert.equal(snapshot.flow.utilityMenuOpen, true);
  assert.ok(snapshot.warnings.includes('OPENING_REVEAL_BACKS_REMAIN'));
  assert.ok(snapshot.warnings.includes('OPENING_REVEAL_HIDDEN_FRONTS'));
  assert.ok(snapshot.warnings.includes('TARGETING_WITHOUT_VALID_TARGETS'));
});

test('simultaneous lethal draw is accepted, impossible non-draw emits warning, and size/privacy remain bounded', () => {
  const scene = makeScene();
  scene.gameState.playerHP = 0;
  scene.gameState.enemyHP = 0;
  scene.gameState.winner = 'draw';
  scene.gameState.board[6] = unit('player', { campaignSave: { secret: true }, phaserObject: { texture: 'nope' } });
  assert.equal(buildBattleReportSnapshot(scene).warnings.includes('SIMULTANEOUS_LETHAL_NOT_DRAW'), false);
  scene.gameState.winner = 'player';
  const snapshot = buildBattleReportSnapshot(scene);
  assert.ok(snapshot.warnings.includes('SIMULTANEOUS_LETHAL_NOT_DRAW'));
  const serialized = JSON.stringify(snapshot);
  assert.ok(serialized.length < 15_000, `snapshot too large: ${serialized.length}`);
  assert.equal(serialized.includes('campaignSave'), false);
  assert.equal(serialized.includes('texture'), false);
});
