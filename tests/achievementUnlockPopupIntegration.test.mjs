import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const battle = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const helper = fs.readFileSync('src/ui/achievementUnlockPopup.js', 'utf8');
function method(name, next) {
  return battle.slice(battle.indexOf(`  ${name}(`), battle.indexOf(`  ${next}(`));
}

test('standard result modal starts achievement popups only after modal assignment and interactive flags', () => {
  const show = method('showBattleResultModal', 'destroyAchievementUnlockPopupController');
  const assignment = show.indexOf('this.battleResultModal = {');
  const shown = show.indexOf('this.battleResultModalShown = true;', assignment);
  const overlay = show.indexOf('this.resultOverlayState = {', shown);
  const start = show.indexOf('this.startAchievementUnlockPopupsForResultModal();', overlay);
  assert.ok(assignment >= 0 && shown > assignment && overlay > shown && start > overlay);
});

test('popup integration limits batches to 3 and shows sequential non-stacked popups', () => {
  const start = method('startAchievementUnlockPopupsForResultModal', 'createResultModalButton');
  assert.match(start, /peekAchievementPresentation\(ACHIEVEMENT_UNLOCK_POPUP_MAX_BATCH\)/);
  assert.match(helper, /ACHIEVEMENT_UNLOCK_POPUP_MAX_BATCH = 3/);
  assert.match(start, /let activePopup = null;/);
  assert.match(start, /const layout = calculateAchievementUnlockPopupLayout\(this, this\.battleResultModal\);/);
  assert.match(start, /cursor \+= 1;[\s\S]*this\.time\.delayedCall\(ACHIEVEMENT_UNLOCK_POPUP_TIMING\.gapMs, showNext\)/);
});

test('popup start path plays achievement unlock SFX before each popup animation begins', () => {
  const start = method('startAchievementUnlockPopupsForResultModal', 'createResultModalButton');
  const create = start.indexOf('activePopup = createAchievementUnlockPopup(this, entry.definition, {');
  const sfx = start.indexOf('this.playAchievementUnlockPopupSfx(entry.achievementId);', create);
  const play = start.indexOf('activePopup.play({', sfx);
  assert.ok(create >= 0 && sfx > create && play > sfx);
});

