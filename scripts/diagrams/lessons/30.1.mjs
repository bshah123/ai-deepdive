import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-30-huggingface/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below are copied from scripts/diagrams/lessons/30.1_experiment.py output.

{
  // Dispatch: four steps, each one lookup or load. Values from run: model_type "bert", BertConfig, BertModel.
  const s = new Sketch(880, 290, { title: 'Four steps from checkpoint to model object', seed: 301 });
  s.text(440, 40, 'AutoModel makes three lookups, then one load', { size: 24, weight: 700 });
  const boxes = [
    { x: 24, head: 'checkpoint', lines: ['config.json', 'weights'], color: C.muted, fill: null },
    { x: 244, head: 'CONFIG_MAPPING', lines: ['model_type: bert', '-> BertConfig'], color: C.blue, fill: C.blueSoft },
    { x: 464, head: 'MODEL_MAPPING', lines: ['BertConfig', '-> BertModel'], color: C.violet, fill: null },
    { x: 684, head: 'from_pretrained', lines: ['load weights', 'eval() mode'], color: C.green, fill: C.greenSoft },
  ];
  for (const b of boxes) {
    s.rect(b.x, 96, 186, 116, { color: b.color, fill: b.fill ?? undefined, fillStyle: b.fill ? 'solid' : 'hachure' });
    s.text(b.x + 93, 124, b.head, { size: 18, weight: 700 });
    s.text(b.x + 93, 158, b.lines[0], { font: 'mono', size: 15 });
    s.text(b.x + 93, 186, b.lines[1], { font: 'mono', size: 15 });
  }
  s.arrow(212, 154, 240, 154, { color: C.ink });
  s.arrow(432, 154, 460, 154, { color: C.ink });
  s.arrow(652, 154, 680, 154, { color: C.ink });
  s.note(150, 236, 580, 40, ['The config picks the class; the class loads the numbers.'], { size: 18 });
  save('30.1-dispatch.svg', s);
}

{
  // List-valued mapping: config.architectures decides which class is used.
  const s = new Sketch(880, 340, { title: 'Choosing from a list of classes by architectures', seed: 302 });
  s.text(440, 40, 'A list in the mapping is resolved by architectures', { size: 24, weight: 700 });
  s.rect(30, 70, 340, 200, { color: C.muted });
  s.text(200, 100, 'SEQ_CLS_MAPPING[GPT2Config]', { font: 'mono', size: 15, weight: 700 });
  s.rect(50, 120, 300, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(200, 151, 'GPT2ForSequenceClassification', { font: 'mono', size: 15 });
  s.rect(50, 190, 300, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(200, 221, 'GPT2LMHeadModel', { font: 'mono', size: 15 });

  s.arrow(372, 145, 436, 145, { color: C.amber });
  s.rect(440, 120, 400, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(456, 141, 'architectures: []', { font: 'mono', size: 15, anchor: 'start' });
  s.text(456, 161, 'no name matches: take entry 0', { font: 'hand', size: 16, anchor: 'start' });

  s.arrow(372, 215, 436, 215, { color: C.green });
  s.rect(440, 190, 400, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(456, 211, 'architectures: ["GPT2LMHeadModel"]', { font: 'mono', size: 15, anchor: 'start' });
  s.text(456, 231, 'name matches: take entry 1', { font: 'hand', size: 16, anchor: 'start' });

  s.note(200, 290, 480, 40, ['Same rule as _get_model_class in transformers'], { size: 18 });
  save('30.1-list-pick.svg', s);
}

{
  // Weight keys: base checkpoint into the head model (top), head checkpoint into the base model (bottom).
  const s = new Sketch(880, 580, { title: 'Matching checkpoint keys to model keys', seed: 303 });
  s.text(440, 34, 'Prefixes decide which keys load', { size: 24, weight: 700 });

  s.text(40, 72, 'Base checkpoint into BertForSequenceClassification', { size: 18, weight: 700, anchor: 'start' });
  const topL = [['embeddings.weight', 110], ['encoder.weight', 164]];
  const topR = [['bert.embeddings.weight', 110, C.blue, C.blueSoft], ['bert.encoder.weight', 164, C.blue, C.blueSoft], ['classifier.weight', 218, C.amber, C.amberSoft]];
  for (const [t, y] of topL) {
    s.rect(40, y, 260, 40, { color: C.muted });
    s.text(170, y + 26, t, { font: 'mono', size: 15 });
  }
  for (const [t, y, col, fill] of topR) {
    s.rect(440, y, 400, 40, { color: col, fill, fillStyle: 'solid' });
    s.text(640, y + 26, t, { font: 'mono', size: 15 });
  }
  s.arrow(300, 130, 436, 130, { color: C.ink });
  s.arrow(300, 184, 436, 184, { color: C.ink });
  s.text(368, 104, '+ "bert."', { font: 'mono', size: 15 });
  s.text(40, 290, 'No checkpoint key: stays at random init, listed as missing.', { size: 18, anchor: 'start', color: C.amber });

  s.text(40, 336, 'Head checkpoint into BertModel', { size: 18, weight: 700, anchor: 'start' });
  const botL = [['bert.embeddings.weight', 380, C.blue, C.blueSoft], ['bert.encoder.weight', 434, C.blue, C.blueSoft], ['classifier.weight', 488, C.rose, C.roseSoft]];
  const botR = [['embeddings.weight', 380], ['encoder.weight', 434]];
  for (const [t, y, col, fill] of botL) {
    s.rect(40, y, 260, 40, { color: col, fill, fillStyle: 'solid' });
    s.text(170, y + 26, t, { font: 'mono', size: 15 });
  }
  for (const [t, y] of botR) {
    s.rect(440, y, 400, 40, { color: C.muted });
    s.text(640, y + 26, t, { font: 'mono', size: 15 });
  }
  s.arrow(300, 400, 436, 400, { color: C.ink });
  s.arrow(300, 454, 436, 454, { color: C.ink });
  s.text(368, 374, '- "bert."', { font: 'mono', size: 15 });
  s.text(40, 556, 'No BertModel key: ignored, listed as unexpected.', { size: 18, anchor: 'start', color: C.rose });
  save('30.1-key-match.svg', s);
}
