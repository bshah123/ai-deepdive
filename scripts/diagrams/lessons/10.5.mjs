// Diagrams for 10.5 (descriptor protocol, attribute lookup precedence, metaclasses).
// Run: node scripts/diagrams/lessons/10.5.mjs
// Every number comes from scripts/diagrams/lessons/10.5_data.json (written by 10.5_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-10-oop/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '10.5_data.json'), 'utf8'));

// ---------------------------------------------------------------- 10.5-lookup-funnel.svg
{
  const s = new Sketch(880, 580, {
    title: 'Flowchart of obj.x: five checks in order. Data descriptor, then instance dict, then non-data descriptor, then class attribute, then __getattr__, then AttributeError.',
    seed: 1051,
  });
  s.text(440, 40, 'What obj.x does, check by check', { size: 24, weight: 700 });

  const steps = [
    ['data descriptor for x on the class?', 'return the descriptor value', 'yes'],
    ['x in obj.__dict__?', 'return the instance value', 'yes'],
    ['non-data descriptor (__get__ only)?', 'return the descriptor value', 'yes'],
    ['plain class attribute x?', 'return the class value', 'yes'],
    ['class defines __getattr__?', "return __getattr__(obj, 'x')", 'yes'],
  ];
  const tops = [80, 165, 250, 335, 420];
  steps.forEach(([q, a], i) => {
    const top = tops[i];
    s.rect(60, top, 440, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(280, top + 32, `${i + 1}. ${q}`, { size: 17 });
    s.arrow(500, top + 26, 560, top + 26, { color: C.muted, head: 8 });
    s.text(530, top + 18, 'yes', { size: 15, color: C.green });
    s.rect(560, top, 280, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(700, top + 32, a, { size: 16 });
    if (i < steps.length - 1) {
      s.arrow(280, top + 52, 280, tops[i + 1], { color: C.muted, head: 8 });
      s.text(294, top + 46, 'no', { size: 15, color: C.muted, anchor: 'start' });
    }
  });
  s.arrow(280, 472, 280, 515, { color: C.muted, head: 8 });
  s.text(294, 498, 'no', { size: 15, color: C.muted, anchor: 'start' });
  s.rect(60, 515, 440, 48, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(280, 546, '6. raise AttributeError', { size: 17 });
  s.text(580, 546, 'reached only when every check fails', { size: 15, color: C.muted, anchor: 'start' });
  save('10.5-lookup-funnel.svg', s);
}

// ---------------------------------------------------------------- 10.5-precedence-matrix.svg
{
  const p = data.precedence;
  const s = new Sketch(880, 470, {
    title: 'Which source answers obj.x for four kinds of name, with and without the name in the instance dict. Winners: descriptor, instance dict, class attribute or __getattr__.',
    seed: 1052,
  });
  s.text(440, 40, 'Who answers obj.x?', { size: 24, weight: 700 });
  s.text(430, 90, ['obj.__dict__ does not', 'hold the name'], { size: 16, color: C.muted });
  s.text(730, 90, ['obj.__dict__ holds', 'the name'], { size: 16, color: C.muted });

  const rows = [
    ['data descriptor', '(__get__ and __set__)', 'dd'],
    ['non-data descriptor', '(__get__ only)', 'nd'],
    ['plain class attribute', '(a plain value)', 'plain'],
    ['name not on the class', '(only __getattr__)', 'absent'],
  ];
  const style = {
    'data descriptor': [C.blue, C.blueSoft],
    'non-data descriptor': [C.violet, C.blueSoft],
    'instance dict': [C.amber, C.amberSoft],
    'class attribute': [C.green, C.greenSoft],
    '__getattr__ fallback': [C.rose, C.roseSoft],
  };
  rows.forEach(([l1, l2, key], r) => {
    const y = 115 + r * 74;
    s.text(50, y + 26, [l1, l2], { size: 16, anchor: 'start' });
    for (const [col, dict] of [[0, false], [1, true]]) {
      const x = col === 0 ? 290 : 590;
      const winner = p[`${key}|dict=${dict ? 'True' : 'False'}`];
      const [stroke, fill] = style[winner];
      s.rect(x, y, 280, 62, { color: stroke, fill, fillStyle: 'solid' });
      s.text(x + 140, y + 38, winner, { size: 18, weight: 700 });
    }
  });
  s.text(440, 440, 'Data descriptors beat the instance dict; a non-data descriptor or a plain value loses to it.', { size: 17, color: C.muted });
  save('10.5-precedence-matrix.svg', s);
}

// ---------------------------------------------------------------- 10.5-class-trace.svg
{
  const steps = data.class_creation_trace;
  const groups = [C.blueSoft, C.blueSoft, C.amberSoft, C.greenSoft, C.greenSoft, C.roseSoft];
  const s = new Sketch(880, 470, {
    title: 'Order of calls when class Child(Base, metaclass=Meta) runs: prepare, body, metaclass new, set_name, init_subclass, metaclass init.',
    seed: 1053,
  });
  s.text(440, 40, 'What happens when a class statement runs', { size: 24, weight: 700 });
  steps.forEach((step, i) => {
    const y = 66 + i * 62;
    s.rect(60, y, 560, 46, { color: C.ink, fill: groups[i], fillStyle: 'solid' });
    s.text(340, y + 30, `${i + 1}  ${step}`, { font: 'mono', size: 16 });
  });
  s.note(660, 300, 190, 110, ['steps 4 and 5 run', 'inside type.__new__'], { size: 17 });
  s.text(660, 110, ['steps 1 and 2 run', 'before the class exists'], { size: 16, anchor: 'start', color: C.muted });
  save('10.5-class-trace.svg', s);
}

// ---------------------------------------------------------------- 10.5-access-cost.svg
{
  const ns = data.timing_ns;
  const ratio = data.timing_ratio;
  const labels = Object.keys(ns);
  const max = Math.max(...Object.values(ns));
  const scale = 420 / max;
  const s = new Sketch(880, 440, {
    title: 'Horizontal bars of measured nanoseconds per attribute access for five access paths. The plain instance attribute is shortest.',
    seed: 1054,
  });
  s.text(440, 40, 'Cost of one attribute access', { size: 24, weight: 700 });
  s.text(440, 66, 'nanoseconds per access, shorter is faster', { size: 16, color: C.muted });
  labels.forEach((k, i) => {
    const y = 100 + i * 60;
    const w = ns[k] * scale;
    s.text(280, y + 24, k, { size: 17, anchor: 'end' });
    s.rect(300, y, w, 38, { color: C.blue });
    s.text(300 + w + 12, y + 25, `${ns[k].toFixed(1)} ns (${ratio[k].toFixed(1)}×)`, { size: 16, anchor: 'start' });
  });
  s.text(440, 410, 'Measured on one Mac, Python 3.12.13, best of 5 runs. Exact values change with machine and version.', { size: 15, color: C.muted });
  save('10.5-access-cost.svg', s);
}
