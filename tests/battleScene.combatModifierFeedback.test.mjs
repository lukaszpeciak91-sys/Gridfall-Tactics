import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/scenes/BattleScene.js', 'utf8');

test('combat modifier metadata produces grouped floating feedback at attacker or target slots', () => {
  assert.match(source, /getCombatModifierFeedbackItems\(event\) \{[\s\S]*event\.combatModifiers[\s\S]*modifier\?\.feedback === 'target' \? targetIndex : attackerIndex[\s\S]*label: modifier\.label[\s\S]*\}/);
  assert.match(source, /playCombatModifierFeedback\(event\) \{[\s\S]*getCombatModifierFeedbackItems\(event\)[\s\S]*showUnitFloatingText\([\s\S]*group\.labels\.join\('\\n'\)/);
  assert.match(source, /const modifierFeedback = this\.playCombatModifierFeedback\(event\);[\s\S]*if \(modifierFeedback\) animations\.push\(modifierFeedback\);/);
});

test('Hacker, Signal Jam, and Temper Shift action-time debuff feedback remains in action delta feedback', () => {
  assert.match(source, /const debuffEffects = new Set\(\['enemy_lane_atk_minus_1', 'enemy_up_to_2_atk_minus_1', 'lane_tempo_mod_until_combat'\]\);/);
  assert.match(source, /feedback\.push\(\{ type: 'slot-text', index, label: `\$\{attackDelta\} ATK`, kind: 'debuff', phase: 'pre', order: 10 \}\);/);
});

test('Party Host combat-death ATK feedback keeps recorded fallback payloads but skips them for ordered events', () => {
  assert.match(source, /recordedRotcallerFeedback = Array\.isArray\(this\.gameState\?\.rotcallerCombatFeedbackEvents\)/);
  assert.match(source, /source === 'rotcaller_adjacent_death_atk_1'[\s\S]*label: event\.label \?\? '\+1 ATK'[\s\S]*kind: event\.kind \?\? 'buff'/);
  assert.match(source, /hasOrderedDeathTriggerEvents[\s\S]*const beforeRefresh = hasOrderedDeathTriggerEvents \? \[\] : \[\.\.\.recordedRotcallerFeedback\];/);
});


test('Guardian intercept feedback pulses intended ally before Guardian damage feedback', () => {
  assert.match(source, /getCombatEventInterceptOriginalTargetIndex/);
  assert.match(source, /const targetIndex = getCombatEventInterceptOriginalTargetIndex\(event\) \?\? this\.getCombatEventTargetIndex\(event\);/);
  assert.match(source, /playCombatEventFeedback\(events\) \{[\s\S]*events\.map\(async \(event\) => \{[\s\S]*await this\.playGuardianInterceptCue\(event\);[\s\S]*this\.showUnitCombatText\(target, event\)/);
  assert.match(source, /playGuardianInterceptCue\(event\) \{[\s\S]*await this\.showGuardianInterceptThreatPulse\(originalTargetIndex\);[\s\S]*await this\.showGuardianInterceptReactionPulse\(guardianIndex\);/);
});
