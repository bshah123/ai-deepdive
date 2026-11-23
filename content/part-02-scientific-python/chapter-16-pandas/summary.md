## Chapter 16 Summary — Pandas DataFrames

### What you learned

A pandas DataFrame stores its columns in blocks of one dtype each, and its memory cost depends on those blocks, on string storage and on copy-on-write. You learned how Arrow stores strings, how categoricals and downcasting shrink a frame, and why the GIL limits threads. You also saw the buffer protocol that lets libraries share memory without copying.

### Key ideas

- A DataFrame stores columns in blocks: each block is one two-dimensional NumPy array holding columns of one dtype.
- A numeric column is a contiguous run of bytes in its block, so selecting it is a view.
- Since pandas 3.0, copy-on-write is always on: a write through a derived object does not reach the parent.
- Repeated column inserts create one block each; past 100 NumPy blocks pandas warns, and `copy()` merges them.
- An Arrow string array is three flat buffers: validity bits, offsets and data bytes.
- The default constructor and `to_pandas()` copy; `split_blocks=True` avoids the copy for numeric columns.
- Object dtype costs about 58 bytes per string in our run; Arrow costs 13 for the same values.
- `memory_usage(deep=True)` is needed to count string columns properly.
- A categorical stores each distinct value once plus a small integer code per row; it pays off when distinct values are few.
- Downcasting shrinks numeric columns, but float32 keeps only about seven significant digits.
- The GIL lets one thread run bytecode at a time; the free-threaded build (PEP 703) removes it. Measured: 3.07× speed-up on four tasks with the GIL off, and about 5% single-thread cost.
- The buffer protocol exposes memory through `Py_buffer`; `memoryview` slices share memory, while `bytes()` and `tobytes()` copy.

### Before moving on

- □ I can explain why a DataFrame column selection is a view and when a write reaches the parent.
- □ I can measure a frame's memory with `deep=True` and find the expensive columns.
- □ I can choose categoricals and downcasting for a given column.
- □ I can say which pandas and Arrow calls copy and which share memory.
- □ I can explain why threads need a lock for `counter += 1` without the GIL.
- □ I can use `memoryview` to read a buffer without a copy.
