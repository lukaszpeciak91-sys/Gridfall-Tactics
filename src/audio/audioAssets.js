import { resolvePublicAssetPath } from '../rendering/backgroundArt.js';

export const AUDIO_KEYS = Object.freeze({
  UI_CLICK: 'ui.click',
  UI_INVALID: 'ui.invalid',
  CARD_DRAW: 'card.draw',
  CARD_DEPLOY: 'card.deploy',
  SPELL_GENERIC: 'spell.generic',
  ATTACK_IMPACT: 'attack.impact',
  UNIT_DEATH: 'unit.death',
  BASE_BREAK: 'base.break',
  BATTLE_VICTORY: 'battle.victory',
  BATTLE_DEFEAT: 'battle.defeat',
  BASE_HIT: 'base.hit',
  MENU_MUSIC: 'music.menu',
});

const sfxPath = (filename) => resolvePublicAssetPath(`assets/audio/sfx/${filename}`);
const musicPath = (filename) => resolvePublicAssetPath(`assets/audio/music/${filename}`);

export const AUDIO_ASSETS = Object.freeze({
  [AUDIO_KEYS.UI_CLICK]: Object.freeze({ key: AUDIO_KEYS.UI_CLICK, path: sfxPath('ui-click.mp3'), category: 'sfx', cooldownMs: 45 }),
  [AUDIO_KEYS.UI_INVALID]: Object.freeze({ key: AUDIO_KEYS.UI_INVALID, path: sfxPath('ui-invalid.mp3'), category: 'sfx', cooldownMs: 160 }),
  [AUDIO_KEYS.CARD_DRAW]: Object.freeze({ key: AUDIO_KEYS.CARD_DRAW, path: sfxPath('card-draw.mp3'), category: 'sfx', cooldownMs: 80 }),
  [AUDIO_KEYS.CARD_DEPLOY]: Object.freeze({ key: AUDIO_KEYS.CARD_DEPLOY, path: sfxPath('card-deploy.mp3'), category: 'sfx', cooldownMs: 80 }),
  [AUDIO_KEYS.SPELL_GENERIC]: Object.freeze({ key: AUDIO_KEYS.SPELL_GENERIC, path: sfxPath('spell-generic.mp3'), category: 'sfx', cooldownMs: 90 }),
  [AUDIO_KEYS.ATTACK_IMPACT]: Object.freeze({ key: AUDIO_KEYS.ATTACK_IMPACT, path: sfxPath('attack-impact.mp3'), category: 'sfx', cooldownMs: 70 }),
  [AUDIO_KEYS.UNIT_DEATH]: Object.freeze({ key: AUDIO_KEYS.UNIT_DEATH, path: sfxPath('unit-death.mp3'), category: 'sfx', cooldownMs: 110 }),
  [AUDIO_KEYS.BASE_BREAK]: Object.freeze({ key: AUDIO_KEYS.BASE_BREAK, path: sfxPath('base-break.mp3'), category: 'sfx', cooldownMs: 250 }),
  [AUDIO_KEYS.BATTLE_VICTORY]: Object.freeze({ key: AUDIO_KEYS.BATTLE_VICTORY, path: sfxPath('battle-victory.mp3'), category: 'sfx', cooldownMs: 1000, volume: 0.45 }),
  [AUDIO_KEYS.BATTLE_DEFEAT]: Object.freeze({ key: AUDIO_KEYS.BATTLE_DEFEAT, path: sfxPath('battle-defeat.mp3'), category: 'sfx', cooldownMs: 1000 }),
  [AUDIO_KEYS.BASE_HIT]: Object.freeze({ key: AUDIO_KEYS.BASE_HIT, path: sfxPath('base-hit.mp3'), category: 'sfx', cooldownMs: 120 }),
  [AUDIO_KEYS.MENU_MUSIC]: Object.freeze({ key: AUDIO_KEYS.MENU_MUSIC, path: musicPath('menu-music.mp3'), category: 'music', loop: true }),
});

export function getAudioAsset(key) {
  return AUDIO_ASSETS[key] ?? null;
}

export function hasCachedAudioAsset(scene, key) {
  if (!key || !scene?.cache?.audio) return false;
  return Boolean(scene.cache.audio.exists?.(key) ?? scene.cache.audio.has?.(key));
}

export function preloadAudioAssets(scene) {
  if (!scene?.load?.audio) return;

  Object.values(AUDIO_ASSETS).forEach((asset) => {
    if (!asset?.key || !asset?.path || hasCachedAudioAsset(scene, asset.key)) return;
    scene.load.audio(asset.key, asset.path);
  });
}
