// Diagrams for 10.4 (property descriptors: __get__, __set__, __delete__).
// Run: node scripts/diagrams/lessons/10.4.mjs
// Every number comes from scripts/diagrams/lessons/10.4_data.json (written by 10.4_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-10-oop/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const d = JSON.parse(readFileSync(join(HERE, '10.4_data.json'), 'utf8'));

// ---------------------------------------------------------------- 10.4-where.svg
{
  const s = new Sketch(880, 330, { title: 'The descriptor lives on the class; the value lives in the instance dict. A data descriptor is found on the class first and wins.', seed: 1041 });
  s.text(440, 34, 'Where the attribute lives, and who answers', { size: 26, weight: 700 });

  s.rect(40, 80, 280, 110, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(180, 110, 'class Account', { size: 20, weight: 700 });
  s.text(180, 150, "balance = Positive()", { font: 'mono', size: 16 });
  s.text(180, 176, 'type(acct).__dict__', { size: 15, color: C.muted });

  s.rect(40, 222, 280, 86, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(180, 248, 'Positive instance (descriptor)', { size: 18, weight: 700 });
  s.text(180, 280, '__get__  __set__  __delete__', { font: 'mono', size: 15 });

  s.rect(560, 80, 280, 110, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(700, 110, 'acct (instance)', { size: 20, weight: 700 });
  s.text(700, 150, "__dict__: {'balance': 10}", { font: 'mono', size: 15 });
  s.text(700, 176, 'the stored value', { size: 15, color: C.muted });

  s.arrow(560, 150, 330, 250, { color: C.blue, head: 10, width: 2.5 });
  s.text(440, 300, '1. data descriptor on type: __get__ wins', { size: 17, color: C.blue, weight: 700 });
  s.arrow(700, 196, 700, 250, { color: C.muted, dash: '6 8', head: 9 });
  s.text(700, 276, '2. instance dict skipped', { size: 17, color: C.muted });

  s.note(40, 0, 0, 0, [], { size: 1 }); // no-op guard removed below
  save('10.4-where.svg', s);
}

// ---------------------------------------------------------------- 10.4-trace.svg
{
  const s = new Sketch(880, 400, { title: 'Trace of acct.balance = -5: the descriptor finds the value invalid, so the instance dict is never written.', seed: 1042 });
  s.text(440, 34, 'Worked trace: acct.balance = -5', { size: 26, weight: 700 });
  const steps = [
    ["1. Look up 'balance'", 'on type(acct): Positive', 'has __set__, so it is', 'a data descriptor'],
    ['2. Call __set__(acct, -5)', 'inside Positive:', '-5 < 0 is true'],
    ['3. raise ValueError', d.trace_error.replace('ValueError: ', "'") + "'", 'acct.__dict__ is untouched'],
  ];
  const colors = [C.blue, C.amber, C.rose];
  const soft = [C.blueSoft, C.amberSoft, C.roseSoft];
  steps.forEach((lines, i) => {
    const x = 30 + i * 290;
    s.rect(x, 80, 240, 140, { color: colors[i], fill: soft[i], fillStyle: 'solid' });
    s.text(x + 120, 110, lines, { size: 17, weight: 400 });
    if (i < 2) s.arrow(x + 240, 150, x + 290, 150, { color: C.muted, head: 9 });
  });
  s.rect(30, 250, 820, 120, { color: C.muted, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 282, `acct.__dict__ before:  {'balance': ${d.trace_before.balance}}`, { font: 'mono', size: 18 });
  s.text(440, 316, `acct.__dict__ after:   {'balance': ${d.trace_after.balance}}`, { font: 'mono', size: 18 });
  s.text(440, 352, `acct.balance still reads ${d.trace_read_after}`, { size: 20, weight: 700 });
  save('10.4-trace.svg', s);
}

// ---------------------------------------------------------------- 10.4-precedence.svg
{
  const s = new Sketch(880, 350, { title: 'Attribute lookup precedence: a data descriptor beats the instance dict, a non-data descriptor or plain class value loses to it.', seed: 1043 });
  s.text(440, 34, 'Which one does obj.attr return?', { size: 26, weight: 700 });
  const cols = [40, 280, 500, 700, 860];
  const heads = ['kind on the class', 'defines', 'obj.__dict__ also has attr', 'obj.attr returns'];
  heads.forEach((h, i) => s.text((cols[i] + cols[i + 1]) / 2, 84, h, { size: 17, weight: 700 }));
  const rows = [
    ['data descriptor', '__set__ (and/or __delete__)', 'descriptor', d.precedence.data_descriptor, C.blue, C.blueSoft],
    ['non-data descriptor', '__get__ only', 'instance', d.precedence.non_data_descriptor, C.green, C.greenSoft],
    ['plain class attribute', 'neither', 'instance', d.precedence.class_attribute, C.green, C.greenSoft],
  ];
  rows.forEach((r, j) => {
    const y = 110 + j * 70;
    s.line(cols[0], y, cols[4], y, { color: C.muted, width: 1 }); s.line(cols[0], y + 58, cols[4], y + 58, { color: C.muted, width: 1 });
    s.line(cols[3], y, cols[3], y + 58, { color: C.muted, width: 1 });
    s.text(cols[0] + 12, y + 35, r[0], { size: 18, weight: 700, anchor: 'start' });
    s.text(cols[1] + 12, y + 35, r[1], { size: 17, anchor: 'start' });
    s.text(cols[2] + 100, y + 35, r[2], { size: 17 });
    s.rect(cols[3] + 10, y + 10, cols[4] - cols[3] - 20, 38, { color: r[4], fill: r[5], fillStyle: 'solid' });
    s.text((cols[3] + cols[4]) / 2, y + 35, `'${r[3]}'`, { font: 'mono', size: 17, color: r[4] });
  });
  s.text(440, 326, 'Measured with the Demo class in 10.4_experiment.py (Python 3.12.13).', { size: 17, color: C.muted });
  save('10.4-precedence.svg', s);
}

// ---------------------------------------------------------------- 10.4-timing.svg
{
  const s = new Sketch(880, 380, { title: 'Measured nanoseconds per attribute access: a data descriptor costs several times a plain attribute, and about 2.9 times a property read.', seed: 1044 });
  s.text(440, 34, 'Cost per access (ns, lower is faster)', { size: 26, weight: 700 });
  const bars = [
    ['plain read', d.timing_ns.plain_read, C.muted],
    ['property read', d.timing_ns.property_read, C.amber],
    ['data descriptor read', d.timing_ns.data_descriptor_read, C.blue],
    ['plain write', d.timing_ns.plain_write, C.muted],
    ['data descriptor write', d.timing_ns.data_descriptor_write, C.blue],
  ];
  const max = Math.max(...bars.map((b) => b[1]));
  const scale = 430 / max;
  bars.forEach(([label, v, col], i) => {
    const y = 80 + i * 52;
    s.text(40, y + 24, label, { size: 18, anchor: 'start', weight: 700 });
    s.rect(260, y, v * scale, 34, { color: col, fill: col, fillStyle: 'solid' });
    s.text(260 + v * scale + 14, y + 24, `${v.toFixed(1)}`, { font: 'mono', size: 18, anchor: 'start' });
  });
  s.note(40, 330, 800, 40, [`min of ${d.timing_repeat} runs of ${d.timing_n.toLocaleString('en-US')} accesses; ${d.python} on macOS; your numbers will differ`], { size: 17 });
  save('10.4-timing.svg', s);
}
