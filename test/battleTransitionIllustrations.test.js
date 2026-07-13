import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST,
  resolveBattleTransitionCandidates,
  resolveBattleTransitionIllustration,
} from '../src/data/battleTransitionIllustrations.js';

function makeAllowlist(overrides = {}) {
  return {
    aggro: [
      { artAssetId: 'aggro_02', cardId: 'aggro_berserker_1' },
      { artAssetId: 'aggro_09', cardId: 'aggro_adrenaline_1' },
    ],
    control: [
      { artAssetId: 'control_02', cardId: 'control_disruptor_1' },
      { artAssetId: 'control_05', cardId: 'control_drone_1' },
    ],
    tank: [
      { artAssetId: 'tank_01', cardId: 'tank_shieldbearer_1' },
    ],
    generic: [],
    tutorial: [
      { factionId: 'tutorial', artAssetId: 'ally_01', cardId: 'tutorial_unit_a_1' },
      { factionId: 'tutorial', artAssetId: 'ally_03', cardId: 'tutorial_unit_c_1' },
    ],
    ...overrides,
  };
}

function select(payload, randomValue, allowlist = makeAllowlist(), previousSelections = new Map()) {
  return resolveBattleTransitionIllustration(payload, () => randomValue, { allowlist, previousSelections });
}

test('production allowlist exposes an empty generic pool for future neutral transition art', () => {
  assert.deepEqual(BATTLE_TRANSITION_ILLUSTRATION_ALLOWLIST.generic, []);
});

test('normal battles combine player, enemy, and generic pools', () => {
  const allowlist = makeAllowlist({
    generic: [{ factionId: 'transition', artAssetId: 'transition_01', cardId: 'transition_01' }],
  });

  const { candidates, fallbackUsed } = resolveBattleTransitionCandidates({ factionKey: 'aggro', enemyFactionKey: 'control' }, allowlist);

  assert.equal(fallbackUsed, false);
  assert.deepEqual(candidates.map((entry) => entry.selectionKey), [
    'aggro::aggro_02',
    'aggro::aggro_09',
    'control::control_02',
    'control::control_05',
    'transition::transition_01',
  ]);
});

test('empty generic pool is safe and does not block player plus enemy candidates', () => {
  const { candidates, fallbackUsed } = resolveBattleTransitionCandidates({ factionKey: 'aggro', enemyFactionKey: 'control' }, makeAllowlist());

  assert.equal(fallbackUsed, false);
  assert.deepEqual(candidates.map((entry) => entry.selectionKey), [
    'aggro::aggro_02',
    'aggro::aggro_09',
    'control::control_02',
    'control::control_05',
  ]);
});

test('tutorial remains isolated to the tutorial pool', () => {
  const allowlist = makeAllowlist({
    generic: [{ factionId: 'transition', artAssetId: 'transition_01', cardId: 'transition_01' }],
  });

  const { candidates, requestedPoolKeys } = resolveBattleTransitionCandidates({ factionKey: 'aggro', enemyFactionKey: 'control', battleContext: { mode: 'tutorial' } }, allowlist);

  assert.deepEqual(requestedPoolKeys, ['tutorial']);
  assert.deepEqual(candidates.map((entry) => entry.selectionKey), ['tutorial::ally_01', 'tutorial::ally_03']);
});

test('combined pool deduplicates by faction id and art asset id', () => {
  const allowlist = makeAllowlist({
    control: [
      { factionId: 'aggro', artAssetId: 'aggro_02', cardId: 'duplicate_of_player' },
      { artAssetId: 'control_05', cardId: 'control_drone_1' },
    ],
    generic: [
      { factionId: 'transition', artAssetId: 'transition_01', cardId: 'transition_01' },
      { factionId: 'transition', artAssetId: 'transition_01', cardId: 'transition_01_duplicate' },
    ],
  });

  const { candidates } = resolveBattleTransitionCandidates({ factionKey: 'aggro', enemyFactionKey: 'control' }, allowlist);

  assert.deepEqual(candidates.map((entry) => entry.selectionKey), [
    'aggro::aggro_02',
    'aggro::aggro_09',
    'control::control_05',
    'transition::transition_01',
  ]);
});

test('immediate repeat avoidance applies to the final combined pool', () => {
  const previousSelections = new Map();
  const payload = { factionKey: 'aggro', enemyFactionKey: 'control' };
  const first = select(payload, 0, makeAllowlist(), previousSelections);
  const second = select(payload, 0, makeAllowlist(), previousSelections);

  assert.equal(first.selectionKey, 'aggro::aggro_02');
  assert.equal(second.selectionKey, 'aggro::aggro_09');
});

test('unknown factions fall back to all valid production transition entries without Aggro-only dependency', () => {
  const allowlist = makeAllowlist({ aggro: [], control: [], tank: [{ artAssetId: 'tank_01', cardId: 'tank_shieldbearer_1' }] });

  const selected = select({ factionKey: 'missing-player', enemyFactionKey: 'missing-enemy' }, 0, allowlist);

  assert.equal(selected.fallbackUsed, true);
  assert.equal(selected.selectionKey, 'tank::tank_01');
});

test('retry payload preserves both player and enemy faction identities', () => {
  const { candidates } = resolveBattleTransitionCandidates({ factionKey: 'aggro', enemyFactionKey: 'control', battleContext: { mode: 'arena' } }, makeAllowlist());

  assert.ok(candidates.some((entry) => entry.selectionKey === 'aggro::aggro_02'));
  assert.ok(candidates.some((entry) => entry.selectionKey === 'control::control_02'));
});
