import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers come from scripts/diagrams/lessons/1.5_data.py and the lesson's own code blocks (CPython 3.12.13; 3.13.14 and 3.14.6 for diagram 5).
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-01-how-python-works/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. anatomy of dis output and where arguments point
{
  const s = new Sketch(880, 560, { title: 'Real dis output for function bill, with column names above it. Three arguments are followed to the tables they index: co_varnames, co_names and co_consts.', seed: 151 });
  s.text(440, 34, 'Reading one function: dis output and the tables behind it', { size: 24, weight: 700 });
  const rows = [
    [3, 0, 'RESUME', '0', ''],
    [4, 2, 'LOAD_FAST', '0', '(price)'],
    ['', 4, 'LOAD_FAST', '1', '(qty)'],
    ['', 6, 'BINARY_OP', '5', '(*)'],
    ['', 10, 'STORE_FAST', '2', '(total)'],
    [5, 12, 'LOAD_GLOBAL', '1', '(NULL + round)'],
    ['', 22, 'LOAD_FAST', '2', '(total)'],
    ['', 24, 'LOAD_CONST', '1', '(2)'],
    ['', 26, 'CALL', '2', ''],
    ['', 34, 'RETURN_VALUE', '', ''],
  ];
  const X = { line: 40, off: 118, op: 150, arg: 330, rep: 348 }, Y0 = 130, DY = 30, m = { font: 'mono', size: 16 };
  s.rect(24, 62, 490, 40, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(X.line, 88, 'line', { size: 17, anchor: 'start', weight: 700 });
  s.text(X.off - 8, 88, 'offset', { size: 17, anchor: 'end', weight: 700 });
  s.text(X.op, 88, 'opname', { size: 17, anchor: 'start', weight: 700 });
  s.text(X.arg + 6, 88, 'arg', { size: 17, anchor: 'end', weight: 700 });
  s.text(X.rep, 88, 'argrepr', { size: 17, anchor: 'start', weight: 700 });
  rows.forEach(([ln, off, op, arg, rep], i) => {
    const y = Y0 + i * DY;
    s.text(X.line, y, String(ln), { ...m, anchor: 'start', color: C.muted });
    s.text(X.off, y, String(off), { ...m, anchor: 'end' });
    s.text(X.op, y, op, { ...m, anchor: 'start', weight: 700 });
    s.text(X.arg, y, arg, { ...m, anchor: 'end' });
    s.text(X.rep, y, rep, { ...m, anchor: 'start', color: C.muted });
  });
  // tables on the right
  const tbl = (x, y, name, cells, color, soft) => {
    s.text(x, y, name, { font: 'mono', size: 16, anchor: 'start', weight: 700, color });
    cells.forEach((c, i) => {
      const yy = y + 12 + i * 32;
      s.rect(x, yy, 270, 28, { color, fill: soft, fillStyle: 'solid' });
      s.text(x + 22, yy + 20, String(i), { ...m, color: C.muted });
      s.text(x + 44, yy + 20, c, { ...m, anchor: 'start' });
    });
  };
  tbl(580, 118, 'co_varnames', ['price', 'qty', 'total'], C.blue, C.blueSoft);
  tbl(580, 262, 'co_names', ['round'], C.violet, C.violetSoft ?? C.blueSoft);
  tbl(580, 346, 'co_consts', ['None', '2'], C.green, C.greenSoft);
  // arrows (end-points just left of the table cell)
  s.curveArrow(520, 185, 548, 181, 574, 176, { color: C.blue });
  s.text(548, 208, 'arg 1', { size: 15, color: C.blue });
  s.curveArrow(520, 276, 548, 280, 574, 288, { color: C.violet });
  s.text(540, 322, '1 >> 1 = 0', { size: 15, color: C.violet });
  s.curveArrow(520, 336, 548, 360, 574, 404, { color: C.green });
  s.text(530, 372, 'arg 1', { size: 15, color: C.green });
  s.note(24, 448, 832, 92, [
    'Offsets jump by more than 2: CACHE slots are hidden. 6 to 10: 1 slot. 12 to 22: 4 slots. 26 to 34: 3 slots.',
    '10 instructions + 8 cache slots = 18 slots x 2 bytes = 36 bytes of code.',
    'LOAD_GLOBAL: low bit of arg means "also push NULL", so arg 1 reads co_names[0].',
  ], { size: 17 });
  save('1.5-anatomy.svg', s);
}

// 2. loop and jumps
{
  const s = new Sketch(880, 640, { title: 'Control flow of the function total with a for loop. Setup runs once; FOR_ITER at offset 10 either runs the body or jumps to offset 28; JUMP_BACKWARD returns to offset 10.', seed: 152 });
  s.text(440, 34, 'A for loop is a jump back to FOR_ITER', { size: 24, weight: 700 });
  const m = { font: 'mono', size: 16 };
  s.text(40, 96, 'source', { size: 19, anchor: 'start', weight: 700, color: C.muted });
  const src = [['s = 0', C.blue, 130], ['for x in xs:', C.amber, 164], ['    s += x', C.green, 198], ['return s', C.rose, 232]];
  src.forEach(([t, col, y]) => { s.text(40, y, t, { ...m, anchor: 'start', color: col, weight: 700 }); });
  s.text(40, 300, ['FOR_ITER 7 (to 28):', 'the argument counts', '2-byte slots, from after', 'the hidden cache slot:', '14 + 7 x 2 = 28', '', 'JUMP_BACKWARD 9 (to 10):', '28 - 9 x 2 = 10'], { size: 17, anchor: 'start', color: C.muted });
  const box = (x, y, w, lines, col, soft, tag) => {
    const h = 16 + lines.length * 27;
    s.rect(x, y, w, h, { color: col, fill: soft, fillStyle: 'solid' });
    lines.forEach((l, i) => s.text(x + 14, y + 27 + i * 27, l, { ...m, anchor: 'start' }));
    if (tag) s.text(x + w - 12, y - 8, tag, { size: 16, anchor: 'end', color: col, weight: 700 });
  };
  box(300, 62, 300, ['0   RESUME', '2   LOAD_CONST 0', '4   STORE_FAST s', '6   LOAD_FAST xs', '8   GET_ITER'], C.blue, C.blueSoft);
  box(300, 240, 300, ['10  FOR_ITER', '14  STORE_FAST x'], C.amber, C.amberSoft, 'offset 10 is a jump target');
  box(300, 334, 300, ['16  LOAD_FAST s', '18  LOAD_FAST x', '20  BINARY_OP +=', '24  STORE_FAST s', '26  JUMP_BACKWARD'], C.green, C.greenSoft);
  box(300, 520, 300, ['28  END_FOR', '30  LOAD_FAST s', '32  RETURN_VALUE'], C.rose, C.roseSoft, 'offset 28');
  s.arrow(330, 216, 330, 238, { color: C.muted });
  s.arrow(330, 314, 330, 332, { color: C.muted });
  s.curveArrow(604, 466, 700, 400, 604, 290, { color: C.green, width: 3 });
  s.text(698, 360, ['back edge:', 'each pass'], { size: 16, anchor: 'start', color: C.green });
  s.line(604, 252, 770, 252, { color: C.rose, width: 3, dash: '6 8' });
  s.arrow(770, 252, 770, 570, { color: C.rose, width: 3 });
  s.arrow(770, 570, 606, 570, { color: C.rose, width: 3 });
  s.text(620, 236, 'xs exhausted: jump to 28', { size: 16, anchor: 'start', color: C.rose });
  save('1.5-loop-jumps.svg', s);
}

// 3. constant folding
{
  const s = new Sketch(880, 520, { title: 'Instructions executed per call, without RESUME. 60*60*24*n becomes 4 instructions with the constant 86400; n*60*60*24 stays 8. List and set literals after in become a tuple and a frozenset constant.', seed: 153 });
  s.text(440, 34, 'What the compiler already did before the function runs', { size: 24, weight: 700 });
  const m = { font: 'mono', size: 16 };
  const card = (x, w, head, lines, col, soft, count) => {
    s.rect(x, 62, w, 290, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + w / 2, 94, head, { ...m, size: 17, weight: 700 });
    lines.forEach((l, i) => s.text(x + 16, 134 + i * 26, l, { ...m, anchor: 'start' }));
    s.text(x + w / 2, 340, count, { size: 20, weight: 700, color: col });
  };
  card(28, 250, '60 * 60 * 24', ['RETURN_CONST 86400'], C.green, C.greenSoft, '1 instruction');
  card(298, 250, '60 * 60 * 24 * n', ['LOAD_CONST 86400', 'LOAD_FAST n', 'BINARY_OP *', 'RETURN_VALUE'], C.green, C.greenSoft, '4 instructions');
  card(568, 284, 'n * 60 * 60 * 24', ['LOAD_FAST n', 'LOAD_CONST 60', 'BINARY_OP *', 'LOAD_CONST 60', 'BINARY_OP *', 'LOAD_CONST 24', 'BINARY_OP *', 'RETURN_VALUE'], C.rose, C.roseSoft, '8 instructions');
  s.text(40, 386, 'x in [1, 2, 3]', { ...m, anchor: 'start', weight: 700 });
  s.arrow(250, 380, 300, 380, { color: C.muted });
  s.text(312, 386, 'LOAD_CONST (1, 2, 3)          a tuple', { ...m, anchor: 'start' });
  s.text(40, 424, 'x in {1, 2, 3}', { ...m, anchor: 'start', weight: 700 });
  s.arrow(250, 418, 300, 418, { color: C.muted });
  s.text(312, 424, 'LOAD_CONST frozenset({1, 2, 3})', { ...m, anchor: 'start' });
  s.note(28, 446, 824, 56, ['n * 60 is evaluated left to right, so (n * 60) is not a constant and nothing after it can be folded.', 'Both lists above compile to CONTAINS_OP on a constant: no list or set is built per call.'], { size: 17 });
  save('1.5-folding.svg', s);
}

// 4. module vs function loops
{
  const s = new Sketch(880, 560, { title: 'The same loop three ways. Module level uses STORE_NAME and LOAD_NAME and takes 48.3 ms; a function with global declarations uses STORE_GLOBAL and LOAD_GLOBAL and takes 43.8 ms; a function with locals uses STORE_FAST and LOAD_FAST and takes 25.0 ms. Instruction counts are 17, 16 and 16.', seed: 154 });
  s.text(440, 34, 'Same arithmetic, different instructions: s += i, 1,000,000 times', { size: 24, weight: 700 });
  const m = { font: 'mono', size: 16 };
  const cols = [
    ['module level', 'STORE_NAME i', 'LOAD_NAME s', 'LOAD_NAME i', 'BINARY_OP +=', 'STORE_NAME s', 48.3, 17, C.rose, C.roseSoft],
    ['function, global s, i', 'STORE_GLOBAL i', 'LOAD_GLOBAL s', 'LOAD_GLOBAL i', 'BINARY_OP +=', 'STORE_GLOBAL s', 43.8, 16, C.amber, C.amberSoft],
    ['function, locals', 'STORE_FAST i', 'LOAD_FAST s', 'LOAD_FAST i', 'BINARY_OP +=', 'STORE_FAST s', 25.0, 16, C.green, C.greenSoft],
  ];
  const W = 262, G = 15;
  cols.forEach(([head, a, b, c, d, e, ms, n, col, soft], k) => {
    const x = 28 + k * (W + G);
    s.rect(x, 62, W, 206, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + W / 2, 90, head, { size: 20, weight: 700 });
    [a, b, c, d, e].forEach((l, i) => s.text(x + 22, 128 + i * 26, l, { ...m, anchor: 'start' }));
    s.text(x + W / 2, 258, `${n} instructions in all`, { size: 17, color: C.muted });
  });
  s.text(40, 306, 'loop body, run 1,000,000 times (STORE_* of i is first: FOR_ITER pushes the next value)', { size: 17, anchor: 'start', color: C.muted });
  // bars
  const X0 = 250, SC = 500 / 50;
  cols.forEach(([head, , , , , , ms, , col, soft], k) => {
    const y = 340 + k * 52;
    s.text(X0 - 14, y + 28, head, { size: 18, anchor: 'end' });
    s.rect(X0, y, ms * SC, 40, { color: col, fill: soft });
    s.text(X0 + ms * SC + 12, y + 28, `${ms.toFixed(1)} ms`, { size: 19, anchor: 'start', weight: 700 });
  });
  s.note(28, 500, 824, 46, ['Best of 9 runs, CPython 3.12.13, one Apple M5 laptop. Absolute times vary; the order is the result.'], { size: 17 });
  save('1.5-name-vs-fast.svg', s);
}

// 5. the same function across versions
{
  const s = new Sketch(880, 520, { title: 'Disassembly of def swap(a, b): return a * b on three CPython versions: 5 instructions on 3.12.13, 4 on 3.13.14 and 3.14.6. Below, three source constructs and the opcode each version uses.', seed: 155 });
  s.text(440, 34, 'The same source, three CPython versions', { size: 24, weight: 700 });
  const m = { font: 'mono', size: 15 };
  const chain = (y, ver, ops, changed, col, soft) => {
    s.text(40, y + 30, ver, { size: 19, anchor: 'start', weight: 700 });
    let x = 150;
    ops.forEach((o, i) => {
      const w = o.length * 9 + 18;
      const ch = changed.includes(i);
      s.rect(x, y, w, 44, { color: ch ? C.amber : C.muted, fill: ch ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x + w / 2, y + 28, o, m);
      if (i < ops.length - 1) s.arrow(x + w + 2, y + 22, x + w + 14, y + 22, { color: C.muted, head: 6 });
      x += w + 16;
    });
  };
  s.text(150, 74, 'def swap(a, b): return a * b', { font: 'mono', size: 16, anchor: 'start', color: C.muted });
  chain(92, '3.12.13', ['RESUME', 'LOAD_FAST', 'LOAD_FAST', 'BINARY_OP', 'RETURN_VALUE'], [1, 2]);
  chain(152, '3.13.14', ['RESUME', 'LOAD_FAST_LOAD_FAST', 'BINARY_OP', 'RETURN_VALUE'], [1]);
  chain(212, '3.14.6', ['RESUME', 'LOAD_FAST_BORROW_LOAD_FAST_BORROW', 'BINARY_OP', 'RETURN_VALUE'], [1]);
  // table
  s.line(40, 290, 840, 290, { color: C.muted });
  const heads = ['source', '3.12.13', '3.13.14', '3.14.6'];
  const xs = [40, 270, 470, 650];
  heads.forEach((h, i) => s.text(xs[i], 318, h, { size: 18, anchor: 'start', weight: 700, color: C.muted }));
  const t = [
    ['f"Hello, {name}!"', 'FORMAT_VALUE', 'FORMAT_SIMPLE', 'FORMAT_SIMPLE'],
    ['round(total, 2)', 'LOAD_CONST 2', 'LOAD_CONST 2', 'LOAD_SMALL_INT 2'],
  ];
  t.forEach((r, j) => r.forEach((c, i) => s.text(xs[i], 356 + j * 36, c, { ...m, size: 16, anchor: 'start', weight: i === 0 ? 700 : 400 })));
  s.note(40, 420, 800, 76, ['Amber boxes: the instructions that change between versions. Each is a real opcode on its version;', 'none of them is wrong. Opcode names are not a stable interface (dis docs).'], { size: 18 });
  save('1.5-versions.svg', s);
}
