import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import control from '../src/data/factions/control.json' with { type: 'json' };
import { createInitialBattleState, resolveTargetedUnitOnPlayEffect } from '../src/systems/GameState.js';
import { isRotesAugeOnDeployBeamPresentation } from '../src/systems/combatAnimation.js';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const sniper = control.deck.find((card) => card.id === 'control_sniper_1');
const unit = (owner, id, hp) => ({ id, cardId: id, type: 'unit', owner, attack: 1, hp, maxHp: hp, armor: 0 });

function resolveShot(owner, sourceIndex, targetIndex, hp) {
  const targetOwner = owner === 'player' ? 'enemy' : 'player';
  const state = createInitialBattleState(control, control);
  state.board[sourceIndex] = { ...sniper, cardId: sniper.id, owner };
  state.board[targetIndex] = unit(targetOwner, `target-${targetIndex}`, hp);
  const result = resolveTargetedUnitOnPlayEffect(state, owner, sourceIndex, [targetIndex]);
  return { state, result, event: result.combatEvents[0] };
}

test('nonlethal deploy shot preserves exact endpoints and qualifies for the shared beam for either owner', () => {
  for (const probe of [resolveShot('player', 7, 1, 4), resolveShot('enemy', 2, 8, 4)]) {
    assert.equal(probe.event.attackerIndex, probe.result.targetedEffect.sourceBoardIndex);
    assert.equal(probe.event.targetIndex, probe.result.targetedEffect.targetIndex);
    assert.equal(probe.result.targetedEffect.damageDealt, 2);
    assert.equal(probe.state.board[probe.event.targetIndex].hp, 2);
    assert.equal(isRotesAugeOnDeployBeamPresentation(probe.event, probe.result.combatSnapshot.board), true);
  }
});

test('lethal deploy shot retains its pre-resolution target endpoint for beam-before-death presentation', () => {
  const { state, result, event } = resolveShot('player', 6, 0, 2);
  assert.equal(state.board[0], null);
  assert.equal(result.combatSnapshot.board[0].cardId, 'target-0');
  assert.equal(isRotesAugeOnDeployBeamPresentation(event, result.combatSnapshot.board), true);

  const immediateFeedbackBody = battleSource.slice(
    battleSource.indexOf('async playImmediateCombatFeedback('),
    battleSource.indexOf('async playImmediateCombatCreationFeedback('),
  );
  assert.ok(immediateFeedbackBody.indexOf('await this.animateBeamAttack(') < immediateFeedbackBody.indexOf('this.createCombatDeathOverlays('));
  assert.ok(immediateFeedbackBody.indexOf('this.createCombatDeathOverlays(') < immediateFeedbackBody.indexOf('await this.playCombatDeathOverlays('));
});

test('only the resolved Rotes Auge deploy damage route gains immediate beam presentation', () => {
  const { result, event } = resolveShot('enemy', 0, 6, 3);
  assert.equal(isRotesAugeOnDeployBeamPresentation({ ...event, effectId: 'swap_two_enemy_units' }, result.combatSnapshot.board), false);
  assert.equal(isRotesAugeOnDeployBeamPresentation({ ...event, targetIndex: 7 }, result.combatSnapshot.board), false);
  const otherSource = structuredClone(result.combatSnapshot.board);
  otherSource[0].cardId = 'unrelated-unit';
  assert.equal(isRotesAugeOnDeployBeamPresentation(event, otherSource), false);
  assert.match(battleSource, /if \(onDeployBeamEvent\) \{[\s\S]*?await this\.animateBeamAttack\([\s\S]*?\} else \{\s*await this\.playCombatAnimations/);
  assert.equal((battleSource.match(/createBeamAttackCue\(/g) ?? []).length, 2);
});
