import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number and list string below comes from 2.5_data.py (its JSON output).
const D = JSON.parse(readFileSync(join(HERE, '2.5_data.json'), 'utf8'));
const mb = (b) => (b === 0 ? '0 B' : `${(b / 1e6).toFixed(1)} MB`);

// 1. Assignment binds a second name to the same object.
{
  const s = new Sketch(880, 300, { title: 'Two names a and b pointing at one list object', seed: 101 });
  s.text(440, 34, 'b = a adds a second arrow; no list is copied', { size: 24, weight: 700 });
  s.rect(60, 110, 110, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 142, 'a', { font: 'mono', size: 22 });
  s.rect(60, 200, 110, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 232, 'b', { font: 'mono', size: 22 });
  s.rect(480, 100, 320, 150, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(640, 140, 'one list object', { size: 19 });
  s.text(640, 200, '[1, 2, 3]', { font: 'mono', size: 22 });
  s.arrow(170, 135, 478, 150, { color: C.muted });
  s.arrow(170, 225, 478, 210, { color: C.muted });
  s.text(440, 282, 'Both names are labels on the same object, so an in-place change shows through both.', { size: 17, color: C.muted });
  save('2.5-names.svg', s);
}

// 2. Mutating through a name vs rebinding a name.
{
  const s = new Sketch(880, 340, { title: 'Left: append changes the shared list. Right: reassigning x moves only x', seed: 102 });
  s.line(440, 30, 440, 320, { color: C.muted, dash: '6 8' });
  s.text(220, 50, 'x.append(4): mutate the object', { size: 22, weight: 700 });
  s.rect(40, 120, 70, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(75, 149, 'x', { font: 'mono', size: 20 });
  s.rect(40, 220, 70, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(75, 249, 'y', { font: 'mono', size: 20 });
  s.rect(200, 110, 230, 150, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(315, 150, 'same object', { size: 17 });
  s.text(315, 200, D.y_after_mutate_x, { font: 'mono', size: 20 });
  s.arrow(110, 142, 198, 150, { color: C.muted });
  s.arrow(110, 242, 198, 230, { color: C.muted });
  s.text(220, 300, 'y also shows 4', { size: 19, color: C.muted });

  s.text(660, 50, 'x = [5, 6, 7]: rebind the name', { size: 22, weight: 700 });
  s.rect(480, 120, 70, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(515, 149, 'x', { font: 'mono', size: 20 });
  s.rect(480, 220, 70, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(515, 249, 'y', { font: 'mono', size: 20 });
  s.rect(640, 96, 200, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(740, 130, D.x_after_rebind, { font: 'mono', size: 20 });
  s.rect(640, 220, 200, 56, { color: C.muted, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(740, 254, D.y_after_rebind_x, { font: 'mono', size: 20 });
  s.arrow(550, 142, 638, 124, { color: C.muted });
  s.arrow(550, 242, 638, 248, { color: C.muted });
  s.text(660, 300, 'x moved; y still points to the old list', { size: 19, color: C.muted });
  save('2.5-mutate-rebind.svg', s);
}

// 3. Function parameters are local names bound to the caller's objects.
{
  const s = new Sketch(880, 340, { title: 'Parameters are names bound to the caller objects', seed: 103 });
  s.line(440, 30, 440, 320, { color: C.muted, dash: '6 8' });
  s.text(220, 50, 'mutate_param: p.append(99)', { size: 22, weight: 700 });
  s.rect(40, 120, 110, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(95, 149, 'lst', { font: 'mono', size: 17 });
  s.rect(40, 220, 110, 44, { color: C.violet, fill: C.violet, fillStyle: 'solid' });
  s.text(95, 249, 'p', { font: 'mono', size: 17 });
  s.rect(240, 110, 180, 144, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(330, 150, D.lst_after_mutate_param, { font: 'mono', size: 20 });
  s.text(330, 200, 'one list', { size: 17 });
  s.arrow(150, 142, 238, 150, { color: C.muted });
  s.arrow(150, 242, 238, 220, { color: C.muted });
  s.text(220, 300, 'the caller sees the 99', { size: 19, color: C.muted });

  s.text(660, 50, 'rebind_param: p = [0]', { size: 22, weight: 700 });
  s.rect(480, 120, 110, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(535, 149, 'lst', { font: 'mono', size: 17 });
  s.rect(480, 220, 110, 44, { color: C.violet, fill: C.violet, fillStyle: 'solid' });
  s.text(535, 249, 'p', { font: 'mono', size: 17 });
  s.rect(680, 110, 160, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(760, 144, D.lst_after_rebind_param, { font: 'mono', size: 20 });
  s.rect(680, 210, 160, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(760, 244, '[0]', { font: 'mono', size: 20 });
  s.arrow(590, 142, 678, 136, { color: C.muted });
  s.arrow(590, 242, 678, 238, { color: C.muted });
  s.text(660, 300, 'p moved; lst is still [1, 99]', { size: 19, color: C.muted });
  save('2.5-call-frames.svg', s);
}

// 4. Shallow vs deep copy of a list of lists.
{
  const s = new Sketch(880, 560, { title: 'Shallow copy shares inner lists; deep copy makes new ones', seed: 104 });
  s.text(440, 34, 'copy.copy(nested): new outer list, same inner lists', { size: 23, weight: 700 });
  s.rect(30, 130, 140, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(100, 164, 'nested', { font: 'mono', size: 20 });
  s.rect(330, 80, 180, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(420, 112, 'A = [1, 9]', { font: 'mono', size: 19 });
  s.rect(330, 180, 180, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(420, 212, 'B = [2]', { font: 'mono', size: 19 });
  s.rect(670, 130, 160, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(750, 164, 'shallow', { font: 'mono', size: 20 });
  s.arrow(170, 148, 328, 106, { color: C.muted });
  s.arrow(170, 166, 328, 204, { color: C.muted });
  s.arrow(670, 148, 512, 106, { color: C.muted });
  s.arrow(670, 166, 512, 204, { color: C.muted });
  s.text(440, 262, 'A and B are shared: nested[0].append(9) shows in both', { size: 17, color: C.muted });

  s.line(40, 290, 840, 290, { color: C.muted, dash: '6 8' });
  s.text(440, 330, 'copy.deepcopy(nested): recursively new inner lists', { size: 23, weight: 700 });
  s.rect(30, 400, 140, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', dash: '6 8' });
  s.text(100, 434, 'nested', { font: 'mono', size: 20 });
  s.rect(330, 370, 180, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(420, 402, 'C = [1]', { font: 'mono', size: 19 });
  s.rect(330, 450, 180, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(420, 482, 'D = [2]', { font: 'mono', size: 19 });
  s.rect(670, 420, 160, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(750, 454, 'deep', { font: 'mono', size: 20 });
  s.arrow(670, 438, 512, 396, { color: C.muted });
  s.arrow(670, 456, 512, 474, { color: C.muted });
  s.text(440, 532, 'C and D are new: nested[0].append(9) does not reach them', { size: 17, color: C.muted });
  save('2.5-shallow-deep.svg', s);
}

// 5. Bytes that stay allocated, measured with tracemalloc.
{
  const s = new Sketch(880, 420, { title: 'Bytes allocated by each copy operation (measured)', seed: 105 });
  s.text(440, 34, 'Bytes that stay allocated after each operation', { size: 24, weight: 700 });
  const base = 290;
  const k = 22; // px per MB (decimal)
  const bars = [
    { label: ['b = a', 'no new list'], bytes: D.bytes_b_equals_a, color: C.green, soft: C.greenSoft },
    { label: ['a.copy()', '1,000,000 slots'], bytes: D.bytes_flat_shallow_copy, color: C.blue, soft: C.blueSoft },
    { label: ['copy.copy()', '100,000 lists'], bytes: D.bytes_nested_shallow, color: C.amber, soft: C.amberSoft },
    { label: ['copy.deepcopy()', '100,000 lists'], bytes: D.bytes_nested_deep, color: C.rose, soft: C.roseSoft },
  ];
  s.line(60, base, 820, base, { color: C.muted });
  bars.forEach((b, i) => {
    const cx = 150 + i * 180;
    const h = Math.max(3, (b.bytes / 1e6) * k);
    s.rect(cx - 60, base - h, 120, h, { color: b.color, fill: b.soft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, mb(b.bytes), { font: 'mono', size: 19 });
    s.text(cx, base + 28, b.label[0], { font: 'mono', size: 17 });
    s.text(cx, base + 52, b.label[1], { size: 16, color: C.muted });
  });
  s.text(440, 392, 'tracemalloc, CPython 3.12; exact byte counts vary by build', { size: 16, color: C.muted });
  save('2.5-copy-cost.svg', s);
}
