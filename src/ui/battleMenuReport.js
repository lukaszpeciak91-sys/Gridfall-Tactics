import { SHOW_BATTLE_REPORT_TOOL } from '../config/debugTools.js';

export const BATTLE_REPORT_CAPTURE_SOURCE = 'battle-menu-manual';

export function getBattleMenuActionDescriptors({ showBattleReportTool = SHOW_BATTLE_REPORT_TOOL } = {}) {
  const actions = [
    { id: 'rules', labelKey: 'ui.battleMenu.howToPlay', fallback: 'HOW TO PLAY' },
  ];
  if (showBattleReportTool) {
    actions.push({ id: 'battleReport', labelKey: 'ui.battleMenu.battleReport', fallback: 'BATTLE REPORT' });
  }
  return actions;
}

export function serializeBattleReportSnapshot(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

export function buildBattleReportSummary(snapshot) {
  const battle = snapshot?.battle ?? {};
  const scenes = snapshot?.scenes ?? {};
  const environment = snapshot?.environment ?? {};
  const capture = snapshot?.capture ?? {};
  return [
    `Warnings: ${Array.isArray(snapshot?.warnings) ? snapshot.warnings.length : 0}`,
    `Mode: ${battle.mode ?? 'unknown'}`,
    `Battle: ${battle.sessionBattleSequenceNumber ?? environment.battleSequence ?? 'unknown'}`,
    `Turn: ${battle.turnNumber ?? 'unknown'}`,
    `Player: ${battle.playerFactionKey ?? 'unknown'}`,
    `Enemy: ${battle.enemyFactionKey ?? 'unknown'}`,
    battle.battlegroundId ? `Battleground: ${battle.battlegroundId}` : null,
    `Top scene: ${scenes.topSceneKey ?? 'unknown'}`,
    `BattleScene: ${scenes.battleScene?.paused ? 'paused' : scenes.battleScene?.active ? 'active' : 'inactive'}`,
    `Captured: ${snapshot?.capturedAt ?? environment.capturedAt ?? 'unknown'} (${capture.captureSource ?? 'unknown'})`,
  ].filter(Boolean).join('\n');
}

export function canShowBattleReportForceReveal(scene, snapshot) {
  return Boolean(
    scene?.openingMulliganPending
    && !scene?.gameState?.winner
    && !scene?.battleResultModalPending
    && !scene?.battleResultModalShown
    && (
      snapshot?.reveal?.diagnosticFailureCaptured
      || snapshot?.reveal?.invalidHiddenFrontCount > 0
      || scene?.openingRevealDiagFailureCaptured
      || scene?.isOpeningRevealDiagnosticFailureState?.({ visualStateWins: true })
    )
    && typeof scene?.reconcileOpeningMulliganPresentation === 'function'
  );
}
