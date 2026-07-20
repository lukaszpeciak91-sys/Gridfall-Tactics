import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateBattleUtilityMenuLayout } from '../src/ui/battleMenuLayout.js';

const battleSource = readFileSync(new URL('../src/scenes/BattleScene.js', import.meta.url), 'utf8');
const portraitMobile = Object.freeze({
  width: 390,
  height: 844,
  margin: 16,
  triggerX: 24,
  triggerY: 716,
  triggerWidth: 48,
  triggerHeight: 48,
});

function layout(actionCount) {
  return calculateBattleUtilityMenuLayout({ ...portraitMobile, actionCount });
}

function assertButtonsFitPanel(metrics) {
  const panelBottom = metrics.panelTop + metrics.panelHeight;
  assert.ok(metrics.panelTop >= portraitMobile.margin, 'panel must stay within the top portrait viewport margin');
  assert.ok(panelBottom <= portraitMobile.height - portraitMobile.margin, 'panel must stay within the bottom portrait viewport margin');
  for (const position of metrics.buttonPositions) {
    assert.ok(position.top >= metrics.panelTop, `button ${position.index} top must be in panel`);
    assert.ok(position.bottom <= panelBottom, `button ${position.index} bottom must be in panel`);
  }
}

test('battle report-enabled utility menu gives four actions visible in-panel portrait positions', () => {
  const metrics = layout(4);
  assert.equal(metrics.buttonPositions.length, 4);
  assertButtonsFitPanel(metrics);
  assert.ok(metrics.panelHeight > layout(3).panelHeight, 'four actions should dynamically expand the panel only when needed');
});

test('battle report is the final visible utility menu action when enabled', () => {
  assert.match(battleSource, /id: 'rules'[\s\S]*id: 'settings'[\s\S]*id: 'surrender'[\s\S]*id: 'battleReport'/);
  assert.match(battleSource, /SHOW_BATTLE_REPORT_TOOL \? \[\{ id: 'battleReport'/);
  assert.match(battleSource, /utilityMenuActions\.map\(\(action, index\) => this\.createUtilityMenuButton\([\s\S]*firstButtonY \+ buttonGap \* index/);
});

test('disabled battle report flag keeps the three-action mobile layout valid', () => {
  const metrics = layout(3);
  assert.equal(metrics.buttonPositions.length, 3);
  assertButtonsFitPanel(metrics);
});
