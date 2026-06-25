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

test('battle result title is unconstrained, lowered, and has a slow subtle broadcast pulse', () => {
  assert.match(showBattleResultModalSource, /const title = this\.add\.text\(centerX, centerY - overlayHeight \* 0\.1, resultText,/);
  const titleStart = showBattleResultModalSource.indexOf('    const title = this.add.text');
  const subtitleStart = showBattleResultModalSource.indexOf('    const subtitle = this.add.text', titleStart);
  const titleSource = showBattleResultModalSource.slice(titleStart, subtitleStart);
  assert.doesNotMatch(titleSource, /wordWrap/);
  assert.match(source, /titlePulseScale: 1\.03/);
  assert.match(showBattleResultModalSource, /targets: \[title, titleGlow\],[\s\S]*scale: presentation\.titlePulseScale,[\s\S]*duration: 1850,[\s\S]*yoyo: true,[\s\S]*repeat: -1,[\s\S]*ease: 'Sine\.easeInOut'/);
});


test('battle result overlay polish keeps hierarchy panel-free while elevating subtitle and controls', () => {
  assert.match(showBattleResultModalSource, /const centerY = height \* 0\.38/);
  assert.match(showBattleResultModalSource, /fontSize: `\$\{Math\.max\(20, Math\.floor\(height \* 0\.029\)\)\}px`/);
  assert.match(showBattleResultModalSource, /color: presentation\.subtitleColor/);
  assert.match(showBattleResultModalSource, /const subtitle = this\.add\.text\(centerX, centerY \+ overlayHeight \* 0\.2, resultSubtitle,/);
  assert.match(showBattleResultModalSource, /const dividerY = centerY \+ overlayHeight \* 0\.37/);
  assert.match(showBattleResultModalSource, /const dividerCore = this\.add\.rectangle\(centerX, dividerY, dividerWidth, 1, presentation\.accentColor, 0\.52\)/);
  assert.match(showBattleResultModalSource, /const buttonWidth = Math\.min\(198, Math\.max\(160, width \* 0\.39\)\)/);
  assert.match(showBattleResultModalSource, /const buttonHeight = Math\.max\(68, Math\.min\(80, Math\.floor\(height \* 0\.088\)\)\)/);
  assert.match(showBattleResultModalSource, /const buttonY = Math\.min\([\s\S]*height \* 0\.6,[\s\S]*this\.layout\.playerHero\.y - buttonHeight \* 0\.5 - Math\.max\(6, height \* 0\.01\),[\s\S]*\)/);
  assert.doesNotMatch(showBattleResultModalSource, /panelFill|setStrokeStyle\(4|innerSheen/);
});


test('battle result stats insert compact turns and time block without changing result buttons', () => {
  assert.match(source, /this\.battleStartedAt = Date\.now\(\)/);
  assert.match(source, /this\.battleEndedAt \?\?= Date\.now\(\)/);
  assert.match(source, /formatBattleDuration\(totalSeconds\)/);
  assert.match(source, /turnsLabel.*turns.*timeLabel.*formatBattleDuration\(elapsedSeconds\)/s);
  assert.match(showBattleResultModalSource, /const resultStatsText = this\.getBattleResultStatsText\(\)/);
  assert.match(showBattleResultModalSource, /const stats = this\.add\.text\(centerX, centerY \+ overlayHeight \* 0\.48, resultStatsText,/);
  assert.match(showBattleResultModalSource, /fontSize: `\$\{Math\.max\(14, Math\.min\(20, Math\.floor\(height \* 0\.021\)\)\)\}px`/);
  assert.match(showBattleResultModalSource, /translateActive\('ui\.common\.continue', 'CONTINUE'\)/);
  assert.match(showBattleResultModalSource, /translateActive\('ui\.common\.exit', 'EXIT'\)/);
  assert.match(showBattleResultModalSource, /translateActive\('ui\.common\.retry', 'RETRY'\)/);
});

test('result buttons immediately stop active outcome stingers before navigation handlers run', () => {
  const buttonEnd = source.indexOf('  destroyBattleResultModal()', buttonStart);
  const buttonSource = source.slice(buttonStart, buttonEnd);
  assert.match(buttonSource, /onPointerUp: \(\) => \{[\s\S]*this\.guardPointerEvent\(\);[\s\S]*this\.stopOutcomeStinger\(\{ fadeMs: 0 \}\);[\s\S]*if \(this\.navigationInProgress\) return;[\s\S]*onClick\(\);/);
});

test('victory celebration reuses particles across three staggered waves', () => {
  assert.match(source, /\[0, 800, 1600\]\.forEach\(\(delayMs, waveIndex\) => \{/);
  assert.match(source, /const spawnWave = \(waveIndex\) => \{/);
  assert.match(source, /const waveOffsetX = \(Math\.random\(\) - 0\.5\) \* overlayWidth \* 0\.08/);
  assert.match(source, /this\.add\.rectangle\(startX, startY, size, size \* \(1\.35 \+ Math\.random\(\)\), color, 0\.9\)/);
  assert.match(source, /this\.add\.circle\(/);
});
