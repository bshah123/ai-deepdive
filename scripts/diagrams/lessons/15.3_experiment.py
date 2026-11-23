# Experiment for lesson 15.3 (Universal functions). Produces every number used in the lesson and its diagrams.
# Run: <venv>/bin/python scripts/diagrams/lessons/15.3_experiment.py   (writes 15.3_data.json next to this file)
# Timings are hardware-dependent: they are a measurement on the machine that ran this script, not a benchmark.
import json, pathlib, platform, statistics, timeit
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
out = {"numpy_version": np.__version__, "machine": platform.machine(), "python": platform.python_version()}

# 1. Worked example: the same three ufuncs as the lesson, int32 inputs.
a = np.array([1, 2, 3, 4, 5], dtype=np.int32)
b = np.array([6, 7, 8, 9, 10], dtype=np.int32)
out["worked"] = {
    "a": a.tolist(), "b": b.tolist(),
    "add": np.add(a, b).tolist(),
    "multiply": np.multiply(a, b).tolist(),
    "subtract": np.subtract(a, b).tolist(),
    "power": np.power(a, b).tolist(),
    "add_dtype": str(np.add(a, b).dtype),
    "power_dtype": str(np.power(a, b).dtype),
}

# 2. Type resolution: the loop chosen depends on the input dtypes, not on the operator.
pairs = {
    "int32 + int32": (np.int32, np.int32, np.add),
    "int32 / int32": (np.int32, np.int32, np.divide),
    "int32 + float64": (np.int32, np.float64, np.add),
    "float32 + float64": (np.float32, np.float64, np.add),
}
res = {}
for label, (t1, t2, uf) in pairs.items():
    x = np.array([1], dtype=t1); y = np.array([2], dtype=t2)
    r = uf(x, y)
    res[label] = {"result_dtype": str(r.dtype), "value": r.tolist()}
out["type_resolution"] = res
out["divide_types_count"] = len(np.divide.types)
out["add_types_count"] = len(np.add.types)
out["add_types_first"] = np.add.types[:6]
out["ufunc_attrs"] = {"nin": np.add.nin, "nout": np.add.nout, "nargs": np.add.nargs, "identity": str(np.add.identity)}

# 3. Silent integer overflow: int32 wraps modulo 2**32, no error.
big = np.array([100000], dtype=np.int32)
ov = np.multiply(big, big)
out["overflow"] = {"exact": 100000 * 100000, "int32_result": int(ov[0]),
                   "mod_2_32": (100000 * 100000) % 2**32, "wrapped_to_signed": int(ov[0]) - (2**32 if ov[0] >= 2**31 else 0)}

# 4. Negative integer power is an error, not a float.
try:
    np.power(np.array([2, 3], dtype=np.int64), -1)
    out["neg_int_power"] = "no error"
except ValueError as e:
    out["neg_int_power"] = str(e)

# 5. Python int scalar with small integer array (NEP 50 promotion in NumPy 2).
try:
    r = np.add(np.array([100], dtype=np.int8), 1000)
    out["int8_plus_1000"] = {"ok": True, "value": r.tolist(), "dtype": str(r.dtype)}
except Exception as e:
    out["int8_plus_1000"] = {"ok": False, "error": type(e).__name__ + ": " + str(e)}

# 6. out= writes into an existing array (no new allocation); where= leaves masked entries alone.
c = np.array([1.0, 2.0, 3.0]); d = np.array([10.0, 20.0, 30.0])
ret = np.add(c, d, out=c)
out["out_inplace"] = {"c": c.tolist(), "same_object": ret is c, "shares_memory": bool(np.shares_memory(ret, c))}
num = np.array([4.0, 0.0, 9.0]); den = np.array([2.0, 0.0, 3.0])
safe = np.divide(num, den, out=np.zeros_like(num), where=den != 0)
out["where_mask"] = safe.tolist()

# 7. Methods on a ufunc: reduce, accumulate, outer, at.
v = np.array([1, 2, 3, 4, 5])
out["methods"] = {
    "reduce_add": int(np.add.reduce(v)),
    "accumulate_add": np.add.accumulate(v).tolist(),
    "outer_mul_shape": list(np.multiply.outer(np.array([1, 2, 3]), np.array([10, 20])).shape),
    "outer_mul": np.multiply.outer(np.array([1, 2, 3]), np.array([10, 20])).tolist(),
}
idx = np.array([0, 0, 2])
z1 = np.zeros(3, dtype=np.int64); z1[idx] += 1          # fancy-index augmented assignment: buffered
z2 = np.zeros(3, dtype=np.int64); np.add.at(z2, idx, 1)  # ufunc.at: unbuffered, repeats accumulate
out["repeated_index"] = {"plus_equal": z1.tolist(), "ufunc_at": z2.tolist()}

# 8. Overhead versus a Python loop, measured. Median of 5 repeats of the best-of-n timing.
def med(fn, number):
    runs = timeit.repeat(fn, number=number, repeat=5)
    return statistics.median(runs) / number  # seconds per call

timings = {}
for n in (10, 1_000, 1_000_000):
    x = np.random.default_rng(0).random(n)
    y = np.random.default_rng(1).random(n)
    xl, yl = x.tolist(), y.tolist()
    def py_loop():
        s = [0.0] * n
        for i in range(n):
            s[i] = xl[i] + yl[i]
        return s
    def ufunc():
        return np.add(x, y)
    number = max(1, 2_000_000 // n) if n < 1_000_000 else 5
    tp = med(py_loop, number); tu = med(ufunc, number)
    timings[str(n)] = {"python_loop_s": tp, "ufunc_s": tu, "ratio_loop_over_ufunc": tp / tu}
out["timings"] = timings
out["timing_note"] = "median of 5 repeats; one machine; Python loop builds a list; ufunc returns a new array"

(HERE / "15.3_data.json").write_text(json.dumps(out, indent=2))
print(json.dumps(out, indent=2))
