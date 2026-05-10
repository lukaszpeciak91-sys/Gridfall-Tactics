import Phaser from 'phaser';
import {
  MENU_BACKGROUND_FALLBACK_COLOR,
  MENU_BACKGROUND_FALLBACK_COLOR_HEX,
  createCoverBackground,
  getMenuBackgroundAsset,
  preloadMenuBackgroundArt,
} from '../rendering/backgroundArt.js';
import { createModalBackButton } from '../ui/modalControls.js';

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
const MUTE_ENABLED_LABEL = 'Sound Enabled';
const MUTE_MUTED_LABEL = 'Sound Muted';

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
    this.muteToggleHitArea = null;
    this.muteIconGraphic = null;
    this.muteStatusText = null;
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

    this.add
      .text(width / 2, 54, 'SETTINGS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 98, 'Preferences are saved locally', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const panelWidth = Math.min(width - 32, 342);
    this.addPanel(width / 2, height * 0.27, panelWidth, 154, 'LANGUAGE');
    this.createLanguageSelect(width / 2, height * 0.29, panelWidth - 74);

    this.addPanel(width / 2, height * 0.55, panelWidth, 288, 'AUDIO');
    this.createVolumeSlider(width / 2, height * 0.49, panelWidth - 76, 'Music Volume', 'musicVolume');
    this.createVolumeSlider(width / 2, height * 0.61, panelWidth - 76, 'SFX Volume', 'sfxVolume');
    this.createMuteToggle(width / 2, height * 0.72);

    this.createBackButton(width, height);
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
    this.add.rectangle(x + 2, y + 4, width, height, 0x020617, 0.36).setOrigin(0.5);
    this.add.rectangle(x, y, width, height, 0x0f172a, 0.88).setStrokeStyle(1, 0x334155, 0.9).setOrigin(0.5);
    this.add
      .text(x, y - height / 2 + 22, title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#93c5fd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
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

  updateSliderVisuals({ x, width, fill, knob, valueText, settingKey }) {
    const percent = this.settings[settingKey];
    const fillWidth = width * (percent / 100);
    fill.setDisplaySize(Math.max(0.1, fillWidth), fill.height);
    knob.setPosition(x - width / 2 + fillWidth, knob.y);
    valueText.setText(`${percent}%`);
  }

  createMuteToggle(x, y) {
    const toggleWidth = 228;
    const toggleHeight = 46;
    const iconX = x - 62;
    const labelX = x - 28;

    this.muteToggleHitArea = this.add
      .rectangle(x, y, toggleWidth, toggleHeight, 0x1e293b, 0.36)
      .setStrokeStyle(1, 0x334155, 0.9)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.muteIconGraphic = this.add.graphics();

    this.muteStatusText = this.add
      .text(labelX, y, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#e5e7eb',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const toggleMute = () => {
      this.settings.muted = !this.settings.muted;
      this.saveSettings();
      this.updateMuteToggle();
    };

    [this.muteToggleHitArea, this.muteStatusText].forEach((target) => {
      target.setInteractive({ useHandCursor: true });
      target.on('pointerover', () => this.muteToggleHitArea.setFillStyle(0x334155, 0.5));
      target.on('pointerout', () => this.muteToggleHitArea.setFillStyle(0x1e293b, 0.36));
      target.on('pointerup', toggleMute);
    });

    this.muteToggleIconPosition = { x: iconX, y };
    this.updateMuteToggle();
  }

  updateMuteToggle() {
    this.drawMuteIcon(this.muteToggleIconPosition.x, this.muteToggleIconPosition.y, this.settings.muted);
    this.muteStatusText.setText(this.settings.muted ? MUTE_MUTED_LABEL : MUTE_ENABLED_LABEL);
  }

  drawMuteIcon(x, y, muted) {
    this.muteIconGraphic.clear();
    this.muteIconGraphic.fillStyle(0xf8fafc, 1);
    this.muteIconGraphic.fillRect(x - 13, y - 7, 6, 14);
    this.muteIconGraphic.fillTriangle(x - 7, y - 9, x + 4, y - 16, x + 4, y + 16);
    this.muteIconGraphic.lineStyle(3, 0x93c5fd, 1);
    this.muteIconGraphic.beginPath();
    this.muteIconGraphic.moveTo(x + 9, y - 10);
    this.muteIconGraphic.quadraticCurveTo(x + 18, y, x + 9, y + 10);
    this.muteIconGraphic.strokePath();

    if (!muted) {
      this.muteIconGraphic.lineStyle(3, 0xbfdbfe, 0.86);
      this.muteIconGraphic.beginPath();
      this.muteIconGraphic.moveTo(x + 15, y - 15);
      this.muteIconGraphic.quadraticCurveTo(x + 29, y, x + 15, y + 15);
      this.muteIconGraphic.strokePath();
      return;
    }

    this.muteIconGraphic.lineStyle(4, 0xfde68a, 1);
    this.muteIconGraphic.beginPath();
    this.muteIconGraphic.moveTo(x - 15, y + 17);
    this.muteIconGraphic.lineTo(x + 29, y - 17);
    this.muteIconGraphic.strokePath();
  }

  createBackButton(width, height) {
    createModalBackButton(this, {
      x: width / 2,
      y: height - 96,
      width: 156,
      height: 48,
      onPointerUp: () => this.scene.start('MainMenuScene'),
    });
  }
}
