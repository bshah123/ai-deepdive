#!/usr/bin/env python3
"""Re-run the python blocks of a lesson and diff them against the recorded ```output blocks.

Usage: check-lesson-outputs.py <python-exe> <lesson.md> [<lesson.md> ...]

For every ```python block that is followed by an ```output block:
  OK       runs standalone and prints exactly the recorded output
  DEPENDS  only matches when the lesson's earlier blocks ran first in the same process
           (the in-browser "Run Code" button runs each block alone, so these buttons will fail)
  SKIP     needs a package missing from <python-exe>
  FAIL     output differs or the block crashes (timing/hardware numbers differ legitimately: look)
Exit status is 1 if any FAIL.
"""
import json, os, subprocess, sys, tempfile

def parse_blocks(text):
    blocks, lines, i = [], text.split("\n"), 0
    while i < len(lines):
        s = lines[i].strip()
        if s.startswith("```"):
            lang = s[3:].strip(); body = []; i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                body.append(lines[i]); i += 1
            blocks.append((lang, "\n".join(body)))
        i += 1
    return blocks

HARNESS = r'''
import sys, io, json, contextlib, traceback
blocks = json.load(open(sys.argv[1]))
g = {"__name__": "__main__"}
res = []
for code in blocks:
    buf = io.StringIO(); err = None
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(code, "<block>", "exec"), g)
    except BaseException as e:
        err = type(e).__name__ + ": " + str(e).splitlines()[0][:120] if str(e) else type(e).__name__
    res.append({"out": buf.getvalue(), "err": err})
print(json.dumps(res))
'''

def run_blocks(py, codes, tmp):
    json.dump(codes, open(os.path.join(tmp, "blocks.json"), "w"))
    open(os.path.join(tmp, "h.py"), "w").write(HARNESS)
    p = subprocess.run([py, "-I", os.path.join(tmp, "h.py"), os.path.join(tmp, "blocks.json")],
                       capture_output=True, text=True, timeout=1800, cwd=tmp)
    try: return json.loads(p.stdout.strip().splitlines()[-1])
    except Exception: return [{"out": "", "err": "harness crashed: " + p.stderr.strip()[-200:]}] * len(codes)

def first_diff(a, b):
    a, b = a.rstrip().splitlines(), b.rstrip().splitlines()
    for i in range(max(len(a), len(b))):
        x = a[i] if i < len(a) else "<missing>"; y = b[i] if i < len(b) else "<missing>"
        if x != y: return f"line {i+1}\n      lesson: {x[:130]}\n      actual: {y[:130]}"
    return ""

def main():
    py, files = sys.argv[1], sys.argv[2:]
    any_fail = False
    for path in files:
        blocks = parse_blocks(open(path).read())
        pyblocks = [(k, b[1]) for k, b in enumerate(blocks) if b[0] == "python"]
        pairs = [(n, code, blocks[k + 1][1]) for n, (k, code) in enumerate(pyblocks)
                 if k + 1 < len(blocks) and blocks[k + 1][0] == "output"]
        counts = {"OK": 0, "DEPENDS": 0, "SKIP": 0, "FAIL": 0}
        with tempfile.TemporaryDirectory() as tmp:
            cumulative = run_blocks(py, [c for _, c in pyblocks], tmp)
            for n, code, expected in pairs:
                alone = run_blocks(py, [code], tmp)[0]
                if alone["err"] is None and alone["out"].rstrip() == expected.rstrip():
                    counts["OK"] += 1; continue
                cum = cumulative[n]
                if cum["err"] is None and cum["out"].rstrip() == expected.rstrip():
                    counts["DEPENDS"] += 1; print(f"  DEPENDS block {n+1} (needs earlier blocks; alone: {alone['err'] or 'different output'})"); continue
                err = alone["err"] or cum["err"] or ""
                if err.startswith(("ModuleNotFoundError", "ImportError")):
                    counts["SKIP"] += 1; print(f"  SKIP block {n+1}: {err[:90]}"); continue
                counts["FAIL"] += 1; any_fail = True
                print(f"  FAIL block {n+1}: {alone['err'] or ''}" + ("\n    " + first_diff(expected, alone["out"]) if not alone["err"] else ""))
        print(f"{os.path.basename(path)}: {len(pairs)} recorded outputs  {counts}")
    sys.exit(1 if any_fail else 0)

main()
