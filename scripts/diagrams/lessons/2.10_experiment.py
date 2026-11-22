"""Experiments for lesson 2.10 (memory leaks). Writes 2.10_data.json next to this file.

Every number used in the lesson text and diagrams comes from this run.
Byte counts come from tracemalloc (Python-object allocations only), so they
differ across Python builds and platforms; ratios and trends are what matter.
"""
import gc, json, sys, tracemalloc, weakref
from functools import lru_cache
from pathlib import Path

OUT = Path(__file__).resolve().parent / "2.10_data.json"
D = {"python": sys.version.split()[0], "platform": sys.platform,
     "gc_thresholds": list(gc.get_threshold())}


class Node:
    def __init__(self, value):
        self.value = value
        self.next = None


def make_pairs(n, cyclic=True):
    for i in range(n):
        a, b = Node(i), Node(i)
        if cyclic:
            a.next, b.next = b, a


class Parent:
    def __init__(self):
        self.child = None


class Child:
    def __init__(self, parent, weak):
        self.parent = weakref.ref(parent) if weak else parent


def make_family(n, weak):
    for _ in range(n):
        p = Parent()
        p.child = Child(p, weak)


class Session:
    def __init__(self, k):
        self.k = k


GLOBAL_CACHE = {}


def handle_unbounded(key):
    GLOBAL_CACHE[key] = bytearray(1024)  # stand-in for a 1 KiB result


@lru_cache(maxsize=256)
def handle_bounded(key):
    return bytearray(1024)


def cur():
    return tracemalloc.get_traced_memory()[0]


# ---- A. Acyclic vs cyclic garbage, with the automatic GC disabled -------------
N = 20000
gc.collect()
gc.disable()
tracemalloc.start()
b0 = cur(); make_pairs(N, cyclic=False); D["A_acyclic_held"] = cur() - b0

b1 = cur(); make_pairs(N, cyclic=True)
D["A_cyclic_held_before_collect"] = cur() - b1
D["A_counts_before_collect"] = list(gc.get_count())
D["A_collect_return"] = gc.collect()
D["A_cyclic_held_after_collect"] = cur() - b1
D["A_N_pairs"] = N
gc.enable()

# ---- A2. Peak with the automatic GC enabled (cycles are collected by themselves)
tracemalloc.stop(); tracemalloc.start()
gc.collect()
b2 = cur(); tracemalloc.reset_peak(); make_pairs(N, cyclic=True)
D["A2_gc_enabled_peak_growth"] = tracemalloc.get_traced_memory()[1] - b2
D["A2_gc_enabled_held_after_loop"] = cur() - b2
tracemalloc.stop()

# ---- B. The generation-0 counter ----------------------------------------------
gc.collect(); gc.disable()
make_pairs(10, cyclic=True)               # same sequence as the lesson's gc-count block
after_make = gc.get_count()
freed = gc.collect()
after_collect = gc.get_count()
D["B_count_after_10_pairs"] = list(after_make)
D["B_collect_return_10_pairs"] = freed
D["B_count_after_collect"] = list(after_collect)
gc.enable()

# ---- C. Weak back-pointer breaks the cycle ------------------------------------
tracemalloc.start()
gc.collect(); gc.disable()
b = cur(); make_family(N, weak=True)
D["C_weak_backref_held"] = cur() - b
b = cur(); make_family(N, weak=False)
D["C_strong_backref_held_before"] = cur() - b
D["C_strong_backref_held_after_collect"] = (gc.collect(), cur() - b)[1]
gc.enable()
tracemalloc.stop()

# ---- D. weakref liveness of a cycle member -----------------------------------
gc.disable()
a = Node(1); bnode = Node(2); a.next = bnode; bnode.next = a
wa = weakref.ref(a)
del a, bnode
D["D_alive_after_del"] = wa() is not None
gc.collect()
D["D_alive_after_collect"] = wa() is not None
gc.enable()

