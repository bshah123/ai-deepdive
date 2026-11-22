import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Same name wiring, two operators: list mutates, tuple rebinds.
{
  const s = new Sketch(880, 330, { title: 'a += [4] grows one shared list; t += (4,) builds a new tuple and only t sees it', seed: 601 });
  s.text(440, 34, 'Same operator, two outcomes', { size: 26, weight: 700 });
  // left: list
  s.text(215, 84, 'list: mutable', { size: 20, weight: 700, color: C.blue });
  s.rect(50, 110, 70, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(85, 136, 'a', { font: 'mono', size: 18 });
  s.rect(50, 190, 70, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(85, 216, 'b', { font: 'mono', size: 18 });
  s.rect(230, 128, 170, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(315, 164, '[1, 2, 3, 4]', { font: 'mono', size: 16 });
  s.arrow(120, 130, 230, 146, { color: C.muted });
  s.arrow(120, 210, 230, 176, { color: C.muted });
  // right: tuple
  s.text(655, 84, 'tuple: immutable', { size: 20, weight: 700, color: C.amber });
  s.rect(440, 110, 70, 40, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(475, 136, 't', { font: 'mono', size: 18 });
  s.rect(440, 200, 70, 40, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(475, 226, 'u', { font: 'mono', size: 18 });
  s.rect(620, 110, 200, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(720, 136, '(1, 2, 3, 4)', { font: 'mono', size: 16 });
  s.rect(620, 200, 200, 40, { color: C.muted, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(720, 226, '(1, 2, 3)', { font: 'mono', size: 16 });
  s.arrow(510, 130, 620, 130, { color: C.muted });
  s.arrow(510, 220, 620, 220, { color: C.muted });
  s.note(40, 268, 800, 46, ['a and b share one object, so b sees the 4.  t and u were two names; u keeps the old tuple.'], { size: 18 });
  save('2.6-same-object.svg', s);
}

// 2. Type table: immutable vs mutable, hashability.
{
  const s = new Sketch(880, 400, { title: 'Immutable types are hashable; mutable built-ins are not', seed: 602 });
  s.text(440, 34, 'Built-in types at a glance', { size: 26, weight: 700 });
  s.text(230, 80, 'immutable: value never changes', { size: 19, weight: 700, color: C.green });
  s.text(650, 80, 'mutable: changed in place', { size: 19, weight: 700, color: C.rose });
  const imm = [['int', 'hashable'], ['float', 'hashable'], ['str', 'hashable'], ['bytes', 'hashable'], ['tuple', 'hashable*'], ['frozenset', 'hashable']];
  const mut = [['list', 'unhashable'], ['dict', 'unhashable'], ['set', 'unhashable'], ['bytearray', 'unhashable']];
  imm.forEach(([n, h], i) => {
    const y = 100 + i * 42;
    s.rect(60, y, 120, 32, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(120, y + 22, n, { font: 'mono', size: 16 });
    s.text(200, y + 22, h, { size: 17, anchor: 'start', color: C.muted });
  });
  mut.forEach(([n, h], i) => {
    const y = 100 + i * 42;
    s.rect(480, y, 130, 32, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(545, y + 22, n, { font: 'mono', size: 16 });
    s.text(625, y + 22, h, { size: 17, anchor: 'start', color: C.muted });
  });
  s.note(40, 352, 800, 36, ['* a tuple is hashable only if everything inside it is. A tuple holding a list is not.'], { size: 17 });
  save('2.6-type-table.svg', s);
}

// 3. Default argument: one list object, created once.
{
  const s = new Sketch(880, 330, { title: 'The default list is created once, when def runs', seed: 603 });
  s.text(440, 34, 'One default object, three calls', { size: 26, weight: 700 });
  s.rect(40, 120, 180, 50, { color: C.ink, fill: C.violet, fillStyle: 'solid' });
  s.text(130, 151, 'add_item', { font: 'mono', size: 17 });
  s.rect(420, 110, 260, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(550, 138, 'default: bag = []', { font: 'mono', size: 16 });
  s.text(550, 164, 'one object, mutated by calls', { size: 16, color: C.muted });
  s.arrow(220, 145, 420, 145, { color: C.muted });
  s.text(320, 132, '__defaults__', { font: 'mono', size: 15, color: C.muted });
  const calls = [['call 1 returns [1]', 40], ['call 2 returns [1, 2]', 315], ['call 3 returns [1, 2, 3]', 590]];
  calls.forEach(([label, x], i) => {
    s.rect(x, 240, 250, 46, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 125, 269, label, { font: 'mono', size: 15 });
    s.arrow(x + 125, 238, 550 + (i - 1) * 30, 182, { color: C.muted });
  });
  save('2.6-default-arg.svg', s);
}

// 4. Tuple holding a list: the list changes, the tuple refuses.
{
  const s = new Sketch(880, 320, { title: 't[0] += [2]: step 1 mutates the list, step 2 fails', seed: 604 });
  s.text(440, 34, 'An immutable tuple holding a mutable list', { size: 26, weight: 700 });
  s.rect(60, 110, 60, 40, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(90, 136, 't', { font: 'mono', size: 18 });
  s.rect(170, 100, 130, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(235, 126, 'slot 0', { font: 'mono', size: 16 });
  s.text(235, 148, 'the tuple', { size: 15, color: C.muted });
  s.rect(420, 100, 170, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(505, 136, '[1, 2]', { font: 'mono', size: 18 });
  s.arrow(120, 130, 170, 130, { color: C.muted });
  s.arrow(300, 130, 420, 130, { color: C.blue });
  s.text(360, 120, 'step 1: extend', { size: 16, color: C.blue });
  s.note(60, 200, 760, 90, ['step 1: list.__iadd__ extends the list in place. This works.', 'step 2: the tuple tries to store the result in slot 0. Tuples refuse item assignment.', 'Result: TypeError, but t is now ([1, 2],).'], { size: 17 });
  save('2.6-tuple-trap.svg', s);
}

// 5. Shallow vs deep copy.
{
  const s = new Sketch(880, 350, { title: 'Shallow copy shares inner lists; deep copy makes new ones', seed: 605 });
  s.text(440, 34, 'Shallow copy vs deep copy', { size: 26, weight: 700 });
  s.text(130, 78, 'orig', { font: 'mono', size: 18 });
  s.text(450, 78, 'shallow = copy.copy(orig)', { font: 'mono', size: 15 });
  s.text(740, 78, 'deep = copy.deepcopy(orig)', { font: 'mono', size: 15 });
  s.rect(60, 96, 140, 40, { color: C.ink, fill: C.violet, fillStyle: 'solid' });
  s.rect(380, 96, 140, 40, { color: C.ink, fill: C.violet, fillStyle: 'solid' });
  s.rect(690, 96, 140, 40, { color: C.ink, fill: C.violet, fillStyle: 'solid' });
  s.text(130, 122, 'outer list', { size: 16 });
  s.text(450, 122, 'new outer list', { size: 16 });
  s.text(760, 122, 'new outer list', { size: 16 });
  s.rect(60, 250, 150, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(135, 277, '[1, 2, 99]', { font: 'mono', size: 16 });
  s.rect(240, 250, 90, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(285, 277, '[3]', { font: 'mono', size: 16 });
  s.rect(560, 250, 130, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(625, 277, '[1, 2]', { font: 'mono', size: 16 });
  s.rect(720, 250, 90, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(765, 277, '[3]', { font: 'mono', size: 16 });
  s.arrow(130, 136, 110, 250, { color: C.muted });
  s.arrow(160, 136, 265, 250, { color: C.muted });
  s.arrow(430, 136, 120, 250, { color: C.blue, dash: '6 8' });
  s.arrow(450, 136, 275, 250, { color: C.blue });
  s.arrow(760, 136, 625, 250, { color: C.green });
  s.arrow(770, 136, 765, 250, { color: C.green });
  s.note(40, 312, 800, 30, ['orig[0].append(99) changes the shared inner list, so shallow shows 99 and deep does not.'], { size: 17 });
  save('2.6-copy.svg', s);
}

// 6. Measured: time multiplier when n doubles.
{
  const s = new Sketch(880, 340, { title: 'Doubling n: concat time grows about 4x, append about 2x', seed: 606 });
  s.text(440, 34, 'Time multiplier when n doubles', { size: 26, weight: 700 });
  const base = 280, k = 40; // 40 px per unit of multiplier
  s.line(120, base, 780, base, { color: C.muted });
  s.line(120, base - 2 * k, 780, base - 2 * k, { color: C.muted, dash: '6 8' });
  s.text(790, base - 2 * k + 6, 'x2 linear', { size: 15, anchor: 'start', color: C.muted });
  s.line(120, base - 4 * k, 780, base - 4 * k, { color: C.muted, dash: '6 8' });
  s.text(790, base - 4 * k + 6, 'x4 quadratic', { size: 15, anchor: 'start', color: C.muted });
  s.rect(200, base - 4.35 * k, 160, 4.35 * k, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(280, base - 4.35 * k - 14, 'x4.1 to x5.1', { size: 17, color: C.rose });
  s.text(280, base + 26, 'lst = lst + [i]', { font: 'mono', size: 16 });
  s.rect(470, base - 1.96 * k, 160, 1.96 * k, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(550, base - 1.96 * k - 14, 'x1.9 to x2.0', { size: 17, color: C.green });
  s.text(550, base + 26, 'lst.append(i)', { font: 'mono', size: 16 });
  save('2.6-growth.svg', s);
}
console.log('ok');
