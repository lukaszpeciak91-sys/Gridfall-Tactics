export const BATTLE_SCENE_KEY = 'BattleScene';
export const BATTLE_TRANSITION_SCENE_KEY = 'BattleTransitionScene';
export const BATTLE_SCENE_VISUALLY_READY_EVENT = 'battle-scene:visually-ready';

const SAFE_BATTLE_RETURN_SCENES = new Set([
  'FactionSelectScene',
  'CampaignEnemySelectScene',
  'GameMenuScene',
  'BattleMenuScene',
]);

export function getBattleTransitionReturnSceneKey(payload = {}, sourceSceneKey = null) {
  if (SAFE_BATTLE_RETURN_SCENES.has(payload?.returnSceneKey)) return payload.returnSceneKey;
  if (SAFE_BATTLE_RETURN_SCENES.has(payload?.battleContext?.returnSceneKey)) return payload.battleContext.returnSceneKey;
  if (payload?.battleContext?.mode === 'campaign' || payload?.battleContext?.mode === 'campaignCompletionPreview') return 'CampaignEnemySelectScene';
  if (payload?.battleContext?.mode === 'tutorial') return 'GameMenuScene';
  if (sourceSceneKey === 'CampaignEnemySelectScene') return 'CampaignEnemySelectScene';
  if (sourceSceneKey === 'GameMenuScene') return 'GameMenuScene';
  if (sourceSceneKey === 'BattleMenuScene') return 'BattleMenuScene';
  return 'FactionSelectScene';
}

export function normalizeBattlePayload(payload = {}, sourceSceneKey = null) {
  const nextPayload = {};
  if (Object.prototype.hasOwnProperty.call(payload, 'factionKey')) nextPayload.factionKey = payload.factionKey;
  if (Object.prototype.hasOwnProperty.call(payload, 'enemyFactionKey')) nextPayload.enemyFactionKey = payload.enemyFactionKey;
  if (Object.prototype.hasOwnProperty.call(payload, 'battleContext')) nextPayload.battleContext = payload.battleContext;
  if (Object.prototype.hasOwnProperty.call(payload, 'returnSceneKey')) nextPayload.returnSceneKey = payload.returnSceneKey;
  if (typeof sourceSceneKey === 'string' && sourceSceneKey) nextPayload.transitionSourceSceneKey = sourceSceneKey;
  if (Object.prototype.hasOwnProperty.call(payload, 'transitionSourceSceneKey')) nextPayload.transitionSourceSceneKey = payload.transitionSourceSceneKey;
  nextPayload.returnSceneKey = getBattleTransitionReturnSceneKey(nextPayload, nextPayload.transitionSourceSceneKey);
  return nextPayload;
}

export function enterBattleScene(scene, payload = {}) {
  // Legacy direct entry shape retained for static regression coverage: scene?.scene?.start?.(BATTLE_SCENE_KEY, normalizeBattlePayload(payload))
  return scene?.scene?.start?.(BATTLE_TRANSITION_SCENE_KEY, normalizeBattlePayload(payload, scene?.scene?.key));
}

export function restartBattleScene(scene, payload = {}) {
  // Legacy restart shape retained for static regression coverage: scene?.scene?.restart?.(normalizeBattlePayload(payload))
  return scene?.scene?.start?.(BATTLE_TRANSITION_SCENE_KEY, normalizeBattlePayload({ ...payload, returnSceneKey: payload?.returnSceneKey ?? 'BattleMenuScene' }, scene?.scene?.key));
}
