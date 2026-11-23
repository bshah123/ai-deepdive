"""Experiment for lesson 1.5: every number used in the lesson and its diagrams.
Run with the 3.12 venv. Version comparison shells out to 3.13 and 3.14 venvs if present.
"""
import dis, sys, subprocess, timeit, json, os

print("python", sys.version.split()[0])

# ---- A. anatomy -------------------------------------------------------
def bill(price, qty):
    total = price * qty
    return round(total, 2)

print("== A. bill")
dis.dis(bill)
c = bill.__code__
print("co_varnames", c.co_varnames, "co_names", c.co_names, "co_consts", c.co_consts)
ins = list(dis.get_instructions(bill))
print("n instructions", len(ins), "co_code bytes", len(c.co_code))
for i in ins:
    print(i.offset, i.opname, i.arg, repr(i.argrepr), i.positions.lineno if i.positions else None)
print("with caches:", len(list(dis.get_instructions(bill, show_caches=True))))

# ---- B. loop ----------------------------------------------------------
def total(xs):
    s = 0
    for x in xs:
        s += x
    return s

print("== B. total")
dis.dis(total)
print("n", len(list(dis.get_instructions(total))))
for i in dis.get_instructions(total):
    print(i.offset, i.opname, i.arg, repr(i.argrepr), "jump target" if i.is_jump_target else "", i.jump_target if hasattr(i, 'jump_target') else "")
print(total.__code__.co_varnames, total.__code__.co_consts)
print("total(range(5)) =", total(range(5)))

# ---- C. folding -------------------------------------------------------
print("== C. folding")
def f1(): return 60 * 60 * 24
def f2(n): return 60 * 60 * 24 * n
def f3(n): return n * 60 * 60 * 24
def f4(x): return x in [1, 2, 3]
def f5(x): return x in {1, 2, 3}
for f in (f1, f2, f3, f4, f5):
    ops = [(i.opname, i.argrepr) for i in dis.get_instructions(f) if i.opname != "RESUME"]
    print(f.__name__, len(ops), ops, f.__code__.co_consts)

# ---- D. module level vs function -------------------------------------
print("== D. module vs function")
N = 1_000_000
mod_src = f"s = 0\nfor i in range({N}):\n    s += i\n"
fn_src = f"def run():\n    s = 0\n    for i in range({N}):\n        s += i\n    return s\n"
mod_code = compile(mod_src, "<mod>", "exec")
ns = {}
exec(fn_src, ns)
run = ns["run"]
print("module loop ops:", [i.opname for i in dis.get_instructions(mod_code) if i.opname != "RESUME"])
print("function loop ops:", [i.opname for i in dis.get_instructions(run) if i.opname != "RESUME"])
print("n module", len(list(dis.get_instructions(mod_code))), "n func", len(list(dis.get_instructions(run))))
t_mod = min(timeit.repeat(lambda: exec(mod_code, {}), number=1, repeat=7))
t_fn = min(timeit.repeat(run, number=1, repeat=7))
print(f"module level: {t_mod*1000:.1f} ms; function: {t_fn*1000:.1f} ms; ratio {t_mod/t_fn:.2f}")

# global vs local read, per-call
G = 5
def read_global(): return G
def read_local():
    g = 5
    return g
def read_arg(g): return g
print("read_global ops", [i.opname for i in dis.get_instructions(read_global)])

# ---- E. cache entries --------------------------------------------------
print("== E. caches")
for f in (bill, total):
    n = len(list(dis.get_instructions(f)))
    nc = len(list(dis.get_instructions(f, show_caches=True)))
    print(f.__name__, "instr", n, "with caches", nc, "co_code bytes", len(f.__code__.co_code), "= 2*", len(f.__code__.co_code)//2)

# adaptive after warmup
def mul(a, b): return a * b + 1
for _ in range(2000): mul(3, 4)
print("plain :", [i.opname for i in dis.get_instructions(mul)])
print("adaptive:", [i.opname for i in dis.get_instructions(mul, adaptive=True)])

# ---- F. nested code objects -------------------------------------------
print("== F. nested")
src = "def outer(a):\n    def inner(b):\n        return a + b\n    return inner\n"
dis.dis(src)

# ---- G. versions --------------------------------------------------------
print("== G. versions")
snippet = '''
import dis, sys
def bill(price, qty):
    total = price * qty
    return round(total, 2)
def greet(name):
    return f"Hello, {name}!"
def swap(a, b):
    return a * b
out = {}
for f in (bill, greet, swap):
    out[f.__name__] = [i.opname for i in dis.get_instructions(f)]
import json; print(json.dumps({"v": sys.version.split()[0], "ops": out}))
'''
base = "/private/tmp/claude-501/-Users-bshah-Documents-Trial-Learning/deaeed1b-fae8-473f-9e77-febb5da77a6e/scratchpad"
res = {}
for name, py in [("3.12", sys.executable), ("3.13", f"{base}/venv-py313/bin/python"), ("3.14", f"{base}/venv-py314/bin/python")]:
    if not os.path.exists(py): continue
    r = subprocess.run([py, "-c", snippet], capture_output=True, text=True)
    d = json.loads(r.stdout)
    res[name] = d
    print(name, d["v"])
    for k, v in d["ops"].items():
        print("  ", k, len(v), v)

# greet on 3.12
print("== greet 3.12")
def greet(name): return f"Hello, {name}!"
dis.dis(greet)
