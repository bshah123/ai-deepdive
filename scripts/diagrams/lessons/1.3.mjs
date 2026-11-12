// Diagrams for Lesson 1.3 (Python Implementations). Run: node scripts/diagrams/lessons/1.3.mjs
// Numbers: run 3 of 3 of scripts/diagrams/lessons/1.3_data.py (CPython 3.12.13 vs PyPy 7.3.23 / Python 3.11.15, Apple M-series).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-01-how-python-works/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- one language, several programs that run it
{
  const s = new Sketch(880, 440, { title: 'The Python language on top; CPython, PyPy and Jython as three different programs that run it', seed: 1301 });
  s.rect(190, 20, 500, 62, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid', width: 1.8 });
  s.text(440, 50, 'The Python language', { size: 25, weight: 700 });
  s.text(440, 73, 'a written description: the Language Reference', { size: 17, color: C.muted });
  const cols = [
    { x: 20, name: 'CPython', col: C.blue, fill: C.blueSoft, rows: ['written in: C', 'the original and', 'most-maintained one', 'this course runs on it'] },
    { x: 310, name: 'PyPy', col: C.green, fill: C.greenSoft, rows: ['written in: RPython', '(a Python-like language', 'translated to C)', 'adds a tracing JIT'] },
    { x: 600, name: 'Jython', col: C.amber, fill: C.amberSoft, rows: ['written in: Java', 'runs on the JVM', 'Python 2.7 only', '(no Python 3 release)'] },
  ];
  cols.forEach((c) => {
    s.arrow(c.x + 130, 88, c.x + 130, 132, { color: C.muted, width: 1.6, head: 10 });
    s.rect(c.x, 138, 260, 190, { color: c.col, fill: c.fill, fillStyle: 'solid', width: 1.8 });
    s.text(c.x + 130, 174, c.name, { size: 27, weight: 700, color: c.col });
    c.rows.forEach((r, i) => s.text(c.x + 130, 212 + i * 28, r, { size: 18 }));
  });
  s.note(120, 356, 640, 66, ['One hello.py, three programs that can run it. Each differs in some', 'way from the Language Reference, so "Python does X" can mean "CPython does X".'], { size: 18, rotate: -0.8 });
  save('1.3-spec-vs-impl.svg', s);
}

// ---------------------------------------------------------------- same front half, different back half
{
  const s = new Sketch(880, 470, { title: 'Each implementation turns source into bytecode, then runs it differently: a C loop, an interpreter plus JIT, or the JVM', seed: 1302 });
  const lanes = [
    { y: 28, name: 'CPython', col: C.blue, fill: C.blueSoft, bc: ['CPython', 'bytecode'], back: ['a loop written in C', 'runs one instruction at a time'] },
    { y: 138, name: 'PyPy', col: C.green, fill: C.greenSoft, bc: ['PyPy', 'bytecode'], back: ['interpreter, plus a JIT:', 'hot loops become machine code'] },
    { y: 248, name: 'Jython', col: C.amber, fill: C.amberSoft, bc: ['JVM bytecode', '(Java bytecode)'], back: ['the Java Virtual Machine runs it', '(not run here: no Java installed)'] },
  ];
  lanes.forEach((l) => {
    s.text(20, l.y + 52, l.name, { size: 25, weight: 700, anchor: 'start', color: l.col });
    s.rect(140, l.y + 20, 110, 62, { color: C.ink, width: 1.4 });
    s.text(195, l.y + 57, 'hello.py', { font: 'mono', size: 17 });
    s.arrow(256, l.y + 51, 292, l.y + 51, { color: C.muted, width: 1.6, head: 10 });
    s.rect(298, l.y + 20, 170, 62, { color: l.col, fill: l.fill, fillStyle: 'solid', width: 1.6 });
    s.text(383, l.y + 47, l.bc[0], { size: 19, weight: 700 });
    s.text(383, l.y + 70, l.bc[1], { size: 18 });
    s.arrow(474, l.y + 51, 510, l.y + 51, { color: C.muted, width: 1.6, head: 10 });
    s.rect(516, l.y + 14, 344, 74, { color: l.col, fill: l.fill, fillStyle: 'solid', width: 1.6 });
    s.text(688, l.y + 46, l.back[0], { size: 19, weight: 700 });
    s.text(688, l.y + 72, l.back[1], { size: 17 });
  });
  s.note(150, 366, 580, 84, ['dis.dis of  def f(a, b): return a + b', 'CPython 3.12:  RESUME, LOAD_FAST x2, BINARY_OP, RETURN_VALUE', 'PyPy 3.11:  LOAD_FAST x2, BINARY_ADD, RETURN_VALUE'], { size: 17, rotate: -0.6 });
  save('1.3-three-pipelines.svg', s);
}

// ---------------------------------------------------------------- measured speed-ups
{
  const s = new Sketch(880, 470, { title: 'Four workloads, CPython 3.12 versus PyPy 3.11: PyPy is about 40, 13, 6 and 1.4 times faster', seed: 1303 });
  const rows = [
    ['loop 10M', 'integer arithmetic loop', 0.550, 0.014, 'about 40x'],
    ['fib(30)', 'recursive calls', 0.088, 0.007, 'about 13x'],
    ['objects 1M', 'small class instances', 0.433, 0.073, 'about 6x'],
    ['sort+join 1M', 'work inside built-ins', 0.272, 0.198, 'about 1.4x'],
  ];
  s.rect(240, 22, 22, 18, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  s.text(272, 38, 'CPython 3.12', { size: 18, anchor: 'start' });
  s.rect(420, 22, 22, 18, { color: C.green, fill: C.green, fillStyle: 'solid' });
  s.text(452, 38, 'PyPy 3.11', { size: 18, anchor: 'start' });
  s.text(640, 38, 'median of 5 runs, seconds', { size: 17, anchor: 'start', color: C.muted });
  const X0 = 240, W = 500;
  rows.forEach(([name, sub, cp, pp, sp], i) => {
    const y = 64 + i * 92;
    s.text(20, y + 24, name, { font: 'mono', size: 18, anchor: 'start', weight: 700 });
    s.text(20, y + 50, sub, { size: 16, anchor: 'start', color: C.muted });
    s.rect(X0, y + 4, W, 26, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
    s.text(X0 + W + 10, y + 24, cp.toFixed(3) + ' s', { size: 17, anchor: 'start' });
    const w = Math.max(5, (W * pp) / cp);
    s.rect(X0, y + 36, w, 26, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.4 });
    s.text(X0 + w + 10, y + 56, pp.toFixed(3) + ' s  ' + sp, { size: 17, anchor: 'start', weight: 700 });
  });
  s.text(20, 446, 'Bars: length is time relative to CPython in the same row. Timings depend on the machine.', { size: 16, anchor: 'start', color: C.muted });
  save('1.3-speedups.svg', s);
}

// ---------------------------------------------------------------- JIT warm-up
{
  const cp = [4.89, 5.04, 4.91, 4.89, 5.01, 4.89, 4.90, 5.04, 4.92, 4.84, 4.82, 5.19];
  const pp = [10.79, 0.88, 0.82, 0.83, 0.84, 0.83, 0.83, 0.83, 0.84, 0.82, 0.85, 0.88];
  const s = new Sketch(880, 430, { title: 'Time of 12 successive calls to fib(24): PyPy is slower than CPython on call 1, then about 6 times faster', seed: 1304 });
  const base = 340, k = 20, X0 = 70, pitch = 62;
  s.text(20, 28, 'ms per call', { size: 18, anchor: 'start', color: C.muted });
  s.rect(280, 12, 22, 18, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  s.text(312, 28, 'CPython 3.12', { size: 18, anchor: 'start' });
  s.rect(470, 12, 22, 18, { color: C.green, fill: C.green, fillStyle: 'solid' });
  s.text(502, 28, 'PyPy 3.11', { size: 18, anchor: 'start' });
  s.line(X0 - 10, base, 850, base, { color: C.muted, width: 1.4 });
  cp.forEach((v, i) => {
    const x = X0 + i * pitch;
    s.rect(x, base - v * k, 24, v * k, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.3 });
    s.rect(x + 26, base - pp[i] * k, 24, pp[i] * k, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.3 });
    s.text(x + 25, base + 26, String(i + 1), { size: 17, color: C.muted });
  });
  s.text(X0 + 25, base + 52, 'call number', { size: 17, color: C.muted, anchor: 'start', rotate: 0 });
  s.text(X0 + 37, base - pp[0] * k - 10, '10.79', { size: 17, weight: 700 });
  s.text(X0 + 4, base - cp[0] * k - 10, '4.89', { size: 17, weight: 700 });
  s.text(X0 + 11 * pitch + 37, base - 30, '0.88', { size: 17, weight: 700 });
  s.note(330, 70, 300, 74, ['call 1: the JIT is still', 'recording and compiling', '(2x slower than CPython)'], { size: 17, rotate: -1 });
  s.curveArrow(330, 106, 300, 100, X0 + 52, base - pp[0] * k + 30, { color: C.muted, width: 1.5 });
  s.note(560, 150, 280, 66, ['calls 2 to 12: about 0.84 ms,', 'about 6x faster than CPython'], { size: 17, rotate: 0.8 });
  save('1.3-warmup.svg', s);
}

// ---------------------------------------------------------------- when __del__ runs
{
  const s = new Sketch(880, 430, { title: 'The same program: in CPython __del__ runs at once at del a; in PyPy it runs later, at the next garbage collection', seed: 1305 });
  const cols = [
    { x: 20, name: 'CPython 3.12', col: C.blue, fill: C.blueSoft, lines: ['del a ...', '  __del__ ran', 'after del a', 'after gc.collect()'], hi: 1, why: ['reference count of the object', 'drops to 0, so it is freed now', 'sys.getrefcount exists'] },
    { x: 450, name: 'PyPy 3.11', col: C.green, fill: C.greenSoft, lines: ['del a ...', 'after del a', '  __del__ ran', 'after gc.collect()'], hi: 2, why: ['no reference counts: freed when', 'the garbage collector next runs', 'sys.getrefcount does not exist'] },
  ];
  cols.forEach((c) => {
    s.text(c.x + 205, 34, c.name, { size: 26, weight: 700, color: c.col });
    c.lines.forEach((ln, i) => {
      const hi = i === c.hi;
      s.rect(c.x, 54 + i * 52, 410, 42, { color: hi ? C.rose : c.col, fill: hi ? C.roseSoft : c.fill, fillStyle: 'solid', width: hi ? 2 : 1.3 });
      s.text(c.x + 16, 82 + i * 52, ln.replace(/ /g, ' '), { font: 'mono', size: 18, anchor: 'start', weight: hi ? 700 : 400 });
    });
    s.text(c.x + 205, 290, c.why[0], { size: 18 });
    s.text(c.x + 205, 314, c.why[1], { size: 18 });
    s.text(c.x + 205, 344, c.why[2], { size: 17, color: C.muted });
  });
  s.text(440, 400, 'printed output, top to bottom = order of events', { size: 17, color: C.muted });
  save('1.3-del-timeline.svg', s);
}
