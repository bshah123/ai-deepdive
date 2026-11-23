// Diagrams for Lesson 14.1 (Type annotations & mypy). Run: node scripts/diagrams/lessons/14.1.mjs
// Every number and message comes from 14.1_data.json, written by 14.1_experiment.py (run once with the lesson venv).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-14-type-systems/diagrams');
mkdirSync(OUT, { recursive: true });
const data = JSON.parse(readFileSync(join(HERE, '14.1_data.json'), 'utf8'));
const snip = data.snippets;
const save = (name, s) => { writeFileSync(join(OUT, name), s.toString()); console.log('wrote', name); };

// ---------------------------------------------------------------- 1. same call, two checkers
{
  const s = new Sketch(880, 360, { title: 'One bad call checked two ways: run time fails on the line, mypy fails before the program starts', seed: 1401 });
  s.text(440, 40, 'One bad call, two checkers', { size: 26, weight: 700 });
  s.text(40, 112, 'Run', { size: 22, anchor: 'start', weight: 700, color: C.blue });
  s.rect(120, 84, 300, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(270, 118, 'add_numbers(5, "7")', { font: 'mono', size: 18 });
  s.arrow(425, 112, 470, 112, { color: C.muted, head: 12 });
  s.note(480, 80, 360, 64, ['TypeError at run time,', 'only when this line runs'], { size: 19 });

  s.text(40, 250, 'Check', { size: 22, anchor: 'start', weight: 700, color: C.amber });
  s.rect(120, 222, 300, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(270, 256, 'add_numbers(5, "7")', { font: 'mono', size: 18 });
  s.arrow(425, 250, 470, 250, { color: C.muted, head: 12 });
  s.note(480, 218, 360, 64, ['mypy error on line 5:', 'argument 2 is str, expected int'], { size: 19 });

  s.text(440, 330, 'mypy reads the annotations and never runs the program', { size: 20, color: C.muted });
  save('14.1-run-vs-check.svg', s);
}

// ---------------------------------------------------------------- 2. narrowing Optional[str]
{
  const s = new Sketch(880, 340, { title: 'Inside an if name is None branch mypy narrows the type, so name.upper() is allowed only on the other path', seed: 1402 });
  s.text(440, 40, 'Narrowing a str | None', { size: 26, weight: 700 });
  s.rect(40, 150, 180, 50, { color: C.ink, width: 1.4 });
  s.text(130, 181, 'name: str | None', { font: 'mono', size: 17 });
  s.arrow(220, 175, 266, 175, { color: C.muted, head: 12 });
  s.rect(270, 150, 190, 50, { color: C.ink, width: 1.4 });
  s.text(365, 181, 'if name is None:', { font: 'mono', size: 17 });
  s.arrow(365, 150, 365, 112, { color: C.muted, head: 12 });
  s.text(380, 138, 'yes', { size: 18, anchor: 'start', color: C.muted });
  s.rect(270, 62, 190, 46, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(365, 92, 'return ""', { font: 'mono', size: 17 });
  s.arrow(460, 175, 508, 175, { color: C.muted, head: 12 });
  s.text(484, 168, 'no', { size: 18, color: C.muted });
  s.rect(510, 150, 160, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(590, 181, 'name: str', { font: 'mono', size: 17 });
  s.arrow(670, 175, 712, 175, { color: C.muted, head: 12 });
  s.rect(712, 150, 148, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(786, 181, 'name.upper()', { font: 'mono', size: 16 });
  s.text(440, 262, 'On the "no" path mypy knows name is a str, so .upper() passes the check.', { size: 20, color: C.muted });
  s.text(440, 300, 'Without the guard, the None path reaches .upper() and mypy reports the error.', { size: 20, color: C.muted });
  save('14.1-optional-narrowing.svg', s);
}

// ---------------------------------------------------------------- 3. nine toy bugs, two checkers
{
  const keys = Object.keys(snip).filter((k) => k !== 'C_fixed_guard');
  const rowH = 38, top = 110;
  const H = top + keys.length * rowH + 110;
  const s = new Sketch(880, H, { title: 'Nine toy bugs: mypy flags seven, the run crashes on six, and the two sets differ', seed: 1403 });
  s.text(440, 40, 'Nine toy bugs, two checkers', { size: 26, weight: 700 });
  s.text(40, 90, 'bug', { size: 19, anchor: 'start', color: C.muted, weight: 700 });
  s.text(560, 90, 'mypy', { size: 19, color: C.muted, weight: 700 });
  s.text(760, 90, 'run on given input', { size: 19, color: C.muted, weight: 700 });
  keys.forEach((k, i) => {
    const e = snip[k];
    const y = top + i * rowH;
    s.text(40, y + 14, `${k.split('_')[0]}  ${e.label}`, { size: 18, anchor: 'start' });
    const m = e.mypy_errors > 0;
    s.rect(500, y, 120, 28, { color: m ? C.green : C.muted, fill: m ? C.greenSoft : undefined, fillStyle: 'solid' });
    s.text(560, y + 20, m ? 'error' : 'none', { size: 17, color: m ? C.ink : C.muted });
    const crash = e.runtime.status === 'crash';
    s.rect(700, y, 130, 28, { color: crash ? C.rose : C.muted, fill: crash ? C.roseSoft : undefined, fillStyle: 'solid' });
    s.text(765, y + 20, crash ? 'crash' : 'silent', { size: 17, color: crash ? C.ink : C.muted });
  });
  const sm = data.summary;
  s.text(440, H - 60, `mypy flags ${sm.mypy_flagged} of ${sm.bug_snippets}; the run crashes on ${sm.runtime_crash_on_given_input} of ${sm.bug_snippets}.`, { size: 21, weight: 700 });
  s.text(440, H - 26, 'Each checker misses a different set, so use both.', { size: 20, color: C.muted });
  save('14.1-nine-bugs.svg', s);
}

// ---------------------------------------------------------------- 4. unannotated body
{
  const s = new Sketch(880, 340, { title: 'Default mypy skips the body of an unannotated function; the flag --check-untyped-defs checks it', seed: 1404 });
  s.text(440, 40, 'Unannotated bodies are skipped by default', { size: 26, weight: 700 });
  s.rect(40, 66, 800, 84, { color: C.ink, width: 1.4 });
  s.text(60, 100, 'def total(prices):', { font: 'mono', size: 19, anchor: 'start' });
  s.text(60, 132, '    x: int = "3"', { font: 'mono', size: 19, anchor: 'start', color: C.rose });
  s.rect(40, 180, 390, 140, { color: C.muted, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(235, 212, 'mypy (default)', { size: 21, weight: 700 });
  s.text(235, 246, 'Success: no issues found', { font: 'mono', size: 16 });
  s.text(235, 282, 'the body is not checked', { size: 19, color: C.muted });
  const msg = snip.I_unannotated_body.mypy_messages_check_untyped_defs[0].split('error: ')[1].split('  [')[0];
  const head = msg.split(' (')[0];
  s.rect(450, 180, 390, 140, { color: C.muted, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(645, 212, 'mypy --check-untyped-defs', { size: 21, weight: 700 });
  s.text(645, 246, 'error: ' + head, { size: 17 });
  s.text(645, 282, 'line 2 is now checked', { size: 19, color: C.muted });
  save('14.1-unannotated-body.svg', s);
}
