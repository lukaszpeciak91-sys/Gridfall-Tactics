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
  'id': 'herd_candidate_card_1', 'cardNumber': 1, 'artAssetId': 'herd-candidate_01', 'name': 'Hot Runner',
  'type': 'unit', 'targeting': 'lane', 'effectId': 'lane_empty_bonus_damage', 'textShort': 'Open lane: +2 ATK',
  'attack': 2, 'hp': 1, 'armor': 0
}
def custom(fid='herd-candidate'):
  return {'id': fid, 'name': 'Herd Candidate', 'frameImage': 'frame_default', 'deck': [dict(base_card, id=f'{fid}_card_{i}', cardNumber=i) for i in range(1, 11)]}
`;

function assertPythonRaises(body, expected) {
  const source = `${pyPrelude}\ntry:\n${body.split('\n').map((line) => `  ${line}`).join('\n')}\nexcept bl.BalanceLabError as error:\n  print(error)\nelse:\n  raise SystemExit('expected BalanceLabError')\n`;
  const output = runPython(source);
  assert.match(output, expected);
}

test('Balance Lab writes valid custom faction only into temp copy', () => {
  const output = runPython(`${pyPrelude}\nwith tempfile.TemporaryDirectory() as tmp:\n  temp = Path(tmp)\n  applied = bl.write_custom_factions(temp, bl.validate_custom_factions(root, [custom()]))\n  assert (temp / 'src/data/factions/herd-candidate.json').exists()\n  assert not (root / 'src/data/factions/herd-candidate.json').exists()\n  assert applied[0]['deckSize'] == 10\nprint('ok')\n`);
  assert.match(output.trim(), /ok$/);
});


test('Balance Lab temp-copy custom faction is loaded by simulator registry without changing production repo', () => {
  const output = runPython(`${pyPrelude}
with tempfile.TemporaryDirectory() as tmp:
  temp = Path(tmp) / 'repo'
  bl.copy_repo_to_temp(root, temp)
  applied = bl.write_custom_factions(temp, bl.validate_custom_factions(root, [custom()]))
  temp_faction = temp / 'src/data/factions/herd-candidate.json'
  assert temp_faction.exists()
  assert not (root / 'src/data/factions/herd-candidate.json').exists()
  assert applied[0]['registryPatched'] is True
  registry = (temp / 'src/data/factions/index.js').read_text()
  assert "./herd-candidate.json" in registry
  baseline = subprocess.check_output(['node', 'scripts/simulate-battles.mjs', '--total=1'], cwd=root, text=True)
  experiment = subprocess.check_output(['node', 'scripts/simulate-battles.mjs', '--total=1', '--telemetry=cards'], cwd=temp, text=True)
  assert 'Simulated faction matrix: 7 factions, 49 ordered matchups.' in baseline
  assert 'herd-candidate' not in baseline
  assert 'Simulated faction matrix: 8 factions, 64 ordered matchups.' in experiment
  assert 'herd-candidate' in experiment
  assert 'herd-candidate_card_1' in experiment
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
  const output = runPython(`${pyPrelude}\nfrom pathlib import Path\nbaseline = '''Balance audit: aggregate faction table\n┌─────────┬───────────┬───────┬─────────┬────────────────┬────────┬────────────┬───────────┬───────────────────────┐\n│ (index) │ faction   │ games │ win %   │ non-draw win % │ draw % │ turn-cap % │ avg turns │ avg remaining hero HP │\n├─────────┼───────────┼───────┼─────────┼────────────────┼────────┼────────────┼───────────┼───────────────────────┤\n│ 0       │ 'aggro'   │ 10    │ '50.0%' │ '50.0%'        │ '0.0%' │ '0.0%'     │ '5.0'     │ '3.0'                 │\n└─────────┴───────────┴───────┴─────────┴────────────────┴────────┴────────────┴───────────┴───────────────────────┘\nBalance audit: combined matchup table across both seats\n┌─────────┬───────────┬───────────┬───────┬────────────────┬────────────────┬───────┬────────────────────────┬───────────────────────┬────────┬────────────┬───────────┐\n│ (index) │ faction A │ faction B │ games │ faction A wins │ faction B wins │ draws │ faction A all-games WR │ faction A non-draw WR │ draw % │ turn-cap % │ avg turns │\n├─────────┼───────────┼───────────┼───────┼────────────────┼────────────────┼───────┼────────────────────────┼───────────────────────┼────────┼────────────┼───────────┤\n│ 0       │ 'aggro'   │ 'aggro'   │ 10    │ 5              │ 5              │ 0     │ '50.0%'                │ '50.0%'               │ '0.0%' │ '0.0%'     │ '5.0'     │\n└─────────┴───────────┴───────────┴───────┴────────────────┴────────────────┴───────┴────────────────────────┴───────────────────────┴────────┴────────────┴───────────┘\n'''\nexperiment = baseline.replace('''│ 0       │ 'aggro'   │ 10    │ '50.0%' │ '50.0%'        │ '0.0%' │ '0.0%'     │ '5.0'     │ '3.0'                 │''', '''│ 0       │ 'aggro'   │ 10    │ '50.0%' │ '50.0%'        │ '0.0%' │ '0.0%'     │ '5.0'     │ '3.0'                 │\n│ 1       │ 'herd-candidate' │ 10    │ '60.0%' │ '60.0%'        │ '0.0%' │ '0.0%'     │ '5.0'     │ '3.0'                 │''').replace('''│ 0       │ 'aggro'   │ 'aggro'   │ 10    │ 5              │ 5              │ 0     │ '50.0%'                │ '50.0%'               │ '0.0%' │ '0.0%'     │ '5.0'     │''', '''│ 0       │ 'aggro'   │ 'aggro'   │ 10    │ 5              │ 5              │ 0     │ '50.0%'                │ '50.0%'               │ '0.0%' │ '0.0%'     │ '5.0'     │\n│ 1       │ 'herd-candidate' │ 'aggro'   │ 10    │ 6              │ 4              │ 0     │ '60.0%'                │ '60.0%'               │ '0.0%' │ '0.0%'     │ '5.0'     │''')\nwith tempfile.TemporaryDirectory() as tmp:\n  report = Path(tmp)\n  patch = report / 'patch-summary.md'; patch.write_text('patch')\n  path, stats = bl.build_comparison_report(report, {'name':'x','matchCount':1,'seed':1,'telemetry':'','changes':[], 'customFactions':[custom()], 'flags': {'warningDeltaPp':3,'dangerDeltaPp':8}}, baseline, experiment, patch)\n  text = path.read_text()\n  assert 'herd-candidate' in text\n  assert 'EXPERIMENT_ONLY' in text\n  assert 'Custom factions:' in text\n  assert 'Custom faction global non-draw WR:' in text\n  assert 'Top custom faction matchups:' in text\n  assert 'Custom faction campaign estimate:' in text\n  assert 'Custom faction global non-draw WR: Not available' not in text\n  assert 'Top custom faction matchups: Not available' not in text\n  assert 'Custom faction campaign estimate: Not available' not in text\nprint('ok')\n`);
  assert.match(output.trim(), /ok$/);
});


