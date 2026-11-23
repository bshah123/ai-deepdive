"""Experiment behind lesson 16.2 (Apache Arrow and pandas). Prints every number the lesson uses.

Run:  <python> scripts/diagrams/lessons/16.2_experiment.py > scripts/diagrams/lessons/16.2_data.txt
Versions when run: pandas 3.1.1, pyarrow 26.0.1, numpy 2.5.5 (Python 3.12).
Timings are deliberately not printed. Memory and file sizes are deterministic for fixed data.
"""
import os
import tempfile

import tracemalloc

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.ipc as ipc

print("versions pandas", pd.__version__, "pyarrow", pa.__version__, "numpy", np.__version__)

# E1. Zero-copy into Arrow: does pa.array() wrap the NumPy buffer?
a = np.arange(5, dtype=np.int64)
t = pa.array(a)
a[0] = 99
print("E1 pa.array(ndarray): arrow[0] after mutating the ndarray =", t[0].as_py())

# E2a. Does the pandas constructor copy the ndarray? Does Table.from_pandas?
x = np.arange(8, dtype=np.float64)
df_nocopy = pd.DataFrame({"x": x}, copy=False)
tab_nc = pa.Table.from_pandas(df_nocopy, preserve_index=False)
x[0] = -1.0
print("E2a pd.DataFrame(copy=False) -> Table.from_pandas: arrow[0] after mutating source =",
      tab_nc.column("x")[0].as_py())
x2 = np.arange(8, dtype=np.float64)
tab_def = pa.Table.from_pandas(pd.DataFrame({"x": x2}), preserve_index=False)
x2[0] = -1.0
print("E2a default pd.DataFrame -> Table.from_pandas: arrow[0] after mutating source =",
      tab_def.column("x")[0].as_py())

# E2b. Arrow -> pandas: does the float column reuse the Arrow buffer?
tab = pa.Table.from_pandas(pd.DataFrame({"x": np.arange(8, dtype=np.float64)}), preserve_index=False)
arrow_addr = tab.column("x").chunk(0).buffers()[1].address
back_split = tab.to_pandas(split_blocks=True)
print("E2b to_pandas(split_blocks=True): float column reuses Arrow buffer =",
      back_split["x"].to_numpy().ctypes.data == arrow_addr)
back_default = tab.to_pandas()
print("E2b to_pandas() default: float column reuses Arrow buffer =",
      back_default["x"].to_numpy().ctypes.data == arrow_addr)

# E3. Missing values: pandas int64 column with a null becomes float64 and loses precision
big = 2**53 + 1  # 9007199254740993: not exactly representable as float64
s_pd = pd.Series([big, None])
print("E3 pandas [int, None] -> dtype", s_pd.dtype, "| value", int(s_pd.iloc[0]),
      "| exact", int(s_pd.iloc[0]) == big)
ta = pa.array([big, None], type=pa.int64())
print("E3 arrow [int, null] -> type", ta.type, "| value", ta[0].as_py(),
      "| exact", ta[0].as_py() == big, "| null_count", ta.null_count)
print("E3 arrow buffers in bytes (validity, data) =", ta.buffers()[0].size, ta.buffers()[1].size)

# E4. Memory layout of one string column, 200,000 rows, 1,000 distinct values
N = 200_000
rng = np.random.default_rng(16)
cats = [f"user_{i:04d}" for i in range(1000)]
codes_n = rng.integers(0, 1000, N)
col = [f"user_{c:04d}" for c in codes_n]  # fresh str objects, one per row
df_obj = pd.DataFrame({"name": pd.Series(col, dtype=object)})
pa_str = pa.array(col, type=pa.string())
pa_large = pa.array(col, type=pa.large_string())
print("E4 object-dtype column, pandas deep bytes =", df_obj["name"].memory_usage(deep=True))
print("E4 Arrow string array, buffers (validity, offsets, data) in bytes =",
      [None if b is None else b.size for b in pa_str.buffers()], "total", pa_str.nbytes)
print("E4 Arrow large_string array, total bytes =", pa_large.nbytes)
arrow_from_obj = pa.Table.from_pandas(df_obj, preserve_index=False)
print("E4 Table.from_pandas(object column) -> type", arrow_from_obj.schema.field("name").type,
      "| nbytes", arrow_from_obj.nbytes)
