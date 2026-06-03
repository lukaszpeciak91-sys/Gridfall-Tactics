import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/scenes/BattleScene.js', 'utf8');

test('Warden friction combat metadata produces attacker-side -1 ATK floating feedback', () => {
  assert.match(source, /getWardenFrictionCombatModifier\(event\) \{[\s\S]*source === 'warden_defensive_friction'[\s\S]*modifier\.type === 'attack-reduction'[\s\S]*modifier\.amount < 0[\s\S]*\}/);
  assert.match(source, /playCombatModifierFeedback\(event\) \{[\s\S]*getCombatEventAttackerIndex\(event\)[\s\S]*showUnitFloatingText\(attackerCell, wardenFriction\.label \?\? `\$\{wardenFriction\.amount\} ATK`, '#fb923c'\)/);
  assert.match(source, /const modifierFeedback = this\.playCombatModifierFeedback\(event\);[\s\S]*if \(modifierFeedback\) animations\.push\(modifierFeedback\);/);
});

test('Hacker and Signal Jam action-time debuff feedback remains in action delta feedback', () => {
  assert.match(source, /const debuffEffects = new Set\(\['enemy_lane_atk_minus_1', 'enemy_up_to_2_atk_minus_1'\]\);/);
  assert.match(source, /feedback\.push\(\{ type: 'slot-text', index, label: `\$\{attackDelta\} ATK`, kind: 'debuff', phase: 'pre', order: 10 \}\);/);
});
