import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers come from scripts/diagrams/lessons/1.6_data.py (CPython 3.12.13 for tier 1; 3.13.14 and 3.14.6 for the JIT runs).
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-01-how-python-works/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const mono = { font: 'mono', size: 15 };

// 1. one instruction over time
{
  const s = new Sketch(880, 400, { title: 'One BINARY_OP instruction over time: generic before it has run twice, specialized for ints after two int calls, still int-specialized through 52 float calls, re-specialized for floats on the 53rd.', seed: 161 });
  s.text(440, 34, 'One instruction, four moments', { size: 26, weight: 700 });
  const steps = [
    ['never called', 'BINARY_OP', 'generic', C.muted, C.blueSoft],
    ['after 2 int calls', 'BINARY_OP_ADD_INT', 'specialized', C.green, C.greenSoft],
    ['then 52 float calls', 'BINARY_OP_ADD_INT', '52 misses so far', C.amber, C.amberSoft],
    ['then 53 float calls', 'BINARY_OP_ADD_FLOAT', 're-specialized', C.green, C.greenSoft],
  ];
  const W = 190, G = 22, X0 = 27, Y = 120, H = 96;
  steps.forEach(([when, name, state, col, soft], i) => {
    const x = X0 + i * (W + G);
    s.text(x + W / 2, Y - 18, when, { size: 19, weight: 700 });
    s.rect(x, Y, W, H, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + W / 2, Y + 44, name.length > 17 ? [name.slice(0, 10), name.slice(10)] : name, { ...mono, size: 16 });
    s.text(x + W / 2, Y + 82, state, { size: 18, color: C.muted });
    if (i < 3) s.arrow(x + W + 2, Y + H / 2, x + W + G - 2, Y + H / 2, { color: C.muted });
  });
  s.text(X0 + 1 * (W + G) + W / 2, 252, 'ints seen twice', { size: 18, color: C.green });
  s.text(X0 + 2 * (W + G) + W / 2, 252, 'floats arrive', { size: 18, color: C.amber });
  s.text(X0 + 3 * (W + G) + W / 2, 252, '53rd miss', { size: 18, color: C.rose });
  s.note(40, 285, 800, 80, ['Every float call before the 53rd still returned the right answer: a miss runs the generic code.', 'Specialization only changes speed, never results. Counts: CPython 3.12 and 3.13 (3.11 differs).'], { size: 18 });
  save('1.6-moments.svg', s);
}

// 2. the bytecode is rewritten in place
{
  const s = new Sketch(880, 450, { title: 'The six 2-byte code units of add(a, b): as compiled, and as running after two int calls. The BINARY_OP unit changes to BINARY_OP_ADD_INT and the cache unit after it holds a counter.', seed: 162 });
  s.text(440, 34, 'Same function, same 12 bytes, rewritten', { size: 26, weight: 700 });
  const X0 = 30, W = 126, G = 10, H = 80;
  const row = (y, label, cells, changed) => {
    s.text(X0, y - 14, label, { size: 19, weight: 700, anchor: 'start' });
    cells.forEach((c, i) => {
      const x = X0 + i * (W + G);
      const ch = changed.includes(i);
      const col = i === 4 ? C.violet : ch ? C.amber : C.blue;
      const soft = i === 4 ? C.blueSoft : ch ? C.amberSoft : C.blueSoft;
      s.rect(x, y, W, H, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + W / 2, y + (c.length > 1 ? 34 : 46), c, { ...mono });
    });
  };
  const top = [['RESUME'], ['LOAD_FAST'], ['LOAD_FAST'], ['BINARY_OP'], ['CACHE'], ['RETURN_', 'VALUE']];
  const bot = [['RESUME'], ['LOAD_FAST__', 'LOAD_FAST'], ['LOAD_FAST'], ['BINARY_OP_', 'ADD_INT'], ['CACHE', 'counter'], ['RETURN_', 'VALUE']];
  row(100, 'as compiled (what plain dis shows)', top, []);
  row(250, 'as running after add(1, 2) twice', bot, [1, 3]);
  for (let i = 0; i < 6; i++) s.text(X0 + i * (W + G) + W / 2, 352, `byte ${2 * i}`, { size: 16, color: C.muted });
  s.arrow(X0 + 3 * (W + G) + W / 2, 186, X0 + 3 * (W + G) + W / 2, 240, { color: C.amber });
  s.note(40, 380, 800, 54, ['dis.dis(add) and add.__code__.co_code keep showing the plain row; dis.dis(add, adaptive=True) shows the running row.'], { size: 17 });
  save('1.6-in-place.svg', s);
}

