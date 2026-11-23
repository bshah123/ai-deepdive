# Experiment numbers for Lesson 11.3 (stdlib only). Run: python3 scripts/diagrams/lessons/11.3_data.py
import sys
import collections.abc as cabc

print("python", sys.version.split()[0])


class Counted:
    """Only __len__ and __getitem__: the old sequence iteration protocol applies."""
    def __init__(self, data):
        self._data = list(data)
        self.calls = []

    def __len__(self):
        return len(self._data)

    def __getitem__(self, i):
        self.calls.append(i)
        return self._data[i]          # IndexError past the end


def traced(seq, action):
    seq.calls.clear()
    out = action()
    return out, list(seq.calls)


s = Counted([10, 20, 30, 40, 50])
print("len(s) =", len(s), " bool(s) =", bool(s), " bool(Counted([])) =", bool(Counted([])))

print("\n-- iteration and membership, call trace --")
_, c = traced(s, lambda: list(s))
print("list(s)          calls:", len(c), c)
for target in (10, 30, 50, 99):
    found, c = traced(s, lambda: target in s)
    print(f"{target:>3} in s         ->", found, " calls:", len(c), c)
_, c = traced(s, lambda: list(reversed(s)))
print("list(reversed(s)) calls:", len(c), c)
big = Counted(range(1000))
_, c = traced(big, lambda: 999 in big)
print("999 in big(1000) calls:", len(c))
_, c = traced(big, lambda: 5000 in big)
print("5000 in big(1000) calls:", len(c))

print("\n-- slices reach __getitem__ as slice objects --")
r, c = traced(s, lambda: s[1:4])
print("s[1:4] arg:", c, " result:", r, " type:", type(r).__name__)
print("slice(None,None,-1).indices(5) =", slice(None, None, -1).indices(5))
print("slice(-2,None).indices(5)      =", slice(-2, None).indices(5))

print("\n-- trap: __getitem__ raising KeyError breaks the fallback --")
class DictLike:
    def __init__(self):
        self._d = {0: "a", 1: "b"}
    def __len__(self):
        return 2
    def __getitem__(self, k):
        return self._d[k]
try:
    list(DictLike())
except Exception as e:
    print("list(DictLike()) raised", type(e).__name__, "instead of stopping")

print("\n-- ABCs: which methods are free --")
class Plain:
    def __init__(self, data):
        self._data = list(data)
    def __len__(self):
        return len(self._data)
    def __getitem__(self, i):
        return self._data[i]

class SeqABC(cabc.Sequence):
    def __init__(self, data):
        self._data = list(data)
    def __len__(self):
        return len(self._data)
    def __getitem__(self, i):
        return self._data[i]

class MutABC(cabc.MutableSequence):
    def __init__(self, data):
        self._data = list(data)
    def __len__(self):
        return len(self._data)
    def __getitem__(self, i):
        return self._data[i]
    def __setitem__(self, i, v):
        self._data[i] = v
    def __delitem__(self, i):
        del self._data[i]
    def insert(self, i, v):
        self._data.insert(i, v)

print("isinstance(Plain, Sized)    =", isinstance(Plain([1]), cabc.Sized))
print("isinstance(Plain, Iterable) =", isinstance(Plain([1]), cabc.Iterable), " iter() works:", next(iter(Plain([1]))))
print("isinstance(Plain, Sequence) =", isinstance(Plain([1]), cabc.Sequence))
print("isinstance(SeqABC, Sequence)=", isinstance(SeqABC([1]), cabc.Sequence))
print("Sequence mixins inherited:", [m for m in ("__contains__", "__iter__", "__reversed__", "index", "count") if m not in SeqABC.__dict__])
print("MutableSequence mixins inherited:", [m for m in ("append", "extend", "pop", "remove", "reverse", "__iadd__") if m not in MutABC.__dict__])
print("Plain has index?", hasattr(Plain([1]), "index"))
x = SeqABC([3, 1, 4, 1, 5])
print("SeqABC: index(4) =", x.index(4), " count(1) =", x.count(1))
m = MutABC([1, 2])
m.append(3)
m += [4]
popped = m.pop()
m.reverse()
print("MutABC: popped", popped, "then data", m._data)

print("\n-- protocol validation --")
class BadLen:
    def __len__(self):
        return 2.0
class NegLen:
    def __len__(self):
        return -1
for cls in (BadLen, NegLen):
    try:
        len(cls())
    except Exception as e:
        print(cls.__name__, "->", type(e).__name__ + ":", e)
