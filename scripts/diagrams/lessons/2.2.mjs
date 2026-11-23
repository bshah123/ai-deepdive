// Diagrams for Lesson 2.2 (PyObject & Python's object system). Run: node scripts/diagrams/lessons/2.2.mjs
// Numbers come from the lesson's code blocks, run on CPython 3.12.13, 64-bit arm64 macOS:
//   sys.getsizeof(object()) = 16; int 1000 = 28; sys.getrefcount on a fresh int: 2, after y = x: 3, after del y: 2, in list: 3, after clear: 2.
//   Stored ob_refcnt (ctypes read, no argument reference): 1. None reports 4294967295 (immortal).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 1. the 16-byte header
{
  const s = new Sketch(880, 340, { title: 'Layout of a CPython object: a header of two 8-byte fields, then the value bytes, and ob_type points to the type object', seed: 2201 });
  s.text(440, 34, 'Every object starts with the same header', { size: 26, weight: 700 });
  s.text(120, 66, 'ob_refcnt', { font: 'mono', size: 17, color: C.blue });
  s.text(240, 66, 'ob_type', { font: 'mono', size: 17, color: C.blue });
  s.text(400, 66, 'value bytes', { font: 'mono', size: 17, color: C.green });
  s.rect(60, 76, 120, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 102, ['count', '= 1'], { size: 20 });
  s.rect(180, 76, 120, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(240, 102, ['pointer', 'to type'], { size: 20 });
  s.rect(300, 76, 200, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(400, 112, 'the number 1000', { size: 20 });
  s.text(120, 160, '8 bytes', { font: 'mono', size: 16, color: C.muted });
  s.text(240, 160, '8 bytes', { font: 'mono', size: 16, color: C.muted });
  s.text(400, 160, '12 bytes for this int', { font: 'mono', size: 16, color: C.muted });
  s.arrow(240, 136, 240, 236, { color: C.blue });
  s.text(256, 196, 'points to', { size: 19, anchor: 'start', color: C.blue });
  s.rect(160, 236, 170, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(245, 268, 'int type object', { size: 21, weight: 700 });
  s.note(560, 210, 290, 90, ['sys.getsizeof(object())', '= 16 bytes: header only'], { size: 18 });
  s.text(440, 318, 'In this build the header is 16 bytes; the value bytes make up the rest of the size.', { size: 18, color: C.muted });
  save('2.2-header.svg', s);
}

// ---------------------------------------------------------------- 2. two names, one object
{
  const s = new Sketch(880, 330, { title: 'After y = x, two names point at one int object whose stored count is 2 and whose type pointer names the int type', seed: 2202 });
  s.text(440, 34, 'y = x: two names, one object, one stored count', { size: 26, weight: 700 });
  s.rect(60, 96, 100, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 124, 'x', { font: 'mono', size: 22 });
  s.rect(60, 196, 100, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 224, 'y', { font: 'mono', size: 22 });
  s.rect(330, 104, 240, 130, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(450, 138, ['ob_refcnt = 2', 'value = 1000'], { font: 'mono', size: 19 });
  s.text(450, 200, 'the int object', { size: 19, color: C.muted });
  s.rect(660, 116, 170, 100, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(745, 152, 'int', { size: 26, weight: 700 });
  s.text(745, 186, 'type object', { size: 19 });
  s.arrow(160, 118, 330, 140, { color: C.ink });
  s.arrow(160, 218, 330, 200, { color: C.ink });
  s.arrow(570, 166, 660, 166, { color: C.blue });
  s.text(615, 152, 'ob_type', { font: 'mono', size: 16, color: C.blue });
  s.text(60, 300, 'sys.getrefcount(x) prints 3: the stored 2, plus 1 for the argument it is passed.', { size: 19, anchor: 'start' });
  save('2.2-names.svg', s);
}

// ---------------------------------------------------------------- 3. types are objects too
{
  const s = new Sketch(880, 300, { title: 'The type of 1 is int, the type of int is type, and the type of type is type: the chain ends in a self-loop', seed: 2203 });
  s.text(440, 34, 'Types are objects too', { size: 26, weight: 700 });
  s.rect(60, 96, 100, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 127, '1', { font: 'mono', size: 22 });
  s.rect(240, 96, 120, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(300, 127, 'int', { size: 22, weight: 700 });
  s.rect(460, 96, 120, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(520, 127, 'type', { size: 22, weight: 700 });
  s.arrow(160, 121, 240, 121, { color: C.blue });
  s.text(200, 110, 'type(1)', { font: 'mono', size: 15, color: C.blue });
  s.arrow(360, 121, 460, 121, { color: C.blue });
  s.text(410, 110, 'type(int)', { font: 'mono', size: 15, color: C.blue });
  s.curveArrow(490, 96, 520, 52, 550, 96, { color: C.blue });
  s.text(620, 118, 'type(type) is type', { font: 'mono', size: 17, color: C.blue, anchor: 'start' });
  s.rect(390, 210, 260, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(520, 238, 'builtin_function_or_method', { font: 'mono', size: 15 });
  s.rect(60, 210, 120, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 238, 'len', { font: 'mono', size: 20 });
  s.arrow(180, 232, 390, 232, { color: C.blue });
  s.text(285, 222, 'type(len)', { font: 'mono', size: 15, color: C.blue });
  s.arrow(520, 210, 520, 146, { color: C.blue });
  s.text(680, 240, 'a function is an object too', { size: 19, anchor: 'start', color: C.muted });
  save('2.2-type-chain.svg', s);
}

// ---------------------------------------------------------------- 4. measured sizes (bars)
{
  const rows = [
    ['None', 16], ['float 1.0', 24], ['int 1000', 28], ['int 2**60', 36], ["str 'hello'", 46],
    ['Plain(42)', 48], ['tuple (1, 2, 3)', 64], ['list [1, 2, 3]', 88], ["dict {'a': 1}", 184], ['set()', 216],
  ];
  const s = new Sketch(880, 500, { title: 'Measured sys.getsizeof values in bytes for ten objects, from 16 for None to 216 for an empty set', seed: 2204 });
  s.text(440, 34, 'sys.getsizeof, in bytes (shallow)', { size: 26, weight: 700 });
  rows.forEach(([label, bytes], i) => {
    const y = 84 + i * 38;
    s.text(40, y + 6, label, { font: 'mono', size: 17, anchor: 'start' });
    const w = bytes * 2.2;
    s.rect(300, y - 12, w, 24, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(300 + w + 10, y + 6, `${bytes} B`, { font: 'mono', size: 17, anchor: 'start' });
  });
  s.text(440, 470, 'Shallow: a list counts its own slots, not the ints inside it.', { size: 18, color: C.muted });
  save('2.2-sizes.svg', s);
}

// ---------------------------------------------------------------- 5. refcount over an object's life
{
  const steps = [
    ['fresh x', 2, 'x'], ['y = x', 3, 'x, y'], ['del y', 2, 'x'], ['[x] in a list', 3, 'x, list'], ['clear()', 2, 'x'],
  ];
  const s = new Sketch(880, 330, { title: 'Reported sys.getrefcount of one int object across five steps: 2, 3, 2, 3, 2', seed: 2205 });
  s.text(440, 34, 'sys.getrefcount(x) over one object’s life', { size: 26, weight: 700 });
  steps.forEach(([label, count, names], i) => {
    const cx = 110 + i * 170;
    s.text(cx, 96, label, { size: 19 });
    s.rect(cx - 62, 116, 124, 100, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx, 176, String(count), { font: 'mono', size: 40, weight: 700 });
    s.text(cx, 254, names, { font: 'mono', size: 16, color: C.muted });
    if (i < steps.length - 1) s.arrow(cx + 66, 166, cx + 104, 166, { color: C.muted });
  });
  s.text(440, 300, 'Each count includes one extra reference: the argument passed to sys.getrefcount.', { size: 18, color: C.muted });
  save('2.2-refcount.svg', s);
}
