import Phaser from 'phaser';
import { AUDIO_KEYS } from '../audio/audioAssets.js';
import { playSfx } from '../audio/audioPlayback.js';
import { SHOW_BATTLE_REPORT_TOOL } from '../config/debugTools.js';
import { translateActive } from '../localization/localeService.js';
import { buildBattleReportSnapshot } from '../systems/battleReport.js';
import { BATTLE_REPORT_CAPTURE_SOURCE, buildBattleReportSummary, canShowBattleReportForceReveal, getBattleMenuActionDescriptors, serializeBattleReportSnapshot } from '../ui/battleMenuReport.js';
import { enterBattleScene } from './battleEntryRouter.js';

const BUTTON_WIDTH = 260;
const BUTTON_STYLE = Object.freeze({
  fontFamily: 'Arial, sans-serif',
  fontSize: '22px',
  color: '#0f172a',
  backgroundColor: '#93c5fd',
  fontStyle: 'bold',
  padding: Object.freeze({ x: 20, y: 10 }),
});

export default class BattleMenuScene extends Phaser.Scene {
  constructor() {
    super('BattleMenuScene');
    this.battleReportPanel = null;
    this.battleReportMountRoot = null;
    this.battleReportText = '';
    this.battleReportSummaryText = '';
    this.battleReportSnapshot = null;
    this.battleReportCleanupHandlers = [];
    this.battleReportStatusTimer = null;
  }

  create(data) {
    const { width, height } = this.scale;
    this.battleMenuData = data ?? {};
    const factionKey = typeof data?.factionKey === 'string' && data.factionKey ? data.factionKey : 'Aggro';
    const enemyFactionKey = typeof data?.enemyFactionKey === 'string' && data.enemyFactionKey ? data.enemyFactionKey : null;
    const battleContext = data?.battleContext && typeof data.battleContext === 'object' ? data.battleContext : { mode: 'arena' };
    const returnSceneKey = typeof data?.returnSceneKey === 'string' && data.returnSceneKey
      ? data.returnSceneKey
      : 'BattleScene';
    this.returnSceneKey = returnSceneKey;
    this.returnBattleLaunchData = { factionKey, enemyFactionKey, battleContext };
    this.reportOnly = data?.reportOnly === true;

    if (data?.openBattleReportPanel === true && this.reportOnly) {
      this.openBattleReportPanel();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyBattleReportPanel());
      return;
    }

    this.cameras.main.setBackgroundColor('#05080f');

