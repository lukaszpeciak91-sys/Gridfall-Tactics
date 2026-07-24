import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const en = JSON.parse(fs.readFileSync('src/localization/translations/en.json', 'utf8'));
const pl = JSON.parse(fs.readFileSync('src/localization/translations/pl.json', 'utf8'));

function methodBlock(name, nextName) {
  const starts = [`\n  ${name}(`, `\n  async ${name}(`];
  const start = starts.map((needle) => source.indexOf(needle)).find((index) => index >= 0) ?? -1;
  const ends = [`\n  ${nextName}(`, `\n  async ${nextName}(`];
  const end = ends.map((needle) => source.indexOf(needle, start + 1)).find((index) => index >= 0) ?? -1;
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

test('opening banner remains one-shot, localized, and awaited before the first action', () => {
  const opening = methodBlock('showOpeningTurnStartBanner', 'scheduleTurnStartBannerFailSafe');
  const mulligan = methodBlock('confirmOpeningMulligan', 'resetOpeningMulliganInputState');

  assert.match(opening, /this\.hasShownOpeningTurnStartBanner \|\| !this\.layout \|\| !this\.gameState/);
  assert.match(opening, /this\.hasShownOpeningTurnStartBanner = true;/);
  assert.match(opening, /getOpeningTurnStartBannerConfig\(\)/);
  assert.match(source, /translateActive\('ui\.battle\.playerStarts', 'YOU START'\)/);
  assert.match(source, /translateActive\('ui\.battle\.enemyStarts', 'ENEMY STARTS'\)/);
  assert.match(mulligan, /await this\.showOpeningTurnStartBanner\(\);\s*this\.startCampaignBattleTimer\(\);\s*this\.skipNextActionTurnBanner = true;\s*await this\.startTurn\(\);/);
});

test('recurring action banners are separate from opening guard and use explicit actionable side', () => {
  const actionBanner = methodBlock('showActionTurnBanner', 'gateActionOpportunity');
  const gate = methodBlock('gateActionOpportunity', 'getActionTurnHandoffDiagnostics');

  assert.match(actionBanner, /async showActionTurnBanner\(side, transitionId = this\.actionTurnBannerTransitionId\)/);
  assert.match(actionBanner, /side !== 'player' && side !== 'enemy'/);
  assert.match(actionBanner, /getActionTurnBannerConfig\(side\)/);
  assert.doesNotMatch(actionBanner, /hasShownOpeningTurnStartBanner/);
  assert.match(gate, /const transitionId = \+\+this\.actionTurnBannerTransitionId;/);
  assert.match(gate, /this\.isActionTurnBannerResolving = true;\s*this\.updatePlayerBaseActionState\(\);\s*const completed = await this\.showActionTurnBanner\(side, transitionId\);/);
  assert.match(gate, /this\.isActionTurnBannerResolving = false;/);
});

test('player input is blocked during action-turn banner and enabled only after validation', () => {
  const actionable = methodBlock('getCurrentActionableSide', 'updatePlayerBaseActionState');
  const gate = methodBlock('gateActionOpportunity', 'getActionTurnHandoffDiagnostics');

  assert.match(actionable, /if \(!ignoreActionTurnBannerGate && this\.isActionTurnBannerResolving\) return null;/);
  assert.match(gate, /this\.updatePlayerBaseActionState\(\);[\s\S]*const completed = await this\.showActionTurnBanner/);
  assert.match(gate, /if \(!completed \|\| !this\.isActionTurnTransitionValid\(side, transitionId\)\) \{\s*this\.updatePlayerBaseActionState\(\);\s*return false;/);
  assert.match(gate, /this\.updateInitiativeIndicator\(\);\s*this\.updatePlayerBaseActionState\(\);/);
});

test('AI execution is gated by ENEMY TURN before the existing AI delay and reveal path', () => {
  const finish = methodBlock('finishTurnAfterBothActions', 'updateActionableSideVisualState');
  const enemyOpening = methodBlock('resolveEnemyFirstTurnOpening', 'finishTurnAfterBothActions');
  const startTurn = methodBlock('startTurn', 'evaluateAndShowPlayerConcedableInfoBanner');

  assert.match(startTurn, /const ready = await this\.gateActionOpportunity\(side, \{ showBanner: !skipActionBanner \}\);/);
  assert.match(startTurn, /if \(side === 'enemy'\) \{\s*await this\.resolveEnemyFirstTurnOpening\(\);/);
  assert.match(finish, /let ready = await this\.gateActionOpportunity\(side\);[\s\S]*recoverRejectedEnemyActionHandoff[\s\S]*if \(!ready \|\| side !== 'enemy' \|\| !this\.canExecuteEnemyActionHandoff\(\)\) return;\s*this\.isFlowResolving = true;[\s\S]*await this\.delay\(650\);\s*if \(!this\.canContinueEnemyActionExecution\(\)\) return;\s*enemyActionPacing = await this\.revealAndApplyEnemyAction\(\);/);
  assert.match(enemyOpening, /await this\.revealAndApplyEnemyAction\(\);[\s\S]*const side = this\.getCurrentActionableSide\(\{ ignoreActionTurnBannerGate: true \}\);\s*await this\.gateActionOpportunity\(side\);/);
});


test('rejected enemy handoff is diagnostically recovered with bounded retry and duplicate AI guard', () => {
  const finish = methodBlock('finishTurnAfterBothActions', 'updateActionableSideVisualState');
  const recover = methodBlock('recoverRejectedEnemyActionHandoff', 'startTurn');
  const diagnostics = methodBlock('getActionTurnHandoffDiagnostics', 'recordActionTurnHandoffDiagnostic');

  assert.match(finish, /if \(this\.enemyActionHandoffInProgress\) return;/);
  assert.match(finish, /this\.enemyActionHandoffInProgress = true;[\s\S]*finally \{\s*this\.enemyActionHandoffInProgress = false;/);
  assert.match(finish, /shouldRecoverRejectedEnemyActionHandoff\(side\)/);
  assert.match(recover, /const maxRetries = 2;/);
  assert.match(recover, /await this\.delay\(50\);/);
  assert.match(recover, /const side = this\.getCurrentActionableSide\(\{ ignoreActionTurnBannerGate: true \}\);\s*if \(side !== 'enemy'\)/);
  assert.match(recover, /const ready = await this\.gateActionOpportunity\('enemy'\);/);
  assert.match(recover, /action-turn-gate-rejected-after-player-action/);
  assert.match(recover, /action-turn-gate-recovery-succeeded/);
  assert.match(recover, /action-turn-gate-recovery-exhausted/);
  assert.match(diagnostics, /requestedSide[\s\S]*playerActionUsed[\s\S]*enemyActionUsed[\s\S]*actionTurnBannerTransitionId[\s\S]*isActionTurnBannerResolving[\s\S]*currentActionableSide[\s\S]*actionableSideIgnoringBannerGate[\s\S]*retryCount[\s\S]*aiSchedulingAlreadyPending[\s\S]*battleActive[\s\S]*winner[\s\S]*rejectionSource/);
});

test('post-combat initiative flip uses startTurn gate and does not alter firstActor semantics', () => {
  const finish = methodBlock('finishTurnAfterBothActions', 'updateActionableSideVisualState');

  assert.match(finish, /toggleFirstActor\(this\.gameState\);\s*this\.isFlowResolving = false;\s*this\.updateTutorialBanner\?\.\(\);\s*await this\.startTurn\(\);/);
  assert.doesNotMatch(source, /function toggleFirstActor|export function toggleFirstActor/);
});

test('battle-ending guards precede next action banners', () => {
  const finish = methodBlock('finishTurnAfterBothActions', 'updateActionableSideVisualState');
  const beforeToggle = finish.slice(0, finish.indexOf('toggleFirstActor(this.gameState);'));

  assert.match(beforeToggle, /if \(this\.gameState\.winner\) \{\s*this\.completeBattleFlow\(500\);\s*return;/);
  assert.match(beforeToggle, /resolveTurnCapWinner\(this\.gameState, this\.gameState\.turnsCompleted\);/);
  assert.match(beforeToggle, /if \(this\.gameState\.winner\) \{\s*this\.completeBattleFlow\(500\);\s*return;/);
});

test('deferred transient coordinator no longer fire-and-forgets turn-start action banners', () => {
  const flush = methodBlock('flushDeferredTransientBattleBanner', 'prepareTransientBattleBanner');

  assert.doesNotMatch(flush, /showOpeningTurnStartBanner\(\)/);
  assert.doesNotMatch(flush, /showActionTurnBanner\(/);
});

test('EN and PL recurring action banner localization keys exist', () => {
  assert.equal(en.ui.battle.yourTurn, 'YOUR TURN');
  assert.equal(en.ui.battle.enemyTurn, 'ENEMY TURN');
  assert.equal(pl.ui.battle.yourTurn, 'TWÓJ RUCH');
  assert.equal(pl.ui.battle.enemyTurn, 'RUCH WROGA');
  assert.equal(en.ui.battle.playerStarts, 'YOU START');
  assert.equal(en.ui.battle.enemyStarts, 'ENEMY STARTS');
});
