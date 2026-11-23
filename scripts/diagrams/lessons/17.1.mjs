import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-02-scientific-python/chapter-17-pytorch-fundamentals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below is read from the experiment output, not typed in by hand.
const D = JSON.parse(readFileSync(join(HERE, '17.1_data.json'), 'utf8'));
const cellW = 126;
const fmt = (v) => String(Math.round(v));

// 1. Two tensors, one storage buffer
{
  const s = new Sketch(880, 360, { title: 'Two tensors sharing one storage buffer', seed: 101 });
  s.text(440, 40, 'Two tensors, one storage buffer', { size: 26, weight: 700 });
  s.rect(60, 62, 330, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(225, 90, 't = torch.Tensor', { font: 'mono', size: 17 });
  s.rect(490, 62, 330, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(655, 90, 'v = t.view(6)', { font: 'mono', size: 17 });
  s.rect(60, 136, 330, 64, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(225, 162, ['shape (2, 3)  stride (3, 1)', 'storage_offset 0'], { font: 'mono', size: 16 });
  s.rect(490, 136, 330, 64, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(655, 162, ['shape (6,)  stride (1,)', 'storage_offset 0'], { font: 'mono', size: 16 });
  s.arrow(225, 106, 225, 134, { color: C.muted });
  s.arrow(655, 106, 655, 134, { color: C.muted });
  const vals = D.view_write.tensor_before;
  vals.forEach((v, i) => {
    const x = 60 + i * cellW;
    s.rect(x, 262, cellW, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + cellW / 2, 292, fmt(v), { font: 'mono', size: 18 });
  });
  s.arrow(225, 202, 225, 258, { color: C.muted });
  s.arrow(655, 202, 655, 258, { color: C.muted });
  s.text(440, 340, `storage: ${vals.length} float32 values = ${D.as_tensor.storage_nbytes} bytes, one buffer`, { size: 20 });
  save('17.1-layers.svg', s);
}

// 2. What shares memory with what
{
  const s = new Sketch(880, 350, { title: 'Which operations share memory', seed: 102 });
  s.text(440, 40, 'Which operations share memory (measured)', { size: 26, weight: 700 });
  const rows = [
    ['torch.as_tensor(a)', D.as_tensor.np_ptr_equals_tensor_ptr],
    ['t.numpy()', D.copies.numpy_view_of_tensor_shares],
    ['torch.tensor(a)', D.copies.torch_tensor_shares],
    ['t.clone()', D.copies.clone_shares],
  ];
  rows.forEach(([op, shares], k) => {
    const y = 110 + k * 58;
    s.text(60, y + 6, op, { font: 'mono', size: 20, anchor: 'start' });
    s.rect(500, y - 20, 320, 40, shares
      ? { color: C.green, fill: C.greenSoft, fillStyle: 'solid' }
      : { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(660, y + 6, shares ? 'shares memory' : 'new buffer (copy)', { size: 19 });
  });
  s.text(440, 330, 'a is the NumPy array; t is torch.as_tensor(a) on CPU with float32', { size: 18 });
  save('17.1-sharing.svg', s);
}

// 3. A write through a view reaches the shared buffer
{
  const s = new Sketch(880, 360, { title: 'Writing through a view', seed: 103 });
  s.text(440, 40, 'v[0] = 10 writes into the shared buffer', { size: 26, weight: 700 });
  s.text(60, 100, 'before', { size: 20, anchor: 'start' });
  D.view_write.tensor_before.forEach((v, i) => {
    const x = 60 + i * cellW;
    s.rect(x, 110, cellW, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + cellW / 2, 140, fmt(v), { font: 'mono', size: 18 });
  });
  s.arrow(440, 166, 440, 206, { color: C.muted });
  s.text(470, 192, 'v[0] = 10', { font: 'mono', size: 18, anchor: 'start' });
  s.text(60, 232, 'after', { size: 20, anchor: 'start' });
  D.view_write.tensor_after.forEach((v, i) => {
    const x = 60 + i * cellW;
    const hot = i === 0;
    s.rect(x, 242, cellW, 46, hot
      ? { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' }
      : { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + cellW / 2, 272, fmt(v), { font: 'mono', size: 18 });
  });
  s.text(440, 330, `NumPy array a, tensor t and view v all read [${D.view_write.tensor_after.map(fmt).join(', ')}]`, { size: 18 });
  save('17.1-view-write.svg', s);
}

// 4. Transpose: same six cells, new strides
{
  const s = new Sketch(880, 400, { title: 'Transpose: same cells, new strides', seed: 104 });
  s.text(440, 40, 'Transpose: same six cells, new strides', { size: 26, weight: 700 });
  s.text(60, 112, 'storage (one buffer)', { size: 20, anchor: 'start' });
  const flat = D.transpose.x_values.flat();
  flat.forEach((v, i) => {
    const x = 60 + i * cellW;
    const hot = i === 5;
    s.rect(x, 124, cellW, 46, hot
      ? { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' }
      : { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + cellW / 2, 154, fmt(v), { font: 'mono', size: 18 });
    s.text(x + cellW / 2, 194, String(i), { font: 'mono', size: 16, color: C.muted });
  });
  s.text(60, 250, `x    shape (${D.transpose.x_shape.join(', ')})  strides (${D.transpose.x_stride.join(', ')})`, { font: 'mono', size: 18, anchor: 'start' });
  s.text(60, 290, `xt = x.T  shape (${D.transpose.xt_shape.join(', ')})  strides (${D.transpose.xt_stride.join(', ')})`, { font: 'mono', size: 18, anchor: 'start' });
  s.text(440, 350, `xt[2, 1] = ${D.transpose.xt_21_value}: index 2*1 + 1*3 = ${D.transpose.xt_21_index}, byte ${D.transpose.xt_byte_offset}`, { font: 'mono', size: 17 });
  save('17.1-transpose.svg', s);
}

// 5. A column slice starts one element into the buffer
{
  const s = new Sketch(880, 320, { title: 'Column slice with storage offset', seed: 105 });
  s.text(440, 40, 'A column slice starts one element in', { size: 26, weight: 700 });
  s.text(440, 100, `storage: ${D.slice.s_values.length} float32 values = ${D.slice.s_values.length * D.slice.itemsize} bytes`, { size: 20 });
  const viewed = new Set();
  for (let r = 0; r < 3; r++) { viewed.add(r * 4 + 1); viewed.add(r * 4 + 2); }
  D.slice.s_values.forEach((v, i) => {
    const x = 64 + i * 62;
    const hit = viewed.has(i);
    s.rect(x, 124, 60, 44, hit
      ? { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' }
      : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 30, 152, fmt(v), { font: 'mono', size: 16 });
  });
  s.text(440, 210, `s[:, 1:3]  shape (${D.slice.shape.join(', ')})  stride (${D.slice.stride.join(', ')})  offset ${D.slice.storage_offset}`, { font: 'mono', size: 16 });
  s.text(440, 250, `amber cells are the view: first element is ${D.slice.data_ptr_minus_storage} bytes into the buffer`, { size: 18 });
  save('17.1-slice.svg', s);
}
