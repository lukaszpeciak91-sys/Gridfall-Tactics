import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  let end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (end < 0) end = source.indexOf(`\n  async ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

function compileMethod(name, nextName, params = []) {
  const block = extractMethodBody(name, nextName);
  const bodyStart = block.indexOf(') {') + 3;
  const bodyEnd = block.lastIndexOf('}');
  return new Function(...params, block.slice(bodyStart, bodyEnd));
}

function createTimer() {
  return {
    removed: false,
    removeCalledWith: null,
    remove(value) {
      this.removed = true;
      this.removeCalledWith = value;
    },
  };
}

test('hand-card pointerout cancels pending long press without opening inspect', () => {
  const onHandCardPointerOut = compileMethod('onHandCardPointerOut', 'clearBoardInspect', ['cardId']);
  const cancelHandCardPressState = compileMethod('cancelHandCardPressState', 'onCardPointerUp');
  const timer = createTimer();
  const scene = {
    handCardLongPressEvent: timer,
    pressedHandCardId: 'unit-a',
    pressedHandCardWasSelected: false,
    longPressTriggeredCardId: null,
    hoverInspectCardId: null,
    cancelHandCardLongPress() {
      if (!this.handCardLongPressEvent) return;
      this.handCardLongPressEvent.remove(false);
      this.handCardLongPressEvent = null;
    },
    cancelHandCardPressState() { cancelHandCardPressState.call(this); },
    destroySelectedHandCardZoom() { throw new Error('interrupted short press must not open or close Inspect'); },
  };

  onHandCardPointerOut.call(scene, 'unit-a');

  assert.equal(timer.removed, true);
  assert.equal(timer.removeCalledWith, false);
  assert.equal(scene.handCardLongPressEvent, null);
  assert.equal(scene.pressedHandCardId, null);
  assert.equal(scene.longPressTriggeredCardId, null);
  assert.equal(scene.hoverInspectCardId, null);
});

test('board-cell pointerout cancels pending long press without tap behavior or Inspect', () => {
  const onBoardCellPointerOut = compileMethod('onBoardCellPointerOut', 'trySelectImplicitSwapSourceOnPointerDown');
  const cancelBoardCellPressState = compileMethod('cancelBoardCellPressState', 'onBoardCellPointerUp');
  const timer = createTimer();
  const scene = {
    boardCellLongPressEvent: timer,
    pressedBoardCellIndex: 2,
    boardLongPressTriggeredIndex: null,
    boardPointerDownSelectedSwapSource: false,
    cancelBoardCellLongPress() {
      if (!this.boardCellLongPressEvent) return;
      this.boardCellLongPressEvent.remove(false);
      this.boardCellLongPressEvent = null;
    },
    cancelBoardCellPressState() { cancelBoardCellPressState.call(this); },
    onBoardCellTap() { throw new Error('interrupted short press must not tap'); },
    showBoardUnitInspect() { throw new Error('interrupted short press must not open Inspect'); },
  };

  onBoardCellPointerOut.call(scene, 2);

  assert.equal(timer.removed, true);
  assert.equal(timer.removeCalledWith, false);
  assert.equal(scene.boardCellLongPressEvent, null);
  assert.equal(scene.pressedBoardCellIndex, null);
  assert.equal(scene.boardLongPressTriggeredIndex, null);
});

test('Phaser canceled hand-card pointerup cleans press state before tap behavior', () => {
  const onCardPointerUp = compileMethod('onCardPointerUp', 'onScenePointerUp', ['cardId', 'pointer']);
  const timer = createTimer();
  const scene = {
    handCardLongPressEvent: timer,
    pressedHandCardId: 'unit-a',
    pressedHandCardWasSelected: false,
    longPressTriggeredCardId: null,
    cancelHandCardPressState() {
      this.handCardLongPressEvent.remove(false);
      this.handCardLongPressEvent = null;
      this.pressedHandCardId = null;
      this.pressedHandCardWasSelected = false;
      this.longPressTriggeredCardId = null;
    },
    toggleOpeningMulliganCard() { throw new Error('pointercancel must not toggle mulligan selection'); },
    resetCardHighlights() { throw new Error('pointercancel must not run tap behavior'); },
  };

  onCardPointerUp.call(scene, 'unit-a', { wasCanceled: true });

  assert.equal(timer.removed, true);
  assert.equal(scene.handCardLongPressEvent, null);
  assert.equal(scene.pressedHandCardId, null);
});

test('Phaser canceled board-cell pointerup cleans press state before tap behavior', () => {
  const onBoardCellPointerUp = compileMethod('onBoardCellPointerUp', 'onBoardCellPointerOut', ['boardIndex', 'pointer']);
  const timer = createTimer();
  const scene = {
    boardCellLongPressEvent: timer,
    pressedBoardCellIndex: 2,
    boardLongPressTriggeredIndex: null,
    boardPointerDownSelectedSwapSource: false,
    cancelBoardCellPressState() {
      this.boardCellLongPressEvent.remove(false);
      this.boardCellLongPressEvent = null;
      this.pressedBoardCellIndex = null;
      this.boardLongPressTriggeredIndex = null;
      this.boardPointerDownSelectedSwapSource = false;
    },
    onBoardCellTap() { throw new Error('pointercancel must not tap'); },
  };

  onBoardCellPointerUp.call(scene, 2, { wasCanceled: true });

  assert.equal(timer.removed, true);
  assert.equal(scene.boardCellLongPressEvent, null);
  assert.equal(scene.pressedBoardCellIndex, null);
});

test('scene pointerupoutside clears both gesture paths without gameplay actions', () => {
  const onScenePointerUpOutside = compileMethod('onScenePointerUpOutside', 'cancelInterruptedPointerGesture');
  const cancelInterruptedPointerGesture = compileMethod('cancelInterruptedPointerGesture', 'drawHeroPanels');
  const calls = [];
  const scene = {
    cancelHandCardPressState() { calls.push('hand'); },
    cancelBoardCellPressState() { calls.push('board'); },
    cancelPassHoldToSurrender() { calls.push('pass'); },
    disarmPlayerSurrender() { calls.push('surrender'); },
    cancelInterruptedPointerGesture() { cancelInterruptedPointerGesture.call(this); },
    onBoardCellTap() { throw new Error('pointerupoutside must not tap'); },
    showBoardUnitInspect() { throw new Error('pointerupoutside must not open Inspect'); },
  };

  onScenePointerUpOutside.call(scene);

  assert.deepEqual(calls, ['hand', 'board', 'pass', 'surrender']);
});

test('battle input wires scene-level pointerupoutside and canceled pointer guards', () => {
  assert.match(source, /this\.input\.on\('pointerupoutside', this\.onScenePointerUpOutside, this\);/);
  assert.match(source, /this\.input\.off\('pointerupoutside', this\.onScenePointerUpOutside, this\);/);
  assert.match(source, /onCardPointerUp\(cardId, pointer\) \{\s*if \(pointer\?\.wasCanceled\)/);
  assert.match(source, /onBoardCellPointerUp\(boardIndex, pointer\) \{\s*if \(pointer\?\.wasCanceled\)/);
  assert.match(source, /onScenePointerUp\(pointer, currentlyOver = \[\]\) \{[\s\S]*if \(pointer\?\.wasCanceled\)/);
});
