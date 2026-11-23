# Experiment for lesson 5.1 (tuples vs lists). Run: python scripts/diagrams/lessons/5.1_experiment.py
# Prints every number used in the lesson and writes 5.1_data.json for the diagrams.
import sys, gc, dis, json, os, timeit

HERE = os.path.dirname(os.path.abspath(__file__))
data = {}
print("python", sys.version.split()[0], sys.platform, 64 if sys.maxsize > 2**32 else 32, "bit")

# A. Sizes by length: tuple(range(n)), list(range(n)), and a list grown by append
print("\n[A] sys.getsizeof by length n")
print("n  tuple  list(range(n))  list(append)  allocated_slots(append)")
rows = []
for n in range(0, 11):
    t = tuple(range(n))
    lr = list(range(n))
    la = []
    for i in range(n):
        la.append(i)
    rows.append({"n": n, "tuple": sys.getsizeof(t), "list_range": sys.getsizeof(lr),
                 "list_append": sys.getsizeof(la), "allocated": (sys.getsizeof(la) - 56) // 8})
    r = rows[-1]
    print(f"{n:<3}{r['tuple']:>5}{r['list_range']:>16}{r['list_append']:>14}{r['allocated']:>25}")
assert all(r["tuple"] == 40 + 8 * r["n"] for r in rows)
print("check: getsizeof(tuple) == 40 + 8*n for n = 0..10: True")
print("getsizeof(()) =", sys.getsizeof(()), " getsizeof([]) =", sys.getsizeof([]))
data["sizes"] = rows

# B. Worked example
t3 = (1, 2, 3)
l3 = [1, 2, 3]
print("\n[B] worked example")
print("t3 =", t3, " getsizeof =", sys.getsizeof(t3))
print("l3 =", l3, " getsizeof =", sys.getsizeof(l3), " allocated slots =", (sys.getsizeof(l3) - 56) // 8)
print("getsizeof((1,2,3)) - getsizeof(()) =", sys.getsizeof((1, 2, 3)) - sys.getsizeof(()))
data["worked"] = {"tuple3": sys.getsizeof(t3), "list3": sys.getsizeof(l3), "list3_allocated": (sys.getsizeof(l3) - 56) // 8}

# C. Growth of an append-built list
print("\n[C] allocated slots at each resize while appending")
l, seen, prev = [], [], None
for i in range(40):
    l.append(i)
    a = (sys.getsizeof(l) - 56) // 8
    if a != prev:
        seen.append((len(l), a)); prev = a
print("(length, allocated) at each resize:", seen)
l, resizes, prev = [], 0, None
for i in range(1000):
    l.append(i)
    a = (sys.getsizeof(l) - 56) // 8
    if a != prev:
        resizes += 1; prev = a
print("resizes for 1000 appends:", resizes)

# D. Building by concatenation vs append (timing is hardware dependent: one run)
N = 20000
def build_tuple(n):
    t = ()
    for i in range(n):
        t = t + (i,)
    return t
def build_list(n):
    l = []
    for i in range(n):
        l.append(i)
    return l
tt = timeit.timeit(lambda: build_tuple(N), number=1)
tl = timeit.timeit(lambda: build_list(N), number=1)
print(f"\n[D] one run, N={N}: t = t + (i,) took {tt:.3f} s; list.append took {tl*1000:.2f} ms (hardware dependent)")
print("pointers copied by t = t + (i,) over N steps = N*(N-1)/2 =", N * (N - 1) // 2)
data["concat"] = {"N": N, "pointers_copied": N * (N - 1) // 2}

# E. Hashing
print("\n[E] hashing")
print("hash((1, 'a')) is int:", isinstance(hash((1, "a")), int))
print("{(1, 'a'): 'ok'}[(1, 'a')] =", {(1, "a"): "ok"}[(1, "a")])
for expr in ["hash((1, [2]))", "{(1, [2]): 0}"]:
    try:
        eval(expr)
    except TypeError as e:
        print(expr, "->", type(e).__name__, e)

# F. Shallow immutability
print("\n[F] shallow immutability")
t = ([], 1)
t[0].append(9)
print("after t[0].append(9):", t)
for stmt in ["t[0] = []", "t[1] = 2"]:
    try:
        exec(stmt)
    except TypeError as e:
        print(stmt, "->", type(e).__name__, e)

# G. Bytecode (3.12)
print("\n[G] bytecode")
def f_tuple():
    return (1, 2, 3)
def f_list():
    return [1, 2, 3]
dis.dis(f_tuple)
dis.dis(f_list)
print("f_tuple.__code__.co_consts:", f_tuple.__code__.co_consts)

# H. GC tracking
print("\n[H] gc")
a = (1, 2)
b = ([],)
gc.collect()
print("gc.is_tracked((1, 2)) after gc.collect():", gc.is_tracked(a))
print("gc.is_tracked(([],)) after gc.collect():", gc.is_tracked(b))
print("gc.is_tracked([1, 2]):", gc.is_tracked([1, 2]))

with open(os.path.join(HERE, "5.1_data.json"), "w") as fh:
    json.dump(data, fh, indent=1)