test('Balance Lab streams child stdout and stderr while preserving captured output and exit code', () => {
  const output = runPython(`${pyPrelude}
import contextlib, io, sys, threading, time
with tempfile.TemporaryDirectory() as tmp:
  tmp_path = Path(tmp)
  marker = tmp_path / 'marker.txt'
  child = tmp_path / 'fake_child.py'
  child.write_text("""
import sys, time
from pathlib import Path
marker = Path(sys.argv[1])
print('stdout-before-exit', flush=True)
print('stderr-before-exit', file=sys.stderr, flush=True)
marker.write_text('ready')
time.sleep(0.4)
print('stdout-after-sleep', flush=True)
print('stderr-after-sleep', file=sys.stderr, flush=True)
raise SystemExit(0)
""")
  stdout_buffer = io.StringIO()
  stderr_buffer = io.StringIO()
  holder = {}
  def run_child():
    with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
      holder['result'] = bl.run_simulation(root, [sys.executable, str(child), str(marker)])
  thread = threading.Thread(target=run_child)
  thread.start()
  deadline = time.time() + 3
  while not marker.exists() and time.time() < deadline:
    time.sleep(0.02)
  assert marker.exists(), 'child did not reach pre-exit marker'
  assert thread.is_alive(), 'child exited before streaming assertion'
  assert 'stdout-before-exit' in stdout_buffer.getvalue()
  assert 'stderr-before-exit' in stderr_buffer.getvalue()
  thread.join(5)
  assert not thread.is_alive(), 'streaming runner did not finish'
  result = holder['result']
  assert result.returncode == 0
  assert result.stdout == 'stdout-before-exit\\nstdout-after-sleep\\n'
  assert result.stderr == 'stderr-before-exit\\nstderr-after-sleep\\n'
print('ok')
`);
  assert.match(output.trim(), /ok$/);
});

