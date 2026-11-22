"""Experiments behind lesson 2.9 (reference cycles). Standard library only.
Run: python3 scripts/diagrams/lessons/2.9_experiment.py
Every number in the lesson text and diagrams comes from this file's output.
Note: sys.getrefcount(x) counts its own argument, so we subtract 1 at each call site."""
import gc, sys, weakref, tracemalloc

class Node:
    def __init__(self, name):
        self.name = name
        self.other = None
    def __repr__(self):
        return f"Node({self.name})"

print("gc.get_threshold() =", gc.get_threshold(), "| gc.isenabled() =", gc.isenabled())

# ---- 1. acyclic: freed the moment the last name goes away
print("\n== 1. no cycle")
a = Node("a")
r = weakref.ref(a, lambda _: print("  callback: a freed"))
print("refcount(a) =", sys.getrefcount(a) - 1)
del a
print("after del a: still alive?", r() is not None)

# ---- 2. two-node cycle, automatic GC off so the cycle stays until we ask
print("\n== 2. two-node cycle (gc disabled)")
gc.collect()  # flush garbage left by section 1
gc.disable()
a = Node("a"); b = Node("b")
a.other = b; b.other = a
print("refcount(a) with variables =", sys.getrefcount(a) - 1, "(variable a + b.other)")
print("refcount(b) with variables =", sys.getrefcount(b) - 1, "(variable b + a.other)")
ra = weakref.ref(a, lambda _: print("  callback: a freed"))
rb = weakref.ref(b, lambda _: print("  callback: b freed"))
del a, b
print("after del a, del b: a alive?", ra() is not None, "| b alive?", rb() is not None)
x = ra()  # probe: one extra strong reference we create on purpose
print("refcount(a) with probe x =", sys.getrefcount(x) - 1, "-> without probe:", sys.getrefcount(x) - 2)
del x
n = gc.collect()
print("gc.collect() returned", n)
print("after gc.collect(): a alive?", ra() is not None, "| b alive?", rb() is not None)

# plain lists: the count gc.collect() returns is exact here
l1 = []; l2 = [l1]; l1.append(l2)
del l1, l2
print("two-list cycle: gc.collect() returned", gc.collect())

# ---- 3. the worked example: CPython's subtract_refs, by hand on this cycle
print("\n== 3. cycle worked example: gc_refs = refcount - internal references")
a = Node("a"); b = Node("b"); a.other = b; b.other = a
def internal(obj, group):
    return sum(1 for m in group for v in vars(m).values() if v is obj)
ca, cb_ = sys.getrefcount(a) - 1, sys.getrefcount(b) - 1
group = [a, b]
ia, ib = internal(a, group), internal(b, group)
print("while variables a, b exist:")
print(f"  a: refcount={ca} internal={ia} gc_refs={ca - ia}")
print(f"  b: refcount={cb_} internal={ib} gc_refs={cb_ - ib}")
del group
ra = weakref.ref(a); rb = weakref.ref(b)
del a, b
x = ra()  # probe: subtract its own reference (x) and getrefcount's argument
print("after del a, del b (probe x excluded):")
print(f"  a: refcount={sys.getrefcount(x) - 2} internal=1 gc_refs={sys.getrefcount(x) - 3}")
del x
print("alive before gc.collect():", ra() is not None, rb() is not None)
gc.collect()
print("alive after gc.collect(): ", ra() is not None, rb() is not None)

# what does gc.collect() actually count? DEBUG_SAVEALL keeps the garbage in gc.garbage
from collections import Counter
gc.set_debug(gc.DEBUG_SAVEALL)
a = Node("a"); b = Node("b"); a.other = b; b.other = a
del a, b
gc.collect()
print("types in gc.garbage:", dict(Counter(type(o).__name__ for o in gc.garbage)))
gc.set_debug(0); gc.garbage.clear()

# ---- 4. acyclic counterpart: child points back to parent with a weakref
print("\n== 4. weakref back-pointer (no strong cycle)")
class TNode:
    def __init__(self, name):
        self.name = name
        self.children = []
        self._parent = None
    @property
    def parent(self):
        return self._parent() if self._parent is not None else None
    def add(self, child):
        child._parent = weakref.ref(self)
        self.children.append(child)

gc.collect()  # flush earlier garbage, so the next count is ours
root = TNode("root"); leaf = TNode("leaf"); root.add(leaf)
print("leaf.parent before =", leaf.parent.name)
del root
print("after del root: leaf.parent =", leaf.parent, "| gc.collect() returned", gc.collect())
del leaf

# ---- 5. __del__ inside a cycle: collectable since PEP 442 (Python 3.4)
print("\n== 5. __del__ inside a cycle")
class Finalized:
    def __init__(self, name):
        self.name = name; self.other = None
    def __del__(self):
        print(f"  __del__ runs for {self.name}")
p = Finalized("p"); q = Finalized("q"); p.other = q; q.other = p
del p, q
print("dropped; gc.collect() found garbage:", gc.collect() > 0)

# ---- 6. cost: bytes held by cycles, with and without automatic GC
print("\n== 6. bytes held by N pairs (tracemalloc)")
N = 10_000

def make_cycles(n):
    for _ in range(n):
        a = Node("a"); b = Node("b")
        a.other = b; b.other = a

def make_acyclic(n):
    for _ in range(n):
        a = Node("a"); b = Node("b")
        a.other = b

def measure(fn, gc_on):
    gc.collect()
    gc.enable() if gc_on else gc.disable()
    gens = {0: 0, 1: 0, 2: 0}
    def cb(phase, info):
        if phase == "stop":
            gens[info["generation"]] += 1
    gc.callbacks.append(cb)
    tracemalloc.start()
    base = tracemalloc.get_traced_memory()[0]
    fn(N)
    held = tracemalloc.get_traced_memory()[0] - base
    tracemalloc.stop()
    gc.callbacks.remove(cb)
    gc.enable()
    gc.collect()
    return held, dict(gens)

held_acyc, _ = measure(make_acyclic, gc_on=False)
held_cyc_off, _ = measure(make_cycles, gc_on=False)
held_cyc_on, coll = measure(make_cycles, gc_on=True)
print(f"N = {N}")
print(f"acyclic pairs, gc off : {held_acyc} bytes held")
print(f"cyclic pairs,  gc off : {held_cyc_off} bytes held")
print(f"cyclic pairs,  gc on  : {held_cyc_on} bytes held")
print(f"collections during cyclic run with gc on: gen0={coll[0]} gen1={coll[1]} gen2={coll[2]}")
print(f"bytes per pair (gc off): {held_cyc_off / N:.1f}")
