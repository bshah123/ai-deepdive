# Experiment for lesson 15.4 (views vs copies, slicing, advanced indexing).
# Run: <python> scripts/diagrams/lessons/15.4_experiment.py
# Writes every number used in the lesson and its diagrams to 15.4_data.json.
import json, sys, tracemalloc
import numpy as np

out = {"numpy": np.__version__, "python": sys.version.split()[0]}

# ---- A. Small array: which operations share memory? ---------------------
a = np.array([1, 2, 3, 4, 5])
out["a_dtype"] = str(a.dtype)
out["a_itemsize"] = a.itemsize
out["a_strides"] = list(a.strides)

def ptr(x):
    return x.__array_interface__["data"][0]

out["offset_bytes_view_1_4"] = ptr(a[1:4]) - ptr(a)
out["slice_1_4"] = {"shape": list(a[1:4].shape), "strides": list(a[1:4].strides),
                    "base_is_a": a[1:4].base is a, "owndata": bool(a[1:4].flags.owndata)}
out["step2_strides"] = list(a[::2].strides)
out["step2_values"] = a[::2].tolist()
out["step2_offset_bytes"] = ptr(a[::2]) - ptr(a)

idx = np.array([0, 2, 4])
out["fancy_idx_values"] = a[idx].tolist()
out["fancy_base_is_none"] = a[idx].base is None
out["fancy_owndata"] = bool(a[idx].flags.owndata)
out["fancy_may_share"] = bool(np.may_share_memory(a[idx], a))

mask = a > 2
out["mask_values"] = a[mask].tolist()
out["mask_base_is_none"] = a[mask].base is None

out["scalar_type"] = type(a[2]).__name__
out["scalar_is_ndarray"] = isinstance(a[2], np.ndarray)
out["single_slice_type"] = type(a[2:3]).__name__
out["view_of_view_base_is_a"] = (a[1:4][1:]).base is a

out["may_share_even_odd_slices"] = bool(np.may_share_memory(a[::2], a[1::2]))
out["shares_even_odd_slices"] = bool(np.shares_memory(a[::2], a[1::2]))
out["shares_overlap_1_4_0_2"] = bool(np.shares_memory(a[1:4], a[0:2]))

# ---- B. The trap: in-place vs rebinding, and mutation through views -----
t = np.array([1, 2, 3, 4, 5])
m = t > 2
b = t[m]
b += 10
out["trap_copy_then_inplace_a"] = t.tolist()
out["trap_copy_then_inplace_b"] = b.tolist()

t2 = np.array([1, 2, 3, 4, 5])
t2[t2 > 2] += 10
out["trap_setitem_a"] = t2.tolist()

t3 = np.array([1, 2, 3, 4, 5])
v3 = t3[1:4]
v3 = v3 * 2          # rebinding: new array, t3 untouched
out["trap_rebind_a"] = t3.tolist()
t4 = np.array([1, 2, 3, 4, 5])
v4 = t4[1:4]
v4 *= 2              # in place: writes through the view
out["trap_inplace_view_a"] = t4.tolist()

# ---- C. Strides and transposes (2-D) -----------------------------------
x = np.arange(12, dtype=np.int64).reshape(3, 4)
out["x_strides"] = list(x.strides)
out["x_col1_strides"] = list(x[:, 1].strides)
out["x_row1_strides"] = list(x[1].strides)
out["x_T_strides"] = list(x.T.strides)
out["x_T_c_contig"] = bool(x.T.flags["C_CONTIGUOUS"])
out["x_T_f_contig"] = bool(x.T.flags["F_CONTIGUOUS"])
out["x_T_base_is_x"] = x.T.base is x

# ---- D. Memory: tracemalloc peak bytes per operation, 1e6 float64 -------
n = 1_000_000
big = np.arange(n, dtype=np.float64)           # 8 MB
idx_big = np.arange(0, n, 2)                   # 500 000 integer indices, made outside the measurement
mask_big = (np.arange(n) % 2) == 0             # 500 000 True, made outside the measurement
out["big_nbytes"] = int(big.nbytes)

ops = [
    ("basic slice big[1:-1]",            lambda: big[1:-1]),
    ("step slice big[::2]",              lambda: big[::2]),
    ("reshape(1000, 1000)",              lambda: big.reshape(1000, 1000)),
    ("transpose of reshape",             lambda: big.reshape(1000, 1000).T),
    ("ravel() of contiguous",            lambda: big.ravel()),
    ("integer array big[idx]",           lambda: big[idx_big]),
    ("boolean mask big[mask]",           lambda: big[mask_big]),
    ("big.copy()",                       lambda: big.copy()),
    ("flatten()",                        lambda: big.reshape(1000, 1000).flatten()),
    ("reshape(-1) of transposed",        lambda: big.reshape(1000, 1000).T.reshape(-1)),
]
mem = []
for label, fn in ops:
    tracemalloc.start()
    r = fn()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    mem.append({"op": label, "peak_bytes": int(peak),
                "is_view": bool(np.may_share_memory(r, big)),
                "owndata": bool(r.flags.owndata),
                "shape": list(r.shape)})
out["memory"] = mem

with open(__file__.replace(".py", "_data.json"), "w") as f:
    json.dump(out, f, indent=1)
print(json.dumps(out, indent=1))
