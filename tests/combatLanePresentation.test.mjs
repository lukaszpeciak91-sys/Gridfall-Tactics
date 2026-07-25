import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMBAT_BETWEEN_LANES_DELAY_MS,
  COMBAT_FINAL_LANE_CONFIRMATION_MS,
  getStandardCombatLanePresentationGroups,
  playStandardCombatLanePresentation,
} from '../src/ui/combatLanePresentation.js';

const event = (lane, type = 'unit-attack', extra = {}) => ({ lane, type, ...extra });

async function observe(events) {
  const calls = [];
  await playStandardCombatLanePresentation(events, {
    presentLane: async (lane, laneEvents) => calls.push(['lane', lane, laneEvents]),
    delay: async (duration) => calls.push(['delay', duration]),
  });
  return calls;
}

test('one presented lane receives only the final confirmation beat', async () => {
  assert.deepEqual(await observe([event(0)]), [
    ['lane', 0, [event(0)]],
    ['delay', COMBAT_FINAL_LANE_CONFIRMATION_MS],
  ]);
  assert.equal(COMBAT_FINAL_LANE_CONFIRMATION_MS, 180);
});

test('two sparse presented lanes retain separation then use the final beat', async () => {
  const lane0 = event(0);
  const lane2 = event(2);
  assert.deepEqual(await observe([lane2, lane0]), [
    ['lane', 0, [lane0]],
    ['delay', COMBAT_BETWEEN_LANES_DELAY_MS],
    ['lane', 2, [lane2]],
    ['delay', COMBAT_FINAL_LANE_CONFIRMATION_MS],
  ]);
  assert.equal(COMBAT_BETWEEN_LANES_DELAY_MS, 320);
});

test('three presented lanes remain in source-lane order with two between-lane pauses', async () => {
  const events = [event(2), event(0), event(1)];
  const calls = await observe(events);
  assert.deepEqual(calls.map(([kind, value]) => [kind, value]), [
    ['lane', 0], ['delay', 320],
    ['lane', 1], ['delay', 320],
    ['lane', 2], ['delay', 180],
  ]);
});

test('empty groups receive no presentation or delay and actual groups determine the final lane', async () => {
  assert.deepEqual(await observe([]), []);
  assert.deepEqual((await observe([event(1)])).map(([kind, value]) => [kind, value]), [
    ['lane', 1], ['delay', 180],
  ]);
});

test('grouping preserves event identity, in-lane order, beam source lane, and simultaneous clash events', () => {
  const clashA = event(1, 'unit-attack', { simultaneous: true, attackerIndex: 1 });
  const beam = event(0, 'unit-attack', { presentation: 'beam', attackerCardId: 'rotes-auge' });
  const clashB = event(1, 'unit-attack', { simultaneous: true, attackerIndex: 4 });
  const groups = getStandardCombatLanePresentationGroups([clashA, beam, clashB]);

  assert.deepEqual(groups.map(({ lane }) => lane), [0, 1]);
  assert.strictEqual(groups[0].events[0], beam);
  assert.deepEqual(groups[1].events, [clashA, clashB]);
});

test('post-lane presentation cannot start until the final confirmation beat resolves', async () => {
  const order = [];
  let releaseFinalBeat;
  const finalBeat = new Promise((resolve) => { releaseFinalBeat = resolve; });
  const presentation = playStandardCombatLanePresentation([event(2, 'lethal-hit')], {
    presentLane: async () => order.push('lane'),
    delay: async (duration) => {
      order.push(`delay:${duration}:start`);
      await finalBeat;
      order.push(`delay:${duration}:end`);
    },
  }).then(() => order.push('death-wave'));

  await Promise.resolve();
  assert.deepEqual(order, ['lane', 'delay:180:start']);
  releaseFinalBeat();
  await presentation;
  assert.deepEqual(order, ['lane', 'delay:180:start', 'delay:180:end', 'death-wave']);
});