test('achievement unlock SFX is guarded per result modal lifecycle without changing queue completion', () => {
  const guard = method('playAchievementUnlockPopupSfx', 'startAchievementUnlockPopupsForResultModal');
  const start = method('startAchievementUnlockPopupsForResultModal', 'createResultModalButton');
  const destroyPopup = method('destroyAchievementUnlockPopupController', 'playAchievementUnlockPopupSfx');
  const destroyModal = method('destroyBattleResultModal', 'createBaseBroadcastFrame');

  assert.match(guard, /if \(typeof achievementId !== 'string' \|\| achievementId\.length === 0\) return false;/);
  assert.match(guard, /if \(!this\.achievementUnlockSfxPlayedIds\) this\.achievementUnlockSfxPlayedIds = new Set\(\);/);
  assert.match(guard, /if \(this\.achievementUnlockSfxPlayedIds\.has\(achievementId\)\) return false;/);
  assert.match(guard, /this\.achievementUnlockSfxPlayedIds\.add\(achievementId\);[\s\S]*return this\.playBattleSfx\?\.\(AUDIO_KEYS\.ACHIEVEMENT_UNLOCK, \{ cooldownMs: 0 \}\);/);
  assert.match(start, /this\.playAchievementUnlockPopupSfx\(entry\.achievementId\);[\s\S]*activePopup\.play\(\{/);
  assert.doesNotMatch(destroyPopup, /achievementUnlockSfxPlayedIds\s*=/);
  assert.match(destroyModal, /this\.achievementUnlockSfxPlayedIds = new Set\(\);/);
  assert.ok(start.lastIndexOf('markAchievementPresented(entry.achievementId);') > start.indexOf('activePopup.play({'), 'SFX guard must not mark achievement presented before popup completion');
});

test('achievement is marked presented only after popup completion and early destroy leaves unfinished pending', () => {
  const start = method('startAchievementUnlockPopupsForResultModal', 'createResultModalButton');
  assert.match(start, /activePopup\.play\(\{[\s\S]*onComplete: \(\) => \{[\s\S]*markAchievementPresented\(entry\.achievementId\);/);
  assert.ok(start.lastIndexOf('markAchievementPresented(entry.achievementId);') > start.indexOf('activePopup.play({'), 'valid entries should be marked only inside popup completion');
  assert.match(start, /destroy: \(\) => \{[\s\S]*cleanupActive\(\);[\s\S]*\}/);
});

test('result buttons do not depend on popup completion and popup failure preserves result modal flags', () => {
  const button = method('createResultModalButton', 'destroyBattleResultModal');
  const start = method('startAchievementUnlockPopupsForResultModal', 'createResultModalButton');
  assert.doesNotMatch(button, /achievementUnlockPopup|startAchievementUnlockPopups|markAchievementPresented/);
  assert.match(start, /catch \(error\) \{[\s\S]*console\.warn\('Achievement unlock popup presentation failed; result modal remains usable\.', error\);[\s\S]*this\.destroyAchievementUnlockPopupController\(\);[\s\S]*\}/);
  assert.doesNotMatch(start, /battleResultModalPending\s*=|battleResultModalShown\s*=|isFlowResolving\s*=/);
});

test('result modal destruction and cleanup destroy active popup controller without snapshot expansion', () => {
  const destroy = method('destroyBattleResultModal', 'createBaseBroadcastFrame');
  const cleanup = method('cleanupSceneObjects', 'create');
  assert.match(destroy, /this\.destroyAchievementUnlockPopupController\(\);/);
  assert.match(cleanup, /this\.destroyBattleResultModal\(\);[\s\S]*this\.destroyAchievementUnlockPopupController\(\);/);
  assert.doesNotMatch(battle, /achievementUnlockPopupController[\s\S]{0,120}resultOverlayState|resultOverlayState[\s\S]{0,120}achievementUnlockPopupController/);
});

test('campaign completion modal starts achievement popups only after interactive summary', () => {
  const start = method('startAchievementUnlockPopupsForResultModal', 'createResultModalButton');
  const campaign = method('showCampaignCompleteModal', 'getCampaignCompletionStatsText');
  assert.match(start, /this\.resultOverlayState\?\.kind === 'campaign-completion'[\s\S]*this\.resultOverlayState\.phase !== 'interactive'/);
  assert.match(start, /this\.resultOverlayState\?\.kind === 'campaign-completion'[\s\S]*this\.resultOverlayState\.preview === true/);
  const buttonVisible = campaign.indexOf('button.items.forEach((item) => item?.setVisible?.(true)?.setAlpha?.(1));');
  const interactiveState = campaign.indexOf("phase: 'interactive'", buttonVisible);
  const startPopup = campaign.indexOf('this.startAchievementUnlockPopupsForResultModal();', interactiveState);
  assert.ok(buttonVisible >= 0 && interactiveState > buttonVisible && startPopup > interactiveState);
  assert.match(campaign, /if \(restoreAsInteractive\) this\.startAchievementUnlockPopupsForResultModal\(\);/);
  assert.match(battle, /continueCampaignBattleResult\(\)[\s\S]*this\.showCampaignCompleteModal\(updatedCampaign\.status\);[\s\S]*this\.scene\.start\('CampaignEnemySelectScene'/);
});

test('Achievements panel source remains read-only and popup helper is separate', () => {
  const achievementsScene = fs.readFileSync('src/scenes/AchievementsScene.js', 'utf8');
  assert.doesNotMatch(achievementsScene, /achievementUnlockPopup|markAchievementPresented|enqueueAchievementPresentation/);
  assert.match(helper, /createAchievementUnlockPopup/);
});
