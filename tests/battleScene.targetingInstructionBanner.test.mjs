import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  const end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function compileMethod(name, nextName, params, prelude = '') {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  const body = block.slice(bodyStart, bodyEnd);
  return new Function(...params, `${prelude}${body}`);
}

const getTargetingInstructionMessage = compileMethod(
  'getTargetingInstructionMessage',
  'showTargetingInstruction',
  ['translateActive'],
);
const showTargetingInstruction = compileMethod('showTargetingInstruction', 'showSwapPrompt', []);
const showSwapPrompt = compileMethod('showSwapPrompt', 'clearSwapPrompt', ['step', 'translateActive']);
const clearSwapPrompt = compileMethod('clearSwapPrompt', 'getCentralBattleBannerLayout', []);
const getCentralBattleBannerLayout = compileMethod(
  'getCentralBattleBannerLayout',
  'getActiveSelectionBannerLayout',
  ['options'],
  'const { baseWidthRatio, horizontalPadding, startOffset = 6 } = options;\n',
);
const getActiveSelectionBannerLayout = compileMethod(
  'getActiveSelectionBannerLayout',
  'showActiveSelectionMessage',
  ['owner'],
);
const showActiveSelectionMessage = compileMethod(
  'showActiveSelectionMessage',
  'showEnemyActionBanner',
  ['message', 'owner'],
  'const PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS = 90;\n',
);
const destroyTargetingInstruction = compileMethod('destroyTargetingInstruction', 'destroyActiveSelectionMessage', []);
const destroyActiveSelectionMessage = compileMethod(
  'destroyActiveSelectionMessage',
  'captureBoardStats',
  ['owner', 'options'],
  'const { flushDeferred = true } = options ?? {};\n',
);

function getPath(root, path) {
  return path.split('.').reduce((value, segment) => value?.[segment], root);
}

