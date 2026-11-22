// Diagrams for Lesson 12.1 (exception hierarchy, stack unwinding).
// Run: node scripts/diagrams/lessons/12.1.mjs
// Numbers come from scripts/diagrams/lessons/12.1_experiment.py (written to 12.1_data.json).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-12-exceptions-debugging/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};
const D = JSON.parse(readFileSync(join(HERE, '12.1_data.json'), 'utf8'));

// A labelled box. y is the top edge; the label is centred in the box.
const box = (s, x, y, w, h, label, o = {}) => {
  const size = o.size ?? 16;
  s.rect(x, y, w, h, {
    color: o.color ?? C.blue,
    fill: o.fill ?? C.blueSoft,
    fillStyle: o.fillStyle ?? 'solid',
    width: o.width ?? 1.4,
    dash: o.dash,
    roughness: 0.9,
  });
  s.text(x + w / 2, y + h / 2 + size * 0.36, label, {
    font: o.font ?? 'mono',
    size,
    color: o.textColor ?? C.ink,
  });
};

// ---------------------------------------------------------------- hierarchy
{
  const s = new Sketch(880, 430, { title: 'Part of the built-in exception tree, with Exception highlighted', seed: 1201 });
  s.text(440, 34, 'Where the common exceptions sit', { size: 26, weight: 700 });

  // level 1
  box(s, 370, 70, 140, 40, 'BaseException');
  // level 2: children of BaseException
  const L2 = [
    { x: 20, w: 130, label: 'SystemExit', cx: 85 },
    { x: 170, w: 190, label: 'KeyboardInterrupt', cx: 265 },
    { x: 380, w: 170, label: 'GeneratorExit', cx: 465 },
    { x: 600, w: 170, label: 'Exception', cx: 685, hi: true },
  ];
  L2.forEach((n) => {
    s.line(440, 110, n.cx, 170, { color: C.muted });
    box(s, n.x, 170, n.w, 40, n.label, n.hi
      ? { color: C.green, fill: C.greenSoft, width: 2.2 }
      : { color: C.muted, fill: C.blueSoft });
  });
  s.text(440, 240, 'also BaseExceptionGroup', { size: 17, color: C.muted });
  // level 3: children of Exception
  box(s, 400, 270, 190, 40, 'ArithmeticError', { color: C.green, fill: C.greenSoft });
  box(s, 620, 270, 170, 40, 'LookupError', { color: C.green, fill: C.greenSoft });
  s.line(685, 210, 495, 270, { color: C.muted });
  s.line(685, 210, 705, 270, { color: C.muted });
  // level 4
  box(s, 400, 350, 190, 40, 'ZeroDivisionError', { color: C.green, fill: C.greenSoft });
  box(s, 600, 350, 120, 40, 'KeyError', { color: C.green, fill: C.greenSoft });
  box(s, 735, 350, 130, 40, 'IndexError', { color: C.green, fill: C.greenSoft });
  s.line(495, 310, 495, 350, { color: C.muted });
  s.line(705, 310, 660, 350, { color: C.muted });
  s.line(705, 310, 800, 350, { color: C.muted });

  s.note(20, 262, 300, 110, ['except Exception catches', 'everything under the green box,', 'but not KeyboardInterrupt', 'or SystemExit'], { size: 18 });
  s.text(440, 412, `Exception has ${D.direct_exception.length} direct built-in subclasses (Python ${D.python})`, { size: 17, color: C.muted });
  save('12.1-hierarchy.svg', s);
}

// ---------------------------------------------------------------- unwinding
{
  const s = new Sketch(880, 430, { title: 'An exception unwinds five frames, running each finally, until one except catches it', seed: 1202 });
  s.text(440, 34, 'One exception, five frames', { size: 26, weight: 700 });
  const names = ['main_chain()', 'a()', 'b()', 'c()', 'd()'];
  const ys = [80, 140, 200, 260, 320];
  names.slice(0, 4).forEach((n, i) => box(s, 60, ys[i], 200, 44, n, { size: 17 }));
  // the frame that raises
  box(s, 60, 320, 200, 44, 'd(): 1 / 0', { size: 17, color: C.rose, fill: C.roseSoft, width: 2 });
  // finally blocks, in the order they run (deepest first)
  const fin = [
    { y: 320, t: '1. finally d' },
    { y: 260, t: '2. finally c' },
    { y: 200, t: '3. finally b' },
    { y: 140, t: '4. finally a' },
  ];
  fin.forEach((f) => box(s, 320, f.y, 190, 44, f.t, { font: 'hand', size: 19, color: C.amber, fill: C.amberSoft }));
  // handler in main_chain
  box(s, 320, 80, 300, 44, '5. except ZeroDivisionError', { size: 15, color: C.green, fill: C.greenSoft, width: 2 });
  // arrow showing the exception travelling up the stack
  s.arrow(42, 336, 42, 96, { color: C.rose, width: 2.2 });
  s.text(40, 400, 'exception travels up', { size: 18, color: C.rose, anchor: 'start' });
  s.note(600, 150, 240, 120, [`traceback at the catch:`, `${D.unwind_tb_entries} entries, one per frame`], { size: 19, rotate: -1 });
  s.text(440, 412, 'Frames are popped on the way up. Each finally runs before the frame goes away.', { size: 17, color: C.muted });
  save('12.1-unwinding.svg', s);
}

