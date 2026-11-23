// Diagrams for Lesson 2.3 (object identity and id()). Run: node scripts/diagrams/lessons/2.3.mjs
// Every address and result below is copied from one run of scripts/diagrams/lessons/2.3_data.py
// (CPython 3.12.13, arm64 macOS). Addresses differ on every run; the diagrams only illustrate that run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// a list box: body text inside, id text under it
const obj = (s, x, y, w, h, body, idText, o) => {
  s.rect(x, y, w, h, { color: o.color, fill: o.soft, fillStyle: 'solid', width: 2, dash: o.dash });
  s.text(x + w / 2, y + h / 2 + 7, body, { font: 'mono', size: 20, color: o.textColor || C.ink });
  if (idText) s.text(x + w / 2, y + h + 24, idText, { font: 'mono', size: 15, color: o.idColor || C.muted });
};
// a name tag: a small box with the variable name
const tag = (s, x, y, name) => {
  s.rect(x, y, 64, 34, { color: C.ink, width: 1.6 });
  s.text(x + 32, y + 24, name, { font: 'mono', size: 18 });
  return { right: x + 64, mid: y + 17 };
};

// ---------------------------------------------------------------- 1. names and ids
{
  const s = new Sketch(880, 330, { title: 'Two names share one list and one id; an equal list has its own id', seed: 2301 });
  s.text(440, 34, 'Same object, same id. Equal value is not the same object.', { size: 24, weight: 700 });
  const ta = tag(s, 60, 80, 'a');
  const tb = tag(s, 60, 140, 'b');
  obj(s, 260, 92, 170, 56, '[1, 2]', 'id 0x10a729800', { color: C.green, soft: C.greenSoft });
  s.arrow(ta.right, ta.mid, 260, 112, { color: C.ink });
  s.arrow(tb.right, tb.mid, 260, 132, { color: C.ink });
  const tc = tag(s, 60, 240, 'c');
  obj(s, 260, 232, 170, 56, '[1, 2]', 'id 0x10a87ab00', { color: C.amber, soft: C.amberSoft });
  s.arrow(tc.right, tc.mid, 260, 262, { color: C.ink });
  s.text(500, 120, 'a is b    True', { font: 'mono', size: 20, anchor: 'start', color: C.green });
  s.text(500, 160, 'a is c    False', { font: 'mono', size: 20, anchor: 'start', color: C.rose });
  s.text(500, 200, 'a == c    True', { font: 'mono', size: 20, anchor: 'start', color: C.blue });
  s.text(500, 262, ['== compares values;', 'is compares identity'], { size: 20, anchor: 'start', color: C.muted });
  save('2.3-names-and-ids.svg', s);
}

// ---------------------------------------------------------------- 2. mutation keeps id, rebinding changes it
{
  const s = new Sketch(880, 430, { title: 'x.append keeps the object and its id; x = x + [4] points x at a new object', seed: 2302 });
  s.text(440, 34, 'Mutation keeps identity; rebinding moves the name', { size: 24, weight: 700 });
  const cols = [150, 440, 730];
  const titles = ['x = [1, 2]', 'x.append(3)', 'x = x + [4]'];
  cols.forEach((cx, i) => s.text(cx, 74, titles[i], { font: 'mono', size: 19, color: C.muted }));
  // column 1 and 2: one object, same id
  const cx1 = cols[0];
  tag(s, cx1 - 32, 100, 'x');
  s.arrow(cx1, 134, cx1, 158, { color: C.ink });
  obj(s, cx1 - 100, 160, 200, 56, '[1, 2]', 'id 0x10a85c500', { color: C.green, soft: C.greenSoft });

  const cx2 = cols[1];
  tag(s, cx2 - 32, 100, 'x');
  s.arrow(cx2, 134, cx2, 158, { color: C.ink });
  obj(s, cx2 - 100, 160, 200, 56, '[1, 2, 3]', 'id 0x10a85c500', { color: C.green, soft: C.greenSoft });
  s.text(cx2, 268, 'same id: changed in place', { size: 18, color: C.green });

  // column 3: new object, old one has no name left
  const cx3 = cols[2];
  tag(s, cx3 - 32, 100, 'x');
  s.arrow(cx3, 134, cx3, 158, { color: C.ink });
  obj(s, cx3 - 100, 160, 200, 56, '[1, 2, 3, 4]', 'id 0x10a87b4c0', { color: C.amber, soft: C.amberSoft });
  obj(s, cx3 - 100, 268, 200, 56, '[1, 2, 3]', null, { color: C.muted, soft: null, dash: '6 8' });
  s.text(cx3, 352, 'old list: no name left', { size: 18, color: C.rose });

  s.note(120, 390, 640, 36, 'Identity is fixed for an object’s lifetime. Only the name moves.', { size: 20 });
  save('2.3-mutation-rebind.svg', s);
}