df_default = pd.DataFrame({"name": col})
print("E4 pandas default string column -> dtype", df_default["name"].dtype,
      "| storage", type(df_default["name"].array).__name__,
      "| deep bytes", df_default["name"].memory_usage(deep=True))

with tempfile.TemporaryDirectory() as d:
    # E5. The same 1,000,000-row table written three ways
    M = 1_000_000
    r = np.random.default_rng(16)
    big_df = pd.DataFrame({
        "id": np.arange(M, dtype=np.int64),
        "value": r.random(M),
        "label": np.array(cats)[r.integers(0, 1000, M)],
    })
    csv_p = os.path.join(d, "t.csv")
    pq_p = os.path.join(d, "t.parquet")
    ar_p = os.path.join(d, "t.arrow")
    big_df.to_csv(csv_p, index=False)
    big_df.to_parquet(pq_p, index=False)
    tab_big = pa.Table.from_pandas(big_df, preserve_index=False)
    with pa.OSFile(ar_p, "wb") as sink:
        with ipc.new_file(sink, tab_big.schema) as w:
            w.write_table(tab_big)
    for name, p in [("csv", csv_p), ("parquet", pq_p), ("arrow_ipc", ar_p)]:
        print(f"E5 file size {name} = {os.path.getsize(p) / 1e6:.2f} MB")
    print("E5 in-memory Arrow table nbytes = %.2f MB" % (tab_big.nbytes / 1e6))
    print("E5 in-memory pandas deep bytes = %.2f MB" % (big_df.memory_usage(deep=True).sum() / 1e6))

    # E6. Memory-mapped Arrow IPC vs a copying read: bytes taken from Arrow's memory pool
    before = pa.total_allocated_bytes()
    with pa.memory_map(ar_p, "r") as mm:
        tm = ipc.open_file(mm).read_all()
        print("E6 memory-mapped read: pool bytes allocated =", pa.total_allocated_bytes() - before,
              "| rows", tm.num_rows, "| sum(id) =", int(pc.sum(tm.column("id")).as_py()))
    before2 = pa.total_allocated_bytes()
    with pa.OSFile(ar_p, "rb") as f:
        tc = ipc.open_file(f).read_all()
        print("E6 copying read: pool bytes allocated =", pa.total_allocated_bytes() - before2,
              "| rows", tc.num_rows)

    # E7. pandas keeps Arrow types after reading Parquet with dtype_backend="pyarrow"
    back_pa = pd.read_parquet(pq_p, dtype_backend="pyarrow")
    print("E7 read_parquet(dtype_backend='pyarrow') dtypes =", {k: str(v) for k, v in back_pa.dtypes.items()})
    print("E7 pyarrow-backed deep bytes = %.2f MB" % (back_pa.memory_usage(deep=True).sum() / 1e6))

# E8. Worked example: the buffers of a 4-row string column with one null
w = pa.array(["ann", "bob", None, "cy"], type=pa.string())
validity_byte = w.buffers()[0].to_pybytes()[0]
print("E8 validity byte (LSB first, 1 = valid) =", validity_byte, "=", format(validity_byte, "04b")[::-1],
      "(slots 0..3, LSB first)")
print("E8 offsets (int32, length+1) =", np.frombuffer(w.buffers()[1], dtype=np.int32)[: len(w) + 1].tolist())
print("E8 data bytes =", w.buffers()[2].to_pybytes())
print("E8 null_count =", w.null_count, "| to_pylist =", w.to_pylist())

# E9. Real Python heap for the object column (fresh str objects), traced with tracemalloc
tracemalloc.start()
fresh = [f"user_{c:04d}" for c in codes_n]
heap_list, _ = tracemalloc.get_traced_memory()
s_obj = pd.Series(fresh, dtype=object)
heap_total, _ = tracemalloc.get_traced_memory()
tracemalloc.stop()
print("E9 tracemalloc: list of 200,000 str objects = %.2f MB" % (heap_list / 1e6))
print("E9 tracemalloc: plus pandas object Series = %.2f MB" % (heap_total / 1e6))
print("E9 pandas object column deep bytes, same data = %.2f MB" % (s_obj.memory_usage(deep=True) / 1e6))
pool0 = pa.total_allocated_bytes()
arr_from_list = pa.array(fresh, type=pa.string())
print("E9 Arrow string array allocated from pool = %.2f MB" % ((pa.total_allocated_bytes() - pool0) / 1e6))