    this.add
      .text(width * 0.5, height * 0.18, translateActive('ui.battleMenu.title', 'MENU'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.5, height * 0.42, translateActive('ui.battleMenu.comingSoon', 'Menu options coming soon.'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#cbd5e1',
        align: 'center',
      })
      .setOrigin(0.5);

    this.menuButtons = getBattleMenuActionDescriptors().map((action, index) => this.createBattleMenuButton({
      x: width * 0.5,
      y: height * (0.56 + index * 0.1),
      label: translateActive(action.labelKey, action.fallback),
      onClick: () => this.handleBattleMenuAction(action.id),
    }));

    const backButton = this.add
      .text(width * 0.08, height * 0.94, '←', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '36px',
        color: '#cbd5e1',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerup', () => this.leaveBattleMenu());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyBattleReportPanel());
  }

  createBattleMenuButton({ x, y, label, onClick }) {
    const button = this.add.text(x, y, label, BUTTON_STYLE).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.setFixedSize?.(BUTTON_WIDTH, 0);
    button.on('pointerup', () => {
      this.playBattleMenuClickSfx();
      onClick?.();
    });
    return button;
  }

  handleBattleMenuAction(actionId) {
    if (actionId === 'rules') return this.openRulesPanel();
    if (actionId === 'battleReport' && SHOW_BATTLE_REPORT_TOOL) return this.openBattleReportPanel();
    return null;
  }

  playBattleMenuClickSfx() {
    const returnScene = this.scene.get(this.returnSceneKey);
    if (returnScene?.playBattleSfx) returnScene.playBattleSfx(AUDIO_KEYS.UI_CLICK);
    else playSfx(this, AUDIO_KEYS.UI_CLICK);
  }

  openRulesPanel() {
    const returnSceneKey = this.returnSceneKey;
    const returnScene = this.scene.get(returnSceneKey);
    this.scene.stop();
    if (returnScene?.launchBattleRulesPanel) {
      returnScene.launchBattleRulesPanel({ prepareNavigation: false });
      return;
    }
    returnScene?.hideRulesPanelBackgroundHelpers?.();
    this.scene.launch('RulesPanelScene', returnScene?.getBattleRulesPanelLaunchData?.() ?? { returnSceneKey, hideScrollHint: true, battleModalPresentation: returnSceneKey === 'BattleScene' });
  }

  leaveBattleMenu() {
    const returnScene = this.scene.get(this.returnSceneKey);
    this.destroyBattleReportPanel();
    this.scene.stop();
    if (this.reportOnly && returnScene?.resumeFromBattleReport) {
      returnScene.resumeFromBattleReport();
      return;
    }
    if (returnScene?.resumeFromBattleMenu) {
      returnScene.resumeFromBattleMenu();
      return;
    }
    const { factionKey, enemyFactionKey, battleContext } = this.returnBattleLaunchData;
    enterBattleScene(this, { factionKey, enemyFactionKey, battleContext });
  }

  buildFreshBattleReport() {
    const battleScene = this.scene.get(this.returnSceneKey);
    const snapshot = battleScene?.buildBattleReportSnapshot
      ? battleScene.buildBattleReportSnapshot({ captureSource: BATTLE_REPORT_CAPTURE_SOURCE })
      : buildBattleReportSnapshot(battleScene, { captureSource: BATTLE_REPORT_CAPTURE_SOURCE });
    return { snapshot, reportText: serializeBattleReportSnapshot(snapshot), summaryText: buildBattleReportSummary(snapshot), battleScene };
  }

  getBattleReportFullscreenElement() {
    const doc = globalThis.document;
    return doc?.fullscreenElement ?? doc?.webkitFullscreenElement ?? null;
  }

  getBattleReportGameRoot() {
    const doc = globalThis.document;
    const configuredTarget = this.scale?.fullscreenTarget;
    if (configuredTarget && typeof configuredTarget !== 'string') return configuredTarget;
    const configuredId = typeof configuredTarget === 'string' && configuredTarget ? configuredTarget : 'app';
    return doc?.getElementById?.(configuredId) ?? doc?.getElementById?.('app') ?? this.game?.canvas?.parentElement ?? null;
  }

  resolveBattleReportMountRoot() {
    const fullscreenElement = this.getBattleReportFullscreenElement();
    const gameRoot = this.getBattleReportGameRoot();
    if (fullscreenElement && (!gameRoot || fullscreenElement === gameRoot || fullscreenElement.contains?.(gameRoot) || gameRoot.contains?.(fullscreenElement))) return fullscreenElement;
    return gameRoot ?? globalThis.document?.body ?? null;
  }

  createBattleReportPanel({ snapshot, reportText, summaryText, battleScene }) {
    const panel = document.createElement('div');
    panel.dataset.gridfallBattleReport = 'true';
    panel.style.cssText = 'position:fixed;inset:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));z-index:9997;display:flex;flex-direction:column;gap:10px;box-sizing:border-box;max-width:min(94vw,920px);max-height:calc(100dvh - 20px);width:calc(100dvw - 20px);margin:auto;padding:clamp(10px,2.8vw,16px);border:2px solid #38bdf8;border-radius:18px;background:linear-gradient(180deg,rgba(15,23,42,.98),rgba(2,6,23,.98));color:#f8fafc;font-family:Arial,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.55);overflow:hidden;overscroll-behavior:contain;touch-action:none;';
    const title = document.createElement('h2'); title.textContent = translateActive('ui.battleMenu.battleReport', 'BATTLE REPORT'); title.style.cssText = 'margin:0;text-align:center;font-size:24px;';
    const summary = document.createElement('pre'); summary.textContent = summaryText; summary.style.cssText = 'margin:0;padding:10px;border:1px solid rgba(147,197,253,.35);border-radius:10px;background:rgba(15,23,42,.75);white-space:pre-wrap;font:12px monospace;user-select:text;';
    const report = document.createElement('pre'); report.textContent = reportText; report.style.cssText = 'flex:1 1 auto;min-height:0;overflow:auto;margin:0;padding:12px;border:1px solid rgba(56,189,248,.4);border-radius:10px;background:rgba(2,6,23,.88);white-space:pre-wrap;overflow-wrap:anywhere;font:11px monospace;user-select:text;-webkit-user-select:text;touch-action:pan-y;';
    const status = document.createElement('div'); status.style.cssText = 'min-height:18px;text-align:center;color:#bfdbfe;font-size:12px;';
    const controls = document.createElement('div'); controls.style.cssText = 'flex:0 0 auto;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding-top:8px;border-top:1px solid rgba(148,163,184,.35);';
    const makeButton = (key, fallback, handler) => {
      const button = document.createElement('button');
      button.textContent = translateActive(key, fallback);
      button.style.cssText = 'min-width:132px;padding:10px 14px;border:0;border-radius:10px;background:#93c5fd;color:#0f172a;font:700 14px Arial,sans-serif;';
      button.addEventListener('click', handler);
      return button;
    };
    if (canShowBattleReportForceReveal(battleScene, snapshot)) {
      controls.appendChild(makeButton('ui.battleMenu.forceReveal', 'FORCE REVEAL', () => {
        this.playBattleMenuClickSfx();
        battleScene.reconcileOpeningMulliganPresentation({ reason: 'diagnostic-force-reveal' });
        this.openBattleReportPanel();
      }));
    }
    controls.appendChild(makeButton('ui.battleMenu.copyReport', 'COPY REPORT', async () => {
      this.playBattleMenuClickSfx();
      try {
        await globalThis.navigator?.clipboard?.writeText?.(report.textContent ?? '');
        status.textContent = translateActive('ui.battleMenu.copySuccess', 'Report copied.');
      } catch (_) {
        try { const range = document.createRange(); range.selectNodeContents(report); globalThis.getSelection?.()?.removeAllRanges?.(); globalThis.getSelection?.()?.addRange?.(range); } catch (__) {}
        status.textContent = translateActive('ui.battleMenu.copyFailure', 'Copy failed. Select text manually.');
      }
    }));
    controls.appendChild(makeButton('ui.battleMenu.closeReport', 'CLOSE', () => { this.playBattleMenuClickSfx(); this.closeBattleReportPanel(); }));
    panel.append(title, summary, report, status, controls);
    return panel;
  }

  installBattleReportLifecycleHandlers() {
    this.removeBattleReportLifecycleHandlers();
    const addDomHandler = (target, eventName, handler, options) => {
      target?.addEventListener?.(eventName, handler, options);
      this.battleReportCleanupHandlers.push(() => target?.removeEventListener?.(eventName, handler, options));
    };
    const remount = () => this.remountBattleReportPanel();
    const structuralClose = () => this.closeBattleReportForStructuralRecovery();
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((eventName) => addDomHandler(globalThis.document, eventName, remount));
    ['resize', 'orientationchange'].forEach((eventName) => addDomHandler(globalThis, eventName, remount, { passive: true }));
    addDomHandler(globalThis.visualViewport, 'resize', remount, { passive: true });
    addDomHandler(globalThis, 'pagehide', structuralClose, { passive: true });
    addDomHandler(globalThis.document, 'visibilitychange', () => { if (globalThis.document?.visibilityState === 'hidden') structuralClose(); });
    const canvas = this.game?.canvas;
    addDomHandler(canvas, 'webglcontextrestored', structuralClose);
    this.scale?.on?.('enterfullscreen', remount, this);
    this.scale?.on?.('leavefullscreen', remount, this);
    this.battleReportCleanupHandlers.push(() => {
      this.scale?.off?.('enterfullscreen', remount, this);
      this.scale?.off?.('leavefullscreen', remount, this);
    });
  }

  removeBattleReportLifecycleHandlers() {
    for (const cleanup of this.battleReportCleanupHandlers.splice(0)) cleanup?.();
  }

  mountBattleReportPanel(panel) {
    const mountRoot = this.resolveBattleReportMountRoot();
    mountRoot?.appendChild?.(panel);
    this.battleReportPanel = panel;
    this.battleReportMountRoot = mountRoot;
  }

  remountBattleReportPanel() {
    if (!this.battleReportPanel || !this.battleReportText) return;
    const targetRoot = this.resolveBattleReportMountRoot();
    if (!targetRoot || targetRoot === this.battleReportMountRoot) return;
    this.battleReportPanel.remove?.();
    this.mountBattleReportPanel(this.createBattleReportPanel({
      snapshot: this.battleReportSnapshot,
      reportText: this.battleReportText,
      summaryText: this.battleReportSummaryText,
      battleScene: this.scene.get(this.returnSceneKey),
    }));
  }

  openBattleReportPanel() {
    if (!SHOW_BATTLE_REPORT_TOOL || !globalThis.document?.createElement) return;
    this.destroyBattleReportPanel();
    const { snapshot, reportText, summaryText, battleScene } = this.buildFreshBattleReport();
    this.battleReportText = reportText;
    this.battleReportSummaryText = summaryText;
    this.battleReportSnapshot = snapshot;
    this.mountBattleReportPanel(this.createBattleReportPanel({ snapshot, reportText, summaryText, battleScene }));
    this.installBattleReportLifecycleHandlers();
  }

  closeBattleReportPanel() {
    this.destroyBattleReportPanel();
    if (this.reportOnly) this.leaveBattleMenu();
  }

  closeBattleReportForStructuralRecovery() {
    this.destroyBattleReportPanel();
    if (!this.reportOnly) return;
    const returnScene = this.scene.get(this.returnSceneKey);
    this.scene.stop();
    returnScene?.resumeFromBattleReport?.();
  }

  destroyBattleReportPanel() {
    this.removeBattleReportLifecycleHandlers();
    if (this.battleReportStatusTimer) {
      globalThis.clearTimeout?.(this.battleReportStatusTimer);
      this.battleReportStatusTimer = null;
    }
    this.battleReportPanel?.remove?.();
    this.battleReportPanel = null;
    this.battleReportMountRoot = null;
    this.battleReportText = '';
    this.battleReportSummaryText = '';
    this.battleReportSnapshot = null;
  }

  resumeFromRulesPanel() {
    this.scene.resume();
  }
}