test('Balance Lab streaming runner preserves non-zero exit code and stderr capture', () => {
  const output = runPython(`${pyPrelude}
import contextlib, io, sys
with tempfile.TemporaryDirectory() as tmp:
  child = Path(tmp) / 'fake_fail.py'
  child.write_text("""
import sys
print('stdout-fail', flush=True)
print('stderr-fail', file=sys.stderr, flush=True)
raise SystemExit(7)
""")
  stdout_buffer = io.StringIO()
  stderr_buffer = io.StringIO()
  with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
    result = bl.run_simulation(root, [sys.executable, str(child)])
  assert result.returncode == 7
  assert result.stdout == 'stdout-fail\\n'
  assert result.stderr == 'stderr-fail\\n'
  assert 'stdout-fail' in stdout_buffer.getvalue()
  assert 'stderr-fail' in stderr_buffer.getvalue()
print('ok')
`);
  assert.match(output.trim(), /ok$/);
});

test('Current State preflight derives seven-faction run size dynamically', () => {
  const output = runPython(`${pyPrelude}
import contextlib, io
buffer = io.StringIO()
data = bl.current_snapshot_config()
assert data['matchCount'] == 100
with contextlib.redirect_stdout(buffer):
  bl.print_current_state_preflight(root, data)
text = buffer.getvalue()
assert 'Current State: 7 factions, 49 ordered matchups, 100 games per matchup, 4900 games total.' in text
assert len(bl.load_runtime_faction_keys(root)) == 7
print('ok')
`);
  assert.match(output.trim(), /ok$/);
});

test('Balance Lab simulator output validation rejects empty stdout, non-zero exit, missing marker, and missing telemetry', () => {
  const output = runPython(`${pyPrelude}
from subprocess import CompletedProcess
ok_table = '''Battle simulation complete (1 total games, max 30 turns).\nBalance audit: aggregate faction table\n┌───┬─────────┬───────┐\n│ (index) │ faction │ games │ win % │ non-draw win % │ draw % │ turn-cap % │ avg turns │ avg remaining hero HP │\n│ 0 │ 'aggro' │ 1 │ '100.0%' │ '100.0%' │ '0.0%' │ '0.0%' │ '1.0' │ '10.0' │\nBalance audit: combined matchup table across both seats\n┌───┬───────────┬───────────┬───────┐\n│ (index) │ faction A │ faction B │ games │ faction A wins │ faction B wins │ draws │ faction A all-games WR │ faction A non-draw WR │ draw % │ turn-cap % │ avg turns │\n│ 0 │ 'aggro' │ 'aggro' │ 1 │ 1 │ 0 │ 0 │ '100.0%' │ '100.0%' │ '0.0%' │ '0.0%' │ '1.0' │\nSimulator telemetry: per-card summary\nSimulator telemetry: per-faction summary\nSimulator telemetry: AI health\nSimulator telemetry: effectVariant operations\n'''
assert 'simulator stdout was empty' in bl.simulator_output_validation_errors(CompletedProcess(['node'], 0, '', ''), '', telemetry='all')
assert 'simulator exited with code 7' in bl.simulator_output_validation_errors(CompletedProcess(['node'], 7, ok_table, 'boom'), ok_table, telemetry='all')
assert 'missing Battle simulation complete marker' in bl.simulator_output_validation_errors(CompletedProcess(['node'], 0, ok_table.replace('Battle simulation complete', 'done'), ''), ok_table.replace('Battle simulation complete', 'done'), telemetry='all')
assert any('effectVariant runtime telemetry' in item for item in bl.simulator_output_validation_errors(CompletedProcess(['node'], 0, ok_table.replace('Simulator telemetry: effectVariant operations', ''), ''), ok_table.replace('Simulator telemetry: effectVariant operations', ''), telemetry='all'))
print('ok')
`);
  assert.match(output.trim(), /ok$/);
});

test('Balance Lab failed report blocks fake SAFE verdict from missing simulator data', () => {
  const output = runPython(`${pyPrelude}
from subprocess import CompletedProcess
with tempfile.TemporaryDirectory() as tmp:
  report = Path(tmp) / 'report'; report.mkdir()
  temp = Path(tmp) / 'temp'; temp.mkdir()
  baseline = CompletedProcess(['npm'], 0, 'Battle simulation complete but no tables', '')
  experiment = CompletedProcess(['npm'], 0, '', 'SyntaxError: broken generated registry\\n    at import')
  failed = bl.write_failed_report(report, temp, Path('experiment.json'), {'name':'x'}, ['npm','run','simulate:battles'], baseline, experiment, ['simulator stdout was empty', 'missing Battle simulation complete marker'])
  text = failed.read_text()
  assert '# Balance Lab FAILED Report' in text
  assert 'SyntaxError: broken generated registry' in text
  assert 'Overall verdict: SAFE' not in text
  assert 'verdict: SAFE' not in text
print('ok')
`);
  assert.match(output.trim(), /ok$/);
});
