"""Experiment for lesson 10.2 (MRO and C3 linearization). Stdlib only.

Run: python3 scripts/diagrams/lessons/10.2_data.py
Every number used in the lesson and in 10.2.mjs comes from this output.
"""
import random
import sys

print("python", sys.version.split()[0])


def names(seq):
    return [c.__name__ for c in seq]


def c3(cls, L, trace=None):
    """L[cls] = [cls] + merge(L[B1], ..., L[Bn], [B1, ..., Bn])."""
    return [cls] + c3_bases(cls.__bases__, L, trace)


def dfs_order(cls):
    """Naive depth-first, left-to-right, keep first occurrence (the pre-2.3 rule)."""
    out = [cls]
    for b in cls.__bases__:
        out += dfs_order(b)
    seen, res = set(), []
    for x in out:
        if x not in seen:
            seen.add(x)
            res.append(x)
    return res


def c3_bases(bases, L, trace=None):
    """C3 merge: merge(L[B1], ..., L[Bn], [B1, ..., Bn]). L maps each already-created
    class to its MRO list. Raises TypeError if no head is acceptable at some step."""
    seqs = [list(L[b]) for b in bases] + [list(bases)]
    result = []
    step = 0
    while True:
        seqs = [s for s in seqs if s]
        if not seqs:
            return result
        for s in seqs:
            head = s[0]
            if not any(head in t[1:] for t in seqs):   # head must not be in any tail
                break
        else:
            raise TypeError("C3: no consistent head")
        step += 1
        if trace is not None:
            trace.append((step, [names(s) for s in seqs], head.__name__))
        result.append(head)
        for s in seqs:
            if s[0] is head:
                del s[0]


# ---------------------------------------------------------------- 1. the diamond
class A:
    def show(self):
        return "A.show"

class B(A):
    pass

class C(A):
    def show(self):
        return "C.show"

class D(B, C):
    pass

print("\n== 1. diamond: class D(B, C); B(A); C(A) with C overriding show")
print("D.__mro__        :", names(D.__mro__))
print("naive DFS order  :", names(dfs_order(D)))
print("D().show()       :", D().show())
print("naive would pick :", next(c for c in dfs_order(D) if "show" in c.__dict__).__name__ + ".show")

# ---------------------------------------------------------------- 2. C3 trace
print("\n== 2. C3 merge trace for D(B, C)")
L = {object: [object], A: [A, object], B: [B, A, object], C: [C, A, object]}
trace = []
res = c3(D, L, trace)
for step, seqs, head in trace:
    print(f"step {step}: lists {seqs}  -> take {head}")
print("result           :", names(res))
print("equals __mro__   :", res == list(D.__mro__))

# ---------------------------------------------------------------- 3. order of bases matters
class D2(C, B):
    pass
print("\n== 3. swap bases: class D2(C, B)")
print("D2.__mro__       :", names(D2.__mro__))
print("D2().show()      :", D2().show())

# ---------------------------------------------------------------- 4. inconsistent bases
print("\n== 4. inconsistent: class X(A, B) where B subclasses A")
try:
    class X(A, B):
        pass
except TypeError as e:
    print("TypeError:", str(e).replace("\n", " "))

# ---------------------------------------------------------------- 5. super() follows the instance's MRO
class Base:
    def hello(self):
        return ["Base"]

class Left(Base):
    def hello(self):
        return ["Left"] + super().hello()

class Right(Base):
    def hello(self):
        return ["Right"] + super().hello()

class Bottom(Left, Right):
    def hello(self):
        return ["Bottom"] + super().hello()

print("\n== 5. super() in Left, when the instance is Bottom")
print("Bottom.__mro__   :", names(Bottom.__mro__))
print("Bottom().hello() :", Bottom().hello())
print("Left().hello()   :", Left().hello())

# ---------------------------------------------------------------- 6. random hierarchies
print("\n== 6. random hierarchies: my C3 against CPython's __mro__ (seed 10, 500 attempts)")


def is_subsequence(sub, seq):
    it = iter(seq)
    return all(x in it for x in sub)


rng = random.Random(10)
pool = []                       # classes CPython accepted
Lmap = {object: [object]}
accepted = rejected = 0
c3_agrees = 0                   # my C3 returned exactly CPython's __mro__
both_reject = 0                 # my C3 and CPython both refused the bases
naive_differs = 0
monotone_ok = local_ok = 0
mismatch = 0
for i in range(500):
    k = rng.choice([1, 2, 2, 3])
    bases = tuple(rng.sample(pool, min(k, len(pool)))) or (object,)
    try:
        my_tail = c3_bases(bases, Lmap)
        my_ok = True
    except TypeError:
        my_ok = False
    ns = {"show": (lambda tag: (lambda self: tag))(f"K{i}.show")} if rng.random() < 0.3 else {}
    try:
        cls = type(f"K{i}", bases, ns)
    except TypeError:
        cls = None
    if cls is None:
        rejected += 1
        if my_ok:
            mismatch += 1       # CPython refused what C3 accepts: a bug somewhere
        else:
            both_reject += 1
        continue
    accepted += 1
    if not my_ok:
        mismatch += 1           # C3 refused what CPython accepted: a bug somewhere
        continue
    if [cls] + my_tail == list(cls.__mro__):
        c3_agrees += 1
    else:
        mismatch += 1
    Lmap[cls] = list(cls.__mro__)
    pool.append(cls)
    if [c.__name__ for c in dfs_order(cls)] != [c.__name__ for c in cls.__mro__]:
        naive_differs += 1
    m = list(cls.__mro__)
    if all(is_subsequence(list(b.__mro__), m) for b in cls.__bases__):
        monotone_ok += 1
    if [m.index(b) for b in cls.__bases__] == sorted(m.index(b) for b in cls.__bases__):
        local_ok += 1

print("attempts                       :", 500)
print("accepted by CPython            :", accepted)
print("rejected by CPython            :", rejected, "(C3 also rejects:", both_reject, ")")
print("C3 == CPython __mro__          :", c3_agrees, "of", accepted)
print("naive DFS differs from C3      :", naive_differs, "of", accepted)
print("monotonicity holds             :", monotone_ok, "of", accepted)
print("local precedence holds         :", local_ok, "of", accepted)
print("unexplained mismatches         :", mismatch)
print("longest MRO among accepted     :", max(len(v) for v in Lmap.values()), "classes")
