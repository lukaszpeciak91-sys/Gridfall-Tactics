import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const actionFeedbackBlock = source.slice(
  source.indexOf('  getProtectionArmedFeedbackLabel('),
  source.indexOf('  getCombatDeathFeedback(', source.indexOf('  buildActionFeedback(')),
);

test('protection effects build localized armed feedback for current allied units only', () => {
  assert.match(actionFeedbackBlock, /case 'immune_move_disable_this_turn':[\s\S]*translateActive\('ui\.battle\.protectionFeedback\.stability'/);
  assert.match(actionFeedbackBlock, /case 'cannot_drop_below_1_this_turn':[\s\S]*translateActive\('ui\.battle\.protectionFeedback\.lastStand'/);
  assert.match(actionFeedbackBlock, /case 'friendly_immovable_this_turn':[\s\S]*translateActive\('ui\.battle\.protectionFeedback\.immovable'/);
  assert.match(actionFeedbackBlock, /\.filter\(\(\{ unit \}\) => unit\?\.owner === owner\)/);
});

test('protection armed feedback is pre-refresh, brief, and board-wide rather than a long queue', () => {
  assert.match(actionFeedbackBlock, /type: 'slot-text',[\s\S]*kind: 'prevention',[\s\S]*phase: 'pre'/);
  assert.match(actionFeedbackBlock, /staggerMs: order === 0 \? 0 : 25/);
  assert.match(actionFeedbackBlock, /feedback\.push\(\.\.\.this\.buildProtectionArmedFeedback\(beforeSnapshot, effectId, owner\)\);[\s\S]*feedback\.push\(\.\.\.this\.buildEffectDeltaFeedback/);
});

test('empty allied board safely produces no protection armed slot feedback', () => {
  assert.match(actionFeedbackBlock, /return beforeSnapshot[\s\S]*\.map\(\(unit, index\) => \(\{ unit, index \}\)\)[\s\S]*\.filter\(\(\{ unit \}\) => unit\?\.owner === owner\)[\s\S]*\.map/);
});

test('existing blocked-effect and triggered Last Stand feedback paths remain separate', () => {
  assert.match(source, /showMovementBlockedFeedback\(index, label = 'BLOCKED'\)/);
  assert.match(source, /return this\.showMovementBlockedFeedback\(event\.index, event\.label\)/);
  assert.match(source, /showLastStandPreventionFeedback\(index, prevention = \{\}\)/);
  assert.match(source, /translateActive\('ui\.battle\.protectionFeedback\.lastStand'/);
  assert.match(source, /showFloatingTextAtSlot\(index, `LAST STAND\\n\$\{finalHp\} HP`, 'prevention'\)/);
});

test('numeric-only buffs do not use the protection armed family', () => {
  assert.doesNotMatch(actionFeedbackBlock, /case 'buff_all_atk_1'|case 'buff_all_armor_1'|case 'temp_armor_1'|case 'adjacent_allies_temp_armor_1'/);
});

test('protection armed feedback labels are localized in English and Polish', () => {
  assert.equal(en.ui.battle.protectionFeedback.stability, 'STABLE');
  assert.equal(en.ui.battle.protectionFeedback.lastStand, 'LAST STAND');
  assert.equal(en.ui.battle.protectionFeedback.immovable, 'IMMOVABLE');
  assert.equal(pl.ui.battle.protectionFeedback.stability, 'STABILNOŚĆ');
  assert.equal(pl.ui.battle.protectionFeedback.lastStand, 'OSTATNI BASTION');
  assert.equal(pl.ui.battle.protectionFeedback.immovable, 'NIEWZRUSZONY');
});

test('BattleScene does not hardcode localized protection label strings', () => {
  const helperBlock = source.slice(
    source.indexOf('  getProtectionArmedFeedbackLabel('),
    source.indexOf('  buildProtectionArmedFeedback(', source.indexOf('  getProtectionArmedFeedbackLabel(')),
  );
  assert.doesNotMatch(helperBlock, /STABLE|LAST STAND|IMMOVABLE|STABILNOŚĆ|OSTATNI BASTION|NIEWZRUSZONY/);
});
