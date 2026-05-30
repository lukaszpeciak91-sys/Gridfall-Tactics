import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createNonUnitEffectStatSymbols,
  NON_UNIT_EFFECT_STAT_SYMBOL_COLOR,
} from '../src/rendering/cardVisualLayout.js';

function createMockScene() {
  const calls = {
    text: [],
    graphics: [],
  };

  return {
    calls,
    add: {
      container: (x, y) => ({
        type: 'container',
        x,
        y,
        depth: 0,
        children: [],
        setDepth(depth) {
          this.depth = depth;
          return this;
        },
        add(item) {
          if (Array.isArray(item)) this.children.push(...item);
          else this.children.push(item);
          return this;
        },
      }),
      graphics: (config) => {
        const graphics = {
          type: 'graphics',
          x: config?.x ?? 0,
          y: config?.y ?? 0,
          commands: [],
          fillStyle(color, alpha) {
            this.commands.push({ type: 'fillStyle', color, alpha });
            return this;
          },
          lineStyle(width, color, alpha) {
            this.commands.push({ type: 'lineStyle', width, color, alpha });
            return this;
          },
          fillPoints(points, closeShape) {
            this.commands.push({ type: 'fillPoints', points, closeShape });
            return this;
          },
          strokePoints(points, closeShape) {
            this.commands.push({ type: 'strokePoints', points, closeShape });
            return this;
          },
        };
        calls.graphics.push(graphics);
        return graphics;
      },
      text: (...args) => {
        calls.text.push(args);
        throw new Error('non-unit effect stars must not be rendered as text');
      },
    },
  };
}

function getBounds(points) {
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

test('non-unit effect stat symbols render as centered icon objects in stat slots', () => {
  const scene = createMockScene();
  const row = createNonUnitEffectStatSymbols(scene, 12, 34, 120, 26, 7);

  assert.equal(row.x, 12);
  assert.equal(row.y, 34);
  assert.equal(row.depth, 7);
  assert.equal(scene.calls.text.length, 0);
  assert.equal(row.children.length, 3);
  assert.equal(scene.calls.graphics.length, 3);

  const [left, middle, right] = row.children;
  assert.ok(left.x < middle.x);
  assert.ok(Math.abs(middle.x) < 0.000001);
  assert.ok(Math.abs(left.x + right.x) < 0.000001);
  assert.equal(left.y, 0);
  assert.equal(middle.y, 0);
  assert.equal(right.y, 0);

  row.children.forEach((star) => {
    assert.equal(star.type, 'graphics');
    assert.ok(star.commands.some((command) => command.type === 'fillStyle' && command.color === NON_UNIT_EFFECT_STAT_SYMBOL_COLOR));
    assert.equal(star.commands.some((command) => command.type === 'lineStyle'), false);
    assert.equal(star.commands.some((command) => command.type === 'strokePoints'), false);

    const mainFill = star.commands.filter((command) => command.type === 'fillPoints').at(-1);
    assert.ok(mainFill, 'star icon should draw a vector fill');
    assert.equal(mainFill.points.length, 12);

    const bounds = getBounds(mainFill.points);
    assert.ok(Math.abs(bounds.minX + bounds.maxX) < 0.000001);
    assert.ok(Math.abs(bounds.minY + bounds.maxY) < 0.000001);
  });
});
