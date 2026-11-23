import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Values from scripts run with CPython 3.12.13 (see the lesson's worked example).
// Step labels and reported sys.getrefcount values, in order:
const TRACE = [
  ['o = Obj()', 2],
  ['p = o', 3],
  ['del p', 2],
  ['lst = [o]', 3],
  ['lst.clear()', 2],
  ['del o', null], // object freed: a weak reference is dead, so no count can be read
];

// 1. Two names, one object. Reported count 3 = stored 2 + the call argument.
{
  const s = new Sketch(880, 300, { title: 'Two names point at one object; the stored count is 2', seed: 271 });
  s.text(440, 40, 'Two names, one object', { size: 26, weight: 700 });
  s.rect(60, 80, 100, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 108, 'o', { font: 'mono', size: 20 });
  s.rect(60, 190, 100, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 218, 'p', { font: 'mono', size: 20 });
  s.rect(340, 100, 230, 110, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(455, 140, 'the object', { size: 20 });
  s.text(455, 186, 'stored count = 2', { font: 'mono', size: 18, weight: 700 });
  s.arrow(160, 102, 340, 128, { color: C.muted });
  s.arrow(160, 212, 340, 180, { color: C.muted });
  s.rect(640, 225, 200, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(740, 250, 'call argument (+1)', { size: 17 });
  s.arrow(640, 240, 572, 200, { color: C.rose });
  s.note(620, 80, 230, 74, ['sys.getrefcount(o)', 'reports 3'], { size: 19 });
  save('2.7-names-and-count.svg', s);
}

// 2. Bars of the reported count over a sequence of operations.
{
  const s = new Sketch(880, 380, { title: 'Reported sys.getrefcount values over six steps', seed: 272 });
  s.text(440, 40, 'The count rises and falls with each name', { size: 26, weight: 700 });
  const base = 300;
  const unit = 55;
  TRACE.forEach(([label, v], i) => {
    const x0 = 40 + i * 140;
    if (v === null) {
      s.circle(x0 + 50, 230, 96, { color: C.rose, dash: '6 8' });
      s.text(x0 + 50, 236, 'freed', { size: 20, color: C.rose, weight: 700 });
    } else {
      const h = v * unit;
      s.rect(x0, base - h, 100, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(x0 + 50, base - h - 12, String(v), { size: 22, weight: 700 });
    }
    s.text(x0 + 50, base + 30, label, { font: 'mono', size: 16 });
  });
  s.line(30, base, 860, base, { color: C.ink });
  s.text(440, 362, 'Bar height = value reported by sys.getrefcount(o), which includes its own argument.', { size: 16, color: C.muted });
  save('2.7-trace.svg', s);
}

// 3. What a decrement does: drop a name, subtract one, test for zero.
{
  const s = new Sketch(880, 320, { title: 'What happens when a name is dropped', seed: 273 });
  s.text(440, 40, 'When a reference goes away', { size: 26, weight: 700 });
  s.rect(40, 80, 200, 60, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(140, 106, 'a name is dropped', { size: 18 });
  s.text(140, 128, 'del, rebind, scope end', { size: 16, color: C.muted });
  s.rect(300, 80, 200, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(400, 116, 'count - 1', { font: 'mono', size: 20 });
  s.rect(560, 80, 280, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(700, 116, 'count == 0 ?', { font: 'mono', size: 20 });
  s.arrow(240, 110, 300, 110, { color: C.muted });
  s.arrow(500, 110, 560, 110, { color: C.muted });
  s.rect(530, 210, 320, 66, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(690, 238, 'yes: __del__ runs, memory freed', { size: 18 });
  s.arrow(700, 140, 700, 210, { color: C.green });
  s.text(712, 182, 'yes', { size: 18, color: C.green, anchor: 'start' });
  s.rect(60, 210, 300, 66, { color: C.muted, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(210, 238, 'no: object stays alive', { size: 18 });
  s.arrow(600, 140, 380, 210, { color: C.muted });
  s.text(470, 180, 'no', { size: 18, color: C.muted });
  save('2.7-decref-flow.svg', s);
}

// 4. Reference cycle: the count never reaches zero until the cyclic collector runs.
{
  const s = new Sketch(880, 320, { title: 'A self-reference survives del', seed: 274 });
  s.text(220, 40, 'after del a', { size: 24, weight: 700 });
  s.text(660, 40, 'after gc.collect()', { size: 24, weight: 700 });
  s.line(440, 60, 440, 300, { color: C.muted, dash: '6 8' });
  s.rect(140, 130, 160, 70, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(220, 172, 'Node', { font: 'mono', size: 20 });
  s.curveArrow(180, 130, 220, 62, 260, 130, { color: C.blue });
  s.text(278, 98, 'a.self', { font: 'mono', size: 17, color: C.blue, anchor: 'start' });
  s.text(220, 252, 'no name left; count = 1 from a.self', { size: 17, color: C.muted });
  s.rect(580, 130, 160, 70, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(660, 172, 'Node', { font: 'mono', size: 20 });
  s.curveArrow(620, 130, 660, 62, 700, 130, { color: C.blue });
  s.text(718, 98, 'a.self', { font: 'mono', size: 17, color: C.blue, anchor: 'start' });
  s.circle(660, 165, 230, { color: C.rose, dash: '6 8' });
  s.text(660, 300, 'unreachable: collected', { size: 17, color: C.rose });
  save('2.7-cycle.svg', s);
}
