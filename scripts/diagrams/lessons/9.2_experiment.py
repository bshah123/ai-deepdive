"""Experiment for lesson 9.2 (generators). Every number in the lesson comes from this output."""
import dis
import inspect
import sys
import tracemalloc
from inspect import getgeneratorstate

print("== 1. calling a generator function does not run its body ==")
log = []

def traced(n):
    log.append("body starts")
    for i in range(n):
        log.append(f"yield {i}")
        yield i
    log.append("body ends")

g = traced(2)
print("after call      :", log, getgeneratorstate(g))
print("type(g)         :", type(g).__name__)
print("g is iter(g)    :", g is iter(g))
print("first next()    :", next(g), "| log =", log, getgeneratorstate(g))
print("second next()   :", next(g), "| log =", log, getgeneratorstate(g))
try:
    next(g)
except StopIteration:
    print("third next()    : StopIteration | log =", log, getgeneratorstate(g))
print("gi_frame after exhaustion:", g.gi_frame)

print()
print("== 2. the frame survives suspension ==")

def count_up_to(limit):
    count = 0
    while count < limit:
        yield count
        count += 1

c = count_up_to(3)
print("state before start:", getgeneratorstate(c), "| locals =", c.gi_frame.f_locals)
for step in range(3):
    value = next(c)
    print(f"next #{step + 1} -> {value} | state =", getgeneratorstate(c),
          "| f_lineno =", c.gi_frame.f_lineno, "| locals =", c.gi_frame.f_locals)
try:
    next(c)
except StopIteration:
    pass
print("after exhaustion:", getgeneratorstate(c), "| gi_frame =", c.gi_frame)

print()
print("== 3. the old lesson's buggy loop (count <= max) ==")

def count_up_to_buggy(limit):
    count = 0
    while count <= limit:
        yield count
        count += 1

print("buggy count_up_to(5) yields:", list(count_up_to_buggy(5)), "| length =", len(list(count_up_to_buggy(5))))

print()
print("== 4. lazy pipeline: one item in flight ==")
events = []

def source(n):
    for i in range(n):
        events.append(f"source yields {i}")
        yield i

def square(xs):
    for x in xs:
        events.append(f"square gets {x}")
        yield x * x

for y in square(source(3)):
    events.append(f"consumer gets {y}")
for e in events:
    print(e)

print()
print("== 5. return value and StopIteration.value ==")

def with_return():
    yield 1
    return "done"

r = with_return()
next(r)
try:
    next(r)
except StopIteration as stop:
    print("StopIteration.value =", repr(stop.value))

print()
print("== 6. generator expression evaluates its outermost iterable eagerly ==")

def make_items():
    print("  make_items() ran")
    return [1, 2, 3]

ge = (x * 10 for x in make_items())
print("generator expression created, nothing consumed yet")
print("values:", list(ge))

print()
print("== 7. single-use: second pass is empty ==")
gen = (x for x in range(3))
print("first pass :", list(gen))
print("second pass:", list(gen))
print("next(gen, 'default') ->", next(gen, "default"))

print()
print("== 8. bytecode: the yield opcodes ==")
ops = [ins.opname for ins in dis.get_instructions(count_up_to)]
print("YIELD_VALUE count:", ops.count("YIELD_VALUE"), "| RESUME count:", ops.count("RESUME"))
print("opcodes:", " ".join(sorted(set(ops))))
print("count_up_to has CO_GENERATOR flag:", bool(count_up_to.__code__.co_flags & inspect.CO_GENERATOR))
print("plain function has CO_GENERATOR flag:", bool((lambda: 0).__code__.co_flags & inspect.CO_GENERATOR))

print()
print("== 9. memory: list versus generator (tracemalloc peak, CPython", sys.version.split()[0], ") ==")

def peak_bytes(fn):
    tracemalloc.start()
    result = fn()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak, result

for n in (10**3, 10**5, 10**6):
    list_peak, list_total = peak_bytes(lambda: sum([x * x for x in range(n)]))
    gen_peak, gen_total = peak_bytes(lambda: sum(x * x for x in range(n)))
    assert list_total == gen_total
    print(f"N={n:>8}: list peak = {list_peak:>12,d} B | generator peak = {gen_peak:>8,d} B | sum = {gen_total}")

print("sys.getsizeof(generator) for N=10 :", sys.getsizeof(count_up_to(10)))
print("sys.getsizeof(list of 10**6 ints)   :", sys.getsizeof(list(range(10**6))), "(pointers only; int objects not counted)")
