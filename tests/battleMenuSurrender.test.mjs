import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const battleMenuSource = readFileSync(new URL('../src/scenes/BattleMenuScene.js', import.meta.url), 'utf8');

test('BattleScene utility menu exposes guarded surrender confirmation and resolves as enemy win', () => {
  assert.match(battleSource, /translateActive\('ui\.battle\.utilityMenuSurrender', 'Surrender'\), \(\) => this\.showBattleMenuSurrenderConfirmation\(\)\)/);
  assert.match(battleSource, /canPlayerMenuSurrender\(\) \{[\s\S]*!this\.gameState\.winner[\s\S]*!this\.battleResultModalShown[\s\S]*!this\.openingMulliganPending[\s\S]*!this\.isFlowResolving[\s\S]*!this\.isEffectCastResolving[\s\S]*!this\.effectCastState[\s\S]*!this\.battleMenuSurrenderModal/);
  assert.match(battleSource, /showBattleMenuSurrenderConfirmation\(\) \{[\s\S]*translateActive\('ui\.battle\.surrenderConfirmTitle', 'SURRENDER\?'\)[\s\S]*translateActive\('ui\.battle\.surrenderConfirmBody', 'This counts as a defeat\.'\)[\s\S]*translateActive\('ui\.common\.cancel', 'Cancel'\)[\s\S]*translateActive\('ui\.battle\.surrenderConfirmButton', 'Surrender'\)/);
  assert.match(battleSource, /resolvePlayerMenuSurrender\(\) \{[\s\S]*this\.gameState\.winner = 'enemy';[\s\S]*this\.gameState\.endingReason = 'player_menu_surrender';[\s\S]*this\.completeBattleFlow\(0\);/);
});

test('separate BattleMenuScene surrender resumes the existing battle and uses normal surrender resolver', () => {
  assert.match(battleMenuSource, /translateActive\('ui\.battleMenu\.surrender', 'SURRENDER'\)/);
  assert.match(battleMenuSource, /showSurrenderConfirmation\(returnScene, returnSceneKey\)/);
  assert.match(battleMenuSource, /returnScene\?\.resumeFromBattleMenu[\s\S]*returnScene\?\.resolvePlayerMenuSurrender\?\.\(\)/);
});

test('surrender defeat flavor uses the normal defeat result subtitle path', () => {
  assert.match(battleSource, /if \(this\.gameState\.winner === 'enemy'\) \{[\s\S]*this\.gameState\.endingReason === 'player_menu_surrender'[\s\S]*translateActive\('ui\.battle\.resultSubtitles\.surrenderDefeat'/);
});
