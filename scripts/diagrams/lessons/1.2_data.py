"""Experiment script for lesson 1.2: every number used in the lesson and diagrams."""
import ast, dis, io, marshal, os, struct, subprocess, sys, tempfile, textwrap, time, tokenize, importlib.util, statistics, token

print("python", sys.version.split()[0], "magic", importlib.util.MAGIC_NUMBER.hex(), "tag", sys.implementation.cache_tag)

# ---- A: three stages on a 2-line program
src = "price = 4\ntotal = price * 3 + 1\n"
toks = [(token.tok_name[t.type], t.string) for t in tokenize.generate_tokens(io.StringIO(src).readline)]
print("TOKENS", len(toks)); print(toks)
tree = ast.parse(src)
print("AST nodes", sum(1 for _ in ast.walk(tree)))
print(ast.dump(tree.body[1], indent=1))
code = compile(src, "<demo>", "exec")
ins = list(dis.get_instructions(code))
print("INSTR", len(ins)); dis.dis(code)
print("co_names", code.co_names, "co_consts", code.co_consts)
# constant folding
c2 = compile("x = 2 + 3 * 4", "<d>", "exec"); dis.dis(c2); print("tree has BinOp:", any(isinstance(n, ast.BinOp) for n in ast.walk(ast.parse("x = 2 + 3 * 4"))))
ns = {}; exec(code, ns); print("exec ->", ns["total"])

