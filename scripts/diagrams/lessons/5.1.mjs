// Diagrams for 5.1 (tuples vs lists, PyTupleObject layout).
// Run: node scripts/diagrams/lessons/5.1.mjs
// Every number comes from scripts/diagrams/lessons/5.1_experiment.py (writes 5.1_data.json).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-05-tuples/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '5.1_data.json'), 'utf8'));

// ---------------------------------------------------------------- 5.1-layout.svg
{
  const s = new Sketch(880, 480, { title: 'A tuple is one block: a 16-byte GC header, a 24-byte header and the items inline. A list has a header block that points to a separate array of item pointers.', seed: 5101 });
  s.text(440, 34, 'One block versus a header and an array', { size: 26, weight: 700 });

  const row = (y, names, widths, fills) => {
    let x = 40;
    names.forEach((n, i) => {
      const w = widths[i];
      s.rect(x, y, w, 64, { color: C.ink, fill: fills[i], fillStyle: 'solid' });
      s.text(x + w / 2, y + 26, n[0], { font: 'mono', size: 15 });
      s.text(x + w / 2, y + 52, n[1], { font: 'mono', size: 15, color: C.muted });
      x += w;
    });
    return x;
  };

  s.text(40, 84, 'tuple (1, 2, 3)', { size: 20, weight: 700, anchor: 'start' });
  row(96,
    [['GC header', '16 B'], ['ob_refcnt', '8 B'], ['ob_type', '8 B'], ['ob_size', '8 B'], ['item 0', '8 B'], ['item 1', '8 B'], ['item 2', '8 B']],
    [96, 112, 112, 112, 112, 112, 112],
    [C.greenSoft, C.blueSoft, C.blueSoft, C.blueSoft, C.amberSoft, C.amberSoft, C.amberSoft]);
  s.text(440, 196, `getsizeof = 16 + 24 + 3 × 8 = ${D.worked.tuple3} bytes, one allocation`, { size: 20 });

  s.text(40, 252, 'list [1, 2, 3]', { size: 20, weight: 700, anchor: 'start' });
  row(264,
    [['GC header', '16 B'], ['ob_refcnt', '8 B'], ['ob_type', '8 B'], ['ob_size', '8 B'], ['ob_item', 'pointer'], ['allocated', '8 B']],
    [96, 112, 112, 112, 112, 112],
    [C.greenSoft, C.blueSoft, C.blueSoft, C.blueSoft, C.roseSoft, C.blueSoft]);
  s.arrow(528, 328, 356, 380, { color: C.rose, head: 9 });
  const slots = [['item 0', 'filled'], ['item 1', 'filled'], ['item 2', 'filled'], ['spare', 'empty']];
  slots.forEach(([label, kind], i) => {
    const x = 300 + i * 112;
    if (kind === 'empty') s.rect(x, 380, 112, 52, { color: C.muted, dash: '6 8' });
    else s.rect(x, 380, 112, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 56, 412, label, { font: 'mono', size: 15, color: kind === 'empty' ? C.muted : C.ink });
  });
  s.text(280, 412, 'separate array of pointers', { size: 18, anchor: 'end', color: C.muted });

  s.text(440, 468, `getsizeof([1, 2, 3]) = 56 + 8 × ${D.worked.list3_allocated} = ${D.worked.list3} bytes (4 slots reserved)`, { size: 19 });
  save('5.1-layout.svg', s);
}

