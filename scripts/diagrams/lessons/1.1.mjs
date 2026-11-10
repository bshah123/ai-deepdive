// Diagrams for Lesson 1.1 (Python Programs & Source Code). Run: node scripts/diagrams/lessons/1.1.mjs
// Numbers come from scripts/diagrams/lessons/1.1_data.py and from the lesson's own code blocks.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-01-how-python-works/diagrams');
mkdirSync(OUT, { recursive: true });
const nb = (t) => t.replace(/ /g, '\u00a0'); // SVG collapses plain spaces; keep indentation visible
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- text -> tokens -> tree
// Data: 1.1_data.py -> tokens NAME total, OP =, NAME price, OP *, NUMBER 3, COMMENT, NEWLINE; tree Assign(Name total, BinOp(Name price, Mult, Constant 3))
{
  const s = new Sketch(880, 500, { title: 'One line of Python as characters, then tokens, then a syntax tree', seed: 1101 });
  s.text(20, 58, '1. text', { size: 24, anchor: 'start', color: C.muted, weight: 700 });
  s.text(20, 160, '2. tokens', { size: 24, anchor: 'start', color: C.muted, weight: 700 });
  s.text(20, 270, '3. tree', { size: 24, anchor: 'start', color: C.muted, weight: 700 });

  s.rect(150, 28, 440, 44, { color: C.ink, width: 1.4 });
  s.text(168, 58, nb('total = price * 3  # with tax'), { font: 'mono', size: 20, anchor: 'start' });

  s.arrow(370, 76, 370, 112, { color: C.muted, width: 1.6, head: 10 });
  s.text(384, 100, 'tokenizer: group characters', { size: 19, anchor: 'start', color: C.muted });

  const toks = [
    ['NAME', 'total', 100, C.blue, C.blueSoft],
    ['OP', '=', 56, C.amber, C.amberSoft],
    ['NAME', 'price', 100, C.blue, C.blueSoft],
    ['OP', '*', 56, C.amber, C.amberSoft],
    ['NUMBER', '3', 90, C.green, C.greenSoft],
    ['COMMENT', '# with tax', 150, C.rose, C.roseSoft],
    ['NEWLINE', '\\n', 96, C.muted, undefined],
  ];
  let x = 140;
  toks.forEach(([ty, str, w, col, fill]) => {
    s.rect(x, 118, w, 62, { color: col, fill, fillStyle: 'solid', width: 1.5 });
    s.text(x + w / 2, 140, ty, { size: 16, color: col, weight: 700 });
    s.text(x + w / 2, 166, str, { font: 'mono', size: 16 });
    x += w + 8;
  });
  s.text(140 + 100 + 8 + 56 + 8 + 100 + 8 + 56 + 8 + 90 + 8 + 75, 202, 'dropped: the tree has no comments', { size: 18, color: C.rose });

  s.arrow(480, 218, 480, 252, { color: C.muted, width: 1.6, head: 10 });
  s.text(494, 242, 'parser: group tokens by the grammar', { size: 19, anchor: 'start', color: C.muted });

  // tree
  const box = (cx, cy, w, label, col, fill) => {
    s.rect(cx - w / 2, cy - 20, w, 40, { color: col, fill, fillStyle: 'solid', width: 1.5 });
    s.text(cx, cy + 6, label, { font: 'mono', size: 16 });
  };
  const edge = (x1, y1, x2, y2, label, lx, ly) => {
    s.line(x1, y1, x2, y2, { color: C.muted, width: 1.4 });
    s.text(lx, ly, label, { size: 17, color: C.muted });
  };
  edge(480, 318, 310, 366, 'targets', 372, 336);
  edge(480, 318, 600, 366, 'value', 560, 336);
  edge(600, 406, 470, 444, 'left', 510, 418);
  edge(600, 406, 600, 444, 'op', 614, 428);
  edge(600, 406, 730, 444, 'right', 700, 418);
  box(480, 298, 150, 'Assign', C.violet, C.blueSoft);
  box(310, 386, 190, "Name 'total'", C.blue, C.blueSoft);
  box(600, 386, 110, 'BinOp', C.violet, C.blueSoft);
  box(470, 464, 150, "Name 'price'", C.blue, C.blueSoft);
  box(600, 464, 80, 'Mult', C.amber, C.amberSoft);
  box(730, 464, 130, 'Constant 3', C.green, C.greenSoft);

  s.note(16, 408, 190, 84, ['multiplication sits', 'below the assignment:', 'it happens first'], { size: 18, rotate: -1.5 });
  save('1.1-text-to-tree.svg', s);
}

