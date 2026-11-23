## Chapter 17 Summary: PyTorch Fundamentals

### What you learned

A PyTorch tensor is a small metadata record (sizes, strides, storage offset, dtype and device) that points at a reference-counted storage buffer, so several tensors can share one set of numbers. Slices, transposes and `view` change only the metadata, and the byte address of any element follows from its strides and offset; NumPy reports strides in bytes and PyTorch in elements. Moving data to a GPU is a separate cost: a copy from pageable host memory is staged through a driver-made pinned buffer, pinned memory allows `non_blocking=True` copies, and two streams with two buffers overlap copies with kernels. The timeline model in lesson 17.2 gives 185.67 ms for eight batches against 461.33 ms for the serial pageable case, with the bandwidths and kernel time assumed there. Finally, in-place operations (a trailing underscore, or `+=`) write into the buffer a name already owns, so other names see the change. Autograd keeps a version counter and raises an error when an in-place write would corrupt a value saved for backward, and `.data` bypasses that check.

### Key ideas

- A tensor is metadata (sizes, strides, storage offset, dtype, device) that points at a storage buffer.
- Element (i, j) of a strided tensor sits at byte offset itemsize times (offset + s0·i + s1·j).
- Slices, `transpose`, `t` and `view` return views that share memory; `view` fails when the strides cannot describe the new shape.
- `torch.as_tensor` shares memory with a NumPy array when dtype and device match; `torch.tensor` copies.
- Pageable copies are staged through a pinned buffer; pinned memory lets `non_blocking=True` copies run asynchronously.
- Overlap needs both separate streams and a second buffer, because with one buffer each copy waits for the previous kernel.
- Timing a non-blocking copy needs a wait for it to finish, or the clock measures only the time to queue the call.
- `x = x + 1` rebinds the name and leaves other names unchanged; `x += 1` and `x.add_(1)` write into the shared buffer.
- A view and its base share one version counter; every in-place write increments it.
- Autograd saves some outputs for backward (sigmoid saves its output), so an in-place write to them raises a RuntimeError.
- `.data` hides writes from autograd and can return a wrong gradient without an error.

### Before moving on

- □ I can compute the strides, storage offset and byte address of an element of a sliced or transposed tensor.
- □ I can predict whether two tensors share memory after assignment, slicing, `clone()` or `torch.as_tensor`.
- □ I can explain why `xt.view(6)` fails for a transposed tensor and what `reshape` may return instead.
- □ I can compute the total time of a copy-and-compute loop with one or two buffers from the copy and kernel times.
- □ I can explain why `non_blocking=True` needs pinned memory, and why a timer must wait for the copy to finish.
- □ I can rewrite an in-place update that breaks autograd as an out-of-place one.
- □ I can explain what `.data` does and why it is unsafe when gradients matter.
