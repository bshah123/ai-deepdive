// Sync title, difficulty, estimatedMinutes and tags in data/curriculum.json from each lesson's
// frontmatter. Lessons are the source of truth; the sidebar, header and search read curriculum.json.
// Usage: node scripts/sync-curriculum.mjs --chapters chapter-23,chapter-25 [--check]
//   --chapters  only these chapters (rewritten ones; un-rewritten lessons have stale frontmatter)
//   --check     print mismatches and exit 1 instead of writing
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data/curriculum.json');
const check = process.argv.includes('--check');
const ci = process.argv.indexOf('--chapters');
const only = ci > -1 ? new Set(process.argv[ci + 1].split(',')) : null;
if (!only) { console.error('Pass --chapters chapter-NN,chapter-MM'); process.exit(2); }
const raw = fs.readFileSync(FILE, 'utf8');
const cur = JSON.parse(raw);

function frontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('[')) { try { v = JSON.parse(v); } catch { v = []; } }
    else if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    else if (/^\d+$/.test(v)) v = Number(v);
    out[k] = v;
  }
  return out;
}

let changes = 0;
for (const part of cur.parts) for (const ch of part.chapters) for (const l of ch.lessons) {
  if (!only.has(ch.id)) continue;
  const f = path.join(ROOT, 'content', `${part.id}-${part.slug}`, `${ch.id}-${ch.slug}`, l.file);
  const fm = frontmatter(fs.readFileSync(f, 'utf8'));
  const next = { title: fm.title, difficulty: fm.difficulty, estimatedMinutes: fm.estimated_minutes, tags: fm.tags };
  for (const [k, v] of Object.entries(next)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (JSON.stringify(l[k]) !== JSON.stringify(v)) { changes++; if (check) console.log(`${l.id} ${k}: ${JSON.stringify(l[k])} -> ${JSON.stringify(v)}`); l[k] = v; }
  }
}
if (check) { console.log(changes ? `${changes} mismatch(es)` : 'curriculum.json in sync'); process.exit(changes ? 1 : 0); }
fs.writeFileSync(FILE, JSON.stringify(cur, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
console.log(`synced, ${changes} field(s) updated`);
