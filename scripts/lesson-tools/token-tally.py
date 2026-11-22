#!/usr/bin/env python3
"""Tally token use of the lesson-rewrite agents from their transcripts.

Usage: token-tally.py [--log] [<workflow-run-dir> ...]
  default: print totals for every run under the project's subagents/workflows
  --log:   also append one line per run to scripts/lesson-tools/token-log.md
Counts each API message once (de-duplicated by message id). Reports:
  output     tokens the models wrote (the main cost)
  new input  input + cache-creation tokens (fresh context)
  cache read tokens re-read from cache (cheap, but counted by some plans)
Appends a dated line per run to scripts/lesson-tools/token-log.md.
"""
import glob, json, os, sys, datetime
from collections import defaultdict

PROJ = os.path.expanduser('~/.claude/projects/-Users-bshah-Documents-Trial-Learning/deaeed1b-fae8-473f-9e77-febb5da77a6e/subagents/workflows')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')

def tally(run_dir):
    seen, tot = set(), defaultdict(lambda: defaultdict(int))
    for f in glob.glob(os.path.join(run_dir, 'agent-*.jsonl')):
        meta = f[:-6] + '.meta.json'
        model = json.load(open(meta)).get('model', '?') if os.path.exists(meta) else '?'
        for line in open(f, encoding='utf8'):
            try: d = json.loads(line)
            except Exception: continue
            m = d.get('message') or {}
            u = m.get('usage')
            if not u: continue
            key = m.get('id') or d.get('uuid') or (f, line[:80])
            if key in seen: continue
            seen.add(key)
            t = tot[model]
            t['messages'] += 1
            t['output'] += u.get('output_tokens', 0)
            t['new_input'] += u.get('input_tokens', 0) + u.get('cache_creation_input_tokens', 0)
            t['cache_read'] += u.get('cache_read_input_tokens', 0)
    return tot

def fmt(n): return f'{n/1000:,.0f}k' if n < 1_000_000 else f'{n/1_000_000:,.2f}M'

def main():
    args = [a for a in sys.argv[1:] if a != '--log']
    runs = args or sorted(glob.glob(os.path.join(PROJ, 'wf_*')), key=os.path.getmtime)
    log = []
    for r in runs:
        tot = tally(r)
        name = os.path.basename(r.rstrip('/'))
        all_out = sum(v['output'] for v in tot.values())
        print(f'== {name}  (total output {fmt(all_out)})')
        for model, v in sorted(tot.items()):
            print(f"   {model:8} messages {v['messages']:>5}  output {fmt(v['output']):>8}  new input {fmt(v['new_input']):>8}  cache read {fmt(v['cache_read']):>8}")
        log.append(f"| {datetime.date.today()} | {name} | " + ', '.join(f"{m}: out {fmt(v['output'])}" for m, v in sorted(tot.items())) + ' |')
    if '--log' in sys.argv and log:
        path = os.path.join(ROOT, 'scripts/lesson-tools/token-log.md')
        new = not os.path.exists(path)
        with open(path, 'a') as fh:
            if new: fh.write('| date | run | output tokens by model |\n|---|---|---|\n')
            fh.write('\n'.join(log) + '\n')
        print(f'appended {len(log)} line(s) to scripts/lesson-tools/token-log.md')

main()
