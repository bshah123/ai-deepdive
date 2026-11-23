import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-14-type-systems/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. One definition, a binding per call
{
  const s = new Sketch(880, 380, { title: 'One identity function, T bound separately at each call', seed: 141 });
  s.text(440, 36, 'One definition, a binding per call', { size: 26, weight: 700 });
  s.rect(290, 60, 300, 44, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 88, 'def identity(x: T) -> T', { font: 'mono', size: 16 });
  for (const [cx, call, bind, out, col, soft] of [
    [220, 'identity(3)', 'T = int', 'returns int', C.blue, C.blueSoft],
    [660, "identity('a')", 'T = str', 'returns str', C.green, C.greenSoft],
  ]) {
    s.arrow(440, 104, cx, 150, { color: C.muted });
    s.rect(cx - 90, 150, 180, 40, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(cx, 176, call, { font: 'mono', size: 16 });
    s.arrow(cx, 190, cx, 232, { color: C.muted });
    s.rect(cx - 90, 232, 180, 40, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(cx, 258, bind, { font: 'mono', size: 16 });
    s.arrow(cx, 272, cx, 314, { color: C.muted });
    s.rect(cx - 90, 314, 180, 40, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(cx, 340, out, { font: 'mono', size: 16 });
  }
  save('14.2-typevar.svg', s);
}

// 2. Unbounded T versus a bound
{
  const s = new Sketch(880, 360, { title: 'Unbounded T versus T bound to a protocol', seed: 142 });
  s.text(440, 36, 'What the checker may assume about T', { size: 26, weight: 700 });
  s.rect(30, 66, 400, 250, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(230, 102, 'Unbounded T', { size: 22, weight: 700 });
  s.text(230, 144, 'def larger(x: T, y: T) -> T:', { font: 'mono', size: 16 });
  s.text(230, 172, 'return x if x > y else y', { font: 'mono', size: 16 });
  s.text(230, 230, 'mypy: Unsupported left operand', { font: 'mono', size: 16 });
  s.text(230, 256, 'type for > ("T")', { font: 'mono', size: 16 });
  s.rect(450, 66, 400, 250, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(650, 102, 'T bound to Orderable', { size: 22, weight: 700 });
  s.text(650, 144, 'O = TypeVar("O", bound=Orderable)', { font: 'mono', size: 16 });
  s.text(650, 172, 'mypy accepts x > y for O', { font: 'mono', size: 16 });
  s.text(650, 230, 'larger(Plain(), Plain())', { font: 'mono', size: 16 });
  s.text(650, 256, 'mypy: cannot be "Plain"', { font: 'mono', size: 16 });
  s.text(440, 330, 'The bound is a promise the checker can use.', { size: 20 });
  save('14.2-bound.svg', s);
}

// 3. Nominal versus structural matching
{
  const s = new Sketch(880, 380, { title: 'Nominal and structural matching of one interface', seed: 143 });
  s.text(440, 36, 'Who is accepted where Closable is expected', { size: 26, weight: 700 });
  s.text(230, 80, 'Nominal: must inherit', { size: 22, weight: 700 });
  s.rect(160, 100, 140, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(230, 126, 'Closable', { font: 'mono', size: 16 });
  s.rect(50, 230, 140, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(120, 256, 'Good(Closable)', { font: 'mono', size: 15 });
  s.rect(270, 230, 140, 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(340, 256, 'Other', { font: 'mono', size: 16 });
  s.arrow(120, 230, 190, 142, { color: C.green });
  s.arrow(340, 230, 270, 142, { color: C.rose });
  s.text(120, 302, ['inherits from', 'Closable: accepted'], { size: 18 });
  s.text(340, 302, ['has close(), no parent', 'rejected'], { size: 18 });

  s.text(650, 80, 'Structural: shape matches', { size: 22, weight: 700 });
  s.rect(580, 100, 140, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(650, 126, 'Closable', { font: 'mono', size: 16 });
  s.rect(465, 230, 130, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(530, 256, 'Good', { font: 'mono', size: 16 });
  s.rect(620, 230, 130, 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(685, 256, 'Missing', { font: 'mono', size: 16 });
  s.arrow(530, 230, 615, 142, { color: C.green });
  s.arrow(685, 230, 665, 142, { color: C.rose });
  s.text(530, 302, ['has close()', 'accepted'], { size: 18 });
  s.text(685, 302, ['no close()', 'rejected'], { size: 18 });
  save('14.2-nominal-vs-structural.svg', s);
}

// 4. Runtime isinstance versus mypy, five classes
{
  const s = new Sketch(880, 400, { title: 'Runtime isinstance versus mypy --strict on five classes', seed: 144 });
  s.text(440, 36, 'Runtime isinstance versus mypy --strict', { size: 26, weight: 700 });
  s.text(125, 84, 'class', { size: 19, weight: 700 });
  s.text(320, 84, 'what is wrong', { size: 19, weight: 700 });
  s.text(520, 84, 'isinstance', { size: 19, weight: 700 });
  s.text(730, 84, 'mypy --strict', { size: 19, weight: 700 });
  const rows = [
    ['Good', 'nothing', 'True', true, 'accepted'],
    ['Missing', 'name typo: clsoe', 'False', true, 'rejected'],
    ['WrongReturn', 'returns str', 'True', false, 'rejected'],
    ['WrongParams', 'extra required arg', 'True', false, 'rejected'],
    ['NotCallable', 'close = None', 'False', true, 'rejected'],
  ];
  rows.forEach(([name, wrong, rt, rtOk, mp], i) => {
    const y = 100 + i * 52;
    s.text(40, y + 26, name, { font: 'mono', size: 16, anchor: 'start' });
    s.text(320, y + 26, wrong, { size: 18 });
    s.rect(440, y, 160, 44, { color: rtOk ? C.green : C.rose, fill: rtOk ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(520, y + 27, rt, { font: 'mono', size: 16 });
    s.rect(640, y, 180, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(730, y + 27, mp, { font: 'mono', size: 16 });
  });
  s.text(440, 378, 'Runtime is wrong on two rows; mypy is right on all five.', { size: 19 });
  save('14.2-check-matrix.svg', s);
}
