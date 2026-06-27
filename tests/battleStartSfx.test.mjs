import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('battle start SFX is registered as a tunable expected-path asset', () => {
  const source = read('src/audio/audioAssets.js');
  assert.match(source, /BATTLE_START: 'battle\.start'/);
  assert.match(source, /\[AUDIO_KEYS\.BATTLE_START\]: Object\.freeze\(\{ key: AUDIO_KEYS\.BATTLE_START, path: sfxPath\('battle-start\.mp3'\), category: 'sfx', cooldownMs: 1000, volume: 0\.5 \}\)/);
});

test('BattleScene plays battle start SFX once at the opening banner presentation point', () => {
  const battleScene = read('src/scenes/BattleScene.js');
  const gameState = read('src/systems/GameState.js');

  assert.match(gameState, /battleStartPresentationSfxPlayed: false/);
  assert.match(battleScene, /playBattleStartPresentationSfx\(\) \{\s*if \(!this\.gameState \|\| this\.gameState\.battleStartPresentationSfxPlayed\) return null;\s*this\.gameState\.battleStartPresentationSfxPlayed = true;\s*return this\.playBattleSfx\?\.\(AUDIO_KEYS\.BATTLE_START, \{ cooldownMs: 0 \}\);\s*\}/);
  assert.match(battleScene, /this\.hasShownOpeningTurnStartBanner = true;\s*this\.playBattleStartPresentationSfx\(\);\s*const \{ height, board \} = this\.layout;/);
});
