// Diagrams for 11.2 (context managers and the with statement).
// Run: node scripts/diagrams/lessons/11.2.mjs
// Every number and event label comes from scripts/diagrams/lessons/11.2_data.json
// (written by scripts/diagrams/lessons/11.2_data.py; re-run that first).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-11-python-data-model/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '11.2_data.json'), 'utf8'));

// ---------------------------------------------------------------- 11.2-desugar.svg
{
  const s = new Sketch(880, 350, { title: 'Flow of a with statement: enter once, run the body, then call __exit__ on both normal and exceptional paths; the return value of __exit__ decides whether an exception continues', seed: 1121 });
  s.text(440, 34, 'What a with statement does, in order', { size: 24, weight: 700 });
  s.rect(40, 70, 220, 48, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(150, 101, 'evaluate the expression', { size: 19 });
  s.arrow(260, 94, 310, 94, { color: C.muted, head: 9 });
  s.rect(310, 70, 190, 48, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(405, 101, '__enter__()', { font: 'mono', size: 18 });
  s.arrow(500, 94, 550, 94, { color: C.muted, head: 9 });
  s.rect(550, 70, 220, 48, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(660, 101, 'run the body', { size: 19 });
  // fork from the body
  s.arrow(600, 118, 210, 170, { color: C.muted, head: 9 });
  s.arrow(660, 118, 635, 170, { color: C.muted, head: 9 });
  s.rect(40, 170, 330, 70, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(205, 196, 'no exception, continue', { size: 19 });
  s.text(205, 224, '__exit__(None, None, None)', { font: 'mono', size: 16 });
  s.rect(430, 170, 410, 70, { color: C.ink, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(635, 196, 'exception raised in the body', { size: 19 });
  s.text(635, 224, '__exit__(type, value, traceback)', { font: 'mono', size: 16 });
  s.arrow(530, 240, 530, 275, { color: C.muted, head: 9 });
  s.rect(430, 275, 200, 46, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(530, 303, 'return value true?', { size: 19 });
  s.arrow(630, 298, 670, 298, { color: C.muted, head: 9 });
  s.text(650, 290, 'yes', { size: 16, color: C.muted });
  s.rect(670, 275, 190, 46, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(765, 303, 'suppressed, continue', { size: 18 });
  s.arrow(430, 298, 390, 298, { color: C.muted, head: 9 });
  s.text(410, 290, 'no', { size: 16, color: C.muted });
  s.rect(190, 275, 200, 46, { color: C.ink, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(290, 303, 're-raise the exception', { size: 18 });
  s.text(440, 340, 'The __exit__ return value only matters on the exception path.', { size: 17, color: C.muted });
  save('11.2-desugar.svg', s);
}

// ---------------------------------------------------------------- 11.2-nested-order.svg
{
  const ev = D.nested.events;
  const at = (label) => ev.indexOf(label) + 1; // step number from the experiment's event log
  const s = new Sketch(880, 400, { title: 'Three nested context managers: enter runs outside in (A, B, C), exit runs inside out (C, B, A)', seed: 1122 });
  s.text(440, 34, 'with CM("A"), CM("B"), CM("C"): enter order and exit order', { size: 22, weight: 700 });
  s.rect(40, 60, 800, 300, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(60, 88, `A: enter (step ${at('enter A')})`, { size: 18, anchor: 'start' });
  s.text(60, 344, `A: exit (step ${ev.length - at('enter A') + 1})`, { size: 18, anchor: 'start' });
  s.rect(90, 110, 700, 220, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(110, 138, `B: enter (step ${at('enter B')})`, { size: 18, anchor: 'start' });
  s.text(110, 316, `B: exit (step ${ev.length - at('enter B') + 1})`, { size: 18, anchor: 'start' });
  s.rect(140, 160, 600, 120, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(160, 188, `C: enter (step ${at('enter C')})`, { size: 18, anchor: 'start' });
  s.text(440, 230, `body (step ${at('body')})`, { size: 20 });
  s.text(160, 270, `C: exit (step ${ev.length - at('enter C') + 1})`, { size: 18, anchor: 'start' });
  s.text(440, 384, 'Each __exit__ runs after the inner block finishes, so cleanup unwinds like a stack.', { size: 17, color: C.muted });
  save('11.2-nested-order.svg', s);
}

// ---------------------------------------------------------------- 11.2-exception-paths.svg
{
  const exitArg = (c) => c.events.find((e) => e.startsWith('exit')).split(' ').slice(2).join(' ');
  const rows = [
    { name: 'no exception', arg: exitArg(D.no_exc), ret: 'False', result: D.no_exc.outcome, fill: C.blueSoft },
    { name: 'raise, return False', arg: exitArg(D.exc_false), ret: 'False', result: D.exc_false.outcome, fill: C.roseSoft },
    { name: 'raise, return True', arg: exitArg(D.exc_true), ret: 'True', result: D.exc_true.outcome, fill: C.greenSoft },
  ];
  const s = new Sketch(880, 330, { title: 'Three cases of __exit__: no exception, exception with False return, exception with True return', seed: 1123 });
  s.text(440, 34, 'Same with block, three __exit__ return values', { size: 24, weight: 700 });
  const cols = [[40, 300], [310, 560], [570, 840]];
  const heads = ['case', '__exit__ receives', 'result'];
  cols.forEach(([x0, x1], i) => s.text((x0 + x1) / 2, 84, heads[i], { size: 19, weight: 700, color: C.muted }));
  rows.forEach((r, i) => {
    const y = 100 + i * 70;
    s.rect(40, y, 800, 58, { color: C.ink, fill: r.fill, fillStyle: 'solid' });
    s.text(60, y + 36, r.name, { size: 19, anchor: 'start' });
    s.text(435, y + 36, `${r.arg}, return ${r.ret}`, { font: 'mono', size: 16 });
    s.text(705, y + 36, r.result, { size: 19 });
  });
  s.text(440, 318, 'Outcomes come from the experiment; the return values are set in the class code.', { size: 16, color: C.muted });
  save('11.2-exception-paths.svg', s);
}

// ---------------------------------------------------------------- 11.2-generator-cleanup.svg
{
  const lane = (y, events, label, ok) => {
    const cells = ['open R', 'body', 'ValueError', 'close R'];
    const xs = [60, 240, 420, 600];
    s.text(60, y - 14, label, { size: 19, anchor: 'start', weight: 700 });
    cells.forEach((c, i) => {
      const x = xs[i];
      const ran = c === 'ValueError' ? true : events.includes(c);
      if (c === 'close R' && !ran) {
        s.rect(x, y, 140, 50, { color: C.rose, dash: '6 8', fill: C.roseSoft, fillStyle: 'solid' });
        s.text(x + 70, y + 32, 'skipped', { size: 18 });
      } else {
        const fill = c === 'ValueError' ? C.amberSoft : (ok ? C.greenSoft : C.blueSoft);
        s.rect(x, y, 140, 50, { color: C.ink, fill, fillStyle: 'solid' });
        s.text(x + 70, y + 32, c, { font: 'mono', size: 17 });
      }
      if (i < cells.length - 1) s.arrow(x + 140, y + 25, xs[i + 1], y + 25, { color: C.muted, head: 8 });
    });
  };
  const s = new Sketch(880, 330, { title: 'Generator context manager with and without try/finally when the body raises', seed: 1124 });
  s.text(440, 34, 'Where the cleanup line goes decides whether it runs', { size: 24, weight: 700 });
  lane(110, D.gen_no_finally.events, '@contextmanager, cleanup after yield (no try/finally)', false);
  s.text(60, 186, `log: ${D.gen_no_finally.events.join(', ')}`, { font: 'mono', size: 16, anchor: 'start', color: C.muted });
  lane(230, D.gen_with_finally.events, '@contextmanager, cleanup in finally', true);
  s.text(60, 306, `log: ${D.gen_with_finally.events.join(', ')}`, { font: 'mono', size: 16, anchor: 'start', color: C.muted });
  save('11.2-generator-cleanup.svg', s);
}

console.log('wrote 4 diagrams to', OUT);
