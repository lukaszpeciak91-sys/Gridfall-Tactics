import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('battle ambience is registered as quiet music and preloaded with audio assets', () => {
  const source = read('src/audio/audioAssets.js');
  assert.match(source, /BATTLE_AMBIENCE: 'music\.battleAmbience'/);
  assert.match(source, /path: musicPath\('battle-ambience\.mp3'\), category: 'music', loop: true, volume: 0\.08, busVolume: 1/);
});

test('music volume calculations allow per-music bus overrides for ambience', () => {
  const source = read('src/audio/audioPlayback.js');
  assert.match(source, /Number\.isFinite\(asset\.busVolume\)/);
  assert.match(source, /settingsVolume \* assetVolume \* optionVolume \* clampUnit\(asset\.busVolume, MUSIC_BUS_VOLUME\)/);
});

test('BattleScene starts ambience for gameplay and stops it before result SFX', () => {
  const source = read('src/scenes/BattleScene.js');
  assert.match(source, /import \{ playManagedSfx, playMusic, playSfx, stopManagedSfx, stopMusic \} from '\.\.\/audio\/audioPlayback\.js';/);
  assert.match(source, /startBattleAmbience\(\) \{\s*if \(this\.isCampaignCompletionPreview\(\) \|\| this\.gameState\?\.winner\) return null;[\s\S]*return playMusic\(this, AUDIO_KEYS\.BATTLE_AMBIENCE\);/);
  assert.match(source, /this\.startBattleAmbience\(\);\s*if \(this\.isCampaignCompletionPreview\(\)\)/);
  assert.match(source, /this\.stopBattleAmbience\(\{ fadeMs: 350 \}\);\s*this\.updateActionSlotBadge\(\);/);
  assert.match(source, /playOutcomeStinger\(key\) \{\s*if \(!\[AUDIO_KEYS\.BATTLE_VICTORY, AUDIO_KEYS\.BATTLE_DEFEAT\]\.includes\(key\)\) return false;\s*this\.stopBattleAmbience\(\{ fadeMs: 0 \}\);/);
  assert.match(source, /shutdown\(\) \{\s*this\.cleanupSceneObjects\(\);\s*this\.stopBattleAmbience\(\{ fadeMs: 0 \}\);/);
});
