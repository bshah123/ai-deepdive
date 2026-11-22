# Experiment behind lesson 3.5 (small int cache). Every number in the lesson comes from one run of this file.
import sys, timeit, statistics, tracemalloc, warnings

print("python", sys.version.split()[0], sys.platform, "64-bit" if sys.maxsize > 2**32 else "32-bit")
print("sizeof(1) =", sys.getsizeof(1), " sizeof(10**9) =", sys.getsizeof(10**9), " sizeof(2**100) =", sys.getsizeof(2**100))

# 1. Boundary: build the same value twice at run time (int of a string) and ask whether the objects are the same.
def same_object_at_runtime(v):
    return int(str(v)) is int(str(v))

bounds = [-6, -5, -1, 0, 256, 257, 300]
print("runtime int(str(v)) is int(str(v)):", {v: same_object_at_runtime(v) for v in bounds})

# 2. Count how many of the 310 values in [-10, 300) are shared at run time.
vals = range(-10, 300)
shared = sum(same_object_at_runtime(v) for v in vals)
print("shared at runtime:", shared, "of", len(vals))

# 3. Literals in ONE function body: the compiler stores each constant once in co_consts.
def literal_pair():
    a = 300
    b = 300
    return a is b

def literal_pair_small():
    a = 100
    b = 100
    return a is b

print("two literal 300s in one function: a is b ->", literal_pair())
print("two literal 100s in one function: a is b ->", literal_pair_small())

# 4. Literals in DIFFERENT functions: separate code objects.
def get_300():
    return 300

def get_300_again():
    return 300

print("300 from two functions: f() is g() ->", get_300() is get_300_again())
print("300 from one function called twice: f() is f() ->", get_300() is get_300())

# 5. Arithmetic is done at run time (unless the compiler folds it).
def computed(x):
    return (x + 0) is 300

print("run-time 300 (x+0) vs literal 300 ->", computed(300))

# 5b. Separate compile() calls (separate modules) do not share constants.
ns1, ns2 = {}, {}
exec(compile("def k():\n    return 300\n", "<mod1>", "exec"), ns1)
exec(compile("def k():\n    return 300\n", "<mod2>", "exec"), ns2)
print("300 from two separately compiled modules: k1() is k2() ->", ns1["k"]() is ns2["k"]())

# 6. Negative boundary and literal folding of unary minus.
def neg_pair():
    a = -5
    b = -5
    c = -6
    d = -6
    return a is b, c is d

print("-5 literals same object, -6 literals same object ->", neg_pair())

# 7. Identity of the cached objects across refcounts (immortal in 3.12+, PEP 683).
print("sys.getrefcount(7) =", sys.getrefcount(7))
print("getrefcount of a runtime 1000 object =", sys.getrefcount(int(str(1000))))

# 8. SyntaxWarning for 'is' with a literal (CPython 3.8+).
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    compile("x = 300\nprint(x is 300)\n", "<demo>", "exec")
print("warnings for 'x is 300':", [str(m.category.__name__) + ": " + str(m.message) for m in w])

# 9. Memory: a list of 1,000,000 references to values that are all cached vs all fresh.
N = 1_000_000
def build_list(lo):
    return [int(str(lo + (i % 256))) for i in range(N)]  # 256 distinct values, cycled

def build_fresh(lo):
    return [int(str(lo + i)) for i in range(N)]  # 1,000,000 distinct values

def measure(fn, *args):
    tracemalloc.start()
    obj = fn(*args)
    cur, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    del obj
    return cur

cached_mem = measure(build_list, 0)          # values 0..255: all cached
fresh_mem = measure(build_fresh, 1000)       # values 1000..1999999: all new objects
print("list of 1e6 ints, values 0..255 (cached): bytes =", cached_mem)
print("list of 1e6 ints, distinct values (fresh): bytes =", fresh_mem)

# 10a. Arithmetic: result 256 (cached) vs 1001 (not cached); operand is a variable so it is not folded.
def add_ns(a):
    return timeit.repeat("a + 1", globals={"a": a}, number=2_000_000, repeat=7)
for a in (255, 1000):
    runs = add_ns(a)
    print("a + 1 with a =", a, "median ns:", round(statistics.median(runs) / 2_000_000 * 1e9, 2))

# 10. Time: creating a value that is cached vs one that is not (ratio is what matters; absolute time depends on hardware).
def t(stmt):
    runs = timeit.repeat(stmt, globals={"int": int}, number=200_000, repeat=7)
    return statistics.median(runs) / 200_000 * 1e9  # ns per call
ns_cached = t("int('100')")
ns_fresh = t("int('100000')")
print("ns per int(str) cached (100):", round(ns_cached, 1), " fresh (100000):", round(ns_fresh, 1))