// ---------------------------------------------------------------- compile first, then run
// Data: lesson block "whole.py": runtime bug -> compile ok, step 1, step 2, NameError; syntax bug -> compile failed on line 3, nothing ran
{
  const s = new Sketch(880, 440, { title: 'A runtime error on line 3 lets lines 1 and 2 run; a syntax error on line 3 stops everything', seed: 1102 });
  const panels = [
    { x0: 20, title: 'runtime bug on line 3', lines: ['print("step 1")', 'print("step 2")', 'print(undefined_name)'], ok: true },
    { x0: 450, title: 'syntax bug on line 3', lines: ['print("step 1")', 'print("step 2")', 'print("step 3"'], ok: false },
  ];
  panels.forEach((p) => {
    const cx = p.x0 + 205;
    s.text(cx, 34, p.title, { size: 25, weight: 700 });
    p.lines.forEach((ln, i) => {
      const bad = i === 2;
      s.text(p.x0 + 6, 78 + i * 36, String(i + 1), { font: 'mono', size: 14, color: C.muted, anchor: 'start' });
      s.rect(p.x0 + 28, 56 + i * 36, 350, 30, { color: bad ? C.rose : C.blue, fill: bad ? C.roseSoft : C.blueSoft, fillStyle: 'solid', width: 1.3 });
      s.text(p.x0 + 40, 77 + i * 36, ln, { font: 'mono', size: 15, anchor: 'start' });
    });
    s.arrow(cx, 168, cx, 200, { color: C.muted, width: 1.6, head: 10 });
    s.rect(p.x0 + 10, 204, 390, 52, { color: p.ok ? C.green : C.rose, fill: p.ok ? C.greenSoft : C.roseSoft, fillStyle: 'solid', width: 1.6 });
    s.text(cx, 226, 'phase 1: translate the WHOLE file', { size: 20, weight: 700 });
    s.text(cx, 248, p.ok ? 'compile ok' : 'SyntaxError on line 3', { font: 'mono', size: 15, color: p.ok ? C.green : C.rose });
    s.arrow(cx, 260, cx, 290, { color: p.ok ? C.muted : C.rose, width: 1.6, head: 10, dash: p.ok ? undefined : '5 6' });
    if (p.ok) {
      s.rect(p.x0 + 10, 294, 390, 108, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.6 });
      s.text(cx, 316, 'phase 2: run it, line by line', { size: 20, weight: 700 });
      s.text(p.x0 + 30, 342, 'step 1', { font: 'mono', size: 15, anchor: 'start' });
      s.text(p.x0 + 30, 364, 'step 2', { font: 'mono', size: 15, anchor: 'start' });
      s.text(p.x0 + 30, 386, "NameError: name 'undefined_name' is not defined", { font: 'mono', size: 12, anchor: 'start', color: C.rose });
    } else {
      s.rect(p.x0 + 10, 294, 390, 108, { color: C.muted, width: 1.4, dash: '6 7' });
      s.text(cx, 330, 'phase 2 never starts', { size: 22, color: C.muted, weight: 700 });
      s.text(cx, 364, 'nothing is printed, not even "step 1"', { size: 20, color: C.rose });
    }
  });
  s.line(440, 40, 440, 410, { color: C.muted, width: 1.2, dash: '6 8' });
  save('1.1-compile-then-run.svg', s);
}

