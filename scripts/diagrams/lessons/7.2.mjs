import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Every number below is read from 7.2_data.json, written by 7.2_experiment.py.
const HERE = dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(readFileSync(join(HERE, '7.2_data.json'), 'utf8'));

const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-07-functions-call-stack/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Format a Python list as the lesson prints it, e.g. [1, 99].
const pyList = (xs) => '[' + xs.join(', ') + ']';

// 1. Two names, one object: the parameter is a name bound to the caller's object.
{
  const s = new Sketch(880, 350, { title: 'Parameter rebinding versus mutation', seed: 721 });
  s.text(440, 34, 'A parameter is a name for the caller’s object', { size: 26, weight: 700 });
  const panels = [
    { x0: 20, title: '1. call f(a)', names: [['a', 110], ['x', 190]], obj: { y: 100, label: pyList([1]), tone: 'blue' }, xTo: 'L', cap: 'both names, one object' },
    { x0: 300, title: '2. x = [99]', names: [['a', 110], ['x', 190]], obj: { y: 100, label: pyList([1]), tone: 'blue' }, xTo: 'M', cap: 'x now names a new object' },
    { x0: 580, title: '3. x.append(99)', names: [['a', 110], ['x', 190]], obj: { y: 100, label: pyList([1, 99]), tone: 'amber' }, xTo: 'L', cap: 'same object: both see it' },
  ];
  panels.forEach((p, i) => {
    const x = p.x0;
    s.text(x + 140, 80, p.title, { size: 20, weight: 700 });
    // caller-side names on the left, objects on the right
    const L = { x: x + 150, y: p.obj.y, w: 120, h: 50 };
    s.rect(L.x, L.y, L.w, L.h, { color: p.obj.tone === 'amber' ? C.amber : C.blue, fill: p.obj.tone === 'amber' ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(L.x + L.w / 2, L.y + 32, p.obj.label, { font: 'mono', size: 17 });
    s.arrow(x + 90, 135, L.x, 125, { color: C.muted });
    s.rect(x + 20, 110, 70, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 55, 136, 'a', { font: 'mono', size: 18 });
    s.rect(x + 20, 190, 70, 40, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 55, 216, 'x', { font: 'mono', size: 18 });
    if (p.xTo === 'L') {
      s.arrow(x + 90, 210, L.x + 40, L.y + L.h, { color: C.muted });
    } else {
      // x now names a fresh object M = [99], a new box
      s.rect(x + 150, 200, 120, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
      s.text(x + 210, 232, pyList([99]), { font: 'mono', size: 17 });
      s.arrow(x + 90, 210, x + 150, 225, { color: C.muted });
    }
    s.text(x + 140, 296, p.cap, { size: 18, color: C.muted });
  });
  // the caller's list after each step (from the experiment)
  s.text(20, 336, `a after step 2: ${pyList(D.after_rebind)}`, { size: 16, anchor: 'start', color: C.muted });
  s.text(860, 336, `a after step 3: ${pyList(D.after_mutate)}`, { size: 16, anchor: 'end', color: C.muted });
  save('7.2-reference-binding.svg', s);
}

// 2. Binding a call to a signature: each argument lands in one slot.
{
  const s = new Sketch(880, 480, { title: 'Binding a call to a signature', seed: 722 });
  s.text(440, 34, 'Each argument lands in exactly one parameter', { size: 26, weight: 700 });
  s.text(40, 82, 'call site: f(1, 2, 3, 4, c=5, z=9)', { size: 18, anchor: 'start', color: C.muted });
  s.text(560, 82, 'parameters of def f(a, b, *args, c, d=4, **kwargs)', { size: 18, anchor: 'start', color: C.muted });
  const rows = [
    { call: '1', param: `a = ${D.bound_a}`, tone: 'blue' },
    { call: '2', param: `b = ${D.bound_b}`, tone: 'blue' },
    { call: '3, 4', param: `args = ${D.bound_args}`, tone: 'amber' },
    { call: 'c=5', param: `c = ${D.bound_c}`, tone: 'green' },
    { call: 'not passed', param: `d = ${D.bound_d}  (default)`, tone: 'muted' },
    { call: 'z=9', param: `kwargs = ${D.bound_kwargs}`, tone: 'rose' },
  ];
  const tones = { blue: [C.blue, C.blueSoft], amber: [C.amber, C.amberSoft], green: [C.green, C.greenSoft], rose: [C.rose, C.roseSoft], muted: [C.muted, C.blueSoft] };
  rows.forEach((r, i) => {
    const y = 110 + i * 56;
    const [stroke, fill] = tones[r.tone];
    const dashed = r.tone === 'muted';
    s.rect(40, y, 200, 40, { color: stroke, fill, fillStyle: 'solid', dash: dashed ? '6 8' : undefined });
    s.text(140, y + 26, r.call, { font: 'mono', size: 18, color: dashed ? C.muted : C.ink });
    s.arrow(250, y + 20, 540, y + 20, { color: C.muted });
    s.rect(550, y, 300, 40, { color: stroke, fill, fillStyle: 'solid' });
    s.text(700, y + 26, r.param, { font: 'mono', size: 17 });
  });
  s.text(440, 462, 'an unused keyword-only parameter takes its default; a keyword with no matching name goes to **kwargs', { size: 17, color: C.muted });
  save('7.2-binding.svg', s);
}

// 3. A mutable default is one object shared by every call.
{
  const s = new Sketch(880, 400, { title: 'Where a mutable default lives', seed: 723 });
  s.text(440, 34, 'Where a mutable default lives', { size: 26, weight: 700 });
  s.line(440, 70, 440, 340, { color: C.muted, dash: '6 8' });
  // left: one list shared by all calls
  s.text(220, 80, 'default bucket=[]: one list', { size: 19, weight: 700 });
  s.rect(110, 100, 230, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(225, 131, `shared: ${pyList(D.bad_default_after)}`, { font: 'mono', size: 17 });
  const calls = [130, 245, 360];
  calls.forEach((cx, i) => {
    s.rect(cx - 50, 230, 100, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, 256, `call ${i + 1}`, { font: 'mono', size: 17 });
    s.arrow(cx, 228, cx, 158, { color: C.muted });
    s.text(cx, 302, pyList(D.bad_snapshots[i]), { font: 'mono', size: 17 });
  });
  // right: a fresh list per call
  s.text(660, 80, 'bucket=None: new list each call', { size: 19, weight: 700 });
  const fixedX = [500, 615, 730];
  fixedX.forEach((cx, i) => {
    const x = cx - 50;
    s.rect(x, 100, 100, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx, 131, pyList(D.fixed_snapshots[i]), { font: 'mono', size: 17 });
    s.rect(x, 230, 100, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, 256, `call ${i + 1}`, { font: 'mono', size: 17 });
    s.arrow(cx, 228, cx, 158, { color: C.muted });
  });
  s.text(440, 362, 'left: every call returns the same object, so the list grows across calls', { size: 16, color: C.muted });
  s.text(440, 384, 'right: each call creates its own list, so nothing carries over', { size: 16, color: C.muted });
  save('7.2-mutable-default.svg', s);
}

// 4. Parameter kinds must appear in a fixed order.
{
  const s = new Sketch(880, 330, { title: 'Parameter kinds in fixed order', seed: 724 });
  s.text(440, 34, 'Parameter kinds must appear in one fixed order', { size: 26, weight: 700 });
  const short = {
    POSITIONAL_ONLY: 'positional-only',
    POSITIONAL_OR_KEYWORD: 'positional or keyword',
    VAR_POSITIONAL: 'rest as tuple',
    KEYWORD_ONLY: 'keyword-only',
    VAR_KEYWORD: 'rest as dict',
  };
  const kindOf = (name) => {
    const hit = [...D.kinds_p, ...D.kinds_f].find(([n]) => n === name);
    return hit ? hit[1] : null;
  };
  const slots = [
    { tok: 'a', kind: kindOf('a') },
    { tok: '/', kind: 'marker' },
    { tok: 'b', kind: kindOf('b') },
    { tok: '*args', kind: kindOf('args') },
    { tok: 'c', kind: kindOf('c') },
    { tok: 'd=4', kind: kindOf('d') },
    { tok: '**kwargs', kind: kindOf('kwargs') },
  ];
  const w = 104, gap = 10, x0 = 46, y = 100;
  const colour = {
    POSITIONAL_ONLY: [C.blue, C.blueSoft],
    POSITIONAL_OR_KEYWORD: [C.blue, C.blueSoft],
    VAR_POSITIONAL: [C.amber, C.amberSoft],
    KEYWORD_ONLY: [C.green, C.greenSoft],
    VAR_KEYWORD: [C.rose, C.roseSoft],
    marker: [C.muted, C.blueSoft],
  };
  slots.forEach((sl, i) => {
    const x = x0 + i * (w + gap);
    const [stroke, fill] = colour[sl.kind];
    s.rect(x, y, w, 48, { color: stroke, fill, fillStyle: 'solid', dash: sl.kind === 'marker' ? '6 8' : undefined });
    s.text(x + w / 2, y + 31, sl.tok, { font: 'mono', size: 17 });
    const label = sl.kind === 'marker' ? ['separator'] : short[sl.kind].split(' ').reduce((acc, word) => {
      const last = acc[acc.length - 1];
      if (last && (last + ' ' + word).length <= 11) acc[acc.length - 1] = last + ' ' + word;
      else acc.push(word);
      return acc;
    }, []);
    s.text(x + w / 2, y + 74, label, { size: 15, color: C.muted });
  });
  s.arrow(x0, 82, x0 + 7 * w + 6 * gap, 82, { color: C.muted });
  s.text(440, 240, `inspect.signature(p) = ${D.signature_p}`, { font: 'mono', size: 18 });
  s.text(440, 270, `inspect.signature(f) = ${D.signature_f}`, { font: 'mono', size: 18 });
  save('7.2-parameter-order.svg', s);
}
