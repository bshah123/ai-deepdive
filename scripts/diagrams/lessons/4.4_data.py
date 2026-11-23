"""Experiment script for lesson 4.4 (slicing, copies, itertools). Prints every number the lesson uses.

Run: <python> scripts/diagrams/lessons/4.4_data.py   (CPython 3.12, 64-bit; byte counts depend on the build)
"""
import copy, gc, itertools, json, sys, tracemalloc
from itertools import batched, chain, count, groupby, islice

R = {"python": sys.version.split()[0]}

# 1. Slices share element objects
a = [10, 20, 30, 40, 50, 60]
b = a[1:5:2]
R["slice_values"] = b
R["slice_shares_objects"] = [a[1] is b[0], a[3] is b[1]]
R["slice_is_new_list"] = b is not a
R["slice_indices_6"] = slice(1, 5, 2).indices(6)
R["oob_slice"] = a[10:20]
R["neg_slice"] = a[-2:]
R["reverse"] = a[::-1]
c = list(range(6)); c[1:4] = ["x"]
R["slice_assign_shrinks"] = c

# 2. Shallow vs deep on a nested list
n = [[1, 2], [3]]
s = n[:]
d = copy.deepcopy(n)
n[0].append(99)
n.append([7])
R["nested_original"] = n
R["nested_shallow"] = s
R["nested_deep"] = d
R["shallow_inner_same"] = s[0] is n[0]
R["deep_inner_same"] = d[0] is n[0]

# 3. Aliasing trap
g = [[0] * 3] * 3
g[0][0] = 1
R["aliased_grid"] = g
R["aliased_same_row"] = g[0] is g[2]

# 4. Container sizes (64-bit CPython): 56-byte header + 8 bytes per slot
N = 10**6
big = list(range(N))
R["getsizeof_empty_list"] = sys.getsizeof([])
R["getsizeof_slot_model_1e6"] = 56 + 8 * N
R["getsizeof_slice_1e6"] = sys.getsizeof(big[:])

# 5. Traced allocation: shallow slice vs deepcopy vs list materialisation
def traced(fn):
    gc.collect(); tracemalloc.start(); m0 = tracemalloc.get_traced_memory()[0]
    out = fn(); m1 = tracemalloc.get_traced_memory()[0]
    tracemalloc.stop(); return out, m1 - m0

_, R["bytes_flat_slice_1e6"] = traced(lambda: big[:])
nested = [[i] for i in range(100_000)]
_, R["bytes_shallow_nested_1e5"] = traced(lambda: nested[:])
_, R["bytes_deep_nested_1e5"] = traced(lambda: copy.deepcopy(nested))
_, R["bytes_materialise_range_1e6"] = traced(lambda: list(range(N)))
_, R["bytes_lazy_islice_1e6"] = traced(lambda: islice(count(), N))

# 6. islice pulls only what it needs
pulled = []
def source():
    for i in range(100):
        pulled.append(i)
        yield i
R["islice_3_6_out"] = list(islice(source(), 3, 6))
R["islice_3_6_pulled"] = len(pulled)

# 7. chain, batched, groupby (adjacent runs only)
R["chain"] = list(chain([1, 2, 3, 4, 5], [1, 4, 9, 16, 25]))
R["batched_7_3"] = list(batched(range(7), 3))
s_ = "aabbaca"
R["groupby_unsorted"] = [(k, len(list(v))) for k, v in groupby(s_)]
R["groupby_sorted"] = [(k, len(list(v))) for k, v in groupby(sorted(s_))]

# 8. Slicing a generator is an error
try:
    gen = (x for x in range(5)); gen[1:3]
    R["gen_slice"] = "no error"
except TypeError as e:
    R["gen_slice"] = str(e)

# 9. NumPy: basic slice is a view, fancy index is a copy
import numpy as np
arr = np.arange(10)
v = arr[2:7:2]; f = arr[[2, 4, 6]]
R["np_view_shares"] = bool(np.shares_memory(v, arr))
R["np_fancy_shares"] = bool(np.shares_memory(f, arr))
R["np_version"] = np.__version__
v[0] = 99
R["np_after_write"] = arr.tolist()

print(json.dumps(R, indent=1, default=str))