// ---------------------------------------------------------------- catch matrix
{
  const s = new Sketch(880, 430, { title: 'Which except clause handles each raised exception, computed from the experiment', seed: 1203 });
  s.text(440, 34, 'Which except clause handles each exception', { size: 26, weight: 700 });
  const clauses = ['ArithmeticError', 'LookupError', 'Exception', 'BaseException'];
  const rows = ['ZeroDivisionError', 'KeyError', 'NameError', 'KeyboardInterrupt'];
  s.text(40, 98, 'raised \\ except clause', { size: 16, color: C.muted, anchor: 'start' });
  clauses.forEach((c, j) => s.text(270 + j * 150 + 73, 98, c, { font: 'mono', size: 15, color: C.ink }));
  rows.forEach((r, i) => {
    const y = 118 + i * 60;
    s.text(40, y + 28, r, { font: 'mono', size: 16, anchor: 'start' });
    const m = D.catch_matrix[r];
    clauses.forEach((c, j) => {
      const x = 270 + j * 150;
      if (!m.matches.includes(c)) {
        box(s, x, y, 146, 46, '', { color: C.muted, fill: C.blueSoft, fillStyle: 'hachure', dash: '6 8', width: 1 });
      } else if (c === m.first) {
        box(s, x, y, 146, 46, 'runs', { font: 'hand', size: 21, color: C.green, fill: C.greenSoft, width: 2.2, textColor: C.green });
      } else {
        box(s, x, y, 146, 46, 'skipped', { font: 'hand', size: 19, color: C.muted, fill: C.blueSoft, fillStyle: 'solid', width: 1, textColor: C.muted });
      }
    });
  });
  s.text(440, 390, 'runs: the first clause that matches.  skipped: it matches, but an earlier clause already did.', { size: 17, color: C.muted });
  s.text(440, 414, 'blank: that clause does not match this exception.', { size: 17, color: C.muted });
  save('12.1-catch-matrix.svg', s);
}

// ---------------------------------------------------------------- clause order
{
  const s = new Sketch(880, 340, { title: 'Same ZeroDivisionError, two orders of except clauses', seed: 1204 });
  s.text(440, 34, 'The same error, two orders of except clauses', { size: 26, weight: 700 });

  s.text(40, 100, 'Broad clause first', { size: 22, weight: 700, anchor: 'start' });
  box(s, 40, 115, 190, 50, 'ZeroDivisionError', { size: 16 });
  s.arrow(232, 140, 268, 140, { color: C.muted });
  box(s, 270, 115, 270, 50, 'except Exception', { size: 16, color: C.rose, fill: C.roseSoft, width: 2 });
  s.arrow(542, 140, 578, 140, { color: C.muted });
  box(s, 580, 115, 260, 50, 'except ZeroDivisionError', { size: 15, color: C.muted, fill: C.blueSoft, dash: '6 8', width: 1 });
  s.text(40, 200, `returns "${D.wrong_order}"; the specific clause never runs`, { size: 19, color: C.rose, anchor: 'start' });

  s.text(40, 240, 'Specific clause first', { size: 22, weight: 700, anchor: 'start' });
  box(s, 40, 255, 190, 50, 'ZeroDivisionError', { size: 16 });
  s.arrow(232, 280, 268, 280, { color: C.muted });
  box(s, 270, 255, 270, 50, 'except ZeroDivisionError', { size: 15, color: C.green, fill: C.greenSoft, width: 2 });
  s.arrow(542, 280, 578, 280, { color: C.muted });
  box(s, 580, 255, 260, 50, 'except Exception', { size: 16, color: C.muted, fill: C.blueSoft, dash: '6 8', width: 1 });
  s.text(40, 330, `returns "${D.right_order}"`, { size: 19, color: C.green, anchor: 'start' });
  save('12.1-clause-order.svg', s);
}
