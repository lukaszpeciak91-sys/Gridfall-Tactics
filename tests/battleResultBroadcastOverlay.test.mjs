import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
const showStart = source.indexOf('  showBattleResultModal() {');
const buttonStart = source.indexOf('  createResultModalButton', showStart);
const showBattleResultModalSource = source.slice(showStart, buttonStart);

test('battle result screen uses a fullscreen broadcast overlay instead of a modal panel', () => {
  assert.match(showBattleResultModalSource, /this\.add\.rectangle\(centerX, height \* 0\.5, width, height, 0x000000, presentation\.overlayAlpha\)/);
  assert.doesNotMatch(showBattleResultModalSource, /setStrokeStyle\(4, presentation\.frameColor/);
  assert.doesNotMatch(showBattleResultModalSource, /presentation\.panelFill/);
  assert.doesNotMatch(showBattleResultModalSource, /broadcastRule/);
  assert.doesNotMatch(showBattleResultModalSource, /innerSheen/);
});

test('battle result title is unconstrained and has a slow subtle broadcast pulse', () => {
  assert.match(showBattleResultModalSource, /const title = this\.add\.text\(centerX, centerY - overlayHeight \* 0\.13, resultText,/);
  const titleStart = showBattleResultModalSource.indexOf('    const title = this.add.text');
  const subtitleStart = showBattleResultModalSource.indexOf('    const subtitle = this.add.text', titleStart);
  const titleSource = showBattleResultModalSource.slice(titleStart, subtitleStart);
  assert.doesNotMatch(titleSource, /wordWrap/);
  assert.match(source, /titlePulseScale: 1\.03/);
  assert.match(showBattleResultModalSource, /targets: \[title, titleGlow\],[\s\S]*scale: presentation\.titlePulseScale,[\s\S]*duration: 1850,[\s\S]*yoyo: true,[\s\S]*repeat: -1,[\s\S]*ease: 'Sine\.easeInOut'/);
});