// 3. survey of specialized names
{
  const rows = [
    ['for v in xs', 'FOR_ITER', 'FOR_ITER_LIST'],
    ['t += v', 'BINARY_OP', 'BINARY_OP_ADD_INT'],
    ['i < 10', 'COMPARE_OP', 'COMPARE_OP_INT'],
    ['p.x', 'LOAD_ATTR', 'LOAD_ATTR_INSTANCE_VALUE'],
    ['len', 'LOAD_GLOBAL', 'LOAD_GLOBAL_BUILTIN'],
    ['len(xs)', 'CALL', 'CALL_NO_KW_LEN'],
    ['xs[0]', 'BINARY_SUBSCR', 'BINARY_SUBSCR_LIST_INT'],
    ['p.get', 'LOAD_ATTR', 'LOAD_ATTR_METHOD_WITH_VALUES'],
    ['p.get()', 'CALL', 'CALL_PY_EXACT_ARGS'],
  ];
  const s = new Sketch(880, 130 + rows.length * 38 + 70, { title: 'Nine source constructs, the generic instruction the compiler emits for each, and the specialized instruction CPython 3.12 runs after 200 warm-up calls with one type of data.', seed: 163 });
  s.text(440, 34, 'What warm-up turns each instruction into', { size: 26, weight: 700 });
  const xs = [30, 210, 420];
  ['source', 'compiled as', 'runs as (3.12, after warm-up)'].forEach((h, i) => s.text(xs[i], 82, h, { size: 18, weight: 700, anchor: 'start', color: C.blue }));
  s.line(30, 94, 850, 94, { color: C.muted });
  rows.forEach((r, j) => {
    const y = 126 + j * 38;
    s.text(xs[0], y, r[0], { ...mono, anchor: 'start' });
    s.text(xs[1], y, r[1], { ...mono, anchor: 'start', color: C.muted });
    s.arrow(xs[1] + 150, y - 5, xs[2] - 10, y - 5, { color: C.muted, head: 8 });
    s.text(xs[2], y, r[2], { ...mono, anchor: 'start', color: C.green });
  });
  const yb = 126 + rows.length * 38;
  s.note(30, yb - 8, 820, 56, ['In 3.13 the same site is named CALL_LEN (measured), so these names are not a stable interface.'], { size: 17 });
  save('1.6-survey.svg', s);
}

// 4. polymorphic attribute site
{
  const s = new Sketch(880, 390, { title: 'Bar chart: one o.x load costs 18.4 ns per loop iteration when every object has the same class, 22.2 ns with two classes and 24.0 ns with four (CPython 3.12.13, one machine).', seed: 164 });
  s.text(440, 34, 'The same o.x, more classes', { size: 26, weight: 700 });
  const data = [['1 class', 18.4], ['2 classes', 22.2], ['4 classes', 24.0]];
  const base = 320, k = 8; // px per ns
  s.line(110, base, 770, base, { color: C.muted });
  data.forEach(([n, v], i) => {
    const x = 160 + i * 210, h = v * k;
    s.rect(x, base - h, 120, h, { color: i ? C.amber : C.green, fill: i ? C.amberSoft : C.greenSoft, fillStyle: 'hachure' });
    s.text(x + 60, base - h - 34, `${v.toFixed(1)} ns`, { size: 22, weight: 700 });
    if (i) s.text(x + 60, base - h - 10, `+${Math.round((v / 18.4 - 1) * 100)}%`, { size: 18, color: C.amber });
    s.text(x + 60, base + 28, n, { size: 20 });
  });
  s.text(440, 372, 'time per iteration of: for o in objs: t += o.x   (lower is faster)', { size: 17, color: C.muted });
  save('1.6-classes.svg', s);
}

