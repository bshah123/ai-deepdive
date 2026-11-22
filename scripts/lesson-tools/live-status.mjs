#!/usr/bin/env node
// Live dashboard for a running lesson-rewrite workflow. No dependencies.
//   node scripts/lesson-tools/live-status.mjs [--port 3100] [--workflow <dir>] [--done <dir>]
// Open http://localhost:3100 : refreshes every 3 s. Shows each agent (current step, steps taken,
// idle time), finished lessons, and files changed in the repo (git status), with links to the
// lesson pages on the dev server (pnpm run dev, http://localhost:3000), which hot-reload as files change.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const PORT = Number(arg('--port', 3100));
const PROJ = path.join(os.homedir(), '.claude/projects/-Users-bshah-Documents-Trial-Learning');

function newestWorkflowDir() {
  let best = null;
  for (const s of fs.existsSync(PROJ) ? fs.readdirSync(PROJ) : []) {
    const base = path.join(PROJ, s, 'subagents/workflows');
    if (!fs.existsSync(base)) continue;
    for (const w of fs.readdirSync(base)) {
      const p = path.join(base, w); const m = fs.statSync(p).mtimeMs;
      if (fs.statSync(p).isDirectory() && (!best || m > best.m)) best = { p, m };
    }
  }
  return best && best.p;
}
const FIXED_WF = arg('--workflow', null);
const DONE = arg('--done', '/private/tmp/claude-501/-Users-bshah-Documents-Trial-Learning/deaeed1b-fae8-473f-9e77-febb5da77a6e/scratchpad/done');

const short = (s, n = 140) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function lastActivity(file) {
  // Walk the agent transcript backwards for the latest tool call / text and count tool calls.
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let tools = 0, last = '', lastText = '';
  for (let i = 0; i < lines.length; i++) {
    let d; try { d = JSON.parse(lines[i]); } catch { continue; }
    const c = d.message && d.message.content;
    if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (b.type === 'tool_use') {
        tools++;
        const inp = b.input || {};
        last = `${b.name}: ${short(inp.description || inp.command || inp.file_path || inp.url || inp.query || JSON.stringify(inp), 150)}`;
      } else if (b.type === 'text' && d.message.role === 'assistant') lastText = short(b.text, 160);
    }
  }
  return { tools, last, lastText };
}

function status() {
  const WF = FIXED_WF || newestWorkflowDir();   // re-checked on every refresh, so a newly launched run shows up
  const agents = [];
  const finished = new Set();
  const results = [];
  if (WF && fs.existsSync(path.join(WF, 'journal.jsonl'))) {
    const started = new Map();
    for (const line of fs.readFileSync(path.join(WF, 'journal.jsonl'), 'utf8').split('\n').filter(Boolean)) {
      let d; try { d = JSON.parse(line); } catch { continue; }
      if (d.type === 'started') started.set(d.agentId, d.label || d.agentId);
      if (d.type === 'result') {
        finished.add(d.agentId);
        const r = d.result;
        results.push({ label: started.get(d.agentId), ok: r && !r.failed, r });
      }
    }
    for (const [id, label] of started) {
      const f = path.join(WF, `agent-${id}.jsonl`);
      if (!fs.existsSync(f)) continue;
      const a = lastActivity(f);
      agents.push({ id, label, running: !finished.has(id), idleS: Math.round((Date.now() - fs.statSync(f).mtimeMs) / 1000), ...a });
    }
  }
  let changed = [];
  try {
    changed = execFileSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
      .map((l) => { const p = l.slice(3); let m = 0; try { m = fs.statSync(path.join(ROOT, p)).mtimeMs; } catch {} return { st: l.slice(0, 2).trim(), path: p, ageS: m ? Math.round((Date.now() - m) / 1000) : null }; })
      .sort((a, b) => (a.ageS ?? 1e9) - (b.ageS ?? 1e9)).slice(0, 40);
  } catch {}
  const doneMarkers = fs.existsSync(DONE) ? fs.readdirSync(DONE).filter((f) => f.endsWith('.json')) : [];
  return { now: new Date().toISOString(), workflow: WF && path.basename(WF), agents, results, changed, doneMarkers };
}

const PAGE = `<!doctype html><meta charset=utf-8><title>Lesson rewrite: live</title>
<style>:root{color-scheme:light dark;--b:#d0d7de;--m:#6b7280}body{font:14px/1.45 system-ui;margin:0;padding:20px;max-width:1100px;margin:auto}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:var(--m)}
.card{border:1px solid var(--b);border-radius:8px;padding:10px 12px;margin:6px 0;display:grid;grid-template-columns:130px 1fr 130px;gap:10px;align-items:center}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;background:#9ca3af}.run{background:#16a34a;animation:p 1.2s infinite}.idle{background:#d97706}.ok{background:#2563eb}.bad{background:#dc2626}
@keyframes p{50%{opacity:.3}}code{font:12px ui-monospace,monospace;color:var(--m);word-break:break-all}.m{color:var(--m);font-size:12px}
table{border-collapse:collapse;width:100%}td{padding:3px 8px;border-bottom:1px solid var(--b);font:12px ui-monospace,monospace}a{color:inherit}</style>
<h1>Lesson rewrite: live status <span class=m id=t></span></h1><div class=m id=wf></div>
<h2>Agents</h2><div id=agents></div><h2>Finished</h2><div id=fin class=m></div>
<h2>Files changing (newest first)</h2><table id=files></table>
<script>
const e=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function tick(){try{const s=await (await fetch('/api/status')).json();
t.textContent=new Date(s.now).toLocaleTimeString();wf.textContent='workflow '+s.workflow+' · '+s.agents.filter(a=>a.running).length+' running, '+s.agents.filter(a=>!a.running).length+' finished · '+s.doneMarkers.length+' done markers';
agents.innerHTML=s.agents.slice().sort((a,b)=>b.running-a.running||a.idleS-b.idleS).map(a=>{const lid=(a.label.match(/lesson ([\\d.]+)/)||[])[1];
const c=!a.running?'ok':a.idleS>300?'idle':'run';
return '<div class=card><div><span class="dot '+c+'"></span><b>'+e(a.label)+'</b>'+(lid?'<br><a class=m href="http://localhost:3000/lesson/'+lid+'" target=_blank>open page</a>':'')+'</div><div><code>'+e(a.last||'starting…')+'</code></div><div class=m>'+a.tools+' steps<br>'+(a.running?(a.idleS<60?a.idleS+' s ago':Math.round(a.idleS/60)+' min idle'):'finished')+'</div></div>'}).join('')||'<div class=m>no agents yet</div>';
fin.innerHTML=s.results.map(x=>'<div><span class="dot '+(x.ok?'ok':'bad')+'"></span>'+e(x.label)+(x.r&&x.r.diagrams!=null?' · '+x.r.diagrams+' diagrams · '+x.r.visibleWords+' words · checker fail '+x.r.checkerFail:'')+'</div>').join('')||'nothing yet';
files.innerHTML=s.changed.map(f=>'<tr><td>'+e(f.st)+'</td><td>'+e(f.path)+'</td><td>'+(f.ageS==null?'':f.ageS<90?f.ageS+' s ago':Math.round(f.ageS/60)+' min ago')+'</td></tr>').join('');
}catch(err){t.textContent='(dashboard lost connection)'}}
tick();setInterval(tick,3000);</script>`;

http.createServer((req, res) => {
  if (req.url.startsWith('/api/status')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(status())); }
  else { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); }
}).listen(PORT, '127.0.0.1', () => console.log(`live status: http://localhost:${PORT}  (follows the newest workflow run)`));
