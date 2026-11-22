import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Every number below is read from 7.1_data.json, written by 7.1_experiment.py.
const HERE = dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(readFileSync(join(HERE, '7.1_data.json'), 'utf8'));

const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-07-functions-call-stack/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. The chain of frames seen from the innermost call (Block 1).
{
  const s = new Sketch(880, 500, { title: 'Five frames seen from the innermost call', seed: 701 });
  s.text(440, 40, 'Five frames seen from the innermost call', { size: 26, weight: 700 });
  const x = 250, w = 300, h = 44, step = 84, top = 70;
  D.chain.forEach((label, i) => {
    const y = top + i * step;
    const last = i === D.chain.length - 1;
    s.rect(x, y, w, h, { color: last ? C.amber : C.blue, fill: last ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x + w / 2, y + 29, label, { font: 'mono', size: 18 });
    if (!last) {
      s.arrow(x + w / 2, y + h + 6, x + w / 2, y + step - 6, { color: C.muted });
      s.text(x + w / 2 + 16, y + h + (step - h) / 2 + 5, 'f_back', { font: 'mono', size: 17, anchor: 'start', color: C.muted });
    }
  });
  s.text(60, 100, ['innermost', 'call (top)'], { size: 17, anchor: 'start' });
  s.text(60, 430, ['bottom:', 'module'], { size: 17, anchor: 'start' });
  s.note(600, 150, 240, 110, ['each frame points', 'to its caller through', 'f_back; the module', 'frame has f_back None'], { size: 18 });
  save('7.1-chain.svg', s);
}

// 2. What one frame object holds (field names from the 3.12 frame struct).
{
  const s = new Sketch(880, 400, { title: 'Inside one frame object', seed: 702 });
  s.text(440, 38, 'Inside one frame object', { size: 26, weight: 700 });
  const rows = [
    ['f_code', 'the code object being run'],
    ['f_back', "the caller's frame (None at the bottom)"],
    ['f_locals', `local variables; n lives here (co_nlocals = ${D.co_nlocals})`],
    ['f_lasti', 'offset of the current instruction'],
    ['stack', `value slots, up to co_stacksize = ${D.co_stacksize}`],
  ];
  rows.forEach(([key, desc], i) => {
    const y = 90 + i * 54;
    s.rect(60, y, 170, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(145, y + 26, key, { font: 'mono', size: 18 });
    s.text(250, y + 26, desc, { size: 18, anchor: 'start' });
  });
  s.note(640, 90, 230, 140, ['CPython 3.12 keeps this', 'state in an internal', '_PyInterpreterFrame and', 'makes this object only', 'when sys._getframe() asks'], { size: 17 });
  save('7.1-frame-anatomy.svg', s);
}

// 3. Value-stack depth along the recursive branch (Block 4).
{
  const s = new Sketch(880, 430, { title: 'Value-stack depth on the recursive branch', seed: 703 });
  s.text(440, 38, 'Value-stack depth along n * factorial(n - 1)', { size: 24, weight: 700 });
  const base = 330, unit = 40;
  s.line(70, base, 830, base, { color: C.ink });
  D.stack_trace.forEach((t, i) => {
    const x = 90 + i * 98, w = 60, h = t.depth_after * unit;
    s.rect(x, base - h, w, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + w / 2, base - h - 12, String(t.depth_after), { size: 18, weight: 700 });
    const parts = t.opname.split('_');
    s.text(x + w / 2, 352, String(t.offset), { font: 'mono', size: 15, color: C.muted });
    s.text(x + w / 2, 372, parts[0], { font: 'mono', size: 15 });
    if (parts.length > 1) s.text(x + w / 2, 392, parts.slice(1).join('_'), { font: 'mono', size: 15 });
  });
  const cap = D.co_stacksize;
  s.line(70, base - cap * unit, 830, base - cap * unit, { color: C.rose, dash: '6 8' });
  s.text(70, base - cap * unit - 14, `co_stacksize = ${cap}`, { size: 18, anchor: 'start', color: C.rose });
  save('7.1-stack-depth.svg', s);
}

// 4. A frame object outlives its call (Block 3).
{
  const s = new Sketch(880, 340, { title: 'A frame object outlives its call', seed: 704 });
  s.text(440, 38, 'A frame object outlives its call', { size: 26, weight: 700 });
  s.rect(60, 90, 300, 190, { color: C.muted, dash: '6 8' });
  s.text(210, 150, ['make_frame() has returned,', 'so its locals should be gone'], { size: 19 });
  s.text(210, 220, ['the call is off the stack'], { size: 19 });
  s.arrow(370, 185, 450, 185, { color: C.ink });
  s.rect(460, 90, 360, 190, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(640, 125, 'frame object (still referenced)', { size: 19, weight: 700 });
  s.text(640, 165, `f_code.co_name = ${D.captured_name}`, { font: 'mono', size: 16 });
  s.text(640, 200, `f_locals["secret"] = ${D.captured_secret}`, { font: 'mono', size: 16 });
  s.text(640, 235, `f_back = ${D.captured_f_back}`, { font: 'mono', size: 16 });
  s.text(440, 310, 'frame = make_frame() keeps the frame object, so its locals and f_back stay reachable.', { size: 17 });
  save('7.1-captured-frame.svg', s);
}
