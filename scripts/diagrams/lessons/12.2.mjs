import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-12-exceptions-debugging/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every attribute value below was measured by experiment.py (Python 3.12.13).

{ // 1: the two links, with and without "from e"
  const s = new Sketch(880, 340, { title: 'Left: raise from e sets __cause__ and __context__ to the KeyError. Right: a bare raise sets only __context__.', seed: 1201 });
  s.text(240, 40, 'raise ... from e', { size: 22, weight: 700 });
  s.text(660, 40, 'bare raise, inside except', { size: 22, weight: 700 });
  s.rect(50, 110, 160, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(130, 141, 'ConfigError', { font: 'mono', size: 16 });
  s.rect(270, 110, 160, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(350, 141, 'KeyError', { font: 'mono', size: 16 });
  s.arrow(212, 135, 268, 135, { color: C.ink });
  s.text(240, 100, '__cause__', { font: 'mono', size: 16 });
  s.curveArrow(130, 162, 240, 240, 350, 162, { color: C.muted, dash: '6 8' });
  s.text(240, 266, '__context__', { font: 'mono', size: 16 });
  s.text(240, 306, 'from e sets both links', { size: 18 });

  s.rect(480, 110, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(555, 141, 'ConfigError', { font: 'mono', size: 16 });
  s.rect(690, 110, 150, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(765, 141, 'KeyError', { font: 'mono', size: 16 });
  s.text(660, 100, '__cause__ is None', { font: 'mono', size: 16, color: C.muted });
  s.curveArrow(555, 162, 660, 240, 765, 162, { color: C.muted, dash: '6 8' });
  s.text(660, 266, '__context__', { font: 'mono', size: 16 });
  s.text(660, 306, 'a bare raise sets only __context__', { size: 18 });
  save('12.2-two-links.svg', s);
}

{ // 2: how the traceback printer picks the next link
  const s = new Sketch(880, 460, { title: 'Flowchart: follow __cause__ if set; else follow __context__ unless __suppress_context__ is True; stop when nothing is left.', seed: 1202 });
  s.rect(290, 40, 300, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 69, 'exc = the outer exception', { font: 'mono', size: 16 });
  s.arrow(440, 86, 440, 118, { color: C.ink });
  s.rect(290, 118, 300, 46, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 147, 'exc.__cause__ is not None?', { font: 'mono', size: 16 });
  s.arrow(290, 141, 155, 205, { color: C.ink });
  s.text(215, 170, 'yes', { size: 18 });
  s.rect(40, 205, 230, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(155, 233, 'exc = exc.__cause__', { font: 'mono', size: 16 });
  s.text(155, 258, 'printed: direct cause', { font: 'mono', size: 16 });
  s.arrow(440, 164, 440, 208, { color: C.ink });
  s.text(462, 190, 'no', { size: 18 });
  s.rect(290, 208, 300, 46, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 236, '__suppress_context__ is True?', { font: 'mono', size: 15 });
  s.arrow(590, 231, 650, 231, { color: C.ink });
  s.text(620, 222, 'yes', { size: 18 });
  s.rect(650, 208, 190, 46, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(745, 236, 'stop', { font: 'mono', size: 16 });
  s.arrow(440, 254, 440, 300, { color: C.ink });
  s.text(462, 280, 'no', { size: 18 });
  s.rect(290, 300, 300, 84, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 328, 'exc = exc.__context__', { font: 'mono', size: 16 });
  s.text(440, 352, 'printed: During handling', { font: 'mono', size: 16 });
  s.text(440, 374, 'stop if it is None', { font: 'mono', size: 16 });
  s.text(440, 430, 'Both branches return to the top with the new exc, until a stop.', { size: 18 });
  save('12.2-chain-walk.svg', s);
}

{ // 3: three raises, three links
  const s = new Sketch(880, 380, { title: 'Three functions, three raises: OSError is the root cause of ConfigError, which is the cause of RuntimeError.', seed: 1203 });
  s.rect(60, 50, 420, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(270, 78, 'RuntimeError', { font: 'mono', size: 18, weight: 700 });
  s.text(270, 104, 'training did not start', { size: 18 });
  s.text(500, 90, 'raised in start_training()', { size: 18, anchor: 'start' });
  s.arrow(270, 120, 270, 165, { color: C.ink });
  s.text(284, 148, '__cause__', { font: 'mono', size: 16, anchor: 'start' });
  s.rect(60, 165, 420, 70, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(270, 193, 'ConfigError', { font: 'mono', size: 18, weight: 700 });
  s.text(270, 219, 'cannot load config', { size: 18 });
  s.text(500, 205, 'raised in load_config()', { size: 18, anchor: 'start' });
  s.arrow(270, 235, 270, 280, { color: C.ink });
  s.text(284, 263, '__cause__', { font: 'mono', size: 16, anchor: 'start' });
  s.rect(60, 280, 420, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(270, 308, 'OSError', { font: 'mono', size: 18, weight: 700 });
  s.text(270, 334, 'config.toml not found', { size: 18 });
  s.text(500, 320, 'raised in open_file()', { size: 18, anchor: 'start' });
  save('12.2-three-level.svg', s);
}

{ // 4: attribute table for four raise forms
  const s = new Sketch(880, 390, { title: 'Table of __cause__, __context__, suppress and printed message for four forms of raise.', seed: 1204 });
  const hdr = { size: 16, weight: 700 };
  s.text(40, 60, 'form', { ...hdr, anchor: 'start' });
  s.text(300, 60, '__cause__', { ...hdr, font: 'mono' });
  s.text(440, 60, '__context__', { ...hdr, font: 'mono' });
  s.text(580, 60, 'suppress', { ...hdr, font: 'mono' });
  s.text(680, 60, 'printed', { ...hdr, anchor: 'start' });
  s.line(30, 74, 850, 74, { color: C.muted });
  s.rect(30, 88, 820, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  const rows = [
    ['from e', 'KeyError', 'KeyError', 'True', 'direct cause'],
    ['bare raise', 'None', 'KeyError', 'False', 'during handling'],
    ['from None', 'None', 'KeyError', 'True', 'none'],
    ['no handler', 'None', 'None', 'False', 'none'],
  ];
  rows.forEach(([form, cause, ctx, sup, printed], i) => {
    const y = 116 + i * 50;
    s.text(40, y, form, { size: 16, anchor: 'start' });
    s.text(300, y, cause, { font: 'mono', size: 16 });
    s.text(440, y, ctx, { font: 'mono', size: 16 });
    s.text(580, y, sup, { font: 'mono', size: 16 });
    s.text(680, y, printed, { font: 'mono', size: 16, anchor: 'start' });
  });
  s.line(30, 296, 850, 296, { color: C.muted });
  s.text(40, 320, 'from e: raise X from e, inside except. bare raise: raise X, inside except.', { size: 16, anchor: 'start' });
  s.text(40, 344, 'from None: raise X from None, inside except. no handler: raise X outside any except.', { size: 16, anchor: 'start' });
  s.text(40, 368, 'suppress = __suppress_context__', { size: 16, anchor: 'start' });
  save('12.2-attribute-grid.svg', s);
}
