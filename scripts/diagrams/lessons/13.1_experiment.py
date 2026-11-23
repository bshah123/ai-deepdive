"""Numbers for lesson 13.1 (the import engine and the sys.modules cache). Stdlib only.

Run: <python> scripts/diagrams/lessons/13.1_experiment.py
Writes scripts/diagrams/lessons/13.1_data.json, which 13.1.mjs reads.
Timing numbers are machine-dependent; the counts are deterministic.
"""
import importlib
import json
import os
import statistics
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
tmp = Path(tempfile.mkdtemp(prefix="lesson131_"))
sys.path.insert(0, str(tmp))

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)

# --- E1: a module body runs once; finder calls per import (counting finder) ---
write(tmp / "greeter.py",
      "import builtins\n"
      "builtins.GREET_RUNS = getattr(builtins, 'GREET_RUNS', 0) + 1\n"
      "VALUE = 42\n")

class SpyFinder:
    """A meta path finder that records calls for one name and declines (returns None)."""
    def __init__(self, name):
        self.name, self.calls = name, 0
    def find_spec(self, fullname, path=None, target=None):
        if fullname == self.name:
            self.calls += 1
        return None  # not mine: let the next finder search

spy = SpyFinder("greeter")
sys.meta_path.insert(0, spy)
import builtins
finder_calls, body_runs, objects = [], [], []
importlib.invalidate_caches()
for i in range(3):
    before, runs_before = spy.calls, getattr(builtins, "GREET_RUNS", 0)
    mod = importlib.import_module("greeter")
    finder_calls.append(spy.calls - before)
    body_runs.append(getattr(builtins, "GREET_RUNS", 0) - runs_before)
    objects.append(mod)
sys.meta_path.remove(spy)
same_object = all(m is objects[0] for m in objects)

# --- E2: timing (machine-dependent). Cold = first import of a fresh file; hot = cache hit ---
n_cold = 200
for k in range(n_cold):
    write(tmp / f"tiny_{k}.py", f"X_{k} = {k}\n")
importlib.invalidate_caches()
cold_ns = []
for k in range(n_cold):
    t0 = time.perf_counter_ns()
    importlib.import_module(f"tiny_{k}")
    cold_ns.append(time.perf_counter_ns() - t0)
hot_batches = []
for _ in range(7):
    t0 = time.perf_counter_ns()
    for _ in range(100_000):
        importlib.import_module("tiny_0")
    hot_batches.append((time.perf_counter_ns() - t0) / 100_000)
cold_median_us = statistics.median(cold_ns) / 1000
hot_median_ns = statistics.median(hot_batches)

# --- E3: sys.modules entry exists while the module body runs ---
write(tmp / "selfaware.py",
      "import sys\nprint('  in sys.modules during its own body:', 'selfaware' in sys.modules)\n")
importlib.import_module("selfaware")

# --- E4: a failing import is removed; the next attempt re-runs the body ---
write(tmp / "broken.py", "print('  [broken body runs]')\nraise RuntimeError('boom')\n")
attempt_results = []
for _ in range(2):
    try:
        importlib.import_module("broken")
    except RuntimeError as e:
        attempt_results.append(str(e))
broken_in_cache = "broken" in sys.modules

# --- E5: a None entry in sys.modules blocks the import ---
sys.modules["ghost"] = None
try:
    importlib.import_module("ghost")
    none_msg = "no error"
except ModuleNotFoundError as e:
    none_msg = str(e)
del sys.modules["ghost"]

# --- E6: dotted names: parent package and child are both cache keys ---
write(tmp / "pkgdemo" / "__init__.py", "")
write(tmp / "pkgdemo" / "sub.py", "NAME = 'sub'\n")
importlib.import_module("pkgdemo.sub")
dotted_keys = sorted(k for k in sys.modules if k.startswith("pkgdemo"))

# --- E7: first match on sys.path wins (shadowing) ---
dir_a, dir_b = tmp / "dir_a", tmp / "dir_b"
write(dir_a / "helper_mod.py", "WHERE = 'dir_a (earlier on sys.path)'\n")
write(dir_b / "helper_mod.py", "WHERE = 'dir_b (later on sys.path)'\n")
sys.path[0:0] = [str(dir_b), str(dir_a)]  # dir_b is searched first
importlib.invalidate_caches()
helper = importlib.import_module("helper_mod")
shadow_winner = helper.WHERE

# --- E8: deleting the cache entry forces a fresh module object ---
old = sys.modules.pop("greeter")
new = importlib.import_module("greeter")
fresh_object = new is not old

result = {
    "finder_calls": finder_calls,
    "body_runs": body_runs,
    "same_object": same_object,
    "cold_median_us": round(cold_median_us, 1),
    "hot_median_ns": round(hot_median_ns, 0),
    "n_cold": n_cold,
    "broken_attempts": attempt_results,
    "broken_in_cache": broken_in_cache,
    "none_msg": none_msg,
    "dotted_keys": dotted_keys,
    "shadow_winner": shadow_winner,
    "fresh_object_after_delete": fresh_object,
    "python": sys.version.split()[0],
}
print(json.dumps(result, indent=2))
(HERE / "13.1_data.json").write_text(json.dumps(result, indent=2) + "\n")
