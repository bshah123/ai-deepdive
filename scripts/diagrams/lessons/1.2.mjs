import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers come from scripts/diagrams/lessons/1.2_data.py (CPython 3.12.13).
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-01-how-python-works/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const mono = { font: 'mono', size: 16 };

// 1. pipeline
{
  const s = new Sketch(880, 370, { title: 'Source text becomes tokens, then a syntax tree, then a code object, then runs. Errors in the first four stages happen before anything runs.', seed: 121 });
  s.text(440, 34, 'From text to running code', { size: 26, weight: 700 });
  const names = [['source text', '2 lines'], ['tokens', '13 tokens'], ['syntax tree', '16 nodes'], ['code object', '10 instructions'], ['running', 'names stored']];
  const tools = ['tokenizer', 'parser', 'compiler', 'eval loop'];
  const cols = [C.muted, C.blue, C.violet, C.green, C.amber];
  const soft = [null, C.blueSoft, null, C.greenSoft, C.amberSoft];
  const W = 136, G = 30, X0 = 40, Y = 110, H = 84;
  names.forEach(([a, b], i) => {
    const x = X0 + i * (W + G);
    s.rect(x, Y, W, H, { color: cols[i], fill: soft[i] ?? (i === 2 ? C.blueSoft : C.blueSoft), fillStyle: 'solid' });
    s.text(x + W / 2, Y + 36, a, { size: 20, weight: 700 });
    s.text(x + W / 2, Y + 64, b, { size: 17, color: C.muted });
    if (i < 4) {
      s.arrow(x + W + 3, Y + H / 2, x + W + G - 3, Y + H / 2, { color: C.muted });
      s.text(x + W + G / 2, Y - 14, tools[i], { font: 'mono', size: 15, color: C.muted });
    }
  });
  const xEnd = X0 + 4 * (W + G) - G;
  s.line(X0, 226, xEnd, 226, { color: C.rose, width: 3 });
  s.text((X0 + xEnd) / 2, 256, 'Syntax errors are found here: nothing has run yet', { size: 20, color: C.rose });
  const xr = X0 + 4 * (W + G);
  s.line(xr, 226, xr + W, 226, { color: C.amber, width: 3 });
  s.text(xr + W / 2, 256, 'NameError, ...', { size: 20, color: C.amber });
  s.note(40, 280, 800, 64, ['Counts are for: price = 4  and  total = price * 3 + 1', '13 tokens include 2 NEWLINE and 1 ENDMARKER. 10 instructions include RESUME and RETURN_CONST.'], { size: 17 });
  save('1.2-pipeline.svg', s);
}

// 2. which error shows what
{
  const s = new Sketch(880, 330, { title: 'Two files with the same first line. The file with a syntax error prints nothing; the file with a runtime error prints its first line before failing.', seed: 122 });
  s.text(440, 34, 'Same first line, different outcome', { size: 26, weight: 700 });
  const col = (x, name, l2, color, soft, out, err) => {
    s.text(x + 190, 80, name, { font: 'mono', size: 18, weight: 700 });
    s.rect(x, 96, 380, 74, { color: C.muted, fill: soft, fillStyle: 'solid' });
    s.text(x + 16, 126, 'print("line 1 ran")', { ...mono, anchor: 'start' });
    s.text(x + 16, 154, l2, { ...mono, anchor: 'start' });
    s.arrow(x + 190, 176, x + 190, 206, { color: C.muted });
    s.text(x + 16, 232, 'stdout:', { size: 19, anchor: 'start', color: C.muted });
    s.text(x + 110, 232, out, { ...mono, anchor: 'start' });
    s.text(x + 16, 264, 'stderr:', { size: 19, anchor: 'start', color: C.muted });
    err.forEach((e, i) => s.text(x + 110, 264 + i * 22, e, { ...mono, anchor: 'start', color }));
  };
  col(40, 'syn.py', 'print("oops"', C.rose, C.roseSoft, '(empty)', ["SyntaxError: '(' was", 'never closed']);
  col(460, 'run.py', 'print(undefined_name)', C.amber, C.amberSoft, 'line 1 ran', ['NameError: name', "'undefined_name' is not defined"]);
  save('1.2-fail-stage.svg', s);
}

