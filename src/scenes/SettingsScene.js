import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createBuildMarker } from '../ui/buildMarker.js';
import { createBottomNavigationControls, requestPortraitOrientationLock, toggleSceneFullscreen } from '../ui/navigationControls.js';

const SETTINGS_STORAGE_KEY = 'gridfall:tactics:settings:v1';
const DEFAULT_SETTINGS = {
  language: 'en',
  musicVolume: 50,
  sfxVolume: 50,
  muted: false,
};
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'pl', label: 'Polish' },
];
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
  }

  init() {
    this.cleanupScene();
  }

  preload() {
    preloadMenuBackgroundArt(this);
  }

  create() {
    const { width, height } = this.scale;
    this.settings = this.loadSettings();
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

    this.add
      .text(width / 2, height * 0.1, 'SETTINGS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#f8fafc',
        align: 'center',
        wordWrap: { width: width * 0.86 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.15, 'Preferences are saved locally', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const panelWidth = Math.min(width - 32, 342);
    this.addPanel(width / 2, height * 0.3, panelWidth, 154, 'LANGUAGE');
    this.createLanguageSelect(width / 2, height * 0.32, panelWidth - 74);

    const audioPanelHeight = 300;
    const audioPanelTop = height * 0.44;
    const audioPanelY = audioPanelTop + audioPanelHeight / 2;
    const muteToggleY = audioPanelTop + 70;
    const musicSliderY = audioPanelTop + 132;
    const sfxSliderY = audioPanelTop + 222;
    this.addPanel(width / 2, audioPanelY, panelWidth, audioPanelHeight, 'AUDIO');
    this.createMuteToggle(width / 2, muteToggleY, 44);
    this.createVolumeSlider(width / 2, musicSliderY, panelWidth - 76, 'Music Volume', 'musicVolume');
    this.createVolumeSlider(width / 2, sfxSliderY, panelWidth - 76, 'SFX Volume', 'sfxVolume');

    const buildMarker = createBuildMarker(this, { width, height });
    this.drawNavigationControls();
    this.children.bringToTop(buildMarker);
  }

  loadSettings() {
    const stored = this.readStoredSettings();
    return this.normalizeSettings({ ...DEFAULT_SETTINGS, ...stored });
  }

  readStoredSettings() {
    const storage = this.getLocalStorage();
    if (!storage) {
      return {};
    }

    try {
      const rawSettings = storage.getItem(SETTINGS_STORAGE_KEY);
      return rawSettings ? JSON.parse(rawSettings) : {};
    } catch (error) {
      console.warn('Settings localStorage read failed; defaults will be used.', error);
      return {};
    }
  }

  saveSettings() {
    const storage = this.getLocalStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Settings localStorage write failed; changes remain in memory only.', error);
    }
  }

  getLocalStorage() {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage;
    } catch (error) {
      console.warn('Settings localStorage is unavailable; changes remain in memory only.', error);
      return null;
    }
  }

  normalizeSettings(settings) {
    const languageValues = LANGUAGE_OPTIONS.map((option) => option.value);
    return {
      language: languageValues.includes(settings.language) ? settings.language : DEFAULT_SETTINGS.language,
      musicVolume: this.clampVolume(settings.musicVolume),
      sfxVolume: this.clampVolume(settings.sfxVolume),
      muted: Boolean(settings.muted),
    };
  }

  clampVolume(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return DEFAULT_SETTINGS.musicVolume;
    }

    return Phaser.Math.Clamp(Math.round(numericValue), 0, 100);
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
      .text(x, y + 54, 'Select display language for future localization', {
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

    LANGUAGE_OPTIONS.forEach((option, index) => {
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

      const selectLanguage = () => {
        this.settings.language = option.value;
        this.saveSettings();
        this.languageValueText.setText(option.label);
        statusText.setText(`Language: ${option.label}`);
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
    this.languageMenuItems.forEach((item) => {
      const matchingOption = LANGUAGE_OPTIONS.find((option) => item.text === option.label);
      if (!matchingOption) {
        item.setVisible(this.languageMenuOpen);
        return;
      }

      item.setColor(matchingOption.value === this.settings.language ? '#111827' : '#f8fafc');
      item.setVisible(this.languageMenuOpen);
    });

    this.languageMenuItems
      .filter((item) => item.type === 'Rectangle')
      .forEach((item, index) => {
        const option = LANGUAGE_OPTIONS[index];
        item.setFillStyle(option.value === this.settings.language ? 0x93c5fd : 0x1e293b, 1);
        item.setVisible(this.languageMenuOpen);
      });
  }

  getSelectedLanguageOption() {
    return LANGUAGE_OPTIONS.find((option) => option.value === this.settings.language) ?? LANGUAGE_OPTIONS[0];
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
      this.settings[settingKey] = percent;
      this.saveSettings();
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

  createMuteToggle(x, y, size) {
    const button = this.add.container(x, y);
    const halo = this.add
      .circle(0, 0, size * 0.58, 0x38bdf8, this.settings.muted ? 0.16 : 0.08)
      .setStrokeStyle(1, 0x7dd3fc, this.settings.muted ? 0.34 : 0.18);
    const backing = this.add
      .rectangle(0, 0, size, size, 0x020617, 0.66)
      .setStrokeStyle(1, this.settings.muted ? 0x93c5fd : 0x94a3b8, this.settings.muted ? 0.9 : 0.58);
    const icon = this.add.graphics();

    button.add([halo, backing, icon]);
    button.setSize(size, size);
    button.setDepth(2);

    const refreshButton = (isHovering = false) => {
      const isMuted = this.settings.muted;
      backing.setFillStyle(isMuted ? 0x0f2742 : (isHovering ? 0x0f172a : 0x020617), isMuted ? 0.82 : (isHovering ? 0.72 : 0.66));
      backing.setStrokeStyle(1, isMuted || isHovering ? 0x7dd3fc : 0x94a3b8, isMuted ? 0.95 : (isHovering ? 0.82 : 0.58));
      halo.setFillStyle(isMuted ? 0x60a5fa : 0x38bdf8, isMuted ? 0.2 : (isHovering ? 0.18 : 0.08));
      halo.setStrokeStyle(1, 0x7dd3fc, isMuted ? 0.38 : (isHovering ? 0.3 : 0.18));
      this.drawSpeakerIcon(icon, size, isMuted);
    };

    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => refreshButton(true));
    button.on('pointerout', () => refreshButton(false));
    button.on('pointerup', () => {
      this.settings.muted = !this.settings.muted;
      this.saveSettings();
      refreshButton(false);
    });

    refreshButton(false);
  }

  drawSpeakerIcon(icon, size, isMuted) {
    const iconColor = isMuted ? 0xbfdbfe : 0xf8fafc;
    const slashColor = 0xf87171;
    const unit = size / 44;

    icon.clear();
    icon.fillStyle(iconColor, 1);
    icon.lineStyle(2.4 * unit, iconColor, 1);
    icon.beginPath();
    icon.moveTo(-13 * unit, -6 * unit);
    icon.lineTo(-7 * unit, -6 * unit);
    icon.lineTo(1 * unit, -13 * unit);
    icon.lineTo(1 * unit, 13 * unit);
    icon.lineTo(-7 * unit, 6 * unit);
    icon.lineTo(-13 * unit, 6 * unit);
    icon.closePath();
    icon.fillPath();

    if (isMuted) {
      icon.lineStyle(2.8 * unit, slashColor, 1);
      icon.beginPath();
      icon.moveTo(8 * unit, -10 * unit);
      icon.lineTo(17 * unit, 10 * unit);
      icon.strokePath();
      icon.beginPath();
      icon.moveTo(17 * unit, -10 * unit);
      icon.lineTo(8 * unit, 10 * unit);
      icon.strokePath();
      return;
    }

    icon.beginPath();
    icon.arc(6 * unit, 0, 7 * unit, -0.82, 0.82);
    icon.strokePath();
    icon.beginPath();
    icon.arc(6 * unit, 0, 12 * unit, -0.62, 0.62);
    icon.strokePath();
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
      this.scene.restart();
    }
  }

  cleanupScene() {
    this.scale?.off('enterfullscreen', this.onFullscreenChanged, this);
    this.scale?.off('leavefullscreen', this.onFullscreenChanged, this);
  }
}
