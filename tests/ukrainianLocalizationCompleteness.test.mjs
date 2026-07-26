import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pl = JSON.parse(readFileSync('src/localization/translations/pl.json', 'utf8'));
const uk = JSON.parse(readFileSync('src/localization/translations/uk.json', 'utf8'));

function collectCopiedPlayerFacingText(polish, ukrainian, path = [], copied = []) {
  for (const [key, value] of Object.entries(polish)) {
    const nextPath = [...path, key];
    const localized = ukrainian?.[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectCopiedPlayerFacingText(value, localized, nextPath, copied);
    } else if (nextPath[0] === 'ui' && JSON.stringify(value) === JSON.stringify(localized)) {
      copied.push(nextPath.join('.'));
    }
  }
  return copied;
}

test('Ukrainian player-facing UI does not fall through to copied Polish text', () => {
  const allowedBranding = new Set(['ui.start.title', 'ui.mainMenu.title', 'ui.battle.deckInfo.history.baseSuffix', 'ui.cardDetails.atkHp']);
  const copied = collectCopiedPlayerFacingText(pl, uk).filter((key) => !allowedBranding.has(key));
  assert.deepEqual(copied, []);
});

test('Ukrainian localization covers Rules, Settings, Battle, and generated history structures', () => {
  for (const section of ['common', 'settings', 'battleMenu', 'battle', 'rules']) {
    assert.deepEqual(Object.keys(uk.ui[section]).sort(), Object.keys(pl.ui[section]).sort());
  }
  assert.equal(uk.ui.rules.sections.length, pl.ui.rules.sections.length);
  assert.deepEqual(Object.keys(uk.ui.battle.deckInfo.history).sort(), Object.keys(pl.ui.battle.deckInfo.history).sort());
});
