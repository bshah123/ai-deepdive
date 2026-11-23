// Diagrams for Lesson 1.4 (The Module Search Path). Run: node scripts/diagrams/lessons/1.4.mjs
// Numbers come from the lesson's own code blocks (run with Python 3.12): sys.path order, first-match demo, launch modes, shadowing.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-01-how-python-works/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- 1. how sys.path is assembled
{
  const s = new Sketch(880, 500, { title: 'The entries of sys.path in order, and who adds each one', seed: 1401 });
  s.text(440, 36, 'sys.path, top to bottom', { size: 26, weight: 700 });
  const rows = [
    ['0', "script's folder", 'put first at start-up (cwd for -m, "" for -c)', C.amber, C.amberSoft],
    ['1', 'PYTHONPATH entries', 'from the environment variable, if set', C.green, C.greenSoft],
    ['2', 'python312.zip', 'default: need not exist', C.blue, C.blueSoft],
    ['3', 'lib/python3.12', 'default: the standard library', C.blue, C.blueSoft],
    ['4', 'lib/python3.12/lib-dynload', 'default: compiled extension modules', C.blue, C.blueSoft],
    ['5', '.../site-packages', 'added by the site module', C.violet, undefined],
    ['6', '+ lines of any .pth file', 'appended by site, after its folder', C.violet, undefined],
  ];
  const y0 = 66, h = 50, gap = 12;
  rows.forEach(([i, name, why, col, fill], k) => {
    const y = y0 + k * (h + gap);
    s.text(40, y + 33, i, { size: 24, weight: 700, color: C.muted });
    s.rect(70, y, 330, h, { color: col, fill, fillStyle: 'solid', width: 1.6 });
    s.text(235, y + 32, name, { font: 'mono', size: 17 });
    s.text(420, y + 32, why, { size: 20, anchor: 'start', color: col });
  });
  const yb = y0 + rows.length * (h + gap) - gap;
  s.arrow(840, y0 + 4, 840, yb - 4, { color: C.muted, width: 2, head: 12 });
  s.text(824, y0 + 200, 'searched in this order; the first match wins', { size: 19, color: C.muted, rotate: -90, anchor: 'middle' });
  save('1.4-sys-path-order.svg', s);
}

