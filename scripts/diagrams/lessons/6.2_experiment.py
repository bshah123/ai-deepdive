"""Lesson 6.2 experiment: compact dict layout. CPython 3.12, 64-bit only.

Reads the dict's internal keys object with ctypes. Layout from CPython 3.12
Include/internal/pycore_dict.h (struct _dictkeysobject, PyDictKeyEntry,
PyDictUnicodeEntry, DKIX_EMPTY=-1, DKIX_DUMMY=-2) and PyDictObject (48 bytes:
ob_refcnt, ob_type, ma_used, _ma_watcher_tag, ma_keys, ma_values).
Field offsets are checked against sys.getsizeof and len() below; if they fail, stop.
Run: python 6.2_experiment.py   (writes 6.2_data.json next to this file)
"""
import ctypes as C
import json
import sys
from pathlib import Path

assert sys.version_info[:2] == (3, 12), f"needs CPython 3.12, got {sys.version}"
assert C.sizeof(C.c_void_p) == 8

OFF_USED, OFF_KEYS = 16, 32          # PyDictObject: ma_used, ma_keys
INT_OF = {1: C.c_int8, 2: C.c_int16, 4: C.c_int32, 8: C.c_int64}
DICT_KEYS_GENERAL, DICT_KEYS_UNICODE = 0, 1   # kind values, checked against entry sizes below


def keys_addr(d):
    return C.c_void_p.from_address(id(d) + OFF_KEYS).value


def info(d):
    k = keys_addr(d)
    log2 = C.c_uint8.from_address(k + 8).value
    log2ib = C.c_uint8.from_address(k + 9).value
    kind = C.c_uint8.from_address(k + 10).value
    usable = C.c_ssize_t.from_address(k + 16).value
    nent = C.c_ssize_t.from_address(k + 24).value
    size = 1 << log2
    index_total = 1 << log2ib              # bytes of the whole index table
    entry_bytes = 16 if kind == DICT_KEYS_UNICODE else 24
    assert C.c_ssize_t.from_address(id(d) + OFF_USED).value == len(d)
    return dict(dk_size=size, index_total=index_total, index_width=index_total // size,
                kind=kind, entry_bytes=entry_bytes, nentries=nent,
                capacity=usable + nent)     # capacity = usable_left + used entry slots


def index_array(d):
    i = info(d)
    T = INT_OF[i["index_width"]]
    base = keys_addr(d) + 32
    return [T.from_address(base + j * i["index_width"]).value for j in range(i["dk_size"])]


def entries(d):
    i = info(d)
    base = keys_addr(d) + 32 + i["index_total"]
    out = []
    for j in range(i["nentries"]):
        if i["kind"] == DICT_KEYS_UNICODE:
            key = C.c_void_p.from_address(base + j * 16).value
            val = C.c_void_p.from_address(base + j * 16 + 8).value
            h = None
        else:
            h = C.c_ssize_t.from_address(base + j * 24).value
            key = C.c_void_p.from_address(base + j * 24 + 8).value
            val = C.c_void_p.from_address(base + j * 24 + 16).value
        if key is None:
            out.append(dict(hole=True))
        else:
            out.append(dict(hash=h, key=repr(C.cast(C.c_void_p(key), C.py_object).value),
                            value=repr(C.cast(C.c_void_p(val), C.py_object).value)))
    return out