function makeTextObject(x, y, text, style) {
  return {
    active: true,
    x,
    y,
    text,
    style,
    destroyed: false,
    setOrigin(...args) { this.origin = args; return this; },
    setDepth(value) { this.depth = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setScale(value) { this.scale = value; return this; },
    setStroke(...args) { this.stroke = args; return this; },
    setText(value) { this.text = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    destroy() { this.destroyed = true; this.active = false; },
  };
}

function makeScene(targetingState = null) {
  const scene = {
    targetingState,
    targetingInstructionText: null,
    activeSelectionBanner: null,
    activeSelectionBannerOwner: null,
    playerActionBanner: { active: true },
    layout: {
      width: 900,
      height: 700,
      margin: 18,
      board: { width: 540, centerY: 320, cellWidth: 120, cellHeight: 110 },
    },
    addCalls: [],
    tweenCalls: [],
    add: {
      text: (x, y, text, style) => {
        const object = makeTextObject(x, y, text, style);
        scene.addCalls.push(object);
        return object;
      },
    },
    tweens: {
      add: (config) => { scene.tweenCalls.push(config); },
      killTweensOf: (target) => { scene.killedTweenTarget = target; },
    },
    getTargetingInstructionMessage() {
      return getTargetingInstructionMessage.call(this, (key, fallback) => fallback);
    },
    getCentralBattleBannerLayout(options) { return getCentralBattleBannerLayout.call(this, options); },
    getActiveSelectionBannerLayout(owner) { return getActiveSelectionBannerLayout.call(this, owner); },
    showActiveSelectionMessage(message, owner) { return showActiveSelectionMessage.call(this, message, owner); },
    destroyActiveSelectionMessage(owner, options) { return destroyActiveSelectionMessage.call(this, owner, options); },
    flushDeferredTransientBattleBanner() { return false; },
    destroyTargetingInstruction() { return destroyTargetingInstruction.call(this); },
    destroyTransientBattleBanners() {
      if (this.playerActionBanner) this.playerActionBanner.active = false;
      this.transientCleanupCount = (this.transientCleanupCount ?? 0) + 1;
    },
  };
  return scene;
}

test('showTargetingInstruction uses active selection banner style instead of the legacy purple prompt', () => {
  const scene = makeScene({ targetType: 'enemy-unit', requiredTargets: 1, targetIndexes: [] });

  showTargetingInstruction.call(scene);

  assert.equal(scene.addCalls.length, 1);
  assert.equal(scene.activeSelectionBanner, scene.addCalls[0]);
  assert.equal(scene.activeSelectionBannerOwner, 'targeting');
  assert.equal(scene.targetingInstructionText, scene.activeSelectionBanner);
  assert.equal(scene.addCalls[0].text, 'SELECT ENEMY');
  assert.equal(scene.addCalls[0].style.backgroundColor, '#14532d');
  assert.equal(scene.tweenCalls[0].y, scene.layout.board.centerY);
  assert.notEqual(scene.addCalls[0].style.backgroundColor, '#4c1d95');
  assert.equal(scene.playerActionBanner.active, false, 'persistent targeting banner must replace transient central banners');
});

test('central banner layout grows nominally by 20% and caps text width inside viewport padding', () => {
  const scene = makeScene();
  const roomyLayout = getCentralBattleBannerLayout.call(scene, { baseWidthRatio: 0.88, horizontalPadding: 14, startOffset: 5 });

  assert.equal(roomyLayout.x, scene.layout.width * 0.5);
  assert.equal(roomyLayout.targetY, scene.layout.board.centerY);
  assert.equal(roomyLayout.startY, scene.layout.board.centerY + 5);
  assert.equal(roomyLayout.maxTextWidth, scene.layout.board.width * 0.88 * 1.2);

  scene.layout.width = 360;
  scene.layout.margin = 9;
  scene.layout.board.width = 315;
  const cappedLayout = getCentralBattleBannerLayout.call(scene, { baseWidthRatio: 0.94, horizontalPadding: 16 });
  assert.equal(cappedLayout.maxTextWidth, 360 - 9 * 2 - 16 * 2);
});

test('all central banner variants use the shared midpoint helper and increased vertical padding', () => {
  const turnStart = source.slice(source.indexOf('  async showOpeningTurnStartBanner() {'), source.indexOf('  destroyTurnStartBanner() {'));
  const playerAction = extractMethodBody('showPlayerActionBanner', 'getTargetingInstructionMessage');
  const activeSelection = extractMethodBody('showActiveSelectionMessage', 'showEnemyActionBanner');
  const enemyAction = extractMethodBody('showEnemyActionBanner', 'destroyEnemyActionBanner');

  assert.match(turnStart, /getCentralBattleBannerLayout\(\{ baseWidthRatio: 0\.88, horizontalPadding: 16 \}\)/);
  assert.match(turnStart, /const \{ x, targetY \} = bannerLayout;/);
  assert.match(turnStart, /padding: \{ x: 16, y: 12 \}/);
  assert.match(playerAction, /getCentralBattleBannerLayout\(\{ baseWidthRatio: 0\.88, horizontalPadding: 14, startOffset: 5 \}\)/);
  assert.match(playerAction, /const \{ targetY \} = bannerLayout;/);
  assert.match(playerAction, /padding: \{ x: 14, y: 11 \}/);
  assert.match(activeSelection, /padding: \{ x: 14, y: 11 \}/);
  assert.match(enemyAction, /getCentralBattleBannerLayout\(\{ baseWidthRatio: 0\.94, horizontalPadding: 16 \}\)/);
  assert.match(enemyAction, /y: board\.centerY,/);
  assert.match(enemyAction, /padding: \{ x: 16, y: 12 \}/);
});

test('targeting instruction messages still resolve through existing English and Polish localization keys', () => {
  for (const key of ['selectFirstEnemy', 'selectSecondEnemy', 'selectAdjacentEnemy', 'selectEnemy', 'selectAlly', 'selectUnit']) {
    assert.equal(typeof getPath(en, `ui.battle.targeting.${key}`), 'string', `missing English targeting key ${key}`);
    assert.equal(typeof getPath(pl, `ui.battle.targeting.${key}`), 'string', `missing Polish targeting key ${key}`);
  }

  const calls = [];
  const scene = makeScene({ targetType: 'friendly-unit', requiredTargets: 1, targetIndexes: [] });
  const message = getTargetingInstructionMessage.call(scene, (key, fallback) => {
    calls.push({ key, fallback });
    return `localized:${key}`;
  });

  assert.equal(message, 'localized:ui.battle.targeting.selectAlly');
  assert.deepEqual(calls, [{ key: 'ui.battle.targeting.selectAlly', fallback: 'SELECT ALLY' }]);
});

test('multi-target enemy wording updates for first, second, and adjacent enemy selection steps', () => {
  const translate = (key) => key;
  const scene = makeScene({ targetType: 'enemy-unit', requiredTargets: 2, targetIndexes: [] });

  assert.equal(getTargetingInstructionMessage.call(scene, translate), 'ui.battle.targeting.selectFirstEnemy');

  scene.targetingState.targetIndexes = [0];
  assert.equal(getTargetingInstructionMessage.call(scene, translate), 'ui.battle.targeting.selectSecondEnemy');

  scene.targetingState.targetConstraint = 'adjacent-pair';
  assert.equal(getTargetingInstructionMessage.call(scene, translate), 'ui.battle.targeting.selectAdjacentEnemy');
});

test('single enemy, ally, and any-unit prompts display the correct targeting messages', () => {
  const translate = (key) => key;
  const scene = makeScene();

  scene.targetingState = { targetType: 'enemy-unit', requiredTargets: 1, targetIndexes: [] };
  assert.equal(getTargetingInstructionMessage.call(scene, translate), 'ui.battle.targeting.selectEnemy');

  scene.targetingState = { targetType: 'friendly-unit', requiredTargets: 1, targetIndexes: [] };
  assert.equal(getTargetingInstructionMessage.call(scene, translate), 'ui.battle.targeting.selectAlly');

  scene.targetingState = { targetType: 'any-unit', requiredTargets: 1, targetIndexes: [] };
  assert.equal(getTargetingInstructionMessage.call(scene, translate), 'ui.battle.targeting.selectUnit');
});

test('targeting instructions persist while targeting remains active and update without recreating the banner', () => {
  const scene = makeScene({ targetType: 'enemy-unit', requiredTargets: 2, targetIndexes: [] });

  showTargetingInstruction.call(scene);
  const banner = scene.activeSelectionBanner;
  scene.targetingState.targetIndexes = [1];
  showTargetingInstruction.call(scene);

  assert.equal(scene.addCalls.length, 1);
  assert.equal(scene.activeSelectionBanner, banner);
  assert.equal(scene.activeSelectionBanner.destroyed, false);
  assert.equal(scene.activeSelectionBanner.text, 'SELECT SECOND ENEMY');
  assert.equal(scene.activeSelectionBannerOwner, 'targeting');
});

test('canceling and completing targeting clear only the active targeting selection message', () => {
  const scene = makeScene({ targetType: 'enemy-unit', requiredTargets: 1, targetIndexes: [] });
  showTargetingInstruction.call(scene);
  const banner = scene.activeSelectionBanner;

  destroyTargetingInstruction.call(scene);
  assert.equal(banner.destroyed, true);
  assert.equal(scene.activeSelectionBanner, null);
  assert.equal(scene.targetingInstructionText, null);

  scene.targetingState = { targetType: 'any-unit', requiredTargets: 1, targetIndexes: [] };
  showTargetingInstruction.call(scene);
  const completionBanner = scene.activeSelectionBanner;
  scene.targetingState = null;
  showTargetingInstruction.call(scene);

  assert.equal(completionBanner.destroyed, true);
  assert.equal(scene.activeSelectionBanner, null);
  assert.equal(scene.activeSelectionBannerOwner, null);
});

test('board swap prompt appears through the unified active selection banner path', () => {
  const scene = makeScene();
  showSwapPrompt.call(scene, 'selectAdjacent', (key, fallback) => fallback);

  assert.equal(scene.activeSelectionBannerOwner, 'board-swap');
  assert.equal(scene.activeSelectionBanner.text, 'SWAP: select adjacent unit');
  assert.equal(scene.activeSelectionBanner.style.backgroundColor, '#14532d');
  assert.equal(scene.tweenCalls[0].y, scene.layout.board.centerY);
  assert.equal(scene.targetingInstructionText, null);

  clearSwapPrompt.call(scene);
  assert.equal(scene.activeSelectionBanner, null);
});

test('targeting highlight and direct tap routing remain source-aligned', () => {
  assert.match(source, /beginPlayerTargetingSession\(targetingState\) \{/);
  assert.match(source, /if \(\(targetingState\.requiredTargets \?\? 0\) <= 0\) \{/);
  assert.match(source, /this\.targetingState = \{ \.\.\.targetingState, targetIndexes: \[\.\.\.\(targetingState\.targetIndexes \?\? \[\]\)\] \};/);
  assert.match(source, /this\.showTargetingInstruction\(\);/);
  assert.match(source, /const canAutoCast = targetIndexes\.length >= minTargets && isExactTargetCount;/);
  assert.match(source, /if \(!canAutoCast\) \{[\s\S]*this\.targetingState = \{[\s\S]*this\.showTargetingInstruction\(\);[\s\S]*return;[\s\S]*\}/);
  assert.doesNotMatch(source, /confirmTargetingSelection/);
  assert.equal(source.includes('action' + 'Button'), false);
  assert.match(source, /const isValidEnemyTarget = this\.isValidTarget\(cell\.index, 'enemy-unit', selectedTargetIndexes, targetConstraint\);/);
  assert.match(source, /strokeAlpha = BOARD_TARGET_STROKE_ALPHA;/);
});


test('selection banner cleanup is owner-scoped and replacing owners recreates the banner at the correct layout', () => {
  const scene = makeScene({ targetType: 'enemy-unit', requiredTargets: 1, targetIndexes: [] });
  showTargetingInstruction.call(scene);
  const targetingBanner = scene.activeSelectionBanner;

  clearSwapPrompt.call(scene);
  assert.equal(scene.activeSelectionBanner, targetingBanner, 'board swap cleanup must not clear targeting UI');

  showSwapPrompt.call(scene, 'selectAdjacent', (key, fallback) => fallback);
  assert.equal(targetingBanner.destroyed, true, 'switching owners must replace the old layout object');
  const swapBanner = scene.activeSelectionBanner;
  assert.equal(scene.activeSelectionBannerOwner, 'board-swap');
  assert.equal(scene.tweenCalls.at(-1).y, scene.layout.board.centerY);

  destroyTargetingInstruction.call(scene);
  assert.equal(scene.activeSelectionBanner, swapBanner, 'targeting cleanup must not clear board swap UI');
});

test('pass, turn transition, player-action refresh, and scene shutdown retain intentional global banner cleanup', () => {
  const resolvePassTurn = extractMethodBody('resolvePassTurn', 'getOpeningTurnStartBannerConfig');
  const startTurn = extractMethodBody('startTurn', 'evaluateAndShowPlayerConcedableInfoBanner');
  const refreshAfterPlayerAction = source.slice(
    source.indexOf('  refreshAfterPlayerAction() {'),
    source.indexOf('  async revealAndApplyEnemyAction()', source.indexOf('  refreshAfterPlayerAction() {')),
  );
  const cleanupSceneObjects = extractMethodBody('cleanupSceneObjects', 'create');
  const completePlayerAction = source.slice(
    source.indexOf('  async completePlayerAction('),
    source.indexOf('  async resolveEnemyFirstTurnOpening()', source.indexOf('  async completePlayerAction(')),
  );

  assert.match(resolvePassTurn, /this\.pendingSwapIndex = null;\s*this\.destroyActiveSelectionMessage\(\);\s*this\.completePlayerAction\(\);/);
  assert.match(startTurn, /this\.targetingState = null;[\s\S]*this\.destroyActiveSelectionMessage\(\);/);
  assert.match(refreshAfterPlayerAction, /this\.targetingState = null;[\s\S]*this\.destroyActiveSelectionMessage\(\);/);
  assert.match(cleanupSceneObjects, /this\.destroyActiveSelectionMessage\(\);/);
  assert.match(completePlayerAction, /this\.isFlowResolving = true;\s*this\.destroyActiveSelectionMessage\(\);/);
});

test('card selection cleanup clears targeting and board-swap owners through their scoped cleanup paths', () => {
  const clearHandCardSelection = extractMethodBody('clearHandCardSelection', 'onBoardCellTap');

  assert.match(clearHandCardSelection, /this\.destroyTargetingInstruction\(\);\s*this\.clearSwapPrompt\(\);/);
});


test('central banner coordinator preserves persistent prompt priority and rebuild restoration without absorbing excluded feedback', () => {
  const coordinator = source.slice(
    source.indexOf('  getPersistentBattleBannerOwner() {'),
    source.indexOf('  captureBoardSnapshot() {'),
  );
  const rebuildBattleView = extractMethodBody('rebuildBattleView', 'shutdown');
  const showPlayerActionBanner = extractMethodBody('showPlayerActionBanner', 'getTargetingInstructionMessage');
  const showEnemyActionBanner = extractMethodBody('showEnemyActionBanner', 'destroyEnemyActionBanner');
  const showOpeningTurnStartBanner = source.slice(
    source.indexOf('  async showOpeningTurnStartBanner() {'),
    source.indexOf('  destroyTurnStartBanner() {'),
  );
  const cleanupSceneObjects = extractMethodBody('cleanupSceneObjects', 'create');
  const updatePlayerBaseActionState = extractMethodBody('updatePlayerBaseActionState', 'canHoldPassToSurrender');
  const showMovementBlockedFeedback = source.slice(
    source.indexOf('  showMovementBlockedFeedback('),
    source.indexOf('  async playMovementFeedback('),
  );

  assert.match(coordinator, /if \(this\.targetingState\) return 'targeting';/);
  assert.match(coordinator, /if \(this\.pendingSwapIndex !== null && this\.pendingSwapIndex !== undefined\) return 'board-swap';/);
  assert.match(coordinator, /if \(this\.restorePersistentBattleBanner\(\)\) return false;/);
  assert.match(coordinator, /'enemy-action': 3,[\s\S]*'player-action': 2,[\s\S]*'turn-start': 1,/);
  assert.match(coordinator, /if \(this\.getBattleBannerPriority\(renderedOwner\) > this\.getBattleBannerPriority\(owner\)\) return false;/);
  assert.match(coordinator, /this\.destroyTransientBattleBanners\(\);/);
  assert.match(rebuildBattleView, /this\.restorePersistentBattleBanner\(\);/);
  assert.match(showPlayerActionBanner, /!this\.prepareTransientBattleBanner\('player-action'\)/);
  assert.match(showEnemyActionBanner, /!this\.prepareTransientBattleBanner\('enemy-action'\)/);
  assert.match(showOpeningTurnStartBanner, /!this\.prepareTransientBattleBanner\('turn-start'\)/);
  assert.match(cleanupSceneObjects, /this\.destroyEnemyActionBanner\(\);[\s\S]*this\.destroyTurnStartBanner\(\);[\s\S]*this\.destroyPlayerActionBanner\(\);[\s\S]*this\.destroyActiveSelectionMessage\(\);/);
  assert.match(updatePlayerBaseActionState, /this\.passHoldToSurrenderEnabled = passActionActive && this\.canHoldPassToSurrender\(\);/);
  assert.doesNotMatch(updatePlayerBaseActionState, /translateActive\('ui\.battle\.holdPassToSurrender', 'Hold PASS to surrender'\)/);
  assert.match(showMovementBlockedFeedback, /this\.showFloatingTextAtSlot\(index, label, 'damage'\)/);
});

test('persistent owner restoration routes targeting and board swap through their existing prompt methods', () => {
  const getPersistentBattleBannerOwner = compileMethod('getPersistentBattleBannerOwner', 'restorePersistentBattleBanner', []);
  const restorePersistentBattleBanner = compileMethod('restorePersistentBattleBanner', 'getBattleBannerPriority', []);
  const calls = [];
  const scene = {
    targetingState: { targetType: 'enemy-unit' },
    pendingSwapIndex: 2,
    getPersistentBattleBannerOwner() { return getPersistentBattleBannerOwner.call(this); },
    showTargetingInstruction() { calls.push('targeting'); },
    showSwapPrompt(step) { calls.push(`board-swap:${step}`); },
  };

  assert.equal(restorePersistentBattleBanner.call(scene), true);
  assert.deepEqual(calls, ['targeting']);

  scene.targetingState = null;
  assert.equal(restorePersistentBattleBanner.call(scene), true);
  assert.deepEqual(calls, ['targeting', 'board-swap:selectAdjacent']);

  scene.pendingSwapIndex = null;
  assert.equal(restorePersistentBattleBanner.call(scene), false);
});


test('transient coordinator suppresses overlap while persistent state exists and clears competing central banners otherwise', () => {
  const prepareTransientBattleBanner = compileMethod('prepareTransientBattleBanner', 'captureBoardSnapshot', ['owner']);
  const calls = [];
  const scene = {
    restorePersistentBattleBanner() { calls.push('restore'); return true; },
    getRenderedTransientBattleBannerOwner() { return null; },
    getBattleBannerPriority(owner) { return { 'enemy-action': 3, 'player-action': 2, 'turn-start': 1 }[owner] ?? 0; },
    destroyActiveSelectionMessage() { calls.push('clear-selection'); },
    destroyTransientBattleBanners() { calls.push('clear-transient'); },
  };

  assert.equal(prepareTransientBattleBanner.call(scene, 'enemy-action'), false);
  assert.deepEqual(calls, ['restore']);

  scene.restorePersistentBattleBanner = () => { calls.push('restore-none'); return false; };
  assert.equal(prepareTransientBattleBanner.call(scene, 'player-action'), true);
  assert.deepEqual(calls, ['restore', 'restore-none', 'clear-selection', 'clear-transient']);

  calls.length = 0;
  scene.getRenderedTransientBattleBannerOwner = () => 'enemy-action';
  assert.equal(prepareTransientBattleBanner.call(scene, 'turn-start'), false);
  assert.deepEqual(calls, ['restore-none']);
});

test('suppressed player confirmation is deferred until targeting cleanup and higher-priority deferred feedback wins', () => {
  const deferTransientBattleBanner = compileMethod('deferTransientBattleBanner', 'flushDeferredTransientBattleBanner', ['owner', 'payload']);
  const flushDeferredTransientBattleBanner = compileMethod('flushDeferredTransientBattleBanner', 'prepareTransientBattleBanner', []);
  const calls = [];
  const scene = {
    deferredTransientBattleBanner: null,
    targetingState: { targetType: 'enemy-unit' },
    getBattleBannerPriority(owner) { return { 'enemy-action': 3, 'player-action': 2, 'turn-start': 1 }[owner] ?? 0; },
    getPersistentBattleBannerOwner() { return this.targetingState ? 'targeting' : null; },
    showEnemyActionBanner(message) { calls.push(`enemy:${message}`); },
    showPlayerActionBanner(message) { calls.push(`player:${message}`); },
    showOpeningTurnStartBanner() { calls.push('turn-start'); },
  };

  deferTransientBattleBanner.call(scene, 'player-action', { message: 'YOU PLAYED' });
  assert.equal(flushDeferredTransientBattleBanner.call(scene), false, 'targeting prompt must keep rendering while targeting remains active');
  assert.deepEqual(calls, []);

  deferTransientBattleBanner.call(scene, 'turn-start');
  assert.equal(scene.deferredTransientBattleBanner.owner, 'player-action', 'lower-priority deferred feedback must not replace confirmation');

  scene.targetingState = null;
  assert.equal(flushDeferredTransientBattleBanner.call(scene), true);
  assert.deepEqual(calls, ['player:YOU PLAYED']);
  assert.equal(scene.deferredTransientBattleBanner, null);
});

test('target completion flushes deferred confirmation immediately after clearing the persistent prompt', () => {
  const completePlayerAction = source.slice(
    source.indexOf('  async completePlayerAction('),
    source.indexOf('  async resolveEnemyFirstTurnOpening()', source.indexOf('  async completePlayerAction(')),
  );

  assert.match(completePlayerAction, /this\.destroyActiveSelectionMessage\(\);\s*this\.flushDeferredTransientBattleBanner\(\);/);
});