// ---------------------------------------------------------------- 2. what "import mod" does
{
  const s = new Sketch(880, 560, { title: 'The steps of import mod: cache, finders, then the sys.path walk', seed: 1402 });
  const box = (x, y, w, h, col, fill) => s.rect(x, y, w, h, { color: col, fill, fillStyle: 'solid', width: 1.6 });
  s.text(150, 40, 'import mod', { font: 'mono', size: 22, weight: 700 });
  s.arrow(150, 54, 150, 82, { color: C.muted, head: 10 });

  box(40, 86, 440, 64, C.blue, C.blueSoft);
  s.text(260, 114, '1. Is "mod" a key of sys.modules?', { size: 22, weight: 700 });
  s.text(260, 140, 'cache of every module already imported', { size: 18, color: C.muted });
  s.arrow(480, 118, 560, 118, { color: C.green, width: 2, head: 10 });
  s.text(570, 112, 'yes: reuse it,', { size: 20, anchor: 'start', color: C.green });
  s.text(570, 136, 'no search at all', { size: 20, anchor: 'start', color: C.green });
  s.arrow(260, 154, 260, 186, { color: C.muted, head: 10 });
  s.text(276, 176, 'no', { size: 19, anchor: 'start', color: C.muted });

  box(40, 190, 440, 126, C.amber, C.amberSoft);
  s.text(260, 218, '2. Ask sys.meta_path finders in order', { size: 22, weight: 700 });
  s.text(60, 250, 'BuiltinImporter', { font: 'mono', size: 17, anchor: 'start' });
  s.text(250, 250, 'compiled into the interpreter', { size: 18, anchor: 'start', color: C.muted });
  s.text(60, 276, 'FrozenImporter', { font: 'mono', size: 17, anchor: 'start' });
  s.text(250, 276, 'bytecode frozen into the binary', { size: 18, anchor: 'start', color: C.muted });
  s.text(60, 302, 'PathFinder', { font: 'mono', size: 17, anchor: 'start' });
  s.text(250, 302, 'walks sys.path (next step)', { size: 18, anchor: 'start', color: C.muted });
  s.arrow(260, 320, 260, 352, { color: C.muted, head: 10 });

  box(40, 356, 440, 64, C.violet, undefined);
  s.text(260, 384, '3. For each sys.path entry, top to bottom:', { size: 22, weight: 700 });
  s.text(260, 410, 'ask a FileFinder for that one folder', { size: 18, color: C.muted });
  s.arrow(260, 424, 260, 456, { color: C.muted, head: 10 });

  box(40, 460, 440, 80, C.rose, C.roseSoft);
  s.text(260, 488, 'no entry has it: ModuleNotFoundError', { size: 21, weight: 700 });
  s.text(260, 516, 'the error lists the name, not the folders tried', { size: 18, color: C.muted });

  // right: inside one folder
  s.note(540, 190, 320, 232, [], { size: 18 });
  s.text(700, 216, 'Inside one folder', { size: 21, weight: 700 });
  s.text(560, 250, '1  mod/__init__.py', { font: 'mono', size: 16, anchor: 'start' });
  s.text(560, 274, '   a regular package: done', { size: 17, anchor: 'start', color: C.muted });
  s.text(560, 304, '2  mod.so  mod.py  mod.pyc', { font: 'mono', size: 16, anchor: 'start' });
  s.text(560, 328, '   a module file: done', { size: 17, anchor: 'start', color: C.muted });
  s.text(560, 358, '3  mod/ with no __init__.py', { font: 'mono', size: 16, anchor: 'start' });
  s.text(560, 382, '   only a candidate: keep', { size: 17, anchor: 'start', color: C.muted });
  s.text(560, 402, '   scanning the later folders', { size: 17, anchor: 'start', color: C.muted });
  s.arrow(480, 388, 536, 330, { color: C.violet, width: 1.8, head: 10 });
  save('1.4-import-lookup.svg', s);
}

// ---------------------------------------------------------------- 3. first match wins, and the cache
// Data: block 1 output: search finds dir_a/mod.py; 1st import dir_a; search finds now dir_b/mod.py; 2nd import dir_a; after del dir_b
{
  const s = new Sketch(880, 470, { title: 'Two folders both hold mod.py: the first on sys.path wins, and the cache keeps the first import', seed: 1403 });
  const cols = [
    { x: 20, head: 'A. path is [dir_a, dir_b]', list: ['dir_a', 'dir_b'], act: 'import mod', res: 'WHO = dir_a', col: C.green, fill: C.greenSoft, why: 'search hits dir_a first' },
    { x: 305, head: 'B. insert dir_b at index 0', list: ['dir_b', 'dir_a', 'dir_b'], act: 'import mod', res: 'WHO = dir_a', col: C.amber, fill: C.amberSoft, why: 'cache hit: no search' },
    { x: 590, head: 'C. del sys.modules["mod"]', list: ['dir_b', 'dir_a', 'dir_b'], act: 'import mod', res: 'WHO = dir_b', col: C.blue, fill: C.blueSoft, why: 'cache empty: search again' },
  ];
  cols.forEach((c) => {
    s.text(c.x + 135, 36, c.head, { size: 21, weight: 700 });
    c.list.forEach((d, k) => {
      const y = 62 + k * 44;
      s.rect(c.x + 40, y, 190, 36, { color: C.muted, width: 1.3 });
      s.text(c.x + 135, y + 26, d, { font: 'mono', size: 17 });
      s.text(c.x + 20, y + 26, String(k), { size: 18, color: C.muted });
    });
    s.text(c.x + 135, 214, 'sys.path (front)', { size: 17, color: C.muted });
    s.arrow(c.x + 135, 226, c.x + 135, 262, { color: C.muted, head: 10 });
    s.text(c.x + 135, 292, c.act, { font: 'mono', size: 19 });
    s.arrow(c.x + 135, 304, c.x + 135, 338, { color: c.col, width: 2, head: 10 });
    s.rect(c.x + 20, 344, 230, 50, { color: c.col, fill: c.fill, fillStyle: 'solid', width: 1.8 });
    s.text(c.x + 135, 376, c.res, { font: 'mono', size: 19, weight: 700 });
    s.text(c.x + 135, 424, c.why, { size: 19, color: c.col });
  });
  // dim the arrow between panels only with plain labels
  save('1.4-first-match-cache.svg', s);
}

