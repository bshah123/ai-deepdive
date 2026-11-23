// Diagrams for 10.1 (classes, __dict__ vs __slots__).
// Run: node scripts/diagrams/lessons/10.1.mjs
// Every number comes from scripts/diagrams/lessons/10.1_data.json (written by 10.1_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-10-oop/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '10.1_data.json'), 'utf8'));
const mem = data.memory_bytes_per_instance;

// ---------------------------------------------------------------- 10.1-layout.svg
{
  const s = new Sketch(880, 330, { title: 'Two instance layouts: a plain instance points to a separate dict of attributes; a slotted instance holds its attributes in fixed cells inside the object', seed: 1001 });
  s.text(440, 34, 'Where one instance keeps its attributes', { size: 26, weight: 700 });

  // left: plain class
  s.text(215, 86, 'plain class', { size: 20, weight: 700, color: C.amber });
  s.rect(50, 100, 170, 130, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(135, 130, 'instance', { size: 18, weight: 700 });
  s.text(135, 200, '__dict__', { font: 'mono', size: 15 });
  s.arrow(220, 175, 262, 175, { color: C.muted, head: 8 });
  s.rect(262, 100, 186, 130, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(355, 128, 'separate dict', { size: 16, weight: 700 });
  s.text(355, 160, ["'name': 'Bob'", "'age': 25"], { font: 'mono', size: 16 });

  // right: slotted class
  s.text(655, 86, '__slots__ class', { size: 20, weight: 700, color: C.blue });
  s.rect(490, 100, 340, 130, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(660, 128, 'one object', { size: 16, weight: 700 });
  s.rect(505, 145, 100, 65, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(555, 182, 'header', { font: 'mono', size: 15 });
  s.rect(620, 145, 100, 65, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(670, 175, ["name", "'Bob'"], { font: 'mono', size: 15 });
  s.rect(735, 145, 80, 65, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(775, 175, ["age", "25"], { font: 'mono', size: 15 });

  s.note(40, 262, 400, 52, ['Two objects per instance: the dict is', 'found through __dict__, one pointer away.'], { size: 17 });
  s.note(460, 262, 380, 52, ['One object: slots are fixed cells,', 'no dict and no room for new names.'], { size: 17 });
  save('10.1-layout.svg', s);
}

// ---------------------------------------------------------------- 10.1-size-chart.svg
{
  const s = new Sketch(880, 420, { title: `Bar chart: bytes per instance with __dict__ and with __slots__, for 2, 4 and 8 attributes, measured with tracemalloc on CPython ${data.python}`, seed: 1002 });
  s.text(440, 34, 'Bytes per instance (100,000 instances)', { size: 26, weight: 700 });
  const base = 350, scale = 1.8;
  s.line(110, base, 800, base, { color: C.muted, width: 2 });
  // legend
  s.rect(120, 62, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(146, 76, '__dict__', { size: 17, anchor: 'start' });
  s.rect(250, 62, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(276, 76, '__slots__', { size: 17, anchor: 'start' });

  [['2', 240], ['4', 440], ['8', 640]].forEach(([k, cx]) => {
    const d = Math.round(mem[k].dict), sl = Math.round(mem[k].slots);
    const hd = d * scale, hs = sl * scale;
    s.rect(cx - 84, base - hd, 76, hd, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.rect(cx + 8, base - hs, 76, hs, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx - 46, base - hd - 10, String(d), { font: 'mono', size: 16 });
    s.text(cx + 46, base - hs - 10, String(sl), { font: 'mono', size: 16 });
    s.text(cx, base + 30, `${k} attributes`, { size: 18, weight: 700 });
  });
  s.text(440, 400, 'Values are containers only: each attribute holds the same shared int.', { size: 16, color: C.muted });
  save('10.1-size-chart.svg', s);
}

// ---------------------------------------------------------------- 10.1-typo.svg
{
  const s = new Sketch(880, 330, { title: 'The same misspelled attribute name on a slotted instance raises at once; on a dict instance it is silently stored', seed: 1003 });
  s.text(440, 34, 'The same typo, two classes', { size: 26, weight: 700 });

  s.rect(40, 90, 300, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(190, 124, 'slotted: p.adress = "..."', { font: 'mono', size: 15 });
  s.arrow(346, 118, 410, 118, { color: C.muted, head: 8 });
  s.rect(416, 90, 424, 56, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(628, 124, 'AttributeError: no slot named adress', { size: 19 });

  s.rect(40, 185, 300, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(190, 219, 'dict: d.adress = "..."', { font: 'mono', size: 15 });
  s.arrow(346, 213, 410, 213, { color: C.muted, head: 8 });
  s.rect(416, 185, 424, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(628, 219, 'no error: vars(d) gains "adress"', { size: 19 });

  s.text(440, 290, 'The dict bug surfaces later, when code reads d.address and finds nothing.', { size: 17, color: C.muted });
  save('10.1-typo.svg', s);
}

// ---------------------------------------------------------------- 10.1-subclass.svg
{
  const s = new Sketch(880, 300, { title: 'A subclass that declares no __slots__ gets a __dict__ in addition to the inherited slots', seed: 1004 });
  s.text(440, 34, 'A subclass without __slots__ brings a __dict__ back', { size: 26, weight: 700 });
  s.rect(60, 70, 760, 150, { color: C.ink, fill: C.blueSoft, fillStyle: 'hachure' });
  s.text(440, 96, 'Sub instance (class Sub(Person))', { size: 18, weight: 700 });
  s.rect(90, 120, 130, 66, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(155, 158, ['name', 'slot'], { font: 'mono', size: 15 });
  s.rect(240, 120, 130, 66, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(305, 158, ['age', 'slot'], { font: 'mono', size: 15 });
  s.rect(420, 120, 340, 66, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(590, 150, '__dict__ (new)', { font: 'mono', size: 15 });
  s.text(590, 172, "holds 'extra'", { font: 'mono', size: 15 });
  s.text(220, 240, 'inherited from Person', { size: 17, color: C.muted });
  s.text(590, 240, 'added by Sub', { size: 17, color: C.muted });
  s.note(60, 252, 760, 40, ['Keep __slots__ in every class of the hierarchy, or the savings disappear.'], { size: 17 });
  save('10.1-subclass.svg', s);
}
console.log('wrote 4 diagrams to', OUT);
