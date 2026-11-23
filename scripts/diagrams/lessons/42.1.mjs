import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-42-graph-rag/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from experiment.py (stdlib Python, run once): 25 candidates,
// 14 accepted, 11 rejected, 3 accepted but false; rejections by cause; two-hop answers.

{
  // Two ways to store one fact: RDF triples versus a property graph.
  const s = new Sketch(880, 380, { title: 'RDF triples versus a property graph storing the same facts', seed: 421 });
  s.text(440, 36, 'Two ways to store one fact', { size: 26, weight: 700 });
  s.line(450, 70, 450, 330, { color: C.muted, dash: '6 8' });

  s.text(230, 96, 'RDF triples', { size: 20, weight: 700 });
  s.rect(60, 120, 340, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(230, 148, 'alice · worksAt · acme', { size: 17 });
  s.rect(60, 180, 340, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(230, 208, 'alice · livesIn · pune', { size: 17 });
  s.rect(60, 240, 340, 44, { color: C.rose, dash: '6 8' });
  s.text(230, 268, 'since 2019: no slot on the triple', { size: 17 });
  s.text(230, 330, 'a triple has exactly three slots', { size: 17, color: C.muted });

  s.text(660, 96, 'Property graph', { size: 20, weight: 700 });
  s.rect(490, 112, 170, 84, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(575, 142, 'Alice', { size: 20, weight: 700 });
  s.text(575, 174, 'Person, birth_year 1990', { size: 15 });
  s.arrow(575, 196, 575, 250, { color: C.blue });
  s.text(600, 228, 'WORKS_AT {since: 2019}', { size: 16, anchor: 'start' });
  s.rect(490, 250, 170, 84, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(575, 280, 'Acme Ltd', { size: 20, weight: 700 });
  s.text(575, 312, 'Company', { size: 15 });
  s.text(660, 362, 'an edge can carry its own properties', { size: 17, color: C.muted });
  save('42.1-two-ways-to-store.svg', s);
}

{
  // Two-hop walk for "Where does Alice's employer operate?" with one false edge.
  const s = new Sketch(880, 370, { title: 'Two-hop walk from Alice to cities, with one false LOCATED_IN edge', seed: 422 });
  s.text(440, 36, 'A two-hop question, traced', { size: 26, weight: 700 });
  s.rect(80, 150, 130, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(145, 184, 'Alice', { size: 20, weight: 700 });
  s.rect(370, 150, 130, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(435, 184, 'Acme Ltd', { size: 20, weight: 700 });
  s.rect(680, 100, 130, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(745, 134, 'Pune', { size: 20, weight: 700 });
  s.rect(680, 230, 130, 56, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(745, 264, 'Mumbai', { size: 20, weight: 700 });

  s.arrow(210, 178, 370, 178, { color: C.blue });
  s.text(290, 164, 'WORKS_AT', { size: 16 });
  s.arrow(500, 170, 680, 128, { color: C.green });
  s.text(585, 116, 'LOCATED_IN (true)', { size: 16 });
  s.arrow(500, 190, 680, 252, { color: C.rose });
  s.text(520, 270, 'LOCATED_IN (false)', { size: 16, anchor: 'start' });

  s.text(440, 326, 'schema-accepted graph: [mumbai, pune]', { size: 19 });
  s.text(440, 354, 'correct facts only: [pune]', { size: 19, color: C.muted });
  save('42.1-two-hop-query.svg', s);
}

{
  // Candidate records through the schema check.
  const s = new Sketch(880, 300, { title: 'Candidate records pass through the schema check: 25 in, 14 accepted, 11 rejected', seed: 423 });
  s.text(440, 34, 'Candidates through the schema check', { size: 26, weight: 700 });

  s.rect(40, 110, 190, 80, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(135, 142, 'Candidates', { size: 20, weight: 700 });
  s.text(135, 170, '10 nodes, 15 edges', { size: 16 });
  s.arrow(230, 150, 290, 150, { color: C.muted });

  s.rect(290, 110, 190, 80, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(385, 142, 'Schema check', { size: 20, weight: 700 });
  s.text(385, 170, 'one record at a time', { size: 16 });

  s.arrow(480, 140, 560, 96, { color: C.green });
  s.rect(560, 60, 260, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(690, 90, 'Accepted: 14', { size: 22, weight: 700 });
  s.text(690, 116, '11 match the hand label, 3 are false', { size: 15 });

  s.arrow(480, 160, 560, 204, { color: C.rose });
  s.rect(560, 170, 260, 70, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(690, 200, 'Rejected: 11', { size: 22, weight: 700 });
  s.text(690, 226, 'each one a structural error', { size: 15 });

  s.text(440, 280, 'the schema sees structure; it does not check whether a fact is true', { size: 17, color: C.muted });
  save('42.1-pipeline-counts.svg', s);
}

{
  // Rejections by cause, measured on the 25-candidate test set.
  const rows = [
    ['wrong_type', 3],
    ['bad_endpoint', 2],
    ['missing_property', 2],
    ['unknown_label', 2],
    ['dangling_ref', 1],
    ['unknown_property', 1],
  ];
  const s = new Sketch(880, 390, { title: 'Bar chart of schema rejections by cause, 11 in total', seed: 424 });
  s.text(440, 34, 'Schema rejections by cause (11 of 25)', { size: 26, weight: 700 });
  rows.forEach(([name, n], i) => {
    const y = 100 + i * 46;
    s.text(290, y + 6, name, { font: 'mono', size: 17, anchor: 'end' });
    s.rect(310, y - 18, n * 60, 26, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(310 + n * 60 + 12, y + 2, String(n), { size: 18, weight: 700, anchor: 'start' });
  });
  s.text(440, 374, 'counts from one run of the validator; the test set is hand-built, not a benchmark', { size: 16, color: C.muted });
  save('42.1-rejections-by-cause.svg', s);
}