// ---------------------------------------------------------------- 3. function arguments
{
  const s = new Sketch(880, 380, { title: 'A parameter starts as the caller’s object; mutation is shared, rebinding is local', seed: 2303 });
  s.text(440, 34, 'Arguments are passed by assignment', { size: 24, weight: 700 });
  s.line(440, 60, 440, 340, { color: C.muted, width: 1.2, dash: '4 8' });

  // left: mutate
  s.text(220, 72, "lst.append('m')", { font: 'mono', size: 18, color: C.muted });
  const p = tag(s, 40, 120, 'p');
  const l1 = tag(s, 40, 200, 'lst');
  obj(s, 280, 130, 170, 56, "[0, 'm']", 'id 0x10a87b240', { color: C.green, soft: C.greenSoft });
  s.arrow(p.right, p.mid, 280, 146, { color: C.ink });
  s.arrow(l1.right, l1.mid, 280, 172, { color: C.ink });
  s.text(220, 292, ['p sees the change:', 'one shared object'], { size: 20, color: C.green });

  // right: rebind
  s.text(660, 72, "lst = ['r']", { font: 'mono', size: 18, color: C.muted });
  const q = tag(s, 490, 120, 'q');
  const l2 = tag(s, 490, 200, 'lst');
  obj(s, 700, 110, 140, 56, '[0]', 'id 0x10a7290c0', { color: C.blue, soft: C.blueSoft });
  obj(s, 700, 230, 140, 56, "['r']", null, { color: C.amber, soft: C.amberSoft });
  s.arrow(q.right, q.mid, 700, 138, { color: C.ink });
  s.arrow(l2.right, l2.mid, 700, 258, { color: C.ink });
  s.text(660, 330, ['q still [0]:', 'the name lst moved'], { size: 20, color: C.rose });

  save('2.3-call-by-assignment.svg', s);
}

// ---------------------------------------------------------------- 4. small-int cache
{
  const s = new Sketch(880, 320, { title: 'Which runtime-built ints are the same object (CPython 3.12)', seed: 2304 });
  s.text(440, 34, 'CPython reuses small ints; larger ones are new objects', { size: 24, weight: 700 });
  s.text(440, 76, 'two separate int("n") calls, then is', { size: 19, color: C.muted });
  s.rect(160, 128, 300, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.6 });
  s.text(310, 154, 'cached: -5 to 256', { font: 'mono', size: 18 });
  s.line(60, 200, 830, 200, { color: C.ink, width: 1.8 });
  const ticks = [
    [80, '-6', 'different', C.rose],
    [180, '-5', 'same', C.green],
    [290, '5', 'same', C.green],
    [450, '256', 'same', C.green],
    [520, '257', 'different', C.rose],
    [760, '1000', 'different', C.rose],
  ];
  for (const [x, label, res, color] of ticks) {
    s.line(x, 192, x, 208, { color: C.ink, width: 1.6 });
    s.text(x, 234, label, { font: 'mono', size: 20 });
    s.text(x, 266, res, { size: 19, color });
  }
  s.text(440, 302, 'Not to scale. CPython detail: do not rely on it in code.', { size: 17, color: C.muted });
  save('2.3-small-int-cache.svg', s);
}

// ---------------------------------------------------------------- 5. id reuse
{
  const s = new Sketch(880, 320, { title: 'A freed address can come back as a new object’s id', seed: 2305 });
  s.text(440, 34, 'The same id, two objects, two different times', { size: 24, weight: 700 });
  const xs = [90, 380, 650];
  s.text(xs[0] + 85, 80, 't = [1]', { font: 'mono', size: 19, color: C.muted });
  s.text(xs[1] + 85, 80, 'del t', { font: 'mono', size: 19, color: C.muted });
  s.text(xs[2] + 85, 80, 'u = [2]', { font: 'mono', size: 19, color: C.muted });
  obj(s, xs[0], 120, 170, 56, '[1]', 'id 0x10a81fac0', { color: C.blue, soft: C.blueSoft });
  s.arrow(xs[0] + 175, 148, xs[1] - 6, 148, { color: C.muted });
  obj(s, xs[1], 120, 170, 56, '[1]', 'freed: address free', { color: C.rose, soft: null, dash: '6 8', idColor: C.rose });
  s.arrow(xs[1] + 175, 148, xs[2] - 6, 148, { color: C.muted });
  obj(s, xs[2], 120, 170, 56, '[2]', 'id 0x10a81fac0', { color: C.green, soft: C.greenSoft });
  s.note(150, 236, 580, 52, ['same address reused,', 'so the two ids match'], { size: 20 });
  save('2.3-id-reuse.svg', s);
}
