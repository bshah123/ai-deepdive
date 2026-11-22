"""Measured numbers for lesson 13.2 (packages, __init__.py, relative vs absolute imports).

Run:   <venv python> scripts/diagrams/lessons/13.2_data.py
Output: scripts/diagrams/lessons/13.2_data.json (read by 13.2.mjs and checked against the text)

Every file tree is built in a scratch directory and every import runs in a fresh
interpreter (subprocess), so sys.modules and sys.path start clean each time.
"""
import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

SCRATCH = Path("/private/tmp/claude-501/-Users-bshah-Documents-Trial-Learning/"
               "deaeed1b-fae8-473f-9e77-febb5da77a6e/scratchpad/lesson13_2")
OUT = Path(__file__).with_name("13.2_data.json")
ENV = {k: v for k, v in os.environ.items() if k not in ("PYTHONPATH", "PYTHONSAFEPATH")}
PY = sys.executable


def write(root: Path, rel: str, text: str = "") -> None:
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def run(args, cwd, pythonpath=None):
    env = dict(ENV)
    if pythonpath:
        env["PYTHONPATH"] = pythonpath
    r = subprocess.run([PY, *args], cwd=cwd, env=env, capture_output=True, text=True)
    err_last = r.stderr.strip().splitlines()[-1] if r.stderr.strip() else ""
    return {"returncode": r.returncode, "stdout": r.stdout.strip(), "stderr_last": err_last}


if SCRATCH.exists():
    shutil.rmtree(SCRATCH)
SCRATCH.mkdir(parents=True)
result = {"python": sys.version.split()[0]}

# ---- 1. The lesson's package (no prints) -------------------------------------
W = SCRATCH / "pkg"
write(W, "my_package/__init__.py")
write(W, "my_package/module1.py",
      'def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\n'
      'def farewell(name: str) -> str:\n    return f"Goodbye, {name}!"\n')
write(W, "my_package/sub_package1/__init__.py")
write(W, "my_package/sub_package1/module2.py",
      "from ..module1 import greet\n\n"
      "def greet_from_module2(name: str) -> str:\n    return greet(name)\n")
write(W, "my_package/sub_package2/__init__.py")
write(W, "my_package/sub_package2/module3.py",
      "from my_package.module1 import farewell\n\n"
      "def farewell_from_module3(name: str) -> str:\n    return farewell(name)\n")
write(W, "test_package.py",
      "from my_package.sub_package1.module2 import greet_from_module2\n"
      "from my_package.sub_package2.module3 import farewell_from_module3\n\n"
      "def main() -> None:\n    name = \"Alice\"\n"
      "    print(greet_from_module2(name))\n    print(farewell_from_module3(name))\n\n"
      "if __name__ == \"__main__\":\n    main()\n")

result["matrix"] = {
    "python test_package.py (cwd = project root)":
        run(["test_package.py"], W),
    "python my_package/sub_package1/module2.py":
        run(["my_package/sub_package1/module2.py"], W),
    "python -m my_package.sub_package1.module2":
        run(["-m", "my_package.sub_package1.module2"], W),
    "python my_package/sub_package2/module3.py":
        run(["my_package/sub_package2/module3.py"], W),
    "python -m my_package.sub_package2.module3":
        run(["-m", "my_package.sub_package2.module3"], W),
    "cd / && python <root>/test_package.py":
        run([str(W / "test_package.py")], "/"),
    "cd / && python -c 'import my_package' (no PYTHONPATH)":
        run(["-c", "import my_package"], "/"),
    "cd / && PYTHONPATH=<root> python -c 'from ... import greet_from_module2'":
        run(["-c", "from my_package.sub_package1.module2 import greet_from_module2 as g; print(g('Dana'))"],
            "/", pythonpath=str(W)),
}

# Facts about module2 imported through its package name.
result["module2_facts"] = run(
    ["-c", "import my_package.sub_package1.module2 as m; "
           "print(repr(m.__package__)); print(m.__spec__.parent); print(m.greet_from_module2('Eve'))"],
    W)

# ---- 2. Resolution of relative names (importlib's own rule) ------------------
resolve = {}
for name, package in [("..module1", "my_package.sub_package1"),
                      (".", "my_package.sub_package1"),
                      ("..", "my_package.sub_package1"),
                      ("...top", "my_package.sub_package1"),
                      ("..module1", "my_package")]:
    try:
        resolve[f"{name!r} in {package!r}"] = importlib.util.resolve_name(name, package)
    except ImportError as e:
        resolve[f"{name!r} in {package!r}"] = f"ImportError: {e}"
result["resolve_name"] = resolve

# ---- 3. Import order: a copy of the tree with one print per file ------------
T = SCRATCH / "trace"
write(T, "my_package/__init__.py", 'print("1 run my_package/__init__.py")\n')
write(T, "my_package/module1.py", 'print("3 run my_package/module1.py")\n'
      'def greet(name):\n    return f"Hello, {name}!"\n')
write(T, "my_package/sub_package1/__init__.py", 'print("2 run my_package/sub_package1/__init__.py")\n')
write(T, "my_package/sub_package1/module2.py",
      'print("2b start my_package/sub_package1/module2.py")\n'
      "from ..module1 import greet\n"
      'print("4 end my_package/sub_package1/module2.py")\n')
result["import_order"] = run(["-c", "import my_package.sub_package1.module2"], T)
result["import_order_twice"] = run(
    ["-c", "import my_package.sub_package1.module2\nimport my_package.sub_package1.module2\nprint('done')"], T)

# ---- 4. Regular package vs namespace package (PEP 420) ----------------------
N = SCRATCH / "ns"
write(N, "reg/__init__.py")
write(N, "reg/a.py", "X = 'a'\n")
write(N, "nsd/leaf.py", "Y = 'leaf'\n")
result["regular_package"] = run(
    ["-c", "import reg; print(reg.__file__.split('/')[-1]); print(type(reg.__path__).__name__)"], N)
result["namespace_package"] = run(
    ["-c", "import nsd; print(nsd.__file__); print(type(nsd.__path__).__name__)"], N)
result["namespace_import_leaf"] = run(["-c", "import nsd.leaf as m; print(m.Y)"], N)

# Split namespace: two portions of the same name on sys.path.
A, B = SCRATCH / "portA", SCRATCH / "portB"
write(A, "shared/a.py", "A = 1\n")
write(B, "shared/b.py", "B = 2\n")
result["split_namespace_two_portions"] = run(
    ["-c", "import shared.a, shared.b; print(shared.a.A + shared.b.B)"], "/",
    pythonpath=f"{A}{os.pathsep}{B}")
# Add an __init__.py to portion A: it becomes a regular package and hides portion B.
write(A, "shared/__init__.py")
result["regular_hides_portion"] = run(
    ["-c", "import shared.a, shared.b"], "/", pythonpath=f"{A}{os.pathsep}{B}")

OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(result, indent=2, ensure_ascii=False))