# ---- E. WeakValueDictionary: entries vanish when nobody else holds the value --
cache = weakref.WeakValueDictionary()
for k in range(1000):
    cache[k] = Session(k)
D["E_weak_cache_unowned_len"] = len(cache)
alive = [Session(k) for k in range(1000)]
cache2 = weakref.WeakValueDictionary({k: s for k, s in enumerate(alive)})
D["E_weak_cache_owned_len"] = len(cache2)
del alive
D["E_weak_cache_after_owner_gone_len"] = len(cache2)

# ---- F. Unbounded cache: reachable, so gc.collect() cannot free it ------------
GLOBAL_CACHE.clear()
tracemalloc.start()
gc.collect()
base = cur()
growth_unb, growth_b = {}, {}
key = 0
checkpoints = [1000, 2000, 4000, 8000]
for n in checkpoints:
    while key < n:
        handle_unbounded(key); key += 1
    gc.collect()
    growth_unb[n] = cur() - base
handle_bounded.cache_clear()
base = cur()
key = 0
for n in checkpoints:
    while key < n:
        handle_bounded(key); key += 1
    gc.collect()
    growth_b[n] = cur() - base
D["F_checkpoints"] = checkpoints
D["F_unbounded_held"] = growth_unb
D["F_bounded_held"] = growth_b
D["F_bounded_cache_len"] = handle_bounded.cache_info().currsize
D["F_unbounded_len"] = len(GLOBAL_CACHE)

# ---- G. Locating the leak with tracemalloc snapshots ---------------------------
GLOBAL_CACHE.clear()
tracemalloc.stop(); tracemalloc.start(5)
s1 = tracemalloc.take_snapshot()
for i in range(1000):
    handle_unbounded(i)
s2 = tracemalloc.take_snapshot()
top = s2.compare_to(s1, "lineno")[0]
D["G_top_file"] = Path(top.traceback[0].filename).name
D["G_top_line"] = top.traceback[0].lineno
D["G_top_size_diff"] = top.size_diff
D["G_top_count_diff"] = top.count_diff
tracemalloc.stop()

# ---- H. Per-entry overhead of the unbounded cache ----------------------------
D["C_N_families"] = N
D["H_getsizeof_bytearray_1024"] = sys.getsizeof(bytearray(1024))
D["H_unbounded_per_entry"] = growth_unb[8000] / 8000

# ---- I. Which built-in types accept weak references ---------------------------
def weakrefable(obj):
    try:
        weakref.ref(obj)
        return True
    except TypeError:
        return False

class MyList(list):
    pass

class MyDict(dict):
    pass

D["I_weakrefable"] = {
    "int": weakrefable(1), "tuple": weakrefable((1,)), "str": weakrefable("ab"),
    "list": weakrefable([]), "dict": weakrefable({}),
    "list_subclass": weakrefable(MyList()), "dict_subclass": weakrefable(MyDict()),
}

# ---- J. A finalizer whose callback is a bound method keeps its object alive ---
import subprocess
BOUND = '''
import gc, weakref
class Conn:
    def __init__(self):
        self.buffer = bytearray(1 << 20)
        weakref.finalize(self, self.cleanup)
    def cleanup(self):
        print("finalizer ran")
c = Conn()
del c
print("collect returned", gc.collect())
print("end of script")
'''
SAFE = '''
import gc, weakref
def release(buffer):
    print("finalizer ran")
class Conn:
    def __init__(self):
        self.buffer = bytearray(1 << 20)
        weakref.finalize(self, release, self.buffer)
c = Conn()
del c
print("collect returned", gc.collect())
print("end of script")
'''
for name, code in [("J_bound_method_stdout", BOUND), ("J_module_function_stdout", SAFE)]:
    r = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
    D[name] = r.stdout.splitlines()
    D[name.replace("stdout", "returncode")] = r.returncode

OUT.write_text(json.dumps(D, indent=2))
print(json.dumps(D, indent=2))
