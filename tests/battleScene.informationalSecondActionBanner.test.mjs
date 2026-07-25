import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const en = JSON.parse(readFileSync(new URL('../src/localization/translations/en.json', import.meta.url), 'utf8'));
const pl = JSON.parse(readFileSync(new URL('../src/localization/translations/pl.json', import.meta.url), 'utf8'));

function methodBody(name, nextName) {
  let start = source.indexOf(`  ${name}(`);
  if (start === -1) start = source.indexOf(`  async ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  let end = nextName ? source.indexOf(`  ${nextName}(`, start + 1) : source.indexOf('\n  }\n\n', start + 1) + 5;
  if (nextName && end === -1) end = source.indexOf(`  async ${nextName}(`, start + 1);
  assert.notEqual(end, -1, `${name} should have an end boundary`);
  return source.slice(start, end);
}

test('opening turn banner labels are preserved and recurring duplicates use separate labels', () => {
  assert.equal(en.ui.battle.playerStarts, 'YOU START');
  assert.equal(en.ui.battle.enemyStarts, 'ENEMY STARTS');
  assert.equal(pl.ui.battle.playerStarts, 'Ty zaczynasz');
  assert.equal(pl.ui.battle.enemyStarts, 'Wróg zaczyna');
  assert.equal(en.ui.battle.yourTurn, 'YOUR TURN');
  assert.equal(en.ui.battle.enemyTurn, 'ENEMY TURN');
  assert.equal(pl.ui.battle.yourTurn, 'TWÓJ RUCH');
  assert.equal(pl.ui.battle.enemyTurn, 'RUCH WROGA');

  const openingConfig = methodBody('getOpeningTurnStartBannerConfig', 'playBattleStartPresentationSfx');
  assert.match(openingConfig, /enemyStarts', 'ENEMY STARTS'/);
  assert.match(openingConfig, /playerStarts', 'YOU START'/);
  assert.doesNotMatch(openingConfig, /yourTurn|enemyTurn|YOUR TURN|ENEMY TURN/);
});

test('player-first accepted action or PASS fires enemy turn banner without awaiting it', () => {
  const completePlayerAction = methodBody('completePlayerAction', 'resolveEnemyFirstTurnOpening');
  assert.match(completePlayerAction, /this\.playerActionUsed = true;/);
  assert.match(completePlayerAction, /await this\.playImmediateCombatFeedback\(immediateCombatFeedback\);[\s\S]*await this\.playImmediateCombatCreationFeedback\(immediateCombatFeedback\);[\s\S]*this\.showSecondActionBannerAfterPlayerAction\(\);/);
  assert.match(completePlayerAction, /this\.showSecondActionBannerAfterPlayerAction\(\);\s*this\.isFlowResolving = false;\s*this\.finishTurnAfterBothActions\(\);/);
  assert.doesNotMatch(completePlayerAction, /await this\.showSecondActionBannerAfterPlayerAction|await this\.showInformationalActionBanner/);

  const playerHandoff = methodBody('showSecondActionBannerAfterPlayerAction', 'showSecondActionBannerAfterEnemyAction');
  assert.match(playerHandoff, /this\.gameState\?\.firstActor !== 'player'/);
  assert.match(playerHandoff, /!this\.playerActionUsed \|\| this\.enemyActionUsed/);
  assert.match(playerHandoff, /this\.showInformationalActionBanner\('enemy'\)/);

  const pass = methodBody('resolvePassTurn', 'getOpeningTurnStartBannerConfig');
  assert.match(pass, /recordPassAction\(this\.gameState, 'player'\);[\s\S]*this\.completePlayerAction\(\);/);
});

test('enemy-first accepted action or PASS fires your turn banner after existing action presentation boundary', () => {
  const enemyOpening = methodBody('resolveEnemyFirstTurnOpening', 'finishTurnAfterBothActions');
  assert.match(enemyOpening, /await this\.revealAndApplyEnemyAction\(\);[\s\S]*this\.showSecondActionBannerAfterEnemyAction\(\);\s*this\.isFlowResolving = false;/);
  assert.doesNotMatch(enemyOpening, /await this\.showSecondActionBannerAfterEnemyAction|await this\.showInformationalActionBanner/);

  const enemyHandoff = methodBody('showSecondActionBannerAfterEnemyAction', 'showInformationalActionBanner');
  assert.match(enemyHandoff, /this\.gameState\?\.firstActor !== 'enemy'/);
  assert.match(enemyHandoff, /!this\.enemyActionUsed \|\| this\.playerActionUsed/);
  assert.match(enemyHandoff, /this\.showInformationalActionBanner\('player'\)/);

  const enemyAction = methodBody('revealAndApplyEnemyAction', 'getNextTutorialEnemyAction');
  assert.match(enemyAction, /this\.enemyActionUsed = true;/);
  const enemyTake = methodBody('enemyTakeAction', 'delay');
  assert.match(enemyTake, /recordPassAction\(this\.gameState, 'enemy'\);/);
  assert.match(enemyAction, /await this\.playImmediateCombatFeedback\(immediateCombatFeedback\);[\s\S]*await this\.playImmediateCombatCreationFeedback\(immediateCombatFeedback\);/);
});

test('informational action banner is low-priority presentation only with automatic cleanup', () => {
  const helper = methodBody('showInformationalActionBanner', 'showPlayerActionBanner');
  assert.match(helper, /if \(side !== 'player' && side !== 'enemy'\) return null;/);
  assert.match(helper, /this\.time\.delayedCall\(\s*INFORMATIONAL_ACTION_BANNER_PRE_BEAT_MS,[\s\S]*this\.launchInformationalActionBanner\(side\)/);
  assert.match(helper, /prepareTransientBattleBanner\('informational-action'\)/);
  assert.match(helper, /this\.time\.delayedCall\(\s*PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS \+ PLAYER_EFFECT_CONFIRMATION_HOLD_MS/);
  assert.match(helper, /onComplete: \(\) => \{\s*if \(this\.informationalActionBanner === banner\) this\.destroyInformationalActionBanner\(\);/);
  assert.doesNotMatch(helper, /isFlowResolving\s*=|playerActionUsed\s*=|enemyActionUsed\s*=|firstActor|getCurrentActionableSide|transitionToken|retry|aiPending|pendingAi|revealAndApplyEnemyAction|resolveCombat|completeActionOpportunity/);

  const priority = methodBody('getBattleBannerPriority', 'getRenderedTransientBattleBannerOwner');
  assert.match(priority, /'informational-action': 0/);
  assert.match(priority, /'turn-start': 1/);
  assert.match(priority, /'player-action': 2/);
  assert.match(priority, /'enemy-action': 3/);
  assert.match(priority, /'invalid-action': 3/);
  assert.match(priority, /targeting: 5/);
});

test('AI second-action scheduling remains independent and uses fixed pacing that covers the banner', () => {
  const finish = methodBody('finishTurnAfterBothActions', 'updateActionableSideVisualState');
  assert.match(finish, /if \(!this\.enemyActionUsed\) \{\s*await this\.delay\(ENEMY_SECOND_ACTION_HANDOFF_DELAY_MS\);\s*enemyActionPacing = await this\.revealAndApplyEnemyAction\(\);/);
  assert.doesNotMatch(finish, /showInformationalActionBanner[\s\S]*revealAndApplyEnemyAction|destroyInformationalActionBanner[\s\S]*revealAndApplyEnemyAction/);
  assert.match(source, /const INFORMATIONAL_ACTION_BANNER_TOTAL_MS = PLAYER_EFFECT_CONFIRMATION_FADE_IN_MS \+ PLAYER_EFFECT_CONFIRMATION_HOLD_MS \+ PLAYER_EFFECT_CONFIRMATION_FADE_OUT_MS;/);
  assert.match(source, /const INFORMATIONAL_ACTION_BANNER_PRE_BEAT_MS = 120;/);
  assert.match(source, /const ENEMY_SECOND_ACTION_HANDOFF_DELAY_MS = INFORMATIONAL_ACTION_BANNER_PRE_BEAT_MS \+ INFORMATIONAL_ACTION_BANNER_TOTAL_MS;/);
});

test('combat, targeting, results, shutdown, and new turn clear informational banners', () => {
  const finish = methodBody('finishTurnAfterBothActions', 'updateActionableSideVisualState');
  assert.match(finish, /await this\.delay\(enemyActionPacing\?\.preCombatDelayMs \?\? ENEMY_ACTION_PRE_COMBAT_DELAY_MS\);\s*this\.destroyInformationalActionBanner\(\);\s*const preCombatFeedbackSnapshot/);

  const showActiveSelection = methodBody('showActiveSelectionMessage', 'showEnemyActionBanner');
  assert.match(showActiveSelection, /this\.destroyTransientBattleBanners\(\);/);

  const disableResult = methodBody('disableResultPendingOverlayInteractions', 'showBattleResultModal');
  assert.match(disableResult, /this\.destroyInformationalActionBanner\?\.\(\);/);

  const modal = methodBody('showBattleResultModal', 'captureAchievementPresentationResult');
  assert.match(modal, /this\.destroyInformationalActionBanner\(\);/);

  const destroyTransient = methodBody('destroyTransientBattleBanners', 'shouldSuppressTransientBattleBannerForTutorial');
  assert.match(destroyTransient, /this\.destroyInformationalActionBanner\(\);/);

  const destroyInformational = methodBody('destroyInformationalActionBanner', 'destroyPlayerActionBanner');
  assert.match(destroyInformational, /this\.informationalActionBannerLaunchEvent\.remove\(false\);\s*this\.informationalActionBannerLaunchEvent = null;/);

  const shutdown = methodBody('shutdown', 'onScenePointerUpOutside');
  assert.match(shutdown, /this\.resetRuntimeState\(\);/);
});

test('enemy result feedback clears only the low-priority enemy action banner before presentation', () => {
  const enemyAction = methodBody('revealAndApplyEnemyAction', 'getNextTutorialEnemyAction');
  assert.match(enemyAction, /const movementFeedback = this\.buildEnemyMovementFeedback[\s\S]*const actionFeedback = this\.buildActionFeedback[\s\S]*const immediateCombatFeedback = this\.getImmediateCombatFeedback/);
  assert.match(enemyAction, /if \(this\.enemyActionHasVisibleResultFeedback\([\s\S]*\)\) \{\s*this\.destroyEnemyActionBanner\(\);\s*\}\s*await this\.playMovementFeedback/);
  assert.doesNotMatch(enemyAction, /destroyActiveSelectionMessage|destroyTargetingInstruction/);

  const visibleResult = methodBody('enemyActionHasVisibleResultFeedback', 'getEnemyActionPacing');
  assert.match(visibleResult, /action\?\.type === 'pass' \|\| action\?\.type === 'surrender'/);
  assert.match(visibleResult, /movementFeedback\?\.length \|\| actionFeedback\?\.length \|\| immediateCombatFeedback/);
  assert.match(visibleResult, /action\?\.type === 'play-unit'/);
  assert.match(visibleResult, /unit\?\.id !== before\?\.id[\s\S]*unit\?\.attack !== before\?\.attack[\s\S]*unit\?\.armor !== before\?\.armor[\s\S]*unit\?\.health !== before\?\.health/);
});

test('no transition token, retry, AI pending state, action counter, initiative, or combat ownership is introduced', () => {
  const additions = [
    methodBody('showInformationalActionBanner', 'showPlayerActionBanner'),
    methodBody('showSecondActionBannerAfterPlayerAction', 'showSecondActionBannerAfterEnemyAction'),
    methodBody('showSecondActionBannerAfterEnemyAction', 'showInformationalActionBanner'),
  ].join('\n');
  assert.doesNotMatch(additions, /transition.*token|retry|ai.*pending|pending.*ai|firstActor\s*=|toggleFirstActor|resolveCombat|completeActionOpportunity|recordBattleActionUse|recordPassAction|isFlowResolving\s*=/i);
});
