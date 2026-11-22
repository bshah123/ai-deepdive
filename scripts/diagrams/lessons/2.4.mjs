import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Names are labels on objects: a and c share one object, b has its own.
{
  const s = new Sketch(880, 360, { title: 'Three names, two objects: a and c point at the same list, b at an equal but separate list', seed: 241 });
  s.text(440, 34, 'Names point at objects', { size: 26, weight: 700 });
  s.rect(40, 96, 80, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(80, 122, 'a', { font: 'mono', size: 20 });
  s.rect(40, 206, 80, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(80, 232, 'c', { font: 'mono', size: 20 });
  s.rect(40, 286, 80, 40, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(80, 312, 'b', { font: 'mono', size: 20 });
  s.rect(430, 100, 200, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(530, 137, 'list #1', { font: 'mono', size: 18 });
  s.rect(430, 250, 200, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(530, 287, 'list #2', { font: 'mono', size: 18 });
  s.arrow(120, 116, 428, 126, { color: C.muted });
  s.arrow(120, 226, 428, 146, { color: C.muted });
  s.arrow(120, 306, 428, 282, { color: C.muted });
  s.note(690, 110, 170, 110, ['c.append(4)', 'changes list #1,', 'so a sees it too'], { size: 18 });
  s.text(440, 345, 'a is c: True    a is b: False    a == b: True', { size: 20, weight: 700 });
  save('2.4-names-and-objects.svg', s);
}

// 2. Dispatch of a == b: __eq__ of left, then right, then identity.
{
  const s = new Sketch(880, 400, { title: 'Dispatch of a == b: left __eq__, then right __eq__, then identity', seed: 242 });
  s.text(440, 34, 'What a == b does', { size: 26, weight: 700 });
  s.rect(280, 60, 320, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 90, 'type(a).__eq__(a, b)', { font: 'mono', size: 18 });
  s.rect(280, 170, 320, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 200, 'type(b).__eq__(b, a)', { font: 'mono', size: 18 });
  s.rect(280, 280, 320, 46, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 310, 'fallback: a is b', { font: 'mono', size: 18 });
  s.arrow(440, 106, 440, 168, { color: C.muted });
  s.arrow(440, 216, 440, 278, { color: C.muted });
  s.text(452, 142, 'NotImplemented', { size: 16, anchor: 'start', color: C.muted });
  s.text(452, 252, 'NotImplemented', { size: 16, anchor: 'start', color: C.muted });
  s.arrow(600, 83, 700, 83, { color: C.green });
  s.note(700, 58, 150, 52, ['bool returned:', 'that is the answer'], { size: 16 });
  s.arrow(600, 193, 700, 193, { color: C.green });
  s.note(700, 168, 150, 52, ['bool returned:', 'that is the answer'], { size: 16 });
  s.note(60, 300, 180, 86, ['plain class:', 'no __eq__ defined,', 'so identity decides'], { size: 16 });
  s.text(440, 380, 'a == b gives True only if an __eq__ says so or a is b', { size: 18, color: C.muted });
  save('2.4-eq-dispatch.svg', s);
}

// 3. Measured results of x is y for runtime-built values (CPython 3.12, one run).
{
  const rows = [
    ['int(str(-6)) is int(str(-6))', false],
    ['int(str(-5)) is int(str(-5))', true],
    ['int(str(0)) is int(str(0))', true],
    ['int(str(256)) is int(str(256))', true],
    ['int(str(257)) is int(str(257))', false],
    ['int(str(1000)) is int(str(1000))', false],
    ['chr(97) is chr(97)', true],
    ['chr(8364) is chr(8364)', false],
    ["''.join(['hel', 'lo']) is 'hello'", false],
  ];
  const s = new Sketch(880, 520, { title: 'Measured identity results for runtime-built int and str values', seed: 243 });
  s.text(440, 34, 'Equal values, sometimes the same object', { size: 26, weight: 700 });
  rows.forEach(([expr, same], i) => {
    const y = 84 + i * 42;
    s.text(60, y + 6, expr, { font: 'mono', size: 17, anchor: 'start' });
    s.rect(640, y - 14, 90, 30, { color: same ? C.green : C.rose, fill: same ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(685, y + 6, same ? 'True' : 'False', { size: 18, weight: 700 });
  });
  s.note(60, 462, 760, 44, ['CPython 3.12 caches -5..256 and single latin-1 characters: an implementation detail, not a rule.'], { size: 16 });
  save('2.4-identity-cache.svg', s);
}

// 4. NaN: the same object compares equal to itself inside a list, a new NaN does not.
{
  const s = new Sketch(880, 360, { title: 'List equality with NaN: same object gives True, two NaN objects give False', seed: 244 });
  s.text(440, 34, 'Lists of NaN', { size: 26, weight: 700 });
  s.text(230, 80, 'x = float("nan")', { font: 'mono', size: 18 });
  s.text(650, 80, 'two separate float("nan") calls', { font: 'mono', size: 18 });
  s.rect(60, 110, 120, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 142, '[x]', { font: 'mono', size: 20 });
  s.rect(60, 210, 120, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 242, '[x]', { font: 'mono', size: 20 });
  s.circle(330, 185, 90, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(330, 191, 'nan #1', { font: 'mono', size: 17 });
  s.arrow(180, 135, 282, 165, { color: C.muted });
  s.arrow(180, 235, 282, 205, { color: C.muted });
  s.text(230, 330, '[x] == [x] is True', { size: 22, weight: 700 });
  s.rect(470, 110, 120, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(530, 142, '[nan]', { font: 'mono', size: 20 });
  s.rect(470, 210, 120, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(530, 242, '[nan]', { font: 'mono', size: 20 });
  s.circle(700, 135, 80, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(700, 141, 'nan #2', { font: 'mono', size: 16 });
  s.circle(700, 235, 80, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(700, 241, 'nan #3', { font: 'mono', size: 16 });
  s.arrow(590, 135, 658, 135, { color: C.muted });
  s.arrow(590, 235, 658, 235, { color: C.muted });
  s.text(640, 330, '[nan] == [nan] is False', { size: 22, weight: 700 });
  save('2.4-nan-containers.svg', s);
}

// 5. Measured cost of is versus == (one run, CPython 3.12, ns per operation).
{
  const bars = [
    ['obj is None', 8.6, C.green, C.greenSoft],
    ['obj == None (Python __eq__)', 43.8, C.rose, C.roseSoft],
    ['v is 0 (int)', 7.4, C.green, C.greenSoft],
    ['v == 0 (int)', 8.4, C.blue, C.blueSoft],
  ];
  const s = new Sketch(880, 360, { title: 'Measured ns per operation: is versus == with a Python-level __eq__', seed: 245 });
  s.text(440, 34, 'Cost per operation (ns, one run)', { size: 26, weight: 700 });
  bars.forEach(([label, ns, col, soft], i) => {
    const y = 90 + i * 56;
    s.text(60, y + 22, label, { font: 'mono', size: 17, anchor: 'start' });
    s.rect(400, y, ns * 8, 34, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(400 + ns * 8 + 14, y + 23, `${ns.toFixed(1)} ns`, { size: 18, weight: 700, anchor: 'start' });
  });
  s.note(60, 316, 760, 34, ['Your numbers will differ. The ratio, about 5x for a Python-level __eq__, is the point.'], { size: 16 });
  save('2.4-is-vs-eq-cost.svg', s);
}
console.log('2.4 diagrams written');