// 5. tiers
{
  const s = new Sketch(880, 430, { title: 'Tier 1 specialized bytecode always runs. When it is hot enough and the interpreter was built with the experimental JIT option, it is translated to micro-ops (tier 2), optimized, then turned into machine code (JIT) or run by a tier 2 interpreter used for debugging.', seed: 165 });
  s.text(440, 34, 'Two tiers', { size: 26, weight: 700 });
  const box = (x, y, w, h, lines, o = {}) => {
    s.rect(x, y, w, h, { color: o.color ?? C.blue, fill: o.fill ?? C.blueSoft, fillStyle: 'solid', dash: o.dash });
    s.text(x + w / 2, y + h / 2 + (lines.length > 1 ? -2 : 7), lines, { size: 18 });
  };
  s.text(150, 82, 'Tier 1: always on', { size: 20, weight: 700, color: C.green });
  box(40, 100, 220, 84, ['specialized bytecode', '(rewrites itself as it runs)'], { color: C.green, fill: C.greenSoft });
  s.arrow(262, 142, 328, 142, { color: C.amber });
  s.text(295, 124, 'hot', { size: 18, color: C.amber });
  s.text(560, 82, 'Tier 2: only with --enable-experimental-jit', { size: 20, weight: 700, color: C.amber });
  box(330, 100, 200, 84, ['micro-ops', '(tier 2 IR)'], { color: C.amber, fill: C.amberSoft });
  s.arrow(532, 142, 578, 142, { color: C.muted });
  box(580, 100, 260, 84, ['optimize the micro-ops', '(optimization passes)'], { color: C.amber, fill: C.amberSoft });
  s.arrow(710, 186, 710, 230, { color: C.muted });
  s.arrow(710, 186, 450, 230, { color: C.muted });
  box(580, 232, 260, 70, ['machine code', 'copy-and-patch JIT'], { color: C.rose, fill: C.roseSoft });
  box(320, 232, 260 - 20, 70, ['tier 2 interpreter', '(for debugging)'], { color: C.violet, fill: C.blueSoft });
  s.note(40, 330, 800, 76, ['Docs (3.13): configure option "yes-off" builds the JIT but leaves it off; PYTHON_JIT=1 turns it on at run time.', 'Whether it helps is a measurement question: see the next figure.'], { size: 17 });
  save('1.6-tiers.svg', s);
}

// 6. JIT off vs on
{
  const data = {
    '3.13': { 'int loop': [88.3, 94.8], 'float loop': [47.9, 52.4], 'call loop': [129.7, 129.3] },
    '3.14': { 'int loop': [71.9, 87.6], 'float loop': [50.0, 55.0], 'call loop': [96.1, 108.3] },
  };
  const s = new Sketch(880, 440, { title: 'Grouped bars of median milliseconds for three loops with the JIT off and on. With the JIT on, 3.13 is 7% slower, 9% slower and 0.3% faster; 3.14 is 22% slower, 10% slower and 13% slower. One machine, 2 million iterations each.', seed: 166 });
  s.text(440, 34, 'JIT off vs JIT on, same loops', { size: 26, weight: 700 });
  const base = 320, k = 1.4;
  Object.entries(data).forEach(([ver, ws], pi) => {
    const x0 = 40 + pi * 430;
    s.text(x0 + 190, 74, `CPython ${ver}`, { font: 'mono', size: 20, weight: 700 });
    s.line(x0, base, x0 + 400, base, { color: C.muted });
    Object.entries(ws).forEach(([w, [off, on]], gi) => {
      const gx = x0 + 10 + gi * 130;
      [[off, C.blue, C.blueSoft], [on, C.rose, C.roseSoft]].forEach(([v, col, soft], bi) => {
        const bx = gx + bi * 52, h = v * k;
        s.rect(bx, base - h, 46, h, { color: col, fill: soft, fillStyle: 'hachure' });
        s.text(bx + 23, base - h - 8, v.toFixed(0), { size: 16 });
      });
      const pct = (on / off - 1) * 100;
      s.text(gx + 49, base + 26, w, { size: 16 });
      s.text(gx + 49, base + 48, `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, { size: 17, color: pct > 1 ? C.rose : C.muted });
    });
  });
  s.rect(300, 388, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(330, 402, 'PYTHON_JIT=0', { ...mono, anchor: 'start' });
  s.rect(500, 388, 22, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(530, 402, 'PYTHON_JIT=1', { ...mono, anchor: 'start' });
  s.text(440, 426, 'median ms for 2 million iterations (lower is faster); positive % = slower with the JIT', { size: 16, color: C.muted });
  save('1.6-jit.svg', s);
}
