## Chapter 15 Summary — NumPy Internals

### What you learned

A NumPy array is a block of bytes plus metadata: shape, dtype and strides. Strides decide where each element sits, which tells you when an operation is a view (no copy) and when it is a copy. You also learned broadcasting, ufuncs and the rules for views versus copies.

### Key ideas

- Strides give the bytes to step along each axis; an element's offset is its index dotted with the strides.
- C order (NumPy's default) varies the last index fastest; Fortran order varies the first index fastest.
- Transposing and basic slicing return views with new strides; `reshape` and `ravel` copy when the strides cannot describe the result.
- NumPy compares shapes from the right; sizes are compatible when equal or when one is 1.
- Broadcasting does not copy the inputs, but the output is a new array of the full size.
- Shape mistakes such as `(n,)` against `(n, 1)` can give silent wrong results. Check shapes before trusting a result.
- A ufunc is a vectorised wrapper over a compiled loop; the loop is chosen from the input dtypes.
- Integer results wrap silently at the dtype's limits; `/` on integers returns `float64`.
- Basic indexing returns a view; advanced indexing (integer arrays, boolean masks) returns a copy; `flatten` always copies.
- Measure before optimising: `tracemalloc` and `np.may_share_memory` show what really happened.

### Before moving on

- □ I can compute an element's byte offset from its index and the strides.
- □ I can say whether a given operation returns a view or a copy, and check it.
- □ I can predict whether two shapes broadcast, and what the result shape is.
- □ I can explain why `(n,)` minus `(n, 1)` is a silent bug.
- □ I can pick `out=` or `where=` when a ufunc would otherwise allocate.
