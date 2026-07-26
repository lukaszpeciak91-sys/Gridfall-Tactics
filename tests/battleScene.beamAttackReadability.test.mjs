import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import controlFaction from '../src/data/factions/control.json' with { type: 'json' };
import { createInitialBattleState, resolveCombat } from '../src/systems/GameState.js';
import { COMBAT_ATTACK_PRESENTATIONS, getCombatAttackPresentation } from '../src/systems/combatAnimation.js';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const beamCard = controlFaction.deck.find((card) => card.attackPresentation === COMBAT_ATTACK_PRESENTATIONS.beam);

const unit = (owner, overrides = {}) => ({
  id: `${owner}-target`,
  cardId: `${owner}-target`,
  type: 'unit',
  attack: 1,
  hp: 3,
  maxHp: 3,
  armor: 0,
  effectId: null,
  owner,
  ...overrides,
});

function runFullBoardProbe({ owner, attackerIndex, targetIndex, target = {} }) {
  const state = createInitialBattleState({ name: 'Beam presentation probe', deck: [] });
  const opponent = owner === 'player' ? 'enemy' : 'player';
  const opponentIndexes = opponent === 'player' ? [6, 7, 8] : [0, 1, 2];
  const friendlyIndexes = owner === 'player' ? [6, 7, 8] : [0, 1, 2];

  opponentIndexes.forEach((index) => { state.board[index] = unit(opponent, { id: `${opponent}-${index}`, cardId: `${opponent}-${index}`, hp: 5, maxHp: 5 }); });
  friendlyIndexes.forEach((index) => { state.board[index] = unit(owner, { id: `${owner}-${index}`, cardId: `${owner}-${index}` }); });
  state.board[attackerIndex] = { ...beamCard, cardId: beamCard.id, owner, maxHp: beamCard.hp };
  state.board[targetIndex] = unit(opponent, target);

  const snapshot = state.board.map((entry) => (entry ? { ...entry } : null));
  const events = resolveCombat(state);
  const beamEvent = events.find((event) => event.attackerIndex === attackerIndex);
  return { state, snapshot, events, beamEvent };
}

test('full-board beam presentation follows ordinary opposing-lane routing for both owners', () => {
  const player = runFullBoardProbe({ owner: 'player', attackerIndex: 6, targetIndex: 0, target: { hp: 1, maxHp: 1 } });
  const enemy = runFullBoardProbe({ owner: 'enemy', attackerIndex: 0, targetIndex: 6, target: { armor: 1 } });

  assert.equal(player.beamEvent.targetIndex, 0);
  assert.equal(player.beamEvent.lethal, true);
  assert.equal(player.state.board[0], null);
  assert.equal(getCombatAttackPresentation(player.beamEvent, player.snapshot), COMBAT_ATTACK_PRESENTATIONS.beam);

  assert.equal(enemy.beamEvent.targetIndex, 6);
  assert.equal(enemy.beamEvent.damage, 1);
  assert.equal(enemy.state.board[6].hp, 2);
  assert.equal(getCombatAttackPresentation(enemy.beamEvent, enemy.snapshot), COMBAT_ATTACK_PRESENTATIONS.beam);
});

test('beam cue is awaited through impact, hold, and fade before lane sequencing continues', () => {
  assert.match(battleSource, /await cue\.flashAttacker\(\);\s*await cue\.revealBeam\(\);[\s\S]*?await this\.playCombatEventFeedback\(\[event\]\);\s*await this\.delay\(110\);\s*await cue\.fadeOut\(\);/);
  assert.match(battleSource, /flashAttacker:[\s\S]*duration: 80[\s\S]*revealBeam:[\s\S]*duration: 125[\s\S]*fadeOut:[\s\S]*duration: 75/);
  assert.match(battleSource, /await playStandardCombatLanePresentation\(combatEvents, \{\s*presentLane: \(lane, laneEvents\) => this\.playLaneCombatAnimation\(lane, laneEvents, preCombatBoardSnapshot\),\s*delay: \(duration\) => this\.delay\(duration\),\s*\}\);/);
  assert.match(battleSource, /finally \{\s*cue\.destroy\(\);\s*\}/);
});

test('same-lane defeat suppresses melee but preserves the frozen beam route', () => {
  assert.match(battleSource, /const suppressDefeatedAttackerPresentation = attackerWasDefeatedInThisLane && !preservePlannedNonMeleePresentation;/);
  assert.match(battleSource, /else if \(suppressDefeatedAttackerPresentation\)[\s\S]*fallbackReason: 'attacker-defeated-in-lane'[\s\S]*else if \(attackPresentation === COMBAT_ATTACK_PRESENTATIONS\.beam\)[\s\S]*animationHelper: 'animateBeamAttack'/);
  assert.match(battleSource, /else if \(attackPresentation === COMBAT_ATTACK_PRESENTATIONS\.beam\) \{\s*this\.recordCombatPresentationLifecycle\(event, 'beam-route-selected'\);\s*await this\.animateBeamAttack\(event, preCombatBoardSnapshot\);/);
});

test('beam endpoint failures retain feedback-only fallback', () => {
  assert.match(battleSource, /if \(!attacker \|\| !target\)[\s\S]*attackPresentation: 'feedback-only'[\s\S]*'attacker-view-unavailable'[\s\S]*'target-view-unavailable'/);
  assert.match(battleSource, /if \(!cue\)[\s\S]*attackPresentation: 'feedback-only'[\s\S]*fallbackReason: 'beam-cue-creation-failed'/);
});