// ---------------------------------------------------------------- 4. launch modes
// Data: block 4 output
{
  const s = new Sketch(880, 470, { title: 'What is put at the front of sys.path for each way of starting Python', seed: 1404 });
  s.text(440, 36, 'Entry added before the standard library', { size: 25, weight: 700 });
  const rows = [
    ['python show.py', "the script's folder", 'even if you run it from another directory', C.amber, C.amberSoft],
    ['python -m show', 'the current directory', 'cwd, not the folder of any file', C.green, C.greenSoft],
    ["python -c '...'", "'' (empty string)", 'means the cwd, looked up at each import', C.green, C.greenSoft],
    ['python -P show.py', 'nothing', 'the unsafe-path entry is skipped (3.11+)', C.rose, C.roseSoft],
    ['PYTHONPATH=extra', 'extra, after the front entry', 'still before the standard library', C.blue, C.blueSoft],
  ];
  rows.forEach(([cmd, entry, note, col, fill], k) => {
    const y = 66 + k * 78;
    s.rect(20, y, 270, 52, { color: C.ink, width: 1.4 });
    s.text(155, y + 33, cmd, { font: 'mono', size: 16 });
    s.arrow(296, y + 26, 340, y + 26, { color: C.muted, head: 10 });
    s.rect(346, y, 250, 52, { color: col, fill, fillStyle: 'solid', width: 1.6 });
    s.text(471, y + 33, entry, { size: 19, weight: 700, color: C.ink });
    s.text(610, y + 33, note, { size: 18, anchor: 'start', color: C.muted });
  });
  save('1.4-launch-modes.svg', s);
}

// ---------------------------------------------------------------- 5. shadowing
// Data: block 5 output (random.randint exists: False / True)
{
  const s = new Sketch(880, 370, { title: 'A file named random.py next to main.py hides the standard random module, unless -P is used', seed: 1405 });
  const panel = (x, head, rows, res, col, fill) => {
    s.text(x + 200, 36, head, { font: 'mono', size: 20, weight: 700 });
    rows.forEach(([txt, state], k) => {
      const y = 62 + k * 64;
      const dead = state === 'skip';
      s.rect(x, y, 400, 52, { color: dead ? C.muted : C.ink, width: 1.4, dash: dead ? '6 8' : undefined });
      s.text(x + 14, y + 33, txt, { font: 'mono', size: 16, anchor: 'start', color: dead ? C.muted : C.ink });
      if (state === 'hit') s.text(x + 386, y + 33, 'found', { size: 20, anchor: 'end', weight: 700, color: col });
      if (state === 'skip') s.text(x + 386, y + 33, 'never reached', { size: 19, anchor: 'end', color: C.muted });
    });
    s.arrow(x + 200, 196, x + 200, 230, { color: col, width: 2, head: 10 });
    s.rect(x + 10, 238, 380, 90, { color: col, fill, fillStyle: 'solid', width: 1.8 });
    s.text(x + 200, 270, res[0], { font: 'mono', size: 17, weight: 700 });
    s.text(x + 200, 300, res[1], { size: 20 });
  };
  panel(20, 'python main.py', [['<cwd>/random.py', 'hit'], ['<stdlib>/random.py', 'skip']], ['random.randint exists: False', 'AttributeError at the first call'], C.rose, C.roseSoft);
  panel(460, 'python -P main.py', [['<cwd> not added', 'none'], ['<stdlib>/random.py', 'hit']], ['random.randint exists: True', 'the real module is imported'], C.green, C.greenSoft);
  save('1.4-shadowing.svg', s);
}
