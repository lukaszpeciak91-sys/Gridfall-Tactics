import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

function runPython(source) {
  return execFileSync('python3', ['-c', source], { cwd: process.cwd(), encoding: 'utf8' });
}

const pyPrelude = String.raw`
import importlib.util, json, tempfile, subprocess
from pathlib import Path
spec = importlib.util.spec_from_file_location('balance_lab', 'tools/balance-lab/run_balance_lab.py')
bl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bl)
root = Path('.')
base_card = {
  'id': 'overclock_card_1', 'cardNumber': 1, 'artAssetId': 'overclock_01', 'name': 'Hot Runner',
  'type': 'unit', 'targeting': 'lane', 'effectId': 'lane_empty_bonus_damage', 'textShort': 'Open lane: +2 ATK',
  'attack': 2, 'hp': 1, 'armor': 0
}
def custom(fid='overclock'):
  return {'id': fid, 'name': 'Overclock', 'frameImage': 'frame_default', 'deck': [dict(base_card, id=f'{fid}_card_{i}', cardNumber=i) for i in range(1, 11)]}
`;

function assertPythonRaises(body, expected) {
  const source = `${pyPrelude}\ntry:\n${body.split('\n').map((line) => `  ${line}`).join('\n')}\nexcept bl.BalanceLabError as error:\n  print(error)\nelse:\n  raise SystemExit('expected BalanceLabError')\n`;
  const output = runPython(source);
  assert.match(output, expected);
}

test('Balance Lab writes valid custom faction only into temp copy', () => {
  const output = runPython(`${pyPrelude}\nwith tempfile.TemporaryDirectory() as tmp:\n  temp = Path(tmp)\n  applied = bl.write_custom_factions(temp, bl.validate_custom_factions(root, [custom()]))\n  assert (temp / 'src/data/factions/overclock.json').exists()\n  assert not (root / 'src/data/factions/overclock.json').exists()\n  assert applied[0]['deckSize'] == 10\nprint('ok')\n`);
  assert.match(output.trim(), /ok$/);
});


test('Balance Lab temp-copy custom faction is loaded by simulator registry without changing production repo', () => {
  const output = runPython(`${pyPrelude}
with tempfile.TemporaryDirectory() as tmp:
  temp = Path(tmp) / 'repo'
  bl.copy_repo_to_temp(root, temp)
  applied = bl.write_custom_factions(temp, bl.validate_custom_factions(root, [custom()]))
  temp_faction = temp / 'src/data/factions/overclock.json'
  assert temp_faction.exists()
  assert not (root / 'src/data/factions/overclock.json').exists()
  assert applied[0]['registryPatched'] is True
  registry = (temp / 'src/data/factions/index.js').read_text()
  assert "./overclock.json" in registry
  baseline = subprocess.check_output(['node', 'scripts/simulate-battles.mjs', '--total=1'], cwd=root, text=True)
  experiment = subprocess.check_output(['node', 'scripts/simulate-battles.mjs', '--total=1', '--telemetry=cards'], cwd=temp, text=True)
  assert 'Simulated faction matrix: 6 factions, 36 ordered matchups.' in baseline
  assert 'overclock' not in baseline
  assert 'Simulated faction matrix: 7 factions, 49 ordered matchups.' in experiment
  assert 'overclock' in experiment
  assert 'overclock_card_1' in experiment
print('ok')
`);
  assert.match(output.trim(), /ok$/);
});

test('Balance Lab rejects custom faction id collisions and duplicates', () => {
  assertPythonRaises("bl.validate_custom_factions(root, [custom('aggro')])", /collides/);
  assertPythonRaises("bl.validate_custom_factions(root, [custom('dupe-faction'), custom('dupe-faction')])", /duplicated/);
});


test('Balance Lab accepts friendly-only swap effect for custom factions', () => {
  const output = runPython(`${pyPrelude}
f=custom(); f['deck'][0]['type']='order'; f['deck'][0].pop('attack', None); f['deck'][0].pop('hp', None); f['deck'][0].pop('armor', None); f['deck'][0]['targeting']='friendly_unit'; f['deck'][0]['effectId']='swap_any_two_friendly_units'; f['deck'][0]['textShort']='Swap any 2 [ALLY].'; validated=bl.validate_custom_factions(root, [f]); assert validated[0]['deck'][0]['effectId']=='swap_any_two_friendly_units'
print('ok')
`);
  assert.match(output.trim(), /ok$/);
});