// 3. ways to run
{
  const s = new Sketch(880, 400, { title: 'Four ways to start Python and what sys.argv, __file__ and sys.path[0] hold in each', seed: 123 });
  s.text(440, 34, 'Four ways to start a program', { size: 26, weight: 700 });
  const xs = [30, 260, 520, 700];
  const heads = ['command', 'sys.argv', '__file__', 'sys.path[0]'];
  heads.forEach((h, i) => s.text(xs[i], 78, h, { font: 'mono', size: 16, weight: 700, anchor: 'start', color: C.blue }));
  s.line(30, 92, 850, 92, { color: C.muted });
  const rows = [
    ['python probe.py a b', "['probe.py','a','b']", 'D/probe.py', 'D  (file\'s folder)'],
    ['python -m pkg.tool a', "['D/pkg/tool.py','a']", 'D/pkg/tool.py', 'D  (current folder)'],
    ['python -c CODE a', "['-c','a']", '(no __file__)', "''  (current folder)"],
    ['python - a  < stdin', "['-','a']", '<stdin>', "''  (current folder)"],
  ];
  rows.forEach((r, j) => {
    const y = 130 + j * 52;
    r.forEach((t, i) => s.text(xs[i], y, t, { font: 'mono', size: 15, anchor: 'start' }));
    if (j < 3) s.line(30, y + 22, 850, y + 22, { color: C.muted, dash: '4 8', width: 1 });
  });
  s.note(30, 320, 820, 56, ['In all four rows __name__ is "__main__". D means the absolute path of the folder in this experiment.'], { size: 18 });
  save('1.2-run-modes.svg', s);
}

