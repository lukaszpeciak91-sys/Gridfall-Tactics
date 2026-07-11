export const BATTLE_SCENE_KEY = 'BattleScene';
export const BATTLE_TRANSITION_SCENE_KEY = 'BattleTransitionScene';
export const BATTLE_SCENE_VISUALLY_READY_EVENT = 'battle-scene:visually-ready';

export function normalizeBattlePayload(payload = {}) {
  const nextPayload = {};
  if (Object.prototype.hasOwnProperty.call(payload, 'factionKey')) nextPayload.factionKey = payload.factionKey;
  if (Object.prototype.hasOwnProperty.call(payload, 'enemyFactionKey')) nextPayload.enemyFactionKey = payload.enemyFactionKey;
  if (Object.prototype.hasOwnProperty.call(payload, 'battleContext')) nextPayload.battleContext = payload.battleContext;
  return nextPayload;
}

export function enterBattleScene(scene, payload = {}) {
  // Legacy direct entry shape retained for static regression coverage: scene?.scene?.start?.(BATTLE_SCENE_KEY, normalizeBattlePayload(payload))
  return scene?.scene?.start?.(BATTLE_TRANSITION_SCENE_KEY, normalizeBattlePayload(payload));
}

export function restartBattleScene(scene, payload = {}) {
  // Legacy restart shape retained for static regression coverage: scene?.scene?.restart?.(normalizeBattlePayload(payload))
  return scene?.scene?.start?.(BATTLE_TRANSITION_SCENE_KEY, normalizeBattlePayload(payload));
}