// ---------------------------------------------------------------- the __main__ guard
// Data: lesson block "mainguard.py" and the subprocess block "mainreal.py"
{
  const s = new Sketch(880, 470, { title: 'The same file started two ways: as the program (name is __main__) and as an import (name is tool)', seed: 1103 });
  s.rect(250, 18, 380, 118, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.6 });
  s.text(266, 42, 'tool.py', { size: 20, anchor: 'start', weight: 700, color: C.blue });
  s.text(266, 68, 'def main(): ...', { font: 'mono', size: 15, anchor: 'start' });
  s.text(266, 89, 'print("top-level code runs")', { font: 'mono', size: 15, anchor: 'start' });
  s.text(266, 110, 'if __name__ == "__main__":', { font: 'mono', size: 15, anchor: 'start' });
  s.text(266, 130, nb('    main()'), { font: 'mono', size: 15, anchor: 'start' });

  const cols = [
    { cx: 215, launch: '$ python tool.py', name: '"__main__"', top: true, guard: true },
    { cx: 665, launch: '>>> import tool', name: '"tool"', top: true, guard: false },
  ];
  cols.forEach((c) => {
    s.arrow(c.cx < 440 ? 330 : 550, 140, c.cx, 188, { color: C.muted, width: 1.6, head: 10 });
    s.text(c.cx, 204, c.launch, { font: 'mono', size: 18, weight: 700 });
    s.arrow(c.cx, 216, c.cx, 244, { color: C.muted, width: 1.6, head: 10 });
    s.rect(c.cx - 150, 248, 300, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.6 });
    s.text(c.cx, 270, 'the launcher sets', { size: 18, color: C.muted });
    s.text(c.cx, 290, `__name__ = ${c.name}`, { font: 'mono', size: 16, weight: 700 });
    s.arrow(c.cx, 302, c.cx, 330, { color: C.muted, width: 1.6, head: 10 });
    s.rect(c.cx - 190, 334, 380, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.5 });
    s.text(c.cx, 360, 'top-level print runs: always', { size: 20 });
    s.rect(c.cx - 190, 384, 380, 40, { color: c.guard ? C.green : C.muted, fill: c.guard ? C.greenSoft : undefined, fillStyle: 'solid', width: 1.5, dash: c.guard ? undefined : '6 7' });
    s.text(c.cx, 410, c.guard ? 'guard is true: main() runs' : 'guard is false: main() is skipped', { size: 20, color: c.guard ? C.ink : C.muted });
  });
  s.text(440, 456, 'python -m tool and python -c "..." also set the top-level name to __main__', { size: 18, color: C.muted });
  save('1.1-main-guard.svg', s);
}

// ---------------------------------------------------------------- indentation stack
// Data: 1.1_data.py -> widths 0,4,8,4; stacks [0],[0,4],[0,4,8],[0,4]; end of file pops 4
{
  const s = new Sketch(880, 400, { title: 'Indentation becomes INDENT and DEDENT tokens by pushing and popping a stack of widths', seed: 1104 });
  const cols = [
    { x: 20, w: 250, h: 'source line' },
    { x: 280, w: 70, h: 'width' },
    { x: 360, w: 270, h: 'compare with top of stack' },
    { x: 640, w: 130, h: 'stack after' },
    { x: 780, w: 90, h: 'token' },
  ];
  cols.forEach((c) => s.text(c.x + c.w / 2, 30, c.h, { size: 20, color: C.muted, weight: 700 }));
  const rows = [
    ['1  def f(x):', '0', 'equal: nothing happens', '[0]', ''],
    ['2      if x:', '4', '4 > 0: push 4', '[0, 4]', 'INDENT'],
    ['3          return 1', '8', '8 > 4: push 8', '[0, 4, 8]', 'INDENT'],
    ['4      return 0', '4', '4 < 8: pop 8; top is 4: stop', '[0, 4]', 'DEDENT'],
    ['end of file', '-', 'pop everything above 0', '[0]', 'DEDENT'],
  ];
  rows.forEach((r, i) => {
    const y = 48 + i * 62;
    const hasTok = r[4] !== '';
    s.rect(14, y, 856, 52, { color: C.muted, width: 1, roughness: 0.7 });
    s.rect(cols[0].x + 2, y + 6, cols[0].w - 6, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.2 });
    s.text(cols[0].x + 12, y + 32, nb(r[0]), { font: 'mono', size: 15, anchor: 'start' });
    s.text(cols[1].x + cols[1].w / 2, y + 33, r[1], { font: 'mono', size: 18 });
    s.text(cols[2].x + cols[2].w / 2, y + 33, r[2], { size: 20 });
    s.text(cols[3].x + cols[3].w / 2, y + 33, r[3], { font: 'mono', size: 18, color: C.amber, weight: 700 });
    if (hasTok) {
      const ind = r[4] === 'INDENT';
      s.rect(cols[4].x + 2, y + 8, cols[4].w - 4, 36, { color: ind ? C.green : C.rose, fill: ind ? C.greenSoft : C.roseSoft, fillStyle: 'solid', width: 1.3 });
      s.text(cols[4].x + cols[4].w / 2, y + 33, r[4], { font: 'mono', size: 14, weight: 700 });
    }
  });
  s.text(440, 380, 'The stack starts as [0] and its bottom entry is never popped. Blank lines are skipped.', { size: 20, color: C.muted });
  save('1.1-indent-stack.svg', s);
}
