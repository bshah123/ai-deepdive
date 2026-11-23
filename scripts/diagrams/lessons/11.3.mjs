// Diagrams for Lesson 11.3 (container emulation and sequence protocols).
// Run: node scripts/diagrams/lessons/11.3.mjs
// Numbers come from scripts/diagrams/lessons/11.3_data.py (python 3.12) and the lesson's code blocks.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-11-python-data-model/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ------------------------------------------------------------ dispatch table
{
  const s = new Sketch(880, 420, { title: 'Table of Python operations, the special method each calls, and its fallback', seed: 1131 });
  s.text(440, 34, 'Each operation calls one method on your object', { size: 26, weight: 700 });
  s.text(125, 74, 'operation', { size: 17, color: C.muted });
  s.text(447, 74, 'method Python calls', { size: 17, color: C.muted });
  s.text(600, 74, 'if that method is missing', { size: 17, color: C.muted, anchor: 'start' });
  const rows = [
    ['len(s)', '__len__()', 'TypeError', C.muted],
    ['s[2]', '__getitem__(2)', 'TypeError', C.muted],
    ['s[1:4]', '__getitem__(slice)', 'same method, one slice', C.muted],
    ['x in s', '__contains__(x)', '__iter__, then __getitem__', C.amber],
    ['for x in s', '__iter__()', '__getitem__ from index 0', C.amber],
    ['reversed(s)', '__reversed__()', '__len__ and __getitem__', C.amber],
    ['s[2] = v', '__setitem__(2, v)', 'TypeError', C.muted],
    ['del s[2]', '__delitem__(2)', 'TypeError', C.muted],
  ];
  rows.forEach(([op, method, fb, fbColor], i) => {
    const t = 92 + i * 40;
    s.rect(40, t, 170, 30, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', roughness: 0.8 });
    s.text(125, t + 21, op, { font: 'mono', size: 16 });
    s.arrow(214, t + 15, 316, t + 15, { color: C.muted });
    s.rect(320, t, 250, 30, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', roughness: 0.8 });
    s.text(445, t + 21, method, { font: 'mono', size: 16 });
    s.text(600, t + 21, fb, { size: 16, color: fbColor, anchor: 'start' });
  });
  save('11.3-dispatch.svg', s);
}

// ------------------------------------------------------------ membership chain
{
  const s = new Sketch(880, 330, { title: 'Flow of the membership test x in s: __contains__, then __iter__, then __getitem__', seed: 1132 });
  s.text(440, 34, 'How x in s finds its answer', { size: 26, weight: 700 });
  const top = 66, h = 62;
  s.rect(30, top, 240, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(150, top + 38, '__contains__ defined?', { font: 'mono', size: 16 });
  s.rect(330, top, 240, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(450, top + 38, '__iter__ defined?', { font: 'mono', size: 16 });
  s.rect(630, top, 220, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(740, top + 26, '__getitem__ from 0', { font: 'mono', size: 15 });
  s.text(740, top + 49, 'until IndexError', { size: 18 });
  s.arrow(270, top + 31, 328, top + 31, { color: C.muted });
  s.text(299, top + 22, 'no', { size: 17, color: C.muted });
  s.arrow(570, top + 31, 628, top + 31, { color: C.muted });
  s.text(599, top + 22, 'no', { size: 17, color: C.muted });
  const y2 = 200, h2 = 62;
  s.arrow(150, top + h + 4, 150, y2 - 4, { color: C.green });
  s.text(168, 170, 'yes', { size: 17, color: C.green, anchor: 'start' });
  s.arrow(450, top + h + 4, 450, y2 - 4, { color: C.green });
  s.text(468, 170, 'yes', { size: 17, color: C.green, anchor: 'start' });
  s.arrow(740, top + h + 4, 740, y2 - 4, { color: C.amber });
  s.rect(30, y2, 240, h2, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(150, y2 + 38, 'return its answer', { size: 19 });
  s.rect(330, y2, 240, h2, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(450, y2 + 26, 'compare each item', { size: 19 });
  s.text(450, y2 + 49, 'until one equals x', { size: 19 });
  s.rect(630, y2, 220, h2, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(740, y2 + 26, 'IndexError ends', { size: 19 });
  s.text(740, y2 + 49, 'the scan: not found', { size: 19 });
  s.text(440, 300, 'Each step is a Python call, so a miss on a sequence of n items costs n + 1 calls.', { size: 18, color: C.muted });
  save('11.3-membership-chain.svg', s);
}

// ------------------------------------------------------------ index trace
{
  const s = new Sketch(880, 390, { title: 'Index trace: which indices __getitem__ receives for six operations on a five-item sequence', seed: 1133 });
  s.text(440, 34, 'Index trace: what __getitem__ is asked for', { size: 26, weight: 700 });
  const rows = [
    { label: 'list(s)', idx: [0, 1, 2, 3, 4, 5], end: 'miss', calls: '6 calls' },
    { label: '10 in s', idx: [0], end: 'hit', calls: '1 call' },
    { label: '30 in s', idx: [0, 1, 2], end: 'hit', calls: '3 calls' },
    { label: '50 in s', idx: [0, 1, 2, 3, 4], end: 'hit', calls: '5 calls' },
    { label: '99 in s', idx: [0, 1, 2, 3, 4, 5], end: 'miss', calls: '6 calls' },
    { label: 'list(reversed(s))', idx: [4, 3, 2, 1, 0], end: 'none', calls: '5 calls' },
  ];
  rows.forEach((r, row) => {
    const t = 80 + row * 46;
    s.text(24, t + 23, r.label, { font: 'mono', size: 16, anchor: 'start' });
    r.idx.forEach((k, j) => {
      const x = 240 + j * 52;
      const last = j === r.idx.length - 1;
      const kind = last && r.end === 'hit' ? 'hit' : last && r.end === 'miss' ? 'miss' : 'call';
      const color = kind === 'hit' ? C.green : kind === 'miss' ? C.rose : C.blue;
      const fill = kind === 'hit' ? C.greenSoft : kind === 'miss' ? C.roseSoft : C.blueSoft;
      s.rect(x, t, 44, 34, { color, fill, fillStyle: 'solid', roughness: 0.8 });
      s.text(x + 22, t + 23, String(k), { font: 'mono', size: 16 });
    });
    s.text(600, t + 23, r.calls, { size: 20, weight: 700, anchor: 'start' });
  });
  s.text(440, 375, 'green: match found    rose: IndexError (end of sequence)    blue: ordinary call', { size: 17, color: C.muted });
  save('11.3-index-trace.svg', s);
}

// ------------------------------------------------------------ slice path
{
  const s = new Sketch(880, 290, { title: 'A slice reaches __getitem__ as one slice object and returns a plain list', seed: 1134 });
  s.text(440, 34, 'A slice is one argument, and the result is a list', { size: 26, weight: 700 });
  s.rect(40, 100, 170, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(125, 134, 's[1:4]', { font: 'mono', size: 19 });
  s.arrow(214, 128, 256, 128, { color: C.muted });
  s.rect(260, 90, 270, 76, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(395, 120, '__getitem__(self, key)', { font: 'mono', size: 15 });
  s.text(395, 148, 'key = slice(1, 4, None)', { font: 'mono', size: 15 });
  s.arrow(534, 128, 576, 128, { color: C.muted });
  s.rect(580, 90, 270, 76, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', roughness: 0.8 });
  s.text(715, 120, 'self._data[key]', { font: 'mono', size: 15 });
  s.text(715, 148, '[20, 30, 40]', { font: 'mono', size: 15 });
  s.text(715, 200, 'type list, not your class', { size: 19, color: C.rose });
  s.text(440, 258, 'slice(-2, None).indices(5) = (3, 5, 1): start, stop, step after clipping to length 5', { size: 18, color: C.muted });
  save('11.3-slice-path.svg', s);
}

// ------------------------------------------------------------ ABC levels
{
  const s = new Sketch(880, 410, { title: 'Three levels of container: plain class, Sequence subclass, MutableSequence subclass', seed: 1135 });
  s.text(440, 34, 'What you get at each level', { size: 26, weight: 700 });
  const cols = [
    { x: 30, color: C.amber, fill: C.amberSoft, head: 'Plain class', sub: ['you write: __len__, __getitem__'],
      group: 'fallbacks give:', items: ['len(), s[i], s[a:b]', 'for, in, reversed()'],
      miss: 'missing: index(), count()', foot: 'isinstance(Sequence): False', footColor: C.rose },
    { x: 310, color: C.blue, fill: C.blueSoft, head: 'Sequence subclass', sub: ['you write: __getitem__, __len__'],
      group: 'mixins add:', items: ['__contains__, __iter__', '__reversed__, index()', 'count()'],
      miss: null, foot: 'isinstance(Sequence): True', footColor: C.green },
    { x: 590, color: C.green, fill: C.greenSoft, head: 'MutableSequence', sub: ['you write: __setitem__,', '__delitem__, insert'],
      group: 'mixins add:', items: ['append(), extend()', 'pop(), remove()', 'reverse(), +='],
      miss: null, foot: 'isinstance(MutableSequence): True', footColor: C.green },
  ];
  cols.forEach((c) => {
    s.rect(c.x, 66, 260, 300, { color: c.color, fill: c.fill, fillStyle: 'solid', roughness: 0.8 });
    const cx = c.x + 130;
    s.text(cx, 100, c.head, { size: 22, weight: 700 });
    c.sub.forEach((line, i) => s.text(cx, 128 + i * 22, line, { size: 16, color: C.muted }));
    const gy = c.sub.length > 1 ? 186 : 176;
    s.text(cx, gy, c.group, { size: 17, color: C.muted });
    c.items.forEach((t, i) => s.text(cx, gy + 28 + i * 26, t, { font: 'mono', size: 15 }));
    if (c.miss) s.text(cx, gy + 28 + c.items.length * 26, c.miss, { font: 'mono', size: 15, color: C.rose });
    s.text(cx, 336, c.foot, { size: 17, color: c.footColor });
  });
  s.text(440, 392, 'Each column keeps everything from the column before it.', { size: 18, color: C.muted });
  save('11.3-abc-levels.svg', s);
}
