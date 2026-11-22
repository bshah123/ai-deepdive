import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-09-iterators-generators/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Data flow: values travel in through send() and out through yield
{
  const s = new Sketch(880, 330, { title: 'Two boxes: caller and generator, with arrows for the sent value and the yielded value', seed: 931 });
  s.text(440, 34, 'Data flows both ways through one generator', { size: 26, weight: 700 });
  s.rect(40, 90, 220, 120, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(150, 128, 'caller', { size: 22, weight: 700 });
  s.text(150, 162, 'next() or send(v)', { font: 'mono', size: 17 });
  s.rect(620, 90, 220, 120, { color: C.violet, fill: C.violetSoft ?? C.blueSoft, fillStyle: 'solid' });
  s.text(730, 128, 'generator', { size: 22, weight: 700 });
  s.text(730, 162, 'value = yield x', { font: 'mono', size: 17 });
  s.arrow(262, 120, 618, 120, { color: C.green });
  s.text(440, 104, 'v travels in through send(v)', { size: 18, color: C.green });
  s.arrow(618, 176, 262, 176, { color: C.amber });
  s.text(440, 200, 'the yielded value travels back out', { size: 18, color: C.amber });
  s.note(120, 232, 640, 70, ['send(10) makes value = 10 inside the generator;', 'yield x then hands x back to the caller.'], { size: 19 });
  save('9.3-two-way-flow.svg', s);
}

// 2. Worked example: the running-average trace (numbers from 9.3_experiment.py, section A)
{
  const s = new Sketch(880, 380, { title: 'Table: each send() adds the value to a total and returns total divided by count', seed: 932 });
  s.text(440, 34, 'Running average: one send() per value', { size: 26, weight: 700 });
  s.rect(640, 112, 200, 210, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  const heads = [[130, 'call'], [310, 'value sent'], [450, 'total'], [580, 'count'], [740, 'returned']];
  for (const [x, t] of heads) s.text(x, 96, t, { size: 19, weight: 700 });
  const rows = [
    ['next()', '-', '0', '0', 'None'],
    ['send(10)', '10', '10', '1', '10.0'],
    ['send(30)', '30', '40', '2', '20.0'],
    ['send(5)', '5', '45', '3', '15.0'],
    ['send(3)', '3', '48', '4', '12.0'],
  ];
  rows.forEach((r, i) => {
    const y0 = 112 + i * 42;
    s.rect(40, y0, 800, 36, { color: C.muted });
    r.forEach((cell, j) => s.text(heads[j][0], y0 + 24, cell, { font: 'mono', size: 18, weight: j === 4 ? 700 : 400 }));
  });
  s.text(440, 344, 'returned = total / count, checked by hand: 10, 40/2, 45/3, 48/4', { size: 18, color: C.muted });
  save('9.3-averager-trace.svg', s);
}

// 3. State machine of a generator
{
  const s = new Sketch(880, 380, { title: 'State diagram: created, suspended at yield, finished', seed: 933 });
  s.text(440, 34, 'Where a generator can be', { size: 26, weight: 700 });
  s.rect(30, 180, 150, 60, { color: C.muted });
  s.text(105, 217, 'created', { size: 20 });
  s.rect(340, 180, 220, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(450, 217, 'suspended at yield', { size: 20 });
  s.rect(720, 180, 140, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(790, 217, 'finished', { size: 20 });
  s.arrow(182, 210, 338, 210, { color: C.ink });
  s.text(260, 196, 'next() or send(None)', { size: 16 });
  s.arrow(562, 210, 718, 210, { color: C.ink });
  s.text(640, 250, ['throw() uncaught,', 'return, or close()'], { size: 16 });
  s.curveArrow(400, 180, 450, 146, 500, 180, { color: C.blue });
  s.text(450, 122, 'send(v), or throw() caught', { size: 16 });
  s.arrow(105, 242, 105, 296, { color: C.rose, dash: '6 8' });
  s.note(30, 300, 300, 60, ['send(10) before next():', 'raises TypeError'], { size: 17 });
  s.note(520, 300, 340, 60, ['A finished generator ignores close().', 'Garbage collection calls close().'], { size: 16 });
  save('9.3-generator-states.svg', s);
}

// 4. Where the injected error goes: throw() versus close()
{
  const s = new Sketch(880, 360, { title: 'Two entry points, one paused yield, three outcomes', seed: 934 });
  s.text(440, 34, 'throw() and close() both act at the paused yield', { size: 26, weight: 700 });
  s.rect(40, 56, 170, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(125, 92, 'throw(e)', { font: 'mono', size: 18 });
  s.rect(270, 56, 340, 60, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 82, 'generator paused at', { size: 18 });
  s.text(440, 106, 'value = yield x', { font: 'mono', size: 16 });
  s.rect(670, 56, 170, 60, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(755, 92, 'close()', { font: 'mono', size: 18 });
  s.arrow(212, 86, 268, 86, { color: C.ink });
  s.arrow(668, 86, 612, 86, { color: C.ink });
  s.text(440, 160, 'The handler in the generator decides the outcome:', { size: 18 });
  const cols = [
    [30, C.blue, '1. catches, then yields', ['throw() returns the', 'value it yields.', 'close() raises', 'RuntimeError.']],
    [310, C.green, '2. catches, then returns', ['throw() raises', 'StopIteration.', 'close() returns None.']],
    [590, C.amber, '3. does not catch', ['throw() re-raises the', 'same error.', 'close() returns None.']],
  ];
  for (const [x, col, head, body] of cols) {
    s.rect(x, 176, 260, 160, { color: col });
    s.rect(x, 176, 260, 36, { color: col, fill: col === C.blue ? C.blueSoft : col === C.green ? C.greenSoft : C.amberSoft, fillStyle: 'solid' });
    s.text(x + 130, 200, head, { size: 18, weight: 700 });
    s.text(x + 130, 236, body, { size: 17 });
  }
  save('9.3-throw-close-outcomes.svg', s);
}
console.log('wrote 9.3 diagrams');
