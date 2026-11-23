# Experiment script for lesson 2.6 (mutable vs immutable). Prints every number the lesson uses.
# Run: python3 scripts/diagrams/lessons/2.6_data.py
import copy
import operator
import platform
import sys
import time

print("python", sys.version.split()[0], platform.python_implementation())

# 1. In-place operator vs rebinding: does an alias see the change?
print("\n[1] a = b = X; a = a OP rhs")
cases = [
    ("list", lambda: [1, 2, 3], operator.iadd, [4]),
    ("dict", lambda: {"a": 1}, operator.ior, {"b": 2}),
    ("set", lambda: {1, 2, 3}, operator.ior, {4}),
    ("bytearray", lambda: bytearray(b"ab"), operator.iadd, b"c"),
    ("int", lambda: 5, operator.iadd, 1),
    ("str", lambda: "ab", operator.iadd, "c"),
    ("tuple", lambda: (1, 2, 3), operator.iadd, (4,)),
    ("frozenset", lambda: frozenset({1, 2}), operator.ior, frozenset({3})),
]
for label, make, op, rhs in cases:
    a = make()
    b = a
    a = op(a, rhs)  # exactly what `a += rhs` does: the result is bound back to the name a
    print(f"{label:10s} same_object={a is b!s:5s} alias_now={b!r}  new_value={a!r}")

# 2. Hashability (needed for dict keys and set members)
print("\n[2] hash()")
samples = [1, 1.5, "a", b"a", (1, 2), frozenset({1}), [1], {"a": 1}, {1}, bytearray(b"a"), ([1],)]
for x in samples:
    try:
        hash(x)
        print(f"{type(x).__name__:10s} hashable")
    except TypeError as e:
        print(f"{type(x).__name__:10s} TypeError: {e}")

# 3. Immutable container holding a mutable object
print("\n[3] t = ([1],); t[0] += [2]")
t = ([1],)
try:
    t[0] += [2]
except TypeError as e:
    print("TypeError:", e)
print("t =", t)

# 4. Mutable default argument
print("\n[4] default argument")
def add_item(item, bag=[]):
    bag.append(item)
    return bag
print(add_item(1))
print(add_item(2))
print("__defaults__ =", add_item.__defaults__)
print("same default object:", add_item.__defaults__[0] is add_item(3))

# 5. Shallow vs deep copy
print("\n[5] shallow vs deep copy")
orig = [[1, 2], [3]]
shallow = copy.copy(orig)
deep = copy.deepcopy(orig)
orig[0].append(99)
print("shallow =", shallow)
print("deep    =", deep)
print("shallow[0] is orig[0]:", shallow[0] is orig[0], "| deep[0] is orig[0]:", deep[0] is orig[0])

# 6. Growing a list: rebuild with + (copies every time) vs append (amortised O(1))
print("\n[6] build a list of n items, best of 3 runs (hardware-dependent)")
def build_concat(n):
    lst = []
    for i in range(n):
        lst = lst + [i]
    return lst
def build_append(n):
    lst = []
    for i in range(n):
        lst.append(i)
    return lst
def best(f, n):
    times = []
    for _ in range(3):
        t0 = time.perf_counter()
        f(n)
        times.append(time.perf_counter() - t0)
    return min(times)
ns = [5000, 10000, 20000, 40000]
rows = []
for n in ns:
    tc, ta = best(build_concat, n), best(build_append, n)
    rows.append((n, tc, ta))
    print(f"n={n:6d}  lst = lst + [i]: {tc*1000:9.2f} ms   append: {ta*1000:7.3f} ms   ratio {tc/ta:7.1f}x")
for (n1, c1, a1), (n2, c2, a2) in zip(rows, rows[1:]):
    print(f"doubling n {n1}->{n2}: concat time x{c2/c1:.2f}, append time x{a2/a1:.2f}")
