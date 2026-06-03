import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/scenes/BattleScene.js', 'utf8');

test('combat modifier metadata produces grouped floating feedback at attacker or target slots', () => {
  assert.match(source, /getCombatModifierFeedbackItems\(event\) \{[\s\S]*event\.combatModifiers[\s\S]*modifier\?\.feedback === 'target' \? targetIndex : attackerIndex[\s\S]*label: modifier\.label[\s\S]*\}/);
  assert.match(source, /playCombatModifierFeedback\(event\) \{[\s\S]*getCombatModifierFeedbackItems\(event\)[\s\S]*showUnitFloatingText\([\s\S]*group\.labels\.join\('\\n'\)/);
  assert.match(source, /const modifierFeedback = this\.playCombatModifierFeedback\(event\);[\s\S]*if \(modifierFeedback\) animations\.push\(modifierFeedback\);/);
});

test('Hacker and Signal Jam action-time debuff feedback remains in action delta feedback', () => {
  assert.match(source, /const debuffEffects = new Set\(\['enemy_lane_atk_minus_1', 'enemy_up_to_2_atk_minus_1'\]\);/);
  assert.match(source, /feedback\.push\(\{ type: 'slot-text', index, label: `\$\{attackDelta\} ATK`, kind: 'debuff', phase: 'pre', order: 10 \}\);/);
});
