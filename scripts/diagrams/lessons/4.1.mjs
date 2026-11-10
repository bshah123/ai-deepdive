// Diagrams for Lesson 4.1 (PyListObject & contiguous pointers). Run: node scripts/diagrams/lessons/4.1.mjs
// Numbers: 4.1_data.json (written by 4.1_data.py: real sys.getsizeof capacities and copy counts)
// and the lesson's own code blocks (ob_size 5, allocated 8; aliasing example).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-04-lists/diagrams');
mkdirSync(OUT, { recursive: true });
const data = JSON.parse(readFileSync(join(HERE, '4.1_data.json'), 'utf8'));
const NOLIG = `<g style="font-variant-ligatures:none;font-feature-settings:'liga' 0,'calt' 0">`;
const save = (name, sk) => {
  sk.out.unshift(NOLIG);
  sk.out.push('</g>');
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- anatomy
{
  const s = new Sketch(880, 420, { title: 'A list object: head with ob_size 5 and allocated 8, a pointer array of 8 slots, and five separate element objects', seed: 4101 });
  // variable name
  s.text(40, 62, 'lst', { font: 'mono', size: 20, color: C.blue });
  s.arrow(66, 56, 118, 56, { color: C.blue, width: 2, head: 10 });
  // head
  const hx = 120;
  const hy = 30;
  s.text(hx + 80, 20, 'list head (PyListObject)', { size: 21, weight: 700 });
  const rows = [
    ['ob_refcnt', '1'],
    ['ob_type', '&list'],
    ['ob_size', '5'],
    ['ob_item', '●'],
    ['allocated', '8'],
  ];
  rows.forEach(([k, v], i) => {
    const hl = k === 'ob_size' || k === 'allocated' || k === 'ob_item';
    s.rect(hx, hy + i * 40, 170, 40, { color: hl ? C.blue : C.muted, fill: hl ? C.blueSoft : undefined, fillStyle: 'solid', width: 1.4, roughness: 0.7 });
    s.text(hx + 10, hy + i * 40 + 26, k, { font: 'mono', size: 15, anchor: 'start' });
    s.text(hx + 160, hy + i * 40 + 26, v, { font: 'mono', size: 15, anchor: 'end', color: hl ? C.blue : C.muted });
  });
  s.text(hx + 85, hy + 232, '5 words = 40 bytes', { size: 19, color: C.muted });
  s.text(hx + 85, hy + 254, '(+16-byte GC header)', { size: 19, color: C.muted });
  // pointer array
  const ax = 400;
  const ay = 42;
  const sh = 40;
  s.text(ax + 45, 20, 'array of 8 pointers', { size: 21, weight: 700 });
  for (let i = 0; i < 8; i++) {
    const used = i < 5;
    s.rect(ax, ay + i * sh, 90, sh, {
      color: used ? C.ink : C.muted,
      fill: used ? C.amberSoft : undefined,
      fillStyle: used ? 'solid' : 'hachure',
      width: 1.4,
      roughness: 0.7,
    });
    s.text(ax + 10, ay + i * sh + 26, String(i), { font: 'mono', size: 14, anchor: 'start', color: C.muted });
    s.text(ax + 62, ay + i * sh + 26, used ? '●' : '', { font: 'mono', size: 15 });
  }
  s.text(ax + 45, ay + 8 * sh + 22, '3 spare slots', { size: 19, color: C.muted });
  // ob_item arrow into the array
  s.curveArrow(hx + 172, hy + 3 * 40 + 20, 350, hy + 3 * 40 + 70, ax - 2, ay + 8, { color: C.blue, width: 2, head: 10 });
  // element objects, scattered
  const els = [
    { label: '10', kind: 'int', y: 40, x: 640 },
    { label: '"ab"', kind: 'str', y: 108, x: 700 },
    { label: '3.14', kind: 'float', y: 176, x: 650 },
    { label: '[1, 2]', kind: 'list', y: 244, x: 710 },
    { label: 'None', kind: 'NoneType', y: 312, x: 660 },
  ];
  els.forEach((e, i) => {
    s.rect(e.x, e.y, 150, 44, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
    s.text(e.x + 12, e.y + 28, e.label, { font: 'mono', size: 15, anchor: 'start' });
    s.text(e.x + 140, e.y + 28, e.kind, { size: 18, anchor: 'end', color: C.muted });
    s.arrow(ax + 92, ay + i * sh + 20, e.x - 3, e.y + 22, { color: C.amber, width: 1.8, head: 9 });
  });
  s.text(730, 384, ['elements: separate objects,', 'anywhere in memory'], { size: 19, color: C.muted });
  save('4.1-anatomy.svg', s);
}

// ---------------------------------------------------------------- growth staircase
{
  const s = new Sketch(880, 400, { title: 'List capacity versus length over 100 appends: a staircase that stays above the diagonal', seed: 4102 });
  const X0 = 80;
  const Y0 = 340;
  const sx = (v) => X0 + v * 7.4;
  const sy = (v) => Y0 - v * 2.7;
  s.line(X0, Y0, sx(105), Y0, { color: C.ink });
  s.line(X0, Y0, X0, sy(115), { color: C.ink });
  [0, 25, 50, 75, 100].forEach((v) => {
    s.line(sx(v), Y0, sx(v), Y0 + 6, { color: C.ink, width: 1 });
    s.text(sx(v), Y0 + 26, String(v), { font: 'mono', size: 13, color: C.muted });
    s.line(X0 - 6, sy(v), X0, sy(v), { color: C.ink, width: 1 });
    s.text(X0 - 10, sy(v) + 5, String(v), { font: 'mono', size: 13, anchor: 'end', color: C.muted });
  });
  s.text(sx(52), Y0 + 54, 'length of the list (number of appends)', { size: 19, color: C.muted });
  s.text(28, sy(55), 'capacity (slots)', { size: 19, color: C.muted, rotate: -90 });
  // diagonal: size = capacity (a full list)
  s.line(sx(0), sy(0), sx(100), sy(100), { color: C.muted, width: 1.4, dash: '6 7' });
  s.text(sx(99), sy(58), 'dashed line: capacity = length (list is full)', { size: 17, color: C.muted, anchor: 'end' });
  // staircase from real data: [length at which capacity grew, new capacity]
  const st = data.steps;
  for (let i = 0; i < st.length; i++) {
    const [n, cap] = st[i];
    const nextN = i + 1 < st.length ? st[i + 1][0] : 100;
    if (i > 0) s.line(sx(n), sy(st[i - 1][1]), sx(n), sy(cap), { color: C.blue, width: 2.4, roughness: 0.6 });
    s.line(sx(n), sy(cap), sx(nextN), sy(cap), { color: C.blue, width: 2.4, roughness: 0.6 });
    if (n > 0) s.circle(sx(n), sy(cap), 7, { color: C.blue, fill: C.blue, fillStyle: 'solid', width: 1 });
  }
  // labels for a few steps
  const lab = [[9, 16], [17, 24], [41, 52], [77, 92]];
  lab.forEach(([n, cap]) => {
    s.text(sx(n) - 10, sy(cap) - 12, `${n} → ${cap}`, { font: 'mono', size: 13, anchor: 'end', color: C.blue });
  });
  s.note(540, 215, 300, 74, ['gap above the diagonal =', 'spare slots: the next appends', 'are free until it closes'], { size: 18, rotate: 1 });
  save('4.1-growth.svg', s);
}

// ---------------------------------------------------------------- copies per append (log scale)
{
  const s = new Sketch(880, 330, { title: 'Pointer copies per append at n = 100,000 on a log scale: CPython 7.98, doubling 1.31, fixed +8 slots 6249.5', seed: 4103 });
  const X0 = 250;
  const W = 560; // 4 decades
  const px = (v) => X0 + (Math.log10(v) / 4) * W;
  const bars = [
    { name: 'CPython (about 9/8)', v: data.cost.cpython, color: C.blue, soft: C.blueSoft },
    { name: 'doubling', v: data.cost.double, color: C.green, soft: C.greenSoft },
    { name: 'fixed +8 slots', v: data.cost.plus8, color: C.rose, soft: C.roseSoft },
  ];
  [1, 10, 100, 1000, 10000].forEach((v) => {
    s.line(px(v), 40, px(v), 250, { color: C.muted, width: 1, dash: '3 7' });
    s.text(px(v), 276, v.toLocaleString('en-US'), { font: 'mono', size: 14, color: C.muted });
  });
  s.text(X0 + W / 2, 310, 'pointer copies per append (log scale), if every resize moves the block', { size: 19, color: C.muted });
  bars.forEach((b, i) => {
    const y = 56 + i * 70;
    s.text(X0 - 14, y + 30, b.name, { size: 22, anchor: 'end' });
    s.rect(X0, y, Math.max(6, px(b.v) - X0), 44, { color: b.color, fill: b.soft, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
    const label = b.v >= 100 ? b.v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : b.v.toFixed(2);
    if (b.v > 1000) s.text(px(b.v) - 12, y + 30, label, { font: 'mono', size: 16, anchor: 'end' });
    else s.text(px(b.v) + 10, y + 30, label, { font: 'mono', size: 16, anchor: 'start' });
  });
  save('4.1-copies.svg', s);
}

// ---------------------------------------------------------------- aliasing trap
{
  const s = new Sketch(880, 390, { title: 'Repeating a list copies pointers: three slots point at one inner list, versus three separate inner lists', seed: 4104 });
  s.line(440, 20, 440, 370, { color: C.muted, width: 1.2, dash: '6 8' });
  const panel = (x0, title, code, shared) => {
    s.text(x0 + 190, 34, title, { size: 24, weight: 700, color: shared ? C.rose : C.green });
    s.text(x0 + 190, 66, code, { font: 'mono', size: 14 });
    s.text(x0 + 190, 92, 'then  g[0][0] = 1', { font: 'mono', size: 14, color: C.muted });
    // outer list, three slots stacked
    s.text(x0 + 40, 140, 'g', { font: 'mono', size: 18, color: C.blue });
    for (let i = 0; i < 3; i++) {
      s.rect(x0 + 10, 160 + i * 60, 80, 46, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid', width: 1.4, roughness: 0.7 });
      s.text(x0 + 50, 160 + i * 60 + 29, `g[${i}]`, { font: 'mono', size: 14 });
    }
    if (shared) {
      s.rect(x0 + 230, 212, 150, 46, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', width: 1.8, roughness: 0.7 });
      s.text(x0 + 305, 241, '[1, 0, 0]', { font: 'mono', size: 15 });
      [0, 1, 2].forEach((i) => s.arrow(x0 + 92, 160 + i * 60 + 23, x0 + 227, 235, { color: C.rose, width: 1.8, head: 9 }));
      s.text(x0 + 305, 300, 'one inner list,', { size: 20, color: C.rose });
      s.text(x0 + 305, 322, 'referenced three times', { size: 20, color: C.rose });
    } else {
      const vals = ['[1, 0, 0]', '[0, 0, 0]', '[0, 0, 0]'];
      vals.forEach((v, i) => {
        s.rect(x0 + 230, 160 + i * 60, 150, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.8, roughness: 0.7 });
        s.text(x0 + 305, 160 + i * 60 + 29, v, { font: 'mono', size: 15 });
        s.arrow(x0 + 92, 160 + i * 60 + 23, x0 + 227, 160 + i * 60 + 23, { color: C.green, width: 1.8, head: 9 });
      });
      s.text(x0 + 305, 360, 'three independent rows', { size: 20, color: C.green });
    }
  };
  panel(20, 'repeat', '[[0] * 3] * 3', true);
  panel(460, 'builder', '[[0] * 3 for _ in range(3)]', false);
  save('4.1-aliasing.svg', s);
}