def getsizeof_formula(d):
    """Predicted sys.getsizeof for a non-empty dict: GC head 16 + PyDictObject 48
    + PyDictKeysObject header 32 + index table + entry_bytes * USABLE_FRACTION(dk_size)."""
    i = info(d)
    return 16 + 48 + 32 + i["index_total"] + i["entry_bytes"] * ((i["dk_size"] << 1) // 3)


out = {}

# ---- E1: worked example, int keys (hash(k) == k), first insert allocates size 8
d = {}
for k in [3, 11, 19, 5]:
    d[k] = k * 10
i = info(d)
out["worked"] = dict(keys=[3, 11, 19, 5], dk_size=i["dk_size"], index_width=i["index_width"],
                     index=index_array(d), entries=entries(d),
                     getsizeof=sys.getsizeof(d), formula=getsizeof_formula(d))
print("E1 worked example:", json.dumps(out["worked"]))

# ---- E2: str keys vs int keys at n = 1000 (entry size 16 vs 24)
s = {f"k{n}": n for n in range(1000)}
t = {n: n for n in range(1000)}
for name, dd in [("str", s), ("int", t)]:
    i = info(dd)
    assert sys.getsizeof(dd) == getsizeof_formula(dd), name
    print(f"E2 {name}-key n=1000: kind={i['kind']} entry_bytes={i['entry_bytes']} "
          f"dk_size={i['dk_size']} index_width={i['index_width']} capacity={i['capacity']} "
          f"getsizeof={sys.getsizeof(dd)}")
out["n1000"] = {nm: dict(**info(dd), getsizeof=sys.getsizeof(dd)) for nm, dd in [("str", s), ("int", t)]}

# ---- E3: growth transitions, int keys, up to 70000 inserts
g = {}
prev = None
transitions = []
for n in range(1, 70001):
    g[n] = n
    i = info(g)
    if i["dk_size"] != prev:
        prev = i["dk_size"]
        transitions.append(dict(len_after=n, dk_size=i["dk_size"], index_width=i["index_width"],
                                capacity=i["capacity"], getsizeof=sys.getsizeof(g)))
out["transitions"] = transitions
for t_ in transitions:
    print("E3 resize at len", t_["len_after"], t_)
ok = all(sys.getsizeof(g) == getsizeof_formula(g) for _ in [0])
print("E3 formula matches getsizeof at 70000:", ok, sys.getsizeof(g), getsizeof_formula(g))
assert ok
# Formula check at several sizes along the way
checks = []
for n in [5, 6, 10, 21, 43, 100, 1000, 5000, 40000]:
    dd = {x: x for x in range(n)}
    checks.append(dict(n=n, getsizeof=sys.getsizeof(dd), formula=getsizeof_formula(dd)))
    assert checks[-1]["getsizeof"] == checks[-1]["formula"], checks[-1]
out["formula_checks"] = checks
print("E3b formula checks all equal:", checks)

# ---- E4: deletion leaves holes; size does not shrink; copy() compacts
d = {i: i for i in range(1000)}
before = dict(len=len(d), nentries=info(d)["nentries"], getsizeof=sys.getsizeof(d), dk_size=info(d)["dk_size"])
for k in range(999):
    del d[k]
after = dict(len=len(d), nentries=info(d)["nentries"], getsizeof=sys.getsizeof(d), dk_size=info(d)["dk_size"],
             holes=sum(1 for e in entries(d) if e.get("hole")), live=list(d))
d[10**6] = 0
after_insert = dict(len=len(d), nentries=info(d)["nentries"], holes=sum(1 for e in entries(d) if e.get("hole")))
c = d.copy()
compact = dict(len=len(c), nentries=info(c)["nentries"], dk_size=info(c)["dk_size"], getsizeof=sys.getsizeof(c))
out["deletion"] = dict(before=before, after_deletes=after, after_insert=after_insert, copy=compact)
print("E4 deletion:", json.dumps(out["deletion"]))

# ---- E5: insertion order (guaranteed since 3.7) and counterfactual sizes
o = {"b": 1, "a": 2, "c": 3}
out["order"] = list(o)
print("E5 order:", list(o))
# Counterfactual, NOT Python 3.5: same dk_size, but every slot a full 24-byte (hash,key,value) entry
cf = []
for t_ in transitions[3:8]:
    cf.append(dict(dk_size=t_["dk_size"], dense_index_plus_entries=t_["getsizeof"],
                   full_slot_model=16 + 48 + 24 * t_["dk_size"]))
out["counterfactual"] = cf
print("E6 counterfactual:", cf)

# ---- E7: quiz case, key 27 added to a fresh copy of the worked-example table (probe sequence 3 -> 0 -> 1 -> 6)
q = {}
for k in [3, 11, 19, 5, 27]:
    q[k] = k * 10
out["quiz_27"] = dict(dk_size=info(q)["dk_size"], index=index_array(q),
                      entry_of_27=[e for e in entries(q) if e.get("key") == "27"])
print("E7 quiz 27:", json.dumps(out["quiz_27"]))

Path(__file__).with_name("6.2_data.json").write_text(json.dumps(out, indent=1))
print("wrote 6.2_data.json")