// ---------------------------------------------------------------- 5.1-size-chart.svg
{
  const s = new Sketch(880, 400, { title: 'Bar chart of sys.getsizeof against the number of items, for tuples and lists grown by append. Tuple bars rise by 8 bytes per item; list bars rise in steps.', seed: 5102 });
  s.text(440, 34, 'sys.getsizeof by length (bytes)', { size: 26, weight: 700 });
  const X0 = 110, X1 = 820, BASE = 316, SCALE = 1.1; // 1.1 px per byte; 200 bytes = 220 px
  const yOf = (v) => BASE - v * SCALE;
  [0, 50, 100, 150, 200].forEach((v) => {
    s.text(92, yOf(v) + 5, String(v), { font: 'mono', size: 15, anchor: 'end', color: C.muted });
    if (v > 0) s.line(X0, yOf(v), X1, yOf(v), { color: C.muted, dash: '6 8', width: 1 });
  });
  s.line(X0, BASE, X1, BASE, { color: C.ink, width: 2 });
  const group = (X1 - X0) / D.sizes.length;
  D.sizes.forEach((r, i) => {
    const gx = X0 + (i + 0.5) * group;
    const ht = r.tuple * SCALE, hl = r.list_append * SCALE;
    s.rect(gx - 26, BASE - ht, 24, ht, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(gx + 2, BASE - hl, 24, hl, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(gx, BASE + 24, String(r.n), { font: 'mono', size: 16 });
  });
  s.text(440, 378, 'number of items n', { size: 20 });
  s.rect(110, 62, 22, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(140, 78, 'tuple: 40 + 8n', { font: 'mono', size: 16, anchor: 'start' });
  s.rect(400, 62, 22, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(430, 78, 'list grown by append: 56 + 8 × slots', { font: 'mono', size: 16, anchor: 'start' });
  save('5.1-size-chart.svg', s);
}

// ---------------------------------------------------------------- 5.1-bytecode.svg
{
  const s = new Sketch(880, 330, { title: 'Bytecode for returning a literal tuple (one LOAD-style instruction) and a literal list (four instructions that build a new list each call).', seed: 5103 });
  s.text(440, 34, 'Literal tuple versus literal list, as bytecode (CPython 3.12)', { size: 24, weight: 700 });

  s.text(40, 92, 'return (1, 2, 3)', { size: 20, weight: 700, anchor: 'start' });
  s.rect(40, 106, 300, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(190, 135, 'RETURN_CONST (1, 2, 3)', { font: 'mono', size: 16 });
  s.note(380, 110, 460, 40, ['the tuple is a constant: built once, at compile time'], { size: 18 });

  s.text(40, 198, 'return [1, 2, 3]', { size: 20, weight: 700, anchor: 'start' });
  const steps = [['BUILD_LIST 0', 40, 160], ['LOAD_CONST (1, 2, 3)', 230, 220], ['LIST_EXTEND 1', 480, 170], ['RETURN_VALUE', 680, 170]];
  steps.forEach(([label, x, w], i) => {
    s.rect(x, 212, w, 46, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(x + w / 2, 241, label, { font: 'mono', size: 15 });
    if (i < steps.length - 1) s.arrow(x + w + 4, 235, steps[i + 1][1] - 4, 235, { color: C.muted, head: 7 });
  });
  s.text(440, 296, 'four instructions, and a new list object on every call', { size: 19 });
  save('5.1-bytecode.svg', s);
}

// ---------------------------------------------------------------- 5.1-hash.svg
{
  const s = new Sketch(880, 340, { title: 'Decision tree: a tuple is hashable only if every item is hashable. (1, a string) is usable as a dict key; (1, a list) raises TypeError.', seed: 5104 });
  s.text(440, 34, 'Can a tuple be a dict key?', { size: 26, weight: 700 });

  const box = (x, y, w, h, lines, col, soft, font = 'hand', size = 19) => {
    s.rect(x, y, w, h, { color: col, fill: soft, fillStyle: 'solid' });
    const top = y + h / 2 - (lines.length - 1) * 12;
    lines.forEach((ln, i) => s.text(x + w / 2, top + i * 24 + 6, ln, { font, size }));
  };

  box(40, 80, 190, 64, ["(1, 'a')"], C.ink, C.blueSoft, 'mono', 17);
  s.arrow(234, 112, 270, 112, { color: C.muted, head: 8 });
  box(274, 80, 300, 64, ['each item hashable:', 'int and str both are'], C.blue, C.blueSoft);
  s.arrow(578, 112, 614, 112, { color: C.muted, head: 8 });
  box(618, 80, 222, 64, ['hash() works,', 'dict key OK'], C.green, C.greenSoft);

  box(40, 210, 190, 64, ['(1, [2])'], C.ink, C.blueSoft, 'mono', 17);
  s.arrow(234, 242, 270, 242, { color: C.muted, head: 8 });
  box(274, 210, 300, 64, ['the item [2] is a list,', 'a mutable item'], C.rose, C.roseSoft);
  s.arrow(578, 242, 614, 242, { color: C.muted, head: 8 });
  box(618, 210, 222, 64, ['TypeError:', "unhashable type: 'list'"], C.rose, C.roseSoft, 'mono', 15);

  s.text(440, 312, 'The check is recursive in the items, not in the tuple itself', { size: 19 });
  save('5.1-hash.svg', s);
}
