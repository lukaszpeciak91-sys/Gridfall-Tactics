import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');

function extractMethodBody(name, nextName) {
  const start = source.indexOf(`\n  ${name}(`);
  const end = source.indexOf(`\n  ${nextName}(`, start + 1);
  if (start < 0 || end < 0) throw new Error(`Failed to extract ${name}`);
  return source.slice(start, end);
}

test('result overlay lifecycle uses explicit overlay state instead of boolean-only rebuild restore', () => {
  const rebuild = extractMethodBody('rebuildBattleView', 'shutdown');
  assert.match(source, /this\.resultOverlayState = null;/);
  assert.match(source, /captureResultOverlayState\(\) \{/);
  assert.match(source, /restoreResultOverlayFromSnapshot\(snapshot\) \{/);
  assert.match(rebuild, /const resultOverlaySnapshot = this\.captureResultOverlayState\(\);/);
  assert.match(rebuild, /this\.restoreResultOverlayFromSnapshot\(resultOverlaySnapshot\);/);
  assert.doesNotMatch(rebuild, /const resultModalWasShown = this\.battleResultModalShown;/);
});

test('arena and campaign intermediate battle result overlays restore as immediate interactive overlays', () => {
  const showBattle = extractMethodBody('showBattleResultModal', 'createResultModalButton');
  const restore = extractMethodBody('restoreResultOverlayFromSnapshot', 'rebuildBattleView');
  assert.match(showBattle, /kind: this\.isCampaignBattle\(\) \? 'campaign-battle-result' : 'arena-battle-result'/);
  assert.match(showBattle, /phase: 'interactive'/);
  assert.match(showBattle, /const skipReveal = options\.skipReveal === true;/);
  assert.match(restore, /snapshot\.kind === 'arena-battle-result' \|\| snapshot\.kind === 'campaign-battle-result'/);
  assert.match(restore, /this\.showBattleResultModal\(\{ skipReveal: true \}\);/);
});

test('campaign completion phase is persisted and summary restore bypasses reveal gating', () => {
  const campaign = extractMethodBody('showCampaignCompleteModal', 'getCampaignCompletionStatsText');
  assert.match(campaign, /restorePhase/);
  assert.match(campaign, /restoreAsInteractive/);
  assert.match(campaign, /kind: 'campaign-completion'/);
  assert.match(campaign, /phase: 'summary'/);
  assert.match(campaign, /phase: 'interactive'/);
  assert.match(campaign, /if \(restoreAsInteractive\) \{[\s\S]*overlay\.removeAllListeners\('pointerup'\);[\s\S]*summaryItems\.forEach\(\(item\) => item\?\.setVisible\?\.\(true\)\?\.setAlpha\?\.\(1\)\);[\s\S]*\}/);
});

test('campaign completion preview overlays restore without requiring gameState winner', () => {
  const capture = extractMethodBody('captureResultOverlayState', 'restoreResultOverlayFromSnapshot');
  const restore = extractMethodBody('restoreResultOverlayFromSnapshot', 'rebuildBattleView');
  assert.match(source, /preview: options\.preview === true/);
  assert.match(restore, /snapshot\.kind === 'campaign-completion'/);
  assert.match(restore, /preview: snapshot\.preview === true/);
  assert.match(restore, /campaign: snapshot\.campaign/);
  const campaignRestoreBranch = restore.slice(restore.indexOf("if (snapshot.kind === 'campaign-completion')"), restore.indexOf("if ((snapshot.kind === 'arena-battle-result'"));
  assert.doesNotMatch(campaignRestoreBranch, /this\.gameState\?\.winner/);
});

test('result overlay rebuild cleanup cancels stale pending and celebration timers before restore', () => {
  const schedule = extractMethodBody('scheduleBattleResultModal', 'completeBattleFlow');
  const destroy = extractMethodBody('destroyBattleResultModal', 'createBaseBroadcastFrame');
  assert.match(schedule, /this\.battleResultModalPendingEvent = pendingResultModalEvent;/);
  assert.match(destroy, /this\.battleResultModalPendingEvent\?\.remove\?\.\(false\);/);
  assert.match(destroy, /this\.battleResultModal\.celebration\?\.timers\?\.forEach\(\(timer\) => timer\?\.remove\?\.\(false\)\);/);
  assert.match(destroy, /item\?\.removeAllListeners\?\.\(\);/);
});
