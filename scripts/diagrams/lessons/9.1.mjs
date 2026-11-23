import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-09-iterators-generators/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. What a for loop does with the object (flow)
{
  const s = new Sketch(880, 300, { title: 'Flow of a for loop: iter() once, then next() until StopIteration', seed: 911 });
  s.text(440, 34, 'What a for loop does with your object', { size: 26, weight: 700 });
  s.rect(40, 84, 170, 56, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(125, 118, 'obj', { font: 'mono', size: 18 });
  s.arrow(210, 112, 290, 112, { color: C.muted });
  s.rect(290, 84, 230, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(405, 118, 'obj.__iter__()', { font: 'mono', size: 17 });
  s.arrow(520, 112, 570, 112, { color: C.muted });
  s.rect(570, 84, 170, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(655, 118, 'iterator', { font: 'mono', size: 18 });
  s.arrow(655, 142, 655, 196, { color: C.muted });
  s.text(700, 176, 'next(it)', { font: 'mono', size: 16, color: C.muted, anchor: 'start' });
  s.rect(440, 198, 400, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(640, 232, 'value goes to the loop body', { size: 19 });
  s.note(40, 186, 300, 90, ['StopIteration raised:', 'the loop ends', 'and the for statement', 'is finished'], { size: 17 });
  save('9.1-for-loop-protocol.svg', s);
}

// 2. Call trace for CountUpTo(3)
{
  const s = new Sketch(880, 290, { title: 'Call trace for CountUpTo(3)', seed: 922 });
  s.text(440, 34, 'The calls a for loop makes on CountUpTo(3)', { size: 26, weight: 700 });
  const labels = [
    ['iter()', 'returns self'],
    ['next()', 'returns 1'],
    ['next()', 'returns 2'],
    ['next()', 'returns 3'],
    ['next()', 'StopIteration'],
  ];
  labels.forEach(([a, b], i) => {
    const x = 25 + i * 170;
    const isStop = i === 4, isIter = i === 0;
    const col = isStop ? C.rose : isIter ? C.violet : C.blue;
    const soft = isStop ? C.roseSoft : isIter ? C.blueSoft : C.blueSoft;
    s.rect(x, 96, 150, 78, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 75, 128, a, { font: 'mono', size: 17 });
    s.text(x + 75, 156, b, { font: 'mono', size: 15, color: C.muted });
    if (i < 4) s.arrow(x + 150, 135, x + 170, 135, { color: C.muted, head: 8 });
  });
  s.text(440, 218, '1 call to iter(), then 4 calls to next(): three values and the final StopIteration.', { size: 19 });
  s.text(440, 252, 'Counted: the for loop calls next() one more time than there are values.', { size: 19, color: C.muted });
  save('9.1-call-trace.svg', s);
}

// 3. Iterable (list) vs iterator (cursor)
{
  const s = new Sketch(880, 310, { title: 'A list is iterable; each iter() call makes a separate cursor', seed: 933 });
  s.text(440, 34, 'Iterable vs iterator', { size: 26, weight: 700 });
  s.text(345, 92, 'lst (iterable)', { font: 'mono', size: 16, color: C.muted });
  [['10', 300], ['20', 390], ['30', 480]].forEach(([v, x]) => {
    s.rect(x, 104, 90, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 45, 139, v, { font: 'mono', size: 22 });
  });
  s.rect(60, 196, 150, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(135, 225, 'it1 = iter(lst)', { font: 'mono', size: 15 });
  s.arrow(210, 200, 296, 146, { color: C.amber, head: 10 });
  s.rect(60, 254, 150, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(135, 283, 'it2 = iter(lst)', { font: 'mono', size: 15 });
  s.arrow(210, 258, 296, 150, { color: C.green, head: 10 });
  s.note(520, 190, 320, 100, ['it1 is it2  ->  False', 'two cursors, both at', 'the first item'], { size: 18 });
  save('9.1-iterable-vs-iterator.svg', s);
}

// 4. One-shot vs reusable
{
  const s = new Sketch(880, 300, { title: 'One-shot iterator vs reusable iterable', seed: 944 });
  s.text(440, 34, 'Second loop over the same object', { size: 26, weight: 700 });
  s.rect(30, 62, 400, 220, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', dash: '6 8' });
  s.text(230, 96, '__iter__ returns self', { font: 'mono', size: 17 });
  s.rect(55, 116, 350, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(230, 146, 'list(c) first  -> [1, 2, 3, 4, 5]', { font: 'mono', size: 15 });
  s.rect(55, 180, 350, 46, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(230, 210, 'list(c) second -> []', { font: 'mono', size: 15 });
  s.text(230, 250, 'exhausted state is kept', { size: 19, color: C.muted });
  s.rect(450, 62, 400, 220, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', dash: '6 8' });
  s.text(650, 96, '__iter__ returns a new iterator', { font: 'mono', size: 17 });
  s.rect(475, 116, 350, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(650, 146, 'list(r) first  -> [1, 2, 3, 4, 5]', { font: 'mono', size: 15 });
  s.rect(475, 180, 350, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(650, 210, 'list(r) second -> [1, 2, 3, 4, 5]', { font: 'mono', size: 15 });
  s.text(650, 250, 'each loop gets fresh state', { size: 19, color: C.muted });
  save('9.1-one-shot-vs-reusable.svg', s);
}

// 5. Missing StopIteration
{
  const s = new Sketch(880, 250, { title: 'Buggy __next__ falls off the end and returns None', seed: 955 });
  s.text(440, 34, 'A __next__ that never raises StopIteration', { size: 26, weight: 700 });
  const vals = ['2', '4', '6', '8', 'None', 'None', 'None', 'None'];
  vals.forEach((v, i) => {
    const x = 45 + i * 100, bad = i >= 4;
    s.rect(x, 72, 90, 56, { color: bad ? C.rose : C.green, fill: bad ? C.roseSoft : C.greenSoft, fillStyle: 'solid' });
    s.text(x + 45, 106, v, { font: 'mono', size: bad ? 15 : 22 });
  });
  s.text(440, 170, 'next() calls 1-4 return 2, 4, 6, 8; calls 5 onward return None.', { size: 19 });
  s.text(440, 206, 'None is a value to a for loop, so the loop body runs forever.', { size: 19, color: C.muted });
  save('9.1-missing-stopiteration.svg', s);
}

// 6. Memory bars (to scale)
{
  const s = new Sketch(880, 270, { title: 'Bytes held by a list of a million ints vs its iterator', seed: 966 });
  s.text(440, 34, 'Memory, to scale (64-bit CPython 3.12)', { size: 26, weight: 700 });
  const maxW = 560, listBytes = 8000056, itBytes = 48;
  s.text(40, 96, 'list of 1,000,000 ints', { size: 19, anchor: 'start' });
  s.rect(40, 110, maxW, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'hachure' });
  s.text(40 + maxW - 8, 138, '8,000,056 bytes', { font: 'mono', size: 16, anchor: 'end', color: C.ink });
  s.text(40, 196, 'iter(list) cursor', { size: 19, anchor: 'start' });
  s.rect(40, 210, Math.max(4, (maxW * itBytes) / listBytes), 30, { color: C.green, fill: C.green, fillStyle: 'solid' });
  s.text(64, 232, '48 bytes (a sliver at this scale)', { font: 'mono', size: 16, anchor: 'start' });
  save('9.1-memory-bars.svg', s);
}

console.log('wrote 9.1 diagrams');
