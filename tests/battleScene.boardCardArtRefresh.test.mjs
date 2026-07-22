import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const trackingSource = source.slice(source.indexOf('  getBoardCardArtTrackingKey('), source.indexOf('  recordBoardStatMismatchIfIdle()'));
const boardUnitViewSource = source.slice(source.indexOf('  createBoardUnitView(cell, unit)'), source.indexOf('  refreshBoardLabels()'));
const refreshBoardLabelsSource = source.slice(source.indexOf('  refreshBoardLabels()'), source.indexOf('  refreshHeroHP()'));
const shutdownSource = source.slice(source.indexOf('  shutdown()'), source.indexOf('  pauseForNavigation('));

test('missing board texture creates bounded tracking with board index and expected texture key', () => {
  assert.match(source, /import \{ getCardIllustrationAsset, getCardIllustrationAssetsForFaction, preloadCardIllustrationAsset \}/);
  assert.match(trackingSource, /trackMissingBoardCardArt\(boardIndex, unit, asset\)/);
  assert.match(trackingSource, /const trackingKey = this\.getBoardCardArtTrackingKey\(boardIndex, textureKey\)/);
  assert.match(trackingSource, /boardIndex,[\s\S]*cardId,[\s\S]*textureKey,[\s\S]*assetPath/);
  assert.match(trackingSource, /this\.recordBattleReportEvent\?\.\('board-card-art-placeholder-created'/);
  assert.match(boardUnitViewSource, /const expectedArtAsset = getCardIllustrationAsset\(unit\);[\s\S]*this\.trackMissingBoardCardArt\(cell\.index, unit, expectedArtAsset\)/);
});

test('texture-ready handling validates live slot and refreshes only that board slot', () => {
  assert.match(trackingSource, /installBoardCardArtTextureReadyListener\(\)[\s\S]*this\.textures\.on\('addtexture', this\.boundBoardCardTextureReadyHandler\)/);
  assert.match(trackingSource, /handleBoardCardTextureReady\(textureKey\)[\s\S]*entry\?\.textureKey !== textureKey[\s\S]*this\.pendingBoardCardArtRefreshKeys\.add\(trackingKey\)/);
  assert.match(trackingSource, /isTrackedBoardCardArtEntryCurrent\(entry\)[\s\S]*this\.gameState\?\.board\?\.\[entry\?\.boardIndex\][\s\S]*this\.getBoardUnitCardId\(unit\) === entry\.cardId && unit\.owner === entry\.owner/);
  assert.match(trackingSource, /refreshBoardSlotView\(entry\.boardIndex, \{ expectedTextureKey: entry\.textureKey \}\)/);
  assert.doesNotMatch(trackingSource, /this\.refreshBoardLabels\(\)/);
});

test('resolved, stale, duplicate, empty, and shutdown cases are cleared safely', () => {
  assert.match(trackingSource, /clearMissingBoardCardArtForIndex\(boardIndex, exceptTextureKey = null\)[\s\S]*this\.missingBoardCardArt\.delete\(key\)/);
  assert.match(trackingSource, /clearResolvedBoardCardArt\(boardIndex, textureKey\)[\s\S]*this\.missingBoardCardArt\?\.delete\?\.\(trackingKey\)/);
  assert.match(trackingSource, /if \(this\.missingBoardCardArt\.has\(trackingKey\)\) return false;/);
  assert.match(refreshBoardLabelsSource, /this\.clearMissingBoardCardArtForIndex\(cell\.index\);/);
  assert.match(shutdownSource, /this\.removeBoardCardArtTextureReadyListener\(\);\s*this\.clearMissingBoardCardArtTracking\(\);/);
});

test('texture arrival during presentation defers to a safe board-only boundary', () => {
  assert.match(trackingSource, /isBoardCardArtRefreshSafe\(\)[\s\S]*!this\.isFlowResolving[\s\S]*!this\.isEffectCastResolving[\s\S]*!this\.targetingState[\s\S]*this\.boardInspectIndex === null/);
  assert.match(trackingSource, /flushPendingBoardCardArtRefreshes\(\)[\s\S]*if \(!this\.isBoardCardArtRefreshSafe\(\)\) return false;/);
  assert.match(refreshBoardLabelsSource, /this\.flushPendingBoardCardArtRefreshes\(\);/);
});

test('single-slot refresh preserves stats source and avoids whole-scene rebuilds', () => {
  assert.match(trackingSource, /refreshBoardSlotView\(boardIndex, options = \{\}\)[\s\S]*const cell = this\.boardCells\.find[\s\S]*cell\.label\.removeAll\(true\)[\s\S]*cell\.label\.add\(this\.createBoardUnitView\(cell, unit/);
  assert.match(trackingSource, /const currentRenderStats = this\.createBoardRenderStatSnapshot\(\);[\s\S]*this\.lastRenderedBoardStats = currentRenderStats/);
  assert.doesNotMatch(trackingSource, /drawBoard\(\)|rebuildBattleView|createInitialBattleState|shuffleDeck|drawCards/);
});

