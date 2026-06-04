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
    this.musicValueText = null;
    this.sfxValueText = null;
    this.returnSceneKey = null;
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

    createMenuScreenHeader(this, {
      title: translateActive('ui.settings.title', 'SETTINGS'),
      width,
      height,
    });

    const panelWidth = Math.min(width - 32, 342);
    this.addPanel(width / 2, height * 0.3, panelWidth, 154, translateActive('ui.settings.languagePanel', 'LANGUAGE'));
    this.createLanguageSelect(width / 2, height * 0.32, panelWidth - 74);

    const audioPanelHeight = 300;
    const audioPanelTop = height * 0.44;
    const audioPanelY = audioPanelTop + audioPanelHeight / 2;
    const muteToggleY = audioPanelTop + 70;
    const musicSliderY = audioPanelTop + 132;
    const sfxSliderY = audioPanelTop + 222;
    this.addPanel(width / 2, audioPanelY, panelWidth, audioPanelHeight, translateActive('ui.settings.audioPanel', 'AUDIO'));
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
    this.add.rectangle(x + 2, y + 4, width, height, 0x020617, 0.36).setOrigin(0.5).setDepth(SETTINGS_PANEL_DEPTH);
    this.add.rectangle(x, y, width, height, 0x0f172a, 0.88).setStrokeStyle(1, 0x334155, 0.9).setOrigin(0.5).setDepth(SETTINGS_PANEL_DEPTH);
    this.add
      .text(x, y - height / 2 + 22, title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(SETTINGS_PANEL_DEPTH);
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
      .text(x, y + 54, translateActive('ui.settings.languageHelp', 'Select display language for card and faction names'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#fde68a',
        align: 'center',
      })
      .setOrigin(0.5);

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
        this.languageValueText.setText(option.label);
        statusText.setText(translateActive('ui.settings.languageStatus', 'Language: {language}', { language: option.label }));
        this.languageMenuOpen = false;
        arrowText.setText('▾');
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

  getSelectedLanguageOption() {
    const languageOptions = getLanguageOptions(this.settings.language);
    return languageOptions.find((option) => option.value === this.settings.language) ?? languageOptions[0];
  }

  createVolumeSlider(x, y, width, label, settingKey) {
    const trackHeight = 8;
    const trackY = y + 34;
    const valueText = this.add.text(x + width / 2, y, `${this.settings[settingKey]}%`, LABEL_STYLE).setOrigin(1, 0.5);

    this.add.text(x - width / 2, y, label, LABEL_STYLE).setOrigin(0, 0.5);
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
      debugOverlay: true,
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

  openRulesPanel() {
    this.scene.launch('RulesPanelScene', { returnSceneKey: 'SettingsScene' });
    this.scene.pause();
  }

  resumeFromRulesPanel() {
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