test('Balance Lab rejects duplicate card ids, unknown effectIds, and effectParams', () => {
  assertPythonRaises("f=custom(); f['deck'][1]['id']=f['deck'][0]['id']; bl.validate_custom_factions(root, [f])", /duplicated/);
  assertPythonRaises("f=custom(); f['deck'][0]['effectId']='brand_new_effect'; bl.validate_custom_factions(root, [f])", /not an existing effectId/);
  assertPythonRaises("f=custom(); f['deck'][0]['effectParams']={'x':1}; bl.validate_custom_factions(root, [f])", /effectParams/);
});

test('Balance Lab comparison report handles experiment-only custom faction rows', () => {
  const output = runPython(`${pyPrelude}\nfrom pathlib import Path\nbaseline = '''Balance audit: aggregate faction table\n┌─────────┬───────────┬───────┬─────────┬────────────────┬────────┬────────────┬───────────┬───────────────────────┐\n│ (index) │ faction   │ games │ win %   │ non-draw win % │ draw % │ turn-cap % │ avg turns │ avg remaining hero HP │\n├─────────┼───────────┼───────┼─────────┼────────────────┼────────┼────────────┼───────────┼───────────────────────┤\n│ 0       │ 'aggro'   │ 10    │ '50.0%' │ '50.0%'        │ '0.0%' │ '0.0%'     │ '5.0'     │ '3.0'                 │\n└─────────┴───────────┴───────┴─────────┴────────────────┴────────┴────────────┴───────────┴───────────────────────┘\nBalance audit: combined matchup table across both seats\n┌─────────┬───────────┬───────────┬───────┬────────────────┬────────────────┬───────┬────────────────────────┬───────────────────────┬────────┬────────────┬───────────┐\n│ (index) │ faction A │ faction B │ games │ faction A wins │ faction B wins │ draws │ faction A all-games WR │ faction A non-draw WR │ draw % │ turn-cap % │ avg turns │\n├─────────┼───────────┼───────────┼───────┼────────────────┼────────────────┼───────┼────────────────────────┼───────────────────────┼────────┼────────────┼───────────┤\n│ 0       │ 'aggro'   │ 'aggro'   │ 10    │ 5              │ 5              │ 0     │ '50.0%'                │ '50.0%'               │ '0.0%' │ '0.0%'     │ '5.0'     │\n└─────────┴───────────┴───────────┴───────┴────────────────┴────────────────┴───────┴────────────────────────┴───────────────────────┴────────┴────────────┴───────────┘\n'''\nexperiment = baseline.replace('''│ 0       │ 'aggro'   │ 10    │ '50.0%' │ '50.0%'        │ '0.0%' │ '0.0%'     │ '5.0'     │ '3.0'                 │''', '''│ 0       │ 'aggro'   │ 10    │ '50.0%' │ '50.0%'        │ '0.0%' │ '0.0%'     │ '5.0'     │ '3.0'                 │\n│ 1       │ 'overclock' │ 10    │ '60.0%' │ '60.0%'        │ '0.0%' │ '0.0%'     │ '5.0'     │ '3.0'                 │''').replace('''│ 0       │ 'aggro'   │ 'aggro'   │ 10    │ 5              │ 5              │ 0     │ '50.0%'                │ '50.0%'               │ '0.0%' │ '0.0%'     │ '5.0'     │''', '''│ 0       │ 'aggro'   │ 'aggro'   │ 10    │ 5              │ 5              │ 0     │ '50.0%'                │ '50.0%'               │ '0.0%' │ '0.0%'     │ '5.0'     │\n│ 1       │ 'overclock' │ 'aggro'   │ 10    │ 6              │ 4              │ 0     │ '60.0%'                │ '60.0%'               │ '0.0%' │ '0.0%'     │ '5.0'     │''')\nwith tempfile.TemporaryDirectory() as tmp:\n  report = Path(tmp)\n  patch = report / 'patch-summary.md'; patch.write_text('patch')\n  path, stats = bl.build_comparison_report(report, {'name':'x','matchCount':1,'seed':1,'telemetry':'','changes':[], 'customFactions':[custom()], 'flags': {'warningDeltaPp':3,'dangerDeltaPp':8}}, baseline, experiment, patch)\n  text = path.read_text()\n  assert 'overclock' in text\n  assert 'EXPERIMENT_ONLY' in text\n  assert 'Custom factions:' in text\n  assert 'Custom faction global non-draw WR:' in text\n  assert 'Top custom faction matchups:' in text\n  assert 'Custom faction campaign estimate:' in text\n  assert 'Custom faction global non-draw WR: Not available' not in text\n  assert 'Top custom faction matchups: Not available' not in text\n  assert 'Custom faction campaign estimate: Not available' not in text\nprint('ok')\n`);
  assert.match(output.trim(), /ok$/);
});
