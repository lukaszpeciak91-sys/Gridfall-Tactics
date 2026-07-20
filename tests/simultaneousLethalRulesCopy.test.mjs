import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import en from '../src/localization/translations/en.json' with { type: 'json' };
import pl from '../src/localization/translations/pl.json' with { type: 'json' };

const enRule = 'If both Bases are destroyed during the same combat resolution, the battle ends in a draw.';
const plRule = 'Jeśli obie Bazy zostaną zniszczone podczas tego samego rozliczenia walki, bitwa kończy się remisem.';

test('player-facing Rules explain simultaneous base destruction draws in English and Polish', () => {
  assert.ok(en.ui.rules.sections.some((section) => section.lines?.includes(enRule)));
  assert.ok(pl.ui.rules.sections.some((section) => section.lines?.includes(plRule)));
});

test('active canonical battle rules remove raw-overkill simultaneous lethal winner wording', () => {
  const rules = fs.readFileSync('docs/rules/mvp-battle-rules.md', 'utf8');

  assert.match(rules, /If both bases are at \*\*0 or lower HP during the same combat\/finalization window\*\*, the battle ends in a \*\*draw\*\*\./);
  assert.doesNotMatch(rules, /higher raw .*base HP/i);
  assert.doesNotMatch(rules, /raw final base HP values before clamping/i);
  assert.doesNotMatch(rules, /raw-HP tiebreak/i);
});
