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
const clearSwapPrompt = compileMethod('clearSwapPrompt', 'showActiveSelectionMessage', []);
const showActiveSelectionMessage = compileMethod(
  'showActiveSelectionMessage',
  'showEnemyActionBanner',
  ['message', 'mode'],
  'const PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS = 90;\n',
);
const destroyTargetingInstruction = compileMethod('destroyTargetingInstruction', 'destroyActiveSelectionMessage', []);
const destroyActiveSelectionMessage = compileMethod('destroyActiveSelectionMessage', 'captureBoardStats', []);

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
    destroy() { this.destroyed = true; this.active = false; },
  };
}

function makeScene(targetingState = null) {
  const scene = {
    targetingState,
    targetingInstructionText: null,
    activeSelectionBanner: null,
    activeSelectionBannerMode: null,
    playerActionBanner: { active: true },
    layout: {
      width: 900,
      height: 700,
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
    showActiveSelectionMessage(message, mode) { return showActiveSelectionMessage.call(this, message, mode); },
    destroyActiveSelectionMessage() { return destroyActiveSelectionMessage.call(this); },
    destroyTargetingInstruction() { return destroyTargetingInstruction.call(this); },
  };
  return scene;
}

test('showTargetingInstruction uses active selection banner style instead of the legacy purple prompt', () => {
  const scene = makeScene({ targetType: 'enemy-unit', requiredTargets: 1, targetIndexes: [] });

  showTargetingInstruction.call(scene);

  assert.equal(scene.addCalls.length, 1);
  assert.equal(scene.activeSelectionBanner, scene.addCalls[0]);
  assert.equal(scene.activeSelectionBannerMode, 'targeting');
  assert.equal(scene.targetingInstructionText, scene.activeSelectionBanner);
  assert.equal(scene.addCalls[0].text, 'SELECT ENEMY');
  assert.equal(scene.addCalls[0].style.backgroundColor, '#14532d');
  assert.notEqual(scene.addCalls[0].style.backgroundColor, '#4c1d95');
  assert.equal(scene.playerActionBanner.active, true, 'targeting banner must not destroy transient player action banners');
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
  assert.equal(scene.activeSelectionBannerMode, 'targeting');
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
  assert.equal(scene.activeSelectionBannerMode, null);
});

test('board swap prompt appears through the unified active selection banner path', () => {
  const scene = makeScene();
  showSwapPrompt.call(scene, 'selectAdjacent', (key, fallback) => fallback);

  assert.equal(scene.activeSelectionBannerMode, 'swap');
  assert.equal(scene.activeSelectionBanner.text, 'SWAP: select adjacent unit');
  assert.equal(scene.activeSelectionBanner.style.backgroundColor, '#14532d');
  assert.equal(scene.targetingInstructionText, null);

  clearSwapPrompt.call(scene);
  assert.equal(scene.activeSelectionBanner, null);
});

test('targeting highlight and action-button routing remain unchanged', () => {
  assert.match(source, /if \(targetingState\) \{\s*this\.targetingState = \{ \.\.\.targetingState, targetIndexes: \[\.\.\.\(targetingState\.targetIndexes \?\? \[\]\)\] \};[\s\S]*this\.showTargetingInstruction\(\);[\s\S]*return;\s*\}/);
  assert.match(source, /if \(this\.targetingState\) \{[\s\S]*this\.confirmTargetingSelection\(\);[\s\S]*return;[\s\S]*\}/);
  assert.match(source, /const isValidEnemyTarget = this\.isValidTarget\(cell\.index, 'enemy-unit', selectedTargetIndexes, targetConstraint\);/);
  assert.match(source, /strokeAlpha = BOARD_TARGET_STROKE_ALPHA;/);
});
