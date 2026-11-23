import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-13-modules-packages-environments/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from scripts/diagrams/lessons/13.2_data.py (run it first).
const D = JSON.parse(readFileSync(join(HERE, '13.2_data.json'), 'utf8'));
const M = D.matrix;

{ // 1. file path -> dotted module name
  const s = new Sketch(880, 340, { title: 'File paths mapped to dotted module names', seed: 1321 });
  s.text(440, 40, 'A file path is a dotted module name', { size: 26, weight: 700 });
  s.text(30, 84, 'file on disk', { size: 18, color: C.muted, anchor: 'start' });
  s.text(500, 84, 'name used in import', { size: 18, color: C.muted, anchor: 'start' });
  const rows = [
    ['my_package/__init__.py', 'my_package', true],
    ['my_package/module1.py', 'my_package.module1', false],
    ['my_package/sub_package1/__init__.py', 'my_package.sub_package1', true],
    ['my_package/sub_package1/module2.py', 'my_package.sub_package1.module2', false],
  ];
  rows.forEach(([file, mod, pkg], i) => {
    const y = 120 + i * 50;
    s.rect(30, y - 20, 370, 40, { color: pkg ? C.green : C.blue, fill: pkg ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(215, y + 5, file, { font: 'mono', size: 15 });
    s.arrow(410, y, 480, y, { color: C.muted });
    s.rect(490, y - 20, 360, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(670, y + 5, mod, { font: 'mono', size: 15 });
  });
  s.text(440, 318, 'Green: folder with __init__.py, a regular package. Blue: an ordinary module file.', { size: 17, color: C.muted });
  save('13.2-file-to-module-name.svg', s);
}

{ // 2. import order for one statement
  const s = new Sketch(880, 300, { title: 'Import order for import my_package.sub_package1.module2', seed: 1322 });
  s.text(440, 40, 'One import statement, five steps', { size: 26, weight: 700 });
  const steps = [
    ['1', 'my_package', '__init__.py', C.green, C.greenSoft],
    ['2', 'sub_package1', '__init__.py', C.green, C.greenSoft],
    ['3', 'module2.py', 'starts, line 1', C.blue, C.blueSoft],
    ['4', 'module1.py', 'runs inside step 3', C.amber, C.amberSoft],
    ['5', 'module2.py', 'finishes', C.blue, C.blueSoft],
  ];
  steps.forEach(([n, name, note, col, soft], i) => {
    const x = 30 + i * 165, y = 80;
    s.rect(x, y, 140, 90, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 70, y + 26, `step ${n}`, { size: 18, weight: 700 });
    s.text(x + 70, y + 52, name, { font: 'mono', size: 14 });
    s.text(x + 70, y + 74, note, { size: 16 });
    if (i < steps.length - 1) s.arrow(x + 146, y + 45, x + 159, y + 45, { color: C.muted });
  });
  s.text(440, 220, 'Steps 1 and 2 run before the first line of module2.py.', { size: 19 });
  s.text(440, 252, 'Step 4 happens inside step 3: the relative import pauses module2 until module1 finishes.', { size: 19 });
  save('13.2-import-order.svg', s);
}

{ // 3. resolving a relative name
  const s = new Sketch(880, 360, { title: 'Resolving the relative import from ..module1', seed: 1323 });
  s.text(440, 40, 'Resolving "from ..module1" inside module2', { size: 26, weight: 700 });
  s.text(30, 84, '__package__ of module2 = my_package.sub_package1', { font: 'mono', size: 15, anchor: 'start' });
  s.text(410, 124, 'two dots: drop the last part', { size: 18, color: C.rose });
  s.rect(60, 140, 200, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(160, 175, 'my_package', { font: 'mono', size: 18 });
  s.rect(300, 140, 220, 56, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', dash: '6 8' });
  s.text(410, 175, 'sub_package1', { font: 'mono', size: 18, color: C.muted });
  s.text(290, 268, '+', { size: 30, weight: 700 });
  s.rect(320, 240, 130, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(385, 275, '.module1', { font: 'mono', size: 18 });
  s.text(480, 268, '=', { size: 30, weight: 700 });
  s.rect(510, 240, 330, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(675, 275, 'my_package.module1', { font: 'mono', size: 18 });
  s.text(440, 334, `importlib: resolve_name("..module1", "my_package.sub_package1") = ${D.resolve_name["'..module1' in 'my_package.sub_package1'"]}`, { font: 'mono', size: 14, color: C.muted });
  save('13.2-relative-resolve.svg', s);
}

{ // 4. which run modes work
  const s = new Sketch(880, 470, { title: 'Five ways to run the same files, with results', seed: 1324 });
  s.text(440, 36, 'Same files, five ways to run them', { size: 26, weight: 700 });
  const rows = [
    ['python test_package.py  (from the project root)', `runs: ${M['python test_package.py (cwd = project root)'].stdout.replace(/\n/g, ' ')}`, true],
    ['python my_package/sub_package1/module2.py', `${M['python my_package/sub_package1/module2.py'].stderr_last}`, false],
    ['python -m my_package.sub_package1.module2', 'runs; defines functions, prints nothing', true],
    ['python my_package/sub_package2/module3.py', `${M['python my_package/sub_package2/module3.py'].stderr_last}`, false],
    ['python -m my_package.sub_package2.module3', 'runs; defines functions, prints nothing', true],
  ];
  rows.forEach(([cmd, out, ok], i) => {
    const y = 66 + i * 76;
    s.rect(40, y, 800, 62, { color: ok ? C.green : C.rose, fill: ok ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(60, y + 25, cmd, { font: 'mono', size: 15, anchor: 'start' });
    s.text(60, y + 49, out, { size: 18, anchor: 'start' });
  });
  s.text(440, 448, 'Script run: sys.path[0] is the script folder. -m run: the current folder.', { size: 17, color: C.muted });
  save('13.2-run-modes.svg', s);
}

{ // 5. regular vs namespace package
  const s = new Sketch(880, 364, { title: 'Regular package versus namespace package', seed: 1325 });
  s.text(440, 36, 'With and without __init__.py', { size: 26, weight: 700 });
  s.rect(290, 60, 270, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(425, 92, 'Regular package', { size: 20, weight: 700 });
  s.rect(590, 60, 270, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(725, 92, 'Namespace package', { size: 20, weight: 700 });
  const rows = [
    ['has __init__.py?', ['yes'], ['no (PEP 420)']],
    ['type of __path__', ['list'], ['_NamespacePath']],
    ['same name in two folders', ['regular one wins;', 'shared.b is not found'], ['both folders merge;', `shared.a + shared.b = ${D.split_namespace_two_portions.stdout}`]],
  ];
  rows.forEach(([label, a, b], i) => {
    const y = 150 + i * 62;
    s.line(40, y + 34, 840, y + 34, { color: C.muted, dash: '6 8' });
    s.text(150, y + 6, label, { size: 18 });
    s.text(425, y + 6, a, { size: 18 });
    s.text(725, y + 6, b, { size: 18 });
  });
  s.text(440, 344, `Measured on Python ${D.python}, one fresh interpreter per run.`, { size: 16, color: C.muted });
  save('13.2-regular-vs-namespace.svg', s);
}
