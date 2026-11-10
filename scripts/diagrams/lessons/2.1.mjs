// Diagrams for Lesson 2.1 (What is a variable). Run: node scripts/diagrams/lessons/2.1.mjs
// The worked-example numbers (x=6, y=5, z=[6,5,7]) come from the lesson's first code block.
import { Sketch, C, save, nameTag, objBox, ref } from './2.1_helpers.mjs';

// ---------------------------------------------------------------- box model vs name model
{
  const s = new Sketch(880, 520, { title: 'Box model versus name model: after b = a and a mutation, boxes hold two separate lists, names share one list', seed: 2101 });
  const panel = (x0, title, color) => {
    s.text(x0 + 200, 34, title, { size: 26, weight: 700, color });
  };
  panel(20, 'Box model (C-like copy)', C.rose);
  panel(450, 'Name model (Python)', C.green);
  s.line(440, 56, 440, 500, { color: C.muted, width: 1.2, dash: '4 8' });

  // row 1: after  b = a
  s.text(220, 80, 'after   b = a', { font: 'mono', size: 17, color: C.muted });
  s.text(660, 80, 'after   b = a', { font: 'mono', size: 17, color: C.muted });
  // box model: two boxes, each with its own copy
  s.text(80, 128, 'a', { font: 'mono', size: 20 });
  objBox(s, 110, 100, 130, 46, '[1, 2]', null, { color: C.rose, soft: C.roseSoft });
  s.text(80, 196, 'b', { font: 'mono', size: 20 });
  objBox(s, 110, 168, 130, 46, '[1, 2]', null, { color: C.rose, soft: C.roseSoft });
  s.text(330, 160, ['two lists,', 'b is a copy'], { size: 20, color: C.rose });
  // name model: two tags, one list
  const ta = nameTag(s, 470, 100, 'a');
  const tb = nameTag(s, 470, 168, 'b');
  const lst = objBox(s, 610, 124, 130, 46, '[1, 2]', 'list', { color: C.green, soft: C.greenSoft });
  ref(s, ta.right, [lst.left[0], lst.left[1] - 10], { color: C.ink });
  ref(s, tb.right, [lst.left[0], lst.left[1] + 10], { color: C.ink });
  s.text(800, 150, ['one list,', 'two names'], { size: 20, color: C.green });

  s.line(30, 250, 850, 250, { color: C.muted, width: 1, dash: '3 7' });
  // row 2: after  b.append(3)
  s.text(220, 284, 'after   b.append(3)', { font: 'mono', size: 17, color: C.muted });
  s.text(660, 284, 'after   b.append(3)', { font: 'mono', size: 17, color: C.muted });
  s.text(80, 332, 'a', { font: 'mono', size: 20 });
  objBox(s, 110, 304, 130, 46, '[1, 2]', null, { color: C.rose, soft: C.roseSoft });
  s.text(80, 400, 'b', { font: 'mono', size: 20 });
  objBox(s, 110, 372, 130, 46, '[1, 2, 3]', null, { color: C.rose, soft: C.roseSoft, size: 16 });
  s.text(330, 364, ['a is unchanged'], { size: 20, color: C.rose });
  const ta2 = nameTag(s, 470, 304, 'a');
  const tb2 = nameTag(s, 470, 372, 'b');
  const lst2 = objBox(s, 610, 328, 130, 46, '[1, 2, 3]', 'list', { color: C.green, soft: C.greenSoft, size: 16 });
  ref(s, ta2.right, [lst2.left[0], lst2.left[1] - 10], { color: C.ink });
  ref(s, tb2.right, [lst2.left[0], lst2.left[1] + 10], { color: C.ink });
  s.text(800, 354, ['a sees the', 'change too'], { size: 20, color: C.green });
  s.note(150, 450, 580, 48, 'Assignment copies the arrow, not the object it points to.', { size: 22, rotate: -0.6 });
  save('2.1-box-vs-name.svg', s);
}

