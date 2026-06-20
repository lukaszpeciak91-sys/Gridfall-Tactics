import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createMenuScreenHeader } from '../ui/screenHeader.js';
import { createBottomNavigationControls, createMuteToggleControl, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';
import { getSupportedLocales, setActiveLocale, translateActive, translate } from '../localization/localeService.js';
import { DEFAULT_SETTINGS, applyAudioSettings, loadSettings, saveSettings, updateSettings } from '../systems/settingsState.js';
function getLanguageOptions(displayLocale) {
  return getSupportedLocales().map((locale) => ({
    value: locale,
    label: translate(`ui.settings.languages.${locale}`, displayLocale, locale),
  }));
}
const SETTINGS_PANEL_DEPTH = 0;

const LABEL_STYLE = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '15px',
  color: '#e5e7eb',
};

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
    this.settings = { ...DEFAULT_SETTINGS };
    this.languageValueText = null;
    this.languageMenuItems = [];
    this.languageMenuOpen = false;
    this.localizedTextItems = [];
    this.musicValueText = null;
    this.sfxValueText = null;
    this.returnSceneKey = null;
    this.rulesPanelHiddenBattleScene = null;
  }

  init(data) {
    this.cleanupScene();
    this.returnSceneKey = typeof data?.returnSceneKey === 'string' && data.returnSceneKey
      ? data.returnSceneKey
      : null;
  }

  preload() {
    preloadMenuBackgroundArt(this);
  }

  create() {
    const { width, height } = this.scale;
    this.settings = this.loadSettings();
    applyAudioSettings(this, this.settings);
    this.languageMenuItems = [];
    this.languageMenuOpen = false;
    this.localizedTextItems = [];

    this.cameras.main.setBackgroundColor(MENU_BACKGROUND_FALLBACK_COLOR_HEX);
    createCoverBackground(this, {
      asset: getMenuBackgroundAsset(),
      fallbackColor: MENU_BACKGROUND_FALLBACK_COLOR,
      width,
      height,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.scale.on('enterfullscreen', this.onFullscreenChanged, this);
    this.scale.on('leavefullscreen', this.onFullscreenChanged, this);

    const header = createMenuScreenHeader(this, {
      title: translateActive('ui.settings.title', 'SETTINGS'),
      width,
      height,
    });
    this.registerLocalizedText(header.title, 'ui.settings.title', 'SETTINGS', { uppercase: true });
    this.registerLocalizedText(header.glow, 'ui.settings.title', 'SETTINGS', { uppercase: true });

    const panelWidth = Math.min(width - 32, 342);
    const languagePanelTitle = this.addPanel(width / 2, height * 0.3, panelWidth, 154, translateActive('ui.settings.languagePanel', 'LANGUAGE'));
    this.registerLocalizedText(languagePanelTitle, 'ui.settings.languagePanel', 'LANGUAGE');
    this.createLanguageSelect(width / 2, height * 0.32, panelWidth - 74);

    const audioPanelHeight = 300;
    const audioPanelTop = height * 0.44;
    const audioPanelY = audioPanelTop + audioPanelHeight / 2;
    const muteToggleY = audioPanelTop + 70;
    const musicSliderY = audioPanelTop + 132;
    const sfxSliderY = audioPanelTop + 222;
    const audioPanelTitle = this.addPanel(width / 2, audioPanelY, panelWidth, audioPanelHeight, translateActive('ui.settings.audioPanel', 'AUDIO'));
    this.registerLocalizedText(audioPanelTitle, 'ui.settings.audioPanel', 'AUDIO');
    createMuteToggleControl(this, width / 2, muteToggleY, 44, {
      onToggle: (settings) => {
        this.settings = settings;
      },
      depth: 2,
    });
    this.createVolumeSlider(width / 2, musicSliderY, panelWidth - 76, translateActive('ui.settings.musicVolume', 'Music Volume'), 'musicVolume');
    this.createVolumeSlider(width / 2, sfxSliderY, panelWidth - 76, translateActive('ui.settings.sfxVolume', 'SFX Volume'), 'sfxVolume');

    const buildMarker = createBuildMarker(this, { width, height });
    this.drawNavigationControls();
    this.children.bringToTop(buildMarker);
  }

  loadSettings() {
    return loadSettings();
  }

  saveSettings() {
    this.settings = saveSettings(this.settings);
    applyAudioSettings(this, this.settings);
  }

  addPanel(x, y, width, height, title) {
    const radius = 18;
    const left = x - width / 2;
    const top = y - height / 2;
    const panel = this.add.graphics().setDepth(SETTINGS_PANEL_DEPTH);

    panel.fillStyle(0x38bdf8, 0.055);
    panel.fillRoundedRect(left - 4, top - 3, width + 8, height + 8, radius + 4);
    panel.lineStyle(2, 0x7dd3fc, 0.1);
    panel.strokeRoundedRect(left - 3, top - 2, width + 6, height + 6, radius + 3);

    panel.fillGradientStyle(0x1e3a5f, 0x172554, 0x020617, 0x020617, 0.26, 0.18, 0.92, 0.96);
    panel.fillRoundedRect(left, top, width, height, radius);
    panel.fillStyle(0x020617, 0.52);
    panel.fillRoundedRect(left + 1, top + 1, width - 2, height - 2, radius - 1);

    panel.lineStyle(1.25, 0x93c5fd, 0.62);
    panel.strokeRoundedRect(left + 0.5, top + 0.5, width - 1, height - 1, radius - 1);
    panel.lineStyle(1, 0xf8fafc, 0.08);
    panel.strokeRoundedRect(left + 2.5, top + 2.5, width - 5, height - 5, radius - 3);

    const titleText = this.add
      .text(x, y - height / 2 + 22, title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(SETTINGS_PANEL_DEPTH);
    return titleText;
  }

  createLanguageSelect(x, y, width) {
    const selectedOption = this.getSelectedLanguageOption();
    const buttonHeight = 46;
    const button = this.add
      .rectangle(x, y, width, buttonHeight, 0x1e293b, 1)
      .setStrokeStyle(2, 0x93c5fd, 0.88)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.languageValueText = this.add
      .text(x - width / 2 + 18, y, selectedOption.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const arrowText = this.add
      .text(x + width / 2 - 22, y, '▾', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#bfdbfe',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(x, y + 46, translateActive('ui.settings.languageHelp', 'Select display language for card and faction names'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#fde68a',
        align: 'center',
      })
      .setOrigin(0.5);
    this.registerLocalizedText(statusText, 'ui.settings.languageHelp', 'Select display language for card and faction names');

    const toggleMenu = () => {
      this.languageMenuOpen = !this.languageMenuOpen;
      arrowText.setText(this.languageMenuOpen ? '▴' : '▾');
      this.languageMenuItems.forEach((item) => item.setVisible(this.languageMenuOpen));
    };

    [button, this.languageValueText, arrowText].forEach((target) => {
      target.setInteractive({ useHandCursor: true });
      target.on('pointerover', () => button.setFillStyle(0x334155, 1));
      target.on('pointerout', () => button.setFillStyle(0x1e293b, 1));
      target.on('pointerup', toggleMenu);
    });

    getLanguageOptions(this.settings.language).forEach((option, index) => {
      const itemY = y + buttonHeight + index * 39;
      const optionBackground = this.add
        .rectangle(x, itemY, width, 38, option.value === this.settings.language ? 0x93c5fd : 0x1e293b, 1)
        .setStrokeStyle(1, 0x475569, 1)
        .setOrigin(0.5)
        .setDepth(10)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      const optionText = this.add
        .text(x - width / 2 + 18, itemY, option.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          color: option.value === this.settings.language ? '#111827' : '#f8fafc',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setDepth(11)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      optionText.localeValue = option.value;

      const selectLanguage = () => {
        this.settings.language = setActiveLocale(option.value);
        this.saveSettings();
        const selectedLanguageOption = this.getSelectedLanguageOption();
        this.languageValueText.setText(selectedLanguageOption.label);
        this.languageMenuOpen = false;
        arrowText.setText('▾');
        this.refreshLocalizedTexts();
        this.refreshLanguageMenuItems();
      };

      [optionBackground, optionText].forEach((target) => {
        target.on('pointerover', () => optionBackground.setFillStyle(0xbfdbfe, 1));
        target.on('pointerout', () => {
          optionBackground.setFillStyle(option.value === this.settings.language ? 0x93c5fd : 0x1e293b, 1);
        });
        target.on('pointerup', selectLanguage);
      });

      this.languageMenuItems.push(optionBackground, optionText);
    });
  }

  refreshLanguageMenuItems() {
    const languageOptions = getLanguageOptions(this.settings.language);
    this.languageMenuItems.forEach((item) => {
      const matchingOption = languageOptions.find((option) => item.localeValue === option.value);
      if (!matchingOption) {
        item.setVisible(this.languageMenuOpen);
        return;
      }

      item.setText?.(matchingOption.label);
      item.setColor(matchingOption.value === this.settings.language ? '#111827' : '#f8fafc');
      item.setVisible(this.languageMenuOpen);
    });

    this.languageMenuItems
      .filter((item) => item.type === 'Rectangle')
      .forEach((item, index) => {
        const option = languageOptions[index];
        item.setFillStyle(option.value === this.settings.language ? 0x93c5fd : 0x1e293b, 1);
        item.setVisible(this.languageMenuOpen);
      });
  }

  refreshLocalizedTexts() {
    this.localizedTextItems.forEach(({ textObject, key, fallbackValue, uppercase }) => {
      const nextText = translateActive(key, fallbackValue);
      textObject.setText(uppercase ? nextText.toLocaleUpperCase() : nextText);
    });
  }

  registerLocalizedText(textObject, key, fallbackValue, { uppercase = false } = {}) {
    this.localizedTextItems.push({ textObject, key, fallbackValue, uppercase });
    return textObject;
  }

  getSelectedLanguageOption() {
    const languageOptions = getLanguageOptions(this.settings.language);
    return languageOptions.find((option) => option.value === this.settings.language) ?? languageOptions[0];
  }

  createVolumeSlider(x, y, width, label, settingKey) {
    const trackHeight = 8;
    const trackY = y + 34;
    const valueText = this.add.text(x + width / 2, y, `${this.settings[settingKey]}%`, LABEL_STYLE).setOrigin(1, 0.5);

    const labelText = this.add.text(x - width / 2, y, label, LABEL_STYLE).setOrigin(0, 0.5);
    if (settingKey === 'musicVolume') {
      this.registerLocalizedText(labelText, 'ui.settings.musicVolume', 'Music Volume');
    } else if (settingKey === 'sfxVolume') {
      this.registerLocalizedText(labelText, 'ui.settings.sfxVolume', 'SFX Volume');
    }
    const track = this.add
      .rectangle(x, trackY, width, trackHeight, 0x334155, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(x - width / 2, trackY, 1, trackHeight, 0x93c5fd, 1).setOrigin(0, 0.5);
    const knob = this.add
      .circle(x, trackY, 14, 0xf8fafc, 1)
      .setStrokeStyle(3, 0x93c5fd, 1)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(knob);

    const setValueFromX = (pointerX) => {
      const percent = Phaser.Math.Clamp(Math.round(((pointerX - (x - width / 2)) / width) * 100), 0, 100);
      this.settings = updateSettings(this, { ...this.settings, [settingKey]: percent });
      this.updateSliderVisuals({ x, width, fill, knob, valueText, settingKey });
    };

    track.on('pointerdown', (pointer) => setValueFromX(pointer.x));
    knob.on('drag', (pointer, dragX) => setValueFromX(dragX));
    knob.on('pointerdown', (pointer) => setValueFromX(pointer.x));

    if (settingKey === 'musicVolume') {
      this.musicValueText = valueText;
    } else if (settingKey === 'sfxVolume') {
      this.sfxValueText = valueText;
    }

    this.updateSliderVisuals({ x, width, fill, knob, valueText, settingKey });
  }

  updateSliderVisuals({ x, width, fill, knob, valueText, settingKey }) {
    const percent = this.settings[settingKey];
    const fillWidth = width * (percent / 100);
    fill.setDisplaySize(Math.max(0.1, fillWidth), fill.height);
    knob.setPosition(x - width / 2 + fillWidth, knob.y);
    valueText.setText(`${percent}%`);
  }

  drawNavigationControls() {
    createBottomNavigationControls(this, {
      onBack: () => this.returnToMainMenu(),
      onRules: () => this.openRulesPanel(),
      onFullscreen: () => this.toggleFullscreen(),
    });
  }

  returnToMainMenu() {
    const returnSceneKey = this.returnSceneKey;
    const returnScene = returnSceneKey ? this.scene.get(returnSceneKey) : null;

    if (returnSceneKey) {
      this.scene.stop();
      if (returnScene?.resumeFromSettings) {
        returnScene.resumeFromSettings();
        return;
      }
      if (this.scene.isPaused(returnSceneKey)) {
        this.scene.resume(returnSceneKey);
        return;
      }
    }

    this.scene.start('MainMenuScene');
  }

  getBattleReturnScene() {
    return this.returnSceneKey === 'BattleScene' ? this.scene.get('BattleScene') : null;
  }

  openRulesPanel() {
    const battleScene = this.getBattleReturnScene();
    if (battleScene) {
      battleScene.hideRulesPanelBackgroundHelpers?.();
      this.rulesPanelHiddenBattleScene = battleScene;
    }

    this.scene.launch('RulesPanelScene', battleScene
      ? { ...(battleScene.getBattleRulesPanelLaunchData?.() ?? { returnSceneKey: 'BattleScene', hideScrollHint: true, battleModalPresentation: true }), returnSceneKey: 'SettingsScene' }
      : { returnSceneKey: 'SettingsScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
    this.rulesPanelHiddenBattleScene?.restoreRulesPanelBackgroundHelpers?.();
    this.rulesPanelHiddenBattleScene = null;
    this.scene.resume();
  }

  toggleFullscreen() {
    toggleSceneFullscreen(this);
  }

  onFullscreenChanged() {
    if (this.scale.isFullscreen) {
      requestPortraitOrientationLock();
    }

    if (this.scene.isActive('SettingsScene')) {
      this.scene.restart({ returnSceneKey: this.returnSceneKey });
    }
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
  }
}
