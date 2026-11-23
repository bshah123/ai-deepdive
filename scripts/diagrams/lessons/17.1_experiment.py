"""Experiment for lesson 17.1: what shares memory with what in PyTorch.

Run: $PY scripts/diagrams/lessons/17.1_experiment.py > scripts/diagrams/lessons/17.1_data.json
Every number used in the lesson text and diagrams comes from this output.
"""
import json
import warnings

import numpy as np
import torch

warnings.simplefilter("error")  # fail loudly if an API we rely on warns (e.g. TypedStorage)

out = {}
out["versions"] = {"torch": torch.__version__, "numpy": np.__version__}

# --- 1. as_tensor shares memory with the NumPy array --------------------------
a = np.array([[1, 2, 3], [4, 5, 6]], dtype=np.float32)
t = torch.as_tensor(a)
out["as_tensor"] = {
    "shape": list(t.shape),
    "stride": list(t.stride()),
    "storage_offset": t.storage_offset(),
    "dtype": str(t.dtype),
    "itemsize": t.element_size(),
    "np_ptr_equals_tensor_ptr": a.ctypes.data == t.data_ptr(),
    "storage_ptr_equals_tensor_ptr": t.untyped_storage().data_ptr() == t.data_ptr(),
    "storage_nbytes": t.untyped_storage().nbytes(),
    "np_shares_memory_with_tensor": bool(np.shares_memory(a, t.numpy())),
}

# --- 2. view(6) reuses the storage; write through view is seen by tensor -------
v = t.view(6)
out["view"] = {
    "shape": list(v.shape),
    "stride": list(v.stride()),
    "storage_offset": v.storage_offset(),
    "same_storage_ptr": v.untyped_storage().data_ptr() == t.untyped_storage().data_ptr(),
    "same_data_ptr": v.data_ptr() == t.data_ptr(),
    "base_is_tensor": v._base is t,
}
before_t = t.clone()
v[0] = 10
out["view_write"] = {
    "a_after": a.reshape(-1).tolist(),          # NumPy array also changed: same buffer
    "tensor_after": t.reshape(-1).tolist(),
    "view_after": v.tolist(),
    "tensor_before": before_t.reshape(-1).tolist(),
}

# --- 3. transpose: same storage, different strides, no copy ---------------------
x = torch.arange(6, dtype=torch.float32).reshape(2, 3)
xt = x.t()
out["transpose"] = {
    "x_shape": list(x.shape), "x_stride": list(x.stride()),
    "xt_shape": list(xt.shape), "xt_stride": list(xt.stride()),
    "xt_is_contiguous": xt.is_contiguous(),
    "same_storage_ptr": xt.untyped_storage().data_ptr() == x.untyped_storage().data_ptr(),
    "x_values": x.tolist(),
    "xt_values": xt.tolist(),
    "xt_byte_offset": (xt.storage_offset() + 2 * xt.stride()[0] + 1 * xt.stride()[1]) * xt.element_size(),
    # element xt[2, 1] = x[1, 2]: address index = offset + 2*stride0 + 1*stride1
    "xt_21_index": 2 * xt.stride()[0] + 1 * xt.stride()[1],
    "xt_21_value": xt[2, 1].item(),
    "xt_contig_is_copy": xt.contiguous().untyped_storage().data_ptr() != x.untyped_storage().data_ptr(),
}

# --- 4. slicing gives a non-zero storage offset -------------------------------
s = torch.arange(12, dtype=torch.float32).reshape(3, 4)
col = s[:, 1:3]
out["slice"] = {
    "shape": list(col.shape), "stride": list(col.stride()),
    "storage_offset": col.storage_offset(),
    "data_ptr_minus_storage": col.data_ptr() - s.untyped_storage().data_ptr(),
    "itemsize": s.element_size(),
    "same_storage_ptr": col.untyped_storage().data_ptr() == s.untyped_storage().data_ptr(),
    "row1_values": col[1].tolist(),
    "col_values": col.tolist(),
    "s_values": s.reshape(-1).tolist(),
}

# --- 5. torch.tensor copies; .numpy() shares; clone copies --------------------
c = torch.tensor(a)
out["copies"] = {
    "torch_tensor_shares": c.untyped_storage().data_ptr() == a.ctypes.data,
    "torch_tensor_shares_with_as_tensor": c.untyped_storage().data_ptr() == t.untyped_storage().data_ptr(),
    "numpy_view_of_tensor_shares": t.numpy().ctypes.data == t.data_ptr(),
    "clone_shares": t.clone().untyped_storage().data_ptr() == t.untyped_storage().data_ptr(),
}
c[0, 0] = -1.0
out["copies"]["a_after_copy_write"] = a[0, 0].item()   # unchanged, c was a copy

print(json.dumps(out, indent=1, default=str))