// ---------------------------------------------------------------- trace of the worked example
{
  const W = 880, H = 504;
  const s = new Sketch(W, H, { title: 'Six snapshots of names and objects while the worked example runs', seed: 2102 });
  const cw = 284, ch = 236;
  const cell = (c, r) => [8 + c * (cw + 6), 8 + r * (ch + 12)];
  const caption = (x, y, text) => s.text(x + 12, y + 28, text, { font: 'mono', size: 17, anchor: 'start', color: C.muted });
  const frame = (x, y) => s.rect(x, y, cw, ch, { color: C.muted, width: 1, roughness: 0.6 });
  const NEW = { color: C.green, soft: C.greenSoft };
  const OLD = { color: C.blue, soft: C.blueSoft };
  const dot = (x, y) => s.circle(x, y, 8, { color: C.ink, fill: C.ink, fillStyle: 'solid', width: 1 });

  // cells 1-3: plain ints
  let [x, y] = cell(0, 0); frame(x, y); caption(x, y, '1.  x = 5');
  let t = nameTag(s, x + 40, y + 110, 'x');
  let o = objBox(s, x + 170, y + 102, 76, 44, '5', 'int', NEW);
  ref(s, t.right, o.left, { color: C.green, width: 2.6 });

  [x, y] = cell(1, 0); frame(x, y); caption(x, y, '2.  y = x');
  t = nameTag(s, x + 40, y + 80, 'x');
  let t2 = nameTag(s, x + 40, y + 150, 'y', { color: C.green });
  o = objBox(s, x + 170, y + 102, 76, 44, '5', 'int', OLD);
  ref(s, t.right, [o.left[0], o.left[1] - 8]);
  ref(s, t2.right, [o.left[0], o.left[1] + 8], { color: C.green, width: 2.6 });

  [x, y] = cell(2, 0); frame(x, y); caption(x, y, '3.  x = x + 1');
  t = nameTag(s, x + 40, y + 76, 'x');
  t2 = nameTag(s, x + 40, y + 160, 'y');
  const o6 = objBox(s, x + 170, y + 66, 76, 40, '6', 'int', NEW);
  const o5 = objBox(s, x + 170, y + 150, 76, 40, '5', 'int', OLD);
  ref(s, t.right, o6.left, { color: C.green, width: 2.6 });
  ref(s, t2.right, o5.left);

  // cells 4-6: a vertical list in the middle column; x and y tags on the right
  const scene = (c, r, cap, { names, slots, newInt7 = false, newName = null, note = null }) => {
    const [cx, cy] = cell(c, r);
    frame(cx, cy); caption(cx, cy, cap);
    const slotH = 34, lx = cx + 84, ly = cy + 70;
    const green = (n) => n === newName;
    // list box
    s.rect(lx, ly, 46, slots * slotH, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
    for (let i = 1; i < slots; i++) s.line(lx, ly + i * slotH, lx + 46, ly + i * slotH, { color: C.green, width: 1.1, roughness: 0.6 });
    s.text(lx, ly - 7, 'list', { size: 16, anchor: 'start', color: C.muted });
    const slotC = (i) => [lx + 23, ly + i * slotH + slotH / 2];
    for (let i = 0; i < slots; i++) dot(...slotC(i));
    // ints in the right-middle column
    const ix = cx + 158, iw = 48, ih = 32;
    const iy = [cy + 72, cy + 118, cy + 164];
    const targets = [['6', OLD], ['5', OLD], ['7', NEW]];
    const objs = [];
    for (let i = 0; i < slots; i++) {
      const [v, st] = targets[i];
      objs.push(objBox(s, ix, iy[i], iw, ih, v, null, newInt7 && i === 2 ? NEW : st));
      ref(s, [slotC(i)[0] + 6, slotC(i)[1]], objs[i].left, { color: newInt7 && i === 2 ? C.green : C.ink, width: newInt7 && i === 2 ? 2.4 : 1.5, head: 9 });
    }
    // x and y tags on the right, pointing left at their ints
    const tx = nameTag(s, cx + 232, iy[0] + 2, 'x', { w: 36, h: 28, size: 15 });
    const ty = nameTag(s, cx + 232, iy[1] + 2, 'y', { w: 36, h: 28, size: 15 });
    ref(s, tx.left, objs[0].right, { color: C.muted, width: 1.4, head: 9 });
    ref(s, ty.left, objs[1].right, { color: C.muted, width: 1.4, head: 9 });
    // names on the left
    const listMid = ly + (slots * slotH) / 2;
    const gap = 40;
    names.forEach((nm, k) => {
      const yy = listMid - 14 + (k - (names.length - 1) / 2) * gap;
      const tg = nameTag(s, cx + 14, yy, nm, { w: 40, h: 28, size: 15, color: green(nm) ? C.green : C.amber });
      ref(s, tg.right, [lx, listMid + (k - (names.length - 1) / 2) * 12], { color: green(nm) ? C.green : C.ink, width: green(nm) ? 2.6 : 1.8, head: 10 });
    });
    if (note) s.text(cx + cw / 2, cy + ch - 12, note, { size: 18, color: C.green });
  };
  scene(0, 1, '4.  z = [x, y]', { names: ['z'], slots: 2, newName: 'z' });
  scene(1, 1, '5.  w = z', { names: ['z', 'w'], slots: 2, newName: 'w' });
  scene(2, 1, '6.  w.append(7)', { names: ['z', 'w'], slots: 3, newInt7: true, note: 'z and w both see [6, 5, 7]' });
  save('2.1-trace.svg', s);
}

// ---------------------------------------------------------------- where names live
{
  const s = new Sketch(880, 420, { title: 'Module-level names live in a dictionary; function locals live in numbered slots', seed: 2103 });
  s.text(210, 34, 'Module level: a dict', { size: 26, weight: 700, color: C.blue });
  s.text(210, 58, 'globals()', { font: 'mono', size: 16, color: C.muted });
  s.text(640, 34, 'Inside a call of f(p, q): slots', { size: 26, weight: 700, color: C.violet });
  s.text(640, 58, "f.__code__.co_varnames == ('p', 'q', 'r')", { font: 'mono', size: 14, color: C.muted });

  // dict rows
  const dx = 30, dy = 80, rh = 52;
  const rows = [['"a"', null], ['"b"', null], ['"c"', null]];
  s.rect(dx, dy, 200, rows.length * rh, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
  const dAnch = [];
  rows.forEach(([k], i) => {
    if (i > 0) s.line(dx, dy + i * rh, dx + 200, dy + i * rh, { color: C.blue, width: 1, roughness: 0.6 });
    s.text(dx + 16, dy + i * rh + 32, k, { font: 'mono', size: 18, anchor: 'start' });
    s.text(dx + 94, dy + i * rh + 33, '→', { size: 22, color: C.muted });
    s.circle(dx + 165, dy + i * rh + 26, 10, { color: C.ink, fill: C.ink, fillStyle: 'solid', width: 1 });
    dAnch.push([dx + 165, dy + i * rh + 26]);
  });
  // objects for dict
  const o10 = objBox(s, 110 + 150, 90, 70, 44, '10', 'int', { color: C.green, soft: C.greenSoft });
  const olst = objBox(s, 110 + 150, 218, 110, 44, '[1, 2]', 'list', { color: C.green, soft: C.greenSoft });
  ref(s, dAnch[0], [o10.left[0], o10.left[1] - 6], { via: [dAnch[0][0] + 20, 100] });
  ref(s, dAnch[1], [o10.left[0], o10.left[1] + 6], { via: [dAnch[1][0] + 30, 130] });
  ref(s, dAnch[2], olst.left, { via: [dAnch[2][0] + 30, 240] });

  // slots
  const sx = 520, sy = 80, sw = 110;
  const slots = ['p', 'q', 'r'];
  s.rect(sx, sy, sw, slots.length * rh, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
  const sAnch = [];
  slots.forEach((nm, i) => {
    if (i > 0) s.line(sx, sy + i * rh, sx + sw, sy + i * rh, { color: C.violet, width: 1, roughness: 0.6 });
    s.text(sx - 12, sy + i * rh + 32, String(i), { font: 'mono', size: 16, anchor: 'end', color: C.muted });
    s.text(sx + 18, sy + i * rh + 32, nm, { font: 'mono', size: 18, anchor: 'start' });
    s.circle(sx + 80, sy + i * rh + 26, 10, { color: C.ink, fill: C.ink, fillStyle: 'solid', width: 1 });
    sAnch.push([sx + 80, sy + i * rh + 26]);
  });
  const o1 = objBox(s, 740, 88, 60, 40, '1', 'int', { color: C.green, soft: C.greenSoft });
  const o2 = objBox(s, 740, 150, 60, 40, '2', 'int', { color: C.green, soft: C.greenSoft });
  const o3 = objBox(s, 740, 212, 60, 40, '3', 'int', { color: C.green, soft: C.greenSoft });
  ref(s, sAnch[0], o1.left);
  ref(s, sAnch[1], o2.left);
  ref(s, sAnch[2], o3.left);
  s.text(640, 292, 'call f(1, 2): p → 1, q → 2, r = p + q → 3', { font: 'mono', size: 14, color: C.muted });

  s.note(30, 330, 820, 60, ['del a  removes the row "a". It does not touch the object 10,', 'which "b" still reaches. A name is only a way to reach an object.'], { size: 21, rotate: -0.5 });
  save('2.1-namespaces.svg', s);
}
