"""Experiment script for lesson 1.6: every number used in the lesson and diagrams.

Run:  <python> scripts/diagrams/lessons/1.6_data.py            (main report, run once with 3.12)
Internally spawns python3.11 / 3.12 / 3.13 / 3.14 (uv-managed) for cross-version probes.
Timings depend on hardware: they are only compared with each other inside one run.
"""
import dis, json, os, subprocess, sys, statistics, time

def spec_name(fn, op="BINARY_OP"):
    names = [i.opname for i in dis.get_instructions(fn, adaptive=True) if i.opname.startswith(op)]
    return names

PROBE = r'''
import dis, json, sys, time, statistics
def add(a, b):
    return a + b
def name():
    return [i.opname for i in dis.get_instructions(add, adaptive=True) if i.opname.startswith("BINARY_OP")][0]
out = {"version": sys.version.split()[0]}
# 1. how many calls before the site is specialized (ints)
seq = [name()]
for n in range(1, 41):
    add(1, 2); seq.append(name())
first = next((n for n, s in enumerate(seq) if s != "BINARY_OP"), None)
out["calls_until_specialized"] = first
out["name_after"] = seq[-1]
# 2. type switch: now call with floats and track the name call by call
trace = []
for n in range(60):
    add(1.5, 2.5); trace.append(name())
runs = []
for s in trace:
    if runs and runs[-1][0] == s: runs[-1][1] += 1
    else: runs.append([s, 1])
out["float_switch_runs"] = runs
# 3. attribute site: one class vs several classes at the same o.x
class A:
    def __init__(s): s.x = 1
class B:
    def __init__(s): s.y = 0; s.x = 1
class C:
    def __init__(s): s.z = 0; s.x = 1
class D:
    def __init__(s): s.w = 0; s.x = 1
N = 400000
def make():
    ns = {}
    exec("def run(objs):\n    t = 0\n    for o in objs:\n        t += o.x\n    return t\n", ns)
    return ns["run"]
cases = {"1 class": [A()] * N, "2 classes": [A(), B()] * (N // 2), "4 classes": [A(), B(), C(), D()] * (N // 4)}
for k, objs in cases.items():
    run = make()
    for _ in range(3): run(objs)
    ts = []
    for _ in range(9):
        t0 = time.perf_counter(); run(objs); ts.append(time.perf_counter() - t0)
    out["ns_attr_" + k.replace(" ", "_")] = round(min(ts) / N * 1e9, 1)
print(json.dumps(out))
'''

def probe(exe):
    r = subprocess.run([exe, "-I", "-c", PROBE], capture_output=True, text=True)
    if r.returncode: return {"error": r.stderr.strip().splitlines()[-1]}
    return json.loads(r.stdout)

JITLOOP = r'''
import sys, time, statistics
def loop(n):
    t = 0
    for i in range(n):
        t += i * 2 % 7
    return t
def floaty(n):
    x = 0.0
    for i in range(n):
        x = x * 0.999 + 1.5
    return x
def callee(a, b):
    return a + b if a > b else b - a
def calls(n):
    t = 0
    for i in range(n):
        t = callee(t, i) & 1023
    return t
N = 2_000_000
res = {}
for name, f in (("int_loop", loop), ("float_loop", floaty), ("call_loop", calls)):
    ts = []
    for k in range(9):
        t0 = time.perf_counter(); f(N); ts.append(time.perf_counter() - t0)
    res[name] = {"first_ms": round(ts[0]*1e3, 1), "median_ms": round(statistics.median(ts[1:])*1e3, 1)}
if hasattr(sys, "_jit"): res["jit_enabled"] = sys._jit.is_enabled()
import json; print(json.dumps(res))
'''

def jit(exe, flag):
    env = dict(os.environ, PYTHON_JIT=flag)
    r = subprocess.run([exe, "-c", JITLOOP], capture_output=True, text=True, env=env)
    if r.returncode: return {"error": r.stderr.strip().splitlines()[-1]}
    return json.loads(r.stdout)

if __name__ == "__main__":
    print("main python", sys.version.split()[0])
    # ---- A: bytecode rewritten in place (3.12)
    def add(a, b):
        return a + b
    code = add.__code__
    def show(label):
        ca = code._co_code_adaptive; base = code.co_code
        nm = lambda b: dis._all_opname[b]
        print(label, "adaptive:", [nm(ca[i]) for i in range(0, len(ca), 2) if nm(ca[i]) != "CACHE"],
              "| co_code:", [nm(base[i]) for i in range(0, len(base), 2) if nm(base[i]) != "CACHE"], "| bytes", len(ca))
    show("A0 fresh   ")
    for _ in range(3): add(1, 2)
    show("A1 3 ints  ")
    for _ in range(100): add(1.5, 2.5)
    show("A2 +100 flt")
    for _ in range(100): add("a", "b")
    show("A3 +100 str")
    print("A cache entries BINARY_OP:", dis._inline_cache_entries[dis.opmap["BINARY_OP"]] if hasattr(dis, "_inline_cache_entries") else "n/a")
    dis.dis(add, adaptive=True, show_caches=True)

    # ---- B: survey of specialized names after warm-up (this interpreter)
    class P:
        def __init__(self, x): self.x = x
        def get(self): return self.x
    def survey(p, xs, i):
        t = 0
        for v in xs:
            t += v
        if i < 10:
            t += 1
        t += p.x
        t += len(xs)
        t += xs[0]
        t += p.get()
        return t
    p = P(3); xs = [1, 2, 3]
    for i in range(200): survey(p, xs, i % 20)
    pairs = []
    for ins in dis.get_instructions(survey, adaptive=True):
        if ins.opname not in ("CACHE", "RESUME"):
            pairs.append((ins.opname, ins.argrepr))
    print("B survey:")
    for a, b in pairs: print("  ", a, b)
    # unspecialized names for the same function
    print("B base:", [i.opname for i in dis.get_instructions(survey) if i.opname not in ("CACHE", "RESUME")])

    # ---- C: cross-version probe
    exes = {v: f"python{v}" for v in ("3.11", "3.12", "3.13", "3.14")}
    for v, e in exes.items():
        print("C", v, json.dumps(probe(e)))

    # ---- D: JIT on/off (3.13 and 3.14 build with --enable-experimental-jit=yes-off)
    for v in ("3.13", "3.14"):
        for flag in ("0", "1"):
            print("D", v, "PYTHON_JIT=" + flag, json.dumps(jit(exes[v], flag)))
    print("D 3.12 (no JIT build)", json.dumps(jit(exes["3.12"], "0")))