// 4. import + pyc
{
  const s = new Sketch(880, 600, { title: 'What import does with __pycache__: reuse the cached bytecode if its recorded modification time and size match the source, else compile and write it. Below, the 16-byte header of a real .pyc.', seed: 124 });
  s.text(440, 34, 'import mod, and the .pyc cache', { size: 26, weight: 700 });
  const box = (x, y, w, h, t, o = {}) => { s.rect(x, y, w, h, { color: o.color ?? C.blue, fill: o.fill ?? C.blueSoft, fillStyle: 'solid', dash: o.dash }); s.text(x + w / 2, y + h / 2 + 7, t, { size: 19 }); };
  box(40, 70, 130, 50, 'import mod');
  s.arrow(172, 95, 208, 95, { color: C.muted });
  box(210, 70, 170, 50, 'find mod.py');
  s.arrow(382, 95, 418, 95, { color: C.muted });
  s.rect(420, 56, 420, 78, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(630, 88, 'cached .pyc exists and its recorded', { size: 19 });
  s.text(630, 114, 'source mtime and size match?', { size: 19 });
  s.text(497, 160, 'no', { size: 19, color: C.rose, weight: 700 });
  s.arrow(515, 136, 515, 188, { color: C.rose });
  s.text(727, 160, 'yes', { size: 19, color: C.green, weight: 700 });
  s.arrow(745, 136, 745, 188, { color: C.green });
  box(420, 190, 190, 52, 'compile source', { color: C.violet });
  s.arrow(515, 244, 515, 266, { color: C.muted });
  box(420, 268, 190, 46, 'write .pyc', { color: C.violet, dash: '6 8' });
  s.text(515, 336, '(skipped with -B)', { size: 16, color: C.muted });
  box(650, 190, 190, 52, 'marshal.loads', { color: C.green, fill: C.greenSoft });
  s.arrow(745, 244, 745, 372, { color: C.muted });
  s.arrow(515, 344, 515, 372, { color: C.muted });
  box(430, 374, 410, 50, 'run the module body once', { color: C.amber, fill: C.amberSoft });
  s.note(40, 170, 340, 110, ['The script you run directly', 'is never cached.', 'Only imported modules are.'], { size: 19 });
  // header strip
  s.text(440, 462, 'Inside the 231-byte file for a 28-byte mod.py', { size: 20, weight: 700 });
  const seg = [[140, 'magic', 'cb 0d 0d 0a', 'bytes 0-3', C.violet], [100, 'flags', '0', 'bytes 4-7', C.muted], [190, 'source mtime', '1794511438', 'bytes 8-11', C.blue], [130, 'source size', '28', 'bytes 12-15', C.blue], [210, 'marshal data', 'a code object', 'bytes 16-230', C.green]];
  let x = 55;
  seg.forEach(([w, a, b, c, col]) => {
    s.rect(x, 482, w, 60, { color: col, fill: col === C.green ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x + w / 2, 506, a, { size: 17, weight: 700 });
    s.text(x + w / 2, 531, b, { font: 'mono', size: 15 });
    s.text(x + w / 2, 566, c, { size: 16, color: C.muted });
    x += w;
  });
  save('1.2-import-cache.svg', s);
}

// 5. timings
{
  const s = new Sketch(880, 390, { title: 'Bar chart on one scale: importing a 12000-line module takes 40.3 ms without a cache and 1.8 ms with one. In process, compile takes 35.2 ms, marshal.loads 1.06 ms, exec of the module body 0.43 ms.', seed: 125 });
  s.text(440, 34, 'Compiling is the expensive step', { size: 26, weight: 700 });
  const k = 7.4, x0 = 250;
  const bar = (y, label, ms, color, fill, txt) => {
    s.text(x0 - 14, y + 7, label, { font: 'mono', size: 16, anchor: 'end' });
    s.rect(x0, y - 14, Math.max(ms * k, 4), 28, { color, fill, fillStyle: 'hachure' });
    s.text(x0 + Math.max(ms * k, 4) + 12, y + 7, txt, { size: 19, anchor: 'start' });
  };
  s.text(30, 76, 'Fresh process: time of `import big`', { size: 19, anchor: 'start', color: C.muted });
  bar(112, 'no .pyc', 40.3, C.rose, C.roseSoft, '40.3 ms');
  bar(158, 'with .pyc', 1.8, C.green, C.greenSoft, '1.8 ms');
  s.text(30, 214, 'Inside one process, the pieces', { size: 19, anchor: 'start', color: C.muted });
  bar(250, 'compile(source)', 35.2, C.violet, C.blueSoft, '35.2 ms');
  bar(296, 'marshal.loads', 1.06, C.green, C.greenSoft, '1.06 ms');
  bar(342, 'exec(body)', 0.43, C.amber, C.amberSoft, '0.43 ms');
  s.note(630, 215, 230, 110, ['One machine, CPython 3.12.13,', 'median of 9 runs. Yours will', 'differ; the ratio is the point.'], { size: 17 });
  save('1.2-timing.svg', s);
}

// 6. nested code objects
{
  const s = new Sketch(880, 385, { title: 'A module code object holds the code objects of its functions and classes in its constants, and those hold theirs in turn.', seed: 126 });
  s.text(440, 34, 'One code object per module, function and class body', { size: 26, weight: 700 });
  const node = (cx, y, t, o = {}) => { s.rect(cx - 70, y, 140, 46, { color: o.color ?? C.green, fill: o.fill ?? C.greenSoft, fillStyle: 'solid' }); s.text(cx, y + 30, t, { font: 'mono', size: 17 }); };
  node(440, 70, '<module>', { color: C.blue, fill: C.blueSoft });
  node(250, 160, 'outer');
  node(630, 160, 'A');
  node(250, 250, 'inner');
  node(630, 250, 'm');
  s.arrow(400, 118, 290, 158, { color: C.muted }); s.arrow(480, 118, 590, 158, { color: C.muted });
  s.arrow(250, 208, 250, 248, { color: C.muted }); s.arrow(630, 208, 630, 248, { color: C.muted });
  s.text(30, 180, 'def outer(x): ...', { font: 'mono', size: 15, anchor: 'start', color: C.muted });
  s.text(30, 270, '  def inner(y): ...', { font: 'mono', size: 15, anchor: 'start', color: C.muted });
  s.text(730, 180, 'class A: ...', { font: 'mono', size: 15, anchor: 'start', color: C.muted });
  s.text(730, 270, '  def m(self): ...', { font: 'mono', size: 15, anchor: 'start', color: C.muted });
  s.note(280, 316, 320, 44, ['each child sits in its parent\'s co_consts'], { size: 17 });
  save('1.2-code-tree.svg', s);
}
