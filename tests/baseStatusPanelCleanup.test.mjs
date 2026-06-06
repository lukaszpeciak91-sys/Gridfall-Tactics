import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const drawHeroPanels = source.slice(
  source.indexOf('  drawHeroPanels()'),
  source.indexOf('  drawBoard() {'),
);
const updateInitiativeIndicator = source.slice(
  source.indexOf('  updateInitiativeIndicator()'),
  source.indexOf('  refreshAfterPlayerAction()'),
);
const updatePlayerBaseActionState = source.slice(
  source.indexOf('  updatePlayerBaseActionState()'),
  source.indexOf('  toggleOpeningMulliganCard(cardId'),
);

test('normal base panels render centered HP without title labels or action-slot badges', () => {
  assert.doesNotMatch(drawHeroPanels, /ui\.battle\.(enemyHero|playerHero)/);
  assert.doesNotMatch(drawHeroPanels, /ENEMY HERO|PLAYER HERO/);
  assert.doesNotMatch(drawHeroPanels, /createActionSlotBadge|getActionSlotBadgeState|ui\.battle\.act(One|Two)|ACT 1\/2|ACT 2\/2/);
  assert.match(drawHeroPanels, /this\.enemyHpText = this\.add\.text\(enemyPanel\.x, enemyPanel\.y, ''/);
  assert.match(drawHeroPanels, /this\.playerHpText = this\.add\.text\(playerPanel\.x, playerPanel\.y, ''/);
  assert.match(source, /this\.enemyHpText\.setText\(`\$\{this\.gameState\.enemyHP\} \/ 12`\);/);
  assert.match(source, /this\.playerHpText\.setText\(`\$\{this\.gameState\.playerHP\} \/ 12`\);/);
});

test('initiative remains icon-only with subtle side-colored active panel highlight', () => {
  assert.match(drawHeroPanels, /this\.enemyInitiativeIcon = this\.add\.text\(enemyPanel\.x \+ panelWidth \* 0\.44, enemyPanel\.y, '▶'/);
  assert.match(drawHeroPanels, /this\.playerInitiativeIcon = this\.add\.text\(playerPanel\.x - panelWidth \* 0\.44, playerPanel\.y, '▶'/);
  assert.match(updateInitiativeIndicator, /const active = this\.getCurrentActionableSide\(\);/);
  assert.match(updateInitiativeIndicator, /this\.playerHeroPanel\.setStrokeStyle\(playerBaseActionStateActive \|\| playerActive \? 3 : 2, 0x60a5fa/);
  assert.match(updateInitiativeIndicator, /this\.enemyHeroPanel\.setStrokeStyle\(enemyActive \? 3 : 2, 0xf87171/);
  assert.match(updateInitiativeIndicator, /this\.playerInitiativeIcon\.setVisible\(playerActive && !this\.isPlayerBaseActionStateActive\(\)\)/);
  assert.match(updateInitiativeIndicator, /this\.enemyInitiativeIcon\.setVisible\(enemyActive\)/);
  assert.doesNotMatch(updateInitiativeIndicator, /turn label|TURN|AKCJA 1\/2|ACT 1\/2/);
});

test('mulligan base action remains on the player base and hides normal HP', () => {
  assert.match(source, /getOpeningMulliganActionLabel\(\) \{[\s\S]*ui\.battle\.mulligan[\s\S]*ui\.battle\.keepHand/);
  assert.match(source, /getPlayerBaseMode\(\) \{\s*if \(this\.openingMulliganPending\) return 'mulligan';\s*if \(this\.isBasePassAvailable\(\)\) return 'pass';\s*return null;\s*\}/);
  assert.match(source, /getPlayerBaseActionLabel\(\) \{[\s\S]*return this\.getOpeningMulliganActionLabel\(\);[\s\S]*translateActive\('ui\.common\.pass', 'PASS'\)/);
  assert.match(updatePlayerBaseActionState, /this\.playerBaseActionLabelText[\s\S]*\.setText\(actionLabel \?\? ''\)[\s\S]*\.setVisible\(actionStateActive\)/);
  assert.match(updatePlayerBaseActionState, /this\.playerHpText[\s\S]*\.setVisible\(!mulliganActionActive\)/);
  assert.match(source, /onPlayerBasePointerUp\(event\) \{\s*if \(this\.openingMulliganPending\) \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.cancelPassHoldToSurrender\(\);\s*this\.confirmOpeningMulligan\(\);\s*return;\s*\}[\s\S]*if \(!basePassAvailable\) return;[\s\S]*this\.resolvePassTurn\(\);\s*\}/);
});

test('base PASS uses existing pass path and gates PASS-only base action blockers', () => {
  assert.match(source, /hasBasePassBlocker\(\) \{[\s\S]*this\.selectedCardId[\s\S]*this\.targetingState[\s\S]*this\.boardInspectIndex !== null[\s\S]*this\.hoverInspectCardId[\s\S]*this\.selectedHandCardZoom[\s\S]*this\.pendingSwapIndex !== null[\s\S]*this\.deckInfoPanel[\s\S]*this\.utilityMenuPanel[\s\S]*this\.battleResultModalShown[\s\S]*this\.isFlowResolving[\s\S]*this\.isEffectCastResolving[\s\S]*this\.effectCastState[\s\S]*this\.openingMulliganPending/);
  assert.match(source, /getCurrentActionableSide\(\) \{[\s\S]*firstActor === 'player'[\s\S]*firstActor === 'enemy'[\s\S]*this\.enemyActionUsed && !this\.playerActionUsed[\s\S]*this\.playerActionUsed && !this\.enemyActionUsed/);
  assert.match(source, /isBasePassAvailable\(\) \{\s*return this\.getCurrentActionableSide\(\) === 'player'\s*&& !this\.playerActionUsed\s*&& !this\.hasBasePassBlocker\(\)\s*&& canPass\(this\.gameState\);\s*\}/);
  assert.match(source, /onPlayerBasePointerUp\(event\) \{[\s\S]*const basePassAvailable = this\.isBasePassAvailable\(\);[\s\S]*if \(!basePassAvailable\) return;[\s\S]*this\.resolvePassTurn\(\);\s*\}/);
});

test('old central action control is removed while base PASS and direct targeting remain source-owned', () => {
  assert.doesNotMatch(source, /drawActionZone|confirmTargetingSelection/);
  assert.equal(source.includes('action' + 'Button'), false);
  assert.match(source, /this\.passHoldToSurrenderEnabled = passActionActive && this\.canHoldPassToSurrender\(\);/);
  assert.match(source, /onPlayerBasePointerUp\(event\) \{[\s\S]*if \(!basePassAvailable\) return;[\s\S]*this\.resolvePassTurn\(\);\s*\}/);
  assert.match(source, /const canAutoCast = targetIndexes\.length >= minTargets && isExactTargetCount;/);
});


test('player base owns PASS hold-to-surrender timing and cancellation', () => {
  assert.match(source, /playerPanel\.on\('pointerdown'[\s\S]*this\.onPlayerBasePointerDown\(event\);/);
  assert.match(source, /playerPanel\.on\('pointerout'[\s\S]*this\.onPlayerBasePointerCancel\(event\);/);
  assert.match(source, /playerPanel\.on\('pointercancel'[\s\S]*this\.onPlayerBasePointerCancel\(event\);/);
  assert.match(source, /canPlayerBaseHoldToSurrender\(\) \{\s*return this\.isBasePassAvailable\(\) && this\.canHoldPassToSurrender\(\);\s*\}/);
  assert.match(source, /onPlayerBasePointerDown\(event\) \{\s*if \(!this\.canPlayerBaseHoldToSurrender\(\)\) return;[\s\S]*this\.time\.delayedCall\(PASS_HOLD_TO_SURRENDER_MS,[\s\S]*this\.resolvePlayerHoldToSurrender\(\);/);
  assert.match(source, /onPlayerBasePointerCancel\(event\) \{\s*event\?\.stopPropagation\?\.\(\);\s*this\.cancelPassHoldToSurrender\(\);\s*\}/);
  assert.match(source, /onPlayerBasePointerUp\(event\) \{[\s\S]*if \(this\.passHoldToSurrenderProgress\) \{\s*this\.cancelPassHoldToSurrender\(\);\s*\}[\s\S]*this\.resolvePassTurn\(\);\s*\}/);
});