# ---- B: syntax error before any output vs runtime error after output
with tempfile.TemporaryDirectory() as d:
    d = os.path.realpath(d)
    def run(args, **kw):
        r = subprocess.run([sys.executable, *args], capture_output=True, text=True, cwd=d, **kw)
        return r.returncode, r.stdout, r.stderr
    open(f"{d}/syn.py", "w").write('print("line 1 ran")\nprint("oops"\n')
    open(f"{d}/run.py", "w").write('print("line 1 ran")\nprint(undefined_name)\n')
    for f in ("syn.py", "run.py"):
        rc, o, e = run([f]); print("B", f, "rc", rc, "stdout", repr(o), "stderr_last", e.strip().splitlines()[-1], "| first", e.strip().splitlines()[0])
    rc, o, e = run(["syn.py"]); print(e)

    # ---- C: ways to run
    probe = textwrap.dedent('''
        import sys
        print("argv =", sys.argv)
        print("__name__ =", __name__)
        print("__file__ =", globals().get("__file__"))
        print("path[0] =", sys.path[0])
    ''')
    os.makedirs(f"{d}/pkg"); open(f"{d}/pkg/__init__.py", "w").write("")
    open(f"{d}/probe.py", "w").write(probe); open(f"{d}/pkg/tool.py", "w").write(probe)
    def clean(s): return s.replace(d, "<DIR>")
    for label, args, kw in [("script", ["probe.py", "a", "b"], {}), ("-m", ["-m", "pkg.tool", "a"], {}),
                            ("-c", ["-c", probe, "a"], {}), ("stdin", ["-", "a"], {"input": probe})]:
        rc, o, e = run(args, **kw); print("C", label, "rc", rc); print(clean(o), clean(e[-200:]))
    # ---- D: pyc
    open(f"{d}/mod.py", "w").write("X = 1\nprint('mod body ran')\n")
    print("D listdir before", sorted(os.listdir(d)))
    run(["-c", "import mod"]); print("D after import", sorted(os.listdir(f"{d}/__pycache__")))
    open(f"{d}/probe_run.py", "w").write("print('main ran')\n"); run(["probe_run.py"]); print("D after running script as main:", sorted(os.listdir(f"{d}/__pycache__")))
    pyc = f"{d}/__pycache__/mod.{sys.implementation.cache_tag}.pyc"
    raw = open(pyc, "rb").read()
    magic, flags, mt, sz = struct.unpack("<4sIII", raw[:16])
    st = os.stat(f"{d}/mod.py")
    print("D pyc bytes", len(raw), "magic", magic.hex(), "== MAGIC", magic == importlib.util.MAGIC_NUMBER, "flags", flags, "mtime", mt, "src mtime int", int(st.st_mtime), "size", sz, "src size", st.st_size)
    body = marshal.loads(raw[16:]); print("D body type", type(body).__name__, "co_names", body.co_names, "consts", body.co_consts)
    print("D marshal len", len(marshal.dumps(body)), "== len-16", len(raw) - 16)
    # invalidation: change source (same size, new mtime)
    open(f"{d}/mod.py", "w").write("X = 2\nprint('mod body ran')\n"); os.utime(f"{d}/mod.py", (st.st_mtime + 10, st.st_mtime + 10))
    r = run(["-c", "import mod; print(mod.X)"]); print("D after edit ->", r[1].split())
    raw2 = open(pyc, "rb").read(); print("D new mtime in pyc", struct.unpack("<4sIII", raw2[:16])[2], "expect", int(st.st_mtime) + 10)
    # unchecked / hash
    r = run(["-m", "py_compile", "mod.py"]); print("D py_compile rc", r[0])
    # stale pyc is ignored if mtime differs; pyc without source in __pycache__ is ignored
    os.remove(f"{d}/mod.py"); r = run(["-c", "import mod"]); print("D import w/o source (only __pycache__ pyc):", r[0], r[2].strip().splitlines()[-1])
    # -B
    import shutil; shutil.rmtree(f"{d}/__pycache__"); open(f"{d}/mod.py", "w").write("X = 1\n"); run(["-B", "-c", "import mod"]); print("D -B wrote cache:", os.path.exists(f"{d}/__pycache__"))
    # PYTHONPYCACHEPREFIX
    pre = f"{d}/pre"; env = dict(os.environ, PYTHONPYCACHEPREFIX=pre); subprocess.run([sys.executable, "-c", "import mod"], cwd=d, env=env)
    print("D prefix cache ->", clean(str([os.path.relpath(os.path.join(a, f), d) for a, _, fs in os.walk(pre) for f in fs])))
    # ---- E: timing
    N = 3000
    big = "".join(f"def f{i}(a, b):\n    c = a * {i} + b\n    return c - {i}\n\n" for i in range(N))
    open(f"{d}/big.py", "w").write(big)
    timer = "import time;t=time.perf_counter();import big;print(time.perf_counter()-t)"
    def t_import(clear):
        out = []
        for _ in range(9):
            if clear: shutil.rmtree(f"{d}/__pycache__", ignore_errors=True)
            r = subprocess.run([sys.executable, "-B" if clear else "-c", *(["-c", timer] if clear else [timer])], cwd=d, capture_output=True, text=True)
            out.append(float(r.stdout))
        return statistics.median(out) * 1000
    shutil.rmtree(f"{d}/__pycache__", ignore_errors=True)
    nocache = t_import(True); subprocess.run([sys.executable, "-c", "import big"], cwd=d)
    cached = t_import(False)
    print("E source lines", big.count("\n"), "bytes", len(big), "pyc bytes", os.path.getsize(f"{d}/__pycache__/big.cpython-312.pyc"))
    print("E import ms: no cache %.1f, cached %.1f, ratio %.1f" % (nocache, cached, nocache / cached))
    # stage split in-process
    def med(fn, n=9):
        r = []
        for _ in range(n):
            t = time.perf_counter(); fn(); r.append(time.perf_counter() - t)
        return statistics.median(r) * 1000
    tk = med(lambda: list(tokenize.generate_tokens(io.StringIO(big).readline)))
    pa = med(lambda: ast.parse(big)); co = med(lambda: compile(big, "big", "exec"))
    cobj = compile(big, "big", "exec"); data = marshal.dumps(cobj)
    ld = med(lambda: marshal.loads(data)); ex = med(lambda: exec(cobj, {}))
    print("E ms: ast.parse %.1f, compile(src->code) %.1f, marshal.loads %.2f, exec(module body) %.2f, (pure-Python tokenize %.1f)" % (pa, co, ld, ex, tk))
    print("E nodes", sum(1 for _ in ast.walk(ast.parse(big))), "instr in module+funcs", None)
# ---- F: code object nesting
nest = "def outer(x):\n    def inner(y):\n        return x + y\n    return inner\nclass A:\n    def m(self): pass\n"
def walk(c, depth=0):
    print("F", "  " * depth + c.co_name, "<-", c.co_filename[-6:] if False else "")
    for k in c.co_consts:
        if hasattr(k, "co_code"): walk(k, depth + 1)
walk(compile(nest, "n.py", "exec"))
print("F module consts types", [type(k).__name__ for k in compile(nest, "n.py", "exec").co_consts])
# greet disassembly in this version
def greet(name): return f"Hello, {name}!"
dis.dis(greet)
print("modes:", [ (m, type(compile(s, "<s>", m)).__name__) for m, s in (("exec", "a=1\nb=2"), ("eval", "1+2"), ("single", "1+2"))])
print("eval:", eval("1+2"))
try: eval("a=1")
except SyntaxError as e: print("eval stmt ->", type(e).__name__, e.msg)
