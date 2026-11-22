import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Every number and label below is read from 10.3_data.json, written by 10.3_experiment.py.
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-10-oop/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '10.3_data.json'), 'utf8'));

// 1. The MRO of the diamond, and the super() hop from each class to the next.
{
  const s = new Sketch(880, 250, { title: 'The MRO of class D as a chain of super() hops', seed: 1031 });
  s.text(440, 36, 'super() means the next class in the MRO', { size: 26, weight: 700 });
  D.diamond_mro.forEach((n, i) => {
    const x = 30 + i * 180;
    const plain = n === 'object';
    s.text(x + 55, 80, `MRO ${i + 1}`, { size: 16, color: C.muted });
    s.rect(x, 90, 110, 52, plain
      ? { color: C.muted }
      : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 55, 122, n, { font: 'mono', size: 20 });
    if (i < D.diamond_mro.length - 1) {
      s.arrow(x + 116, 116, x + 174, 116, { color: C.ink });
      s.text(x + 145, 176, 'super()', { font: 'mono', size: 15, color: C.muted });
    }
  });
  s.text(440, 226, 'Inside B, super() means C, not A: it follows type(self).__mro__.', { size: 19 });
  save('10.3-mro-chain.svg', s);
}

// 2. Trace of __init__ calls: naive base calls versus super().
{
  const s = new Sketch(880, 300, { title: 'Trace of __init__ calls: naive versus super()', seed: 1032 });
  s.text(440, 36, 'Naming the base class runs A twice', { size: 26, weight: 700 });
  const row = (y, title, labels, count) => {
    s.text(30, y - 16, title, { size: 18, anchor: 'start' });
    labels.forEach((n, i) => {
      const x = 30 + i * 120;
      const isA = n.endsWith('A');
      s.rect(x, y, 104, 48, isA
        ? { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' }
        : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(x + 52, y + 30, n, { font: 'mono', size: 20 });
    });
    s.text(660, y + 30, `A runs ${count} ${count === 1 ? 'time' : 'times'}`,
      { size: 22, weight: 700, anchor: 'start', color: count > 1 ? C.rose : C.green });
  };
  row(104, 'naive: each class calls its base by name', D.naive_trace, D.count_A_naive);
  row(216, 'super(): each class calls the next one in the MRO', D.coop_trace, D.count_A_cooperative);
  save('10.3-trace-count.svg', s);
}

// 3. A parent that forgets super() silently ends the chain.
{
  const s = new Sketch(880, 250, { title: 'A missing super() call breaks the chain', seed: 1033 });
  s.text(440, 36, 'A parent that skips super() ends the chain', { size: 26, weight: 700 });
  s.rect(40, 90, 150, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 122, 'Child', { font: 'mono', size: 20 });
  s.rect(300, 90, 150, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(375, 122, 'ParentA', { font: 'mono', size: 20 });
  s.rect(560, 90, 150, 52, { color: C.muted, dash: '6 8' });
  s.text(635, 122, 'ParentB', { font: 'mono', size: 20, color: C.muted });
  s.arrow(190, 116, 296, 116, { color: C.ink });
  s.text(243, 100, 'super()', { font: 'mono', size: 15, color: C.muted });
  s.arrow(456, 116, 556, 116, { color: C.muted, dash: '6 8' });
  s.text(506, 100, 'none', { font: 'mono', size: 15, color: C.rose });
  s.text(375, 170, 'no super() here', { size: 18, color: C.rose });
  s.text(635, 170, 'never runs', { size: 18, color: C.muted });
  s.text(440, 226, `child.b  ->  ${D.broken_error}`, { font: 'mono', size: 17, color: C.rose });
  save('10.3-broken-chain.svg', s);
}

// 4. Same method body, different next class: the instance's MRO decides.
{
  const s = new Sketch(880, 310, { title: 'Same super() call, two different next classes', seed: 1034 });
  s.text(440, 36, 'The instance decides where super() goes next', { size: 26, weight: 700 });
  const row = (y, label, names, result) => {
    s.text(30, y + 30, label, { font: 'mono', size: 17, anchor: 'start' });
    names.forEach((n, i) => {
      const x = 270 + i * 190;
      s.rect(x, y, 130, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(x + 65, y + 32, n, { font: 'mono', size: 20 });
      if (i < names.length - 1) s.arrow(x + 136, y + 26, x + 184, y + 26, { color: C.ink });
    });
    s.text(270, y + 92, `result: ${result}`, { font: 'mono', size: 18, color: C.green, anchor: 'start' });
  };
  row(86, 'left = Left()', ['Left', 'Base'], D.who_left_on_left);
  row(194, 'Left.who(bottom)', ['Left', 'Right', 'Base'], D.who_left_on_bottom);
  save('10.3-binding.svg', s);
}

// 5. Keyword arguments shrink as each class takes its own.
{
  const s = new Sketch(880, 290, { title: 'Keyword arguments shrink as they move up the chain', seed: 1035 });
  s.text(440, 36, 'Each class consumes its own keyword and forwards the rest', { size: 24, weight: 700 });
  const notes = [
    ['gets name, color', ''],
    ['consumes name', 'forwards color'],
    ['consumes color', 'forwards nothing'],
    ['takes no keywords', 'end of chain'],
  ];
  const hops = [...D.kw_hops, ['object', {}]]; // object.__init__ is the end of the chain
  hops.forEach(([cls, kw], i) => {
    const x = 30 + i * 214;
    const last = i === hops.length - 1;
    const keys = Object.keys(kw).join(', ') || '(empty)';
    s.rect(x, 90, 160, 64, last
      ? { color: C.muted }
      : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 80, 116, cls, { font: 'mono', size: 18, weight: 700 });
    s.text(x + 80, 141, `{${keys}}`, { font: 'mono', size: 15 });
    if (i < hops.length - 1) s.arrow(x + 166, 122, x + 208, 122, { color: C.ink });
    s.text(x + 80, 186, notes[i][0], { size: 17 });
    if (notes[i][1]) s.text(x + 80, 208, notes[i][1], { size: 17, color: C.muted });
  });
  s.text(440, 262, 'Pass size=3 and object gets {size} at the end: TypeError.', { size: 18, color: C.rose });
  save('10.3-kwargs-hops.svg', s);
}
