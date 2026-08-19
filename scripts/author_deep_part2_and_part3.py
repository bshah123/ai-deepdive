import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# CHAPTER 15: NUMPY INTERNALS
# ==============================================================================

write_file("content/part-02-scientific-python/chapter-15-numpy-internals/15.3-numpy-ufuncs.md", """---
id: "15.3"
part: 2
chapter: 15
title: "Universal Functions (ufuncs) & Vectorized C Loops"
slug: "numpy-ufuncs"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["15.1", "15.2"]
tags: ["ufuncs", "vectorization", "simd", "c-extensions", "numpy"]
status: "published"
---

# Concept

A **Universal Function (ufunc)** is a C-level function in NumPy that operates on `ndarrays` in an element-by-element fashion. Ufuncs implement fast, compiled inner loops in C/Fortran that utilize **SIMD (Single Instruction, Multiple Data)** CPU vector registers (AVX-512, NEON), completely eliminating Python bytecode evaluation overhead.

```mermaid
flowchart LR
    PythonLoop["Python for loop:<br>for x in arr: sin(x)"] --> BytecodeEval["Python Bytecode Eval Loop<br>(LOAD_FAST, CALL_FUNCTION)<br>~100-200 CPU cycles per item"]
    NumPyUfunc["NumPy np.sin(arr)"] --> SIMDLoop["Compiled C Inner Loop<br>(AVX-512 Vector Registers)<br>~1-2 CPU cycles per 8 floats!"]
```

# Ufunc Methods: `reduce`, `accumulate`, `outer`, `at`

Every binary ufunc provides powerful reduction and aggregation methods:

```python
import numpy as np

arr = np.array([1, 2, 3, 4, 5])

# 1. reduce: Combines elements (Equivalent to sum or product)
print("np.add.reduce:      ", np.add.reduce(arr))       # 15
print("np.multiply.reduce: ", np.multiply.reduce(arr))  # 120 (Factorial!)

# 2. accumulate: Running prefix scan
print("np.add.accumulate:  ", np.add.accumulate(arr))   # [ 1,  3,  6, 10, 15]

# 3. outer: Outer product / pairwise computation
a = np.array([1, 2, 3])
b = np.array([10, 20, 30])
print("np.multiply.outer:\n", np.multiply.outer(a, b))

# 4. at: Unbuffered in-place scatter mutation (handles duplicate indices!)
counts = np.zeros(5, dtype=int)
np.add.at(counts, [1, 1, 2, 1, 4], 1)
print("Unbuffered scatter count:", counts)  # [0, 3, 1, 0, 1]
```

# Writing Custom Ufuncs with Numba `@vectorize`

```python
from numba import vectorize, float64

@vectorize([float64(float64, float64)], target='cpu')
def custom_gaussian_kernel(x, mu):
    return np.exp(-0.5 * ((x - mu) ** 2))

x_data = np.linspace(-3, 3, 1_000_000)
res = custom_gaussian_kernel(x_data, 0.0)
print(f"Computed {len(res):,} elements via compiled SIMD ufunc!")
```

# Exercises

**🟢 Basic**: Use `np.maximum.accumulate` to compute the running high-water mark of a stock price time series.

**🟡 Intermediate**: Write a pairwise Euclidean distance matrix calculation using `np.subtract.outer` and `np.linalg.norm` without explicit Python loops.

**🔴 Advanced**: Write a C extension module using the NumPy C-API `PyUFunc_FromFuncAndData` that implements a custom fused activation function.
""")

write_file("content/part-02-scientific-python/chapter-15-numpy-internals/15.4-views-vs-copies.md", """---
id: "15.4"
part: 2
chapter: 15
title: "Views vs Copies, Slicing & Advanced Indexing"
slug: "views-vs-copies"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["15.1"]
tags: ["views", "copies", "indexing", "memory-aliasing"]
status: "published"
---

# Concept

In NumPy:
- **Basic Slicing (`arr[1:5, :]`) ALWAYS returns a VIEW**: A new `ndarray` header sharing the exact same underlying memory buffer (Zero-Copy). Mutating the view mutates the original array!
- **Advanced / Fancy Indexing (`arr[[0, 2, 4]]` or boolean masks `arr[arr > 0]`) ALWAYS returns a COPY**: Allocates brand-new memory.

```mermaid
flowchart TD
    Original["Original Array: arr"] --> BasicSlice["Basic Slice: arr[::2]<br>(VIEW: Shares data_ptr, modified strides)"]
    Original --> FancyIndex["Fancy Index: arr[[0, 2]]<br>(COPY: Allocates new memory buffer)"]

    BasicSlice -- Mutates --> SharedRAM["Shared Memory Buffer in RAM"]
    SharedRAM -- Reflected in --> Original
    FancyIndex -- Mutates --> SeparateRAM["Separate Memory Buffer"]
```

# Verifying View vs Copy in Code

```python
import numpy as np

base = np.array([10, 20, 30, 40, 50])

# 1. Basic Slicing (View)
view_slice = base[1:4]
print("Shares memory (View):", np.shares_memory(base, view_slice))  # True
print("view_slice.base is base:", view_slice.base is base)          # True
view_slice[0] = 999
print("Original modified by view mutation:", base[1])              # 999!

# 2. Fancy Indexing (Copy)
copy_fancy = base[[0, 2, 4]]
print("Shares memory (Copy):", np.shares_memory(base, copy_fancy))  # False
print("copy_fancy.base is None:", copy_fancy.base is None)          # True
copy_fancy[0] = 111
print("Original untouched by copy mutation:", base[0])             # 10
```

# Exercises

**🟢 Basic**: Create a 2D array, extract a $2 \times 2$ view from the center, modify it, and verify the changes in the original matrix.

**🟡 Intermediate**: Write a function `is_view(arr)` that traverses `arr.base` recursively to identify the root memory owner.

**🔴 Advanced**: Demonstrate how combining basic slicing with fancy indexing (e.g. `arr[1:3, [0, 1]]`) determines whether a view or copy is created under NumPy indexing rules.
""")

# ==============================================================================
# CHAPTER 16: PANDAS DATAFRAMES
# ==============================================================================

write_file("content/part-02-scientific-python/chapter-16-pandas/16.1-pandas-memory.md", """---
id: "16.1"
part: 2
chapter: 16
title: "Pandas Memory Architecture & The BlockManager"
slug: "pandas-memory"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["15.1"]
tags: ["pandas", "blockmanager", "dataframe", "internals"]
status: "published"
---

# Concept

A Pandas `DataFrame` is **not a single 2D NumPy array**. Internally, Pandas has traditionally used a **`BlockManager`** that groups columns of the same NumPy `dtype` into consolidated 2D array "blocks" in memory.

```mermaid
flowchart TD
    subgraph DataFrame ["Pandas DataFrame (3 columns, 1M rows)"]
        ColIndex["Columns Index: ['age', 'income', 'name']"]
        RowIndex["Row Index: RangeIndex(0, 1000000)"]
    end

    subgraph BlockManager ["Internal BlockManager"]
        FloatBlock["2D Float64 Block (2 x 1,000,000)<br>Stores 'age' and 'income'"]
        ObjectBlock["1D Object Block (1 x 1,000,000)<br>Stores pointers for 'name'"]
    end

    DataFrame --> BlockManager
```

# Why the BlockManager Causes Performance Issues

1. **Fragmentation on Column Insertion**: Adding a column forces the BlockManager to split and reconstruct internal 2D blocks.
2. **Object Dtype Memory Bloat**: String columns stored as `object` store 8-byte pointers to individual Python string objects on the heap, causing 5x-10x memory bloat.
3. **Consolidation Overhead**: Operations like `df.dropna()` require consolidating disparate blocks.

# Inspecting Memory Usage

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "int_col": np.arange(1_000_000, dtype=np.int64),
    "float_col": np.random.randn(1_000_000),
    "str_col": ["sample_text"] * 1_000_000
})

print("=== True Memory Footprint (deep=True) ===")
print(df.memory_usage(deep=True) / 1024 / 1024, "MB")
print(f"Total: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
```

# Exercises

**🟢 Basic**: Use `df.info(memory_usage='deep')` to analyze the memory breakdown of a CSV dataset with numeric and string columns.

**🟡 Intermediate**: Convert high-cardinality and low-cardinality string columns to `category` dtype and measure the memory reduction factor.

**🔴 Advanced**: Compare the memory layout and slice execution speed of a consolidated vs non-consolidated DataFrame using `df._consolidate()`.
""")

write_file("content/part-02-scientific-python/chapter-16-pandas/16.2-pandas-arrow.md", """---
id: "16.2"
part: 1
chapter: 16
title: "Apache Arrow Integration & Zero-Copy Columnar Formats"
slug: "pandas-arrow"
difficulty: "advanced"
estimated_minutes: 25
prerequisites: ["16.1"]
tags: ["arrow", "pyarrow", "parquet", "zero-copy"]
status: "published"
---

# Concept

Pandas 2.0+ introduced native backend support for **Apache Arrow (`dtype_backend='pyarrow'`)**. 

Arrow replaces the fragmented `BlockManager` with a standardized **Columnar In-Memory Format** supporting contiguous chunked arrays, native null bitmaps (no NaN float coercion for integers!), and zero-copy data interchange with Parquet, DuckDB, Polars, and GPU memory via CUDA Arrow adapters.

```mermaid
flowchart LR
    ParquetFile["Parquet File on NVMe SSD"] -- "Zero-Copy MemMap" --> ArrowTable["Apache Arrow Table<br>(Standard Columnar Layout)"]
    ArrowTable --> PandasDF["Pandas (PyArrow Backend)<br>Zero data copies!"]
    ArrowTable --> DuckDB["DuckDB / Polars Query Engine"]
    ArrowTable --> GPU["GPU RAPIDS cuDF (CUDA)"]
```

# Benchmark: NumPy Backend vs PyArrow Backend

```python
import pandas as pd
import numpy as np

# Create 5 million string records
data = {"text": ["embedding_token_alpha_numeric"] * 5_000_000}

# 1. Legacy NumPy Object Backend
df_numpy = pd.DataFrame(data)
mem_numpy = df_numpy.memory_usage(deep=True).sum() / 1024 / 1024

# 2. Modern PyArrow Backend
df_arrow = pd.DataFrame(data, dtype="string[pyarrow]")
mem_arrow = df_arrow.memory_usage(deep=True).sum() / 1024 / 1024

print(f"NumPy Object Backend Memory: {mem_numpy:.2f} MB")
print(f"PyArrow Backend Memory:      {mem_arrow:.2f} MB")
print(f"Memory Savings: {mem_numpy / mem_arrow:.1f}x smaller with Arrow!")
```

# Exercises

**🟢 Basic**: Load a dataset using `pd.read_parquet(..., engine='pyarrow')` and verify that nullable integers (`Int64`) preserve exact nulls without converting to `float64`.

**🟡 Intermediate**: Benchmark string search operations (`.str.contains()`) on a 10M-row DataFrame using Python object vs `string[pyarrow]` backends.

**🔴 Advanced**: Write a zero-copy data exchange pipeline transferring 100M rows between DuckDB, Arrow Table, and Pandas without serializing to disk.
""")

write_file("content/part-02-scientific-python/chapter-16-pandas/16.3-pandas-optimization.md", """---
id: "16.3"
part: 1
chapter: 16
title: "Memory Optimization: Categoricals, Downcasting & Chunking"
slug: "pandas-optimization"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["16.1", "16.2"]
tags: ["categoricals", "downcasting", "chunking", "etl"]
status: "published"
---

# Concept

When working with large tabular datasets (e.g. 50GB clickstream logs) on machines with limited RAM:
1. **Downcasting**: Convert `float64` $\to$ `float32` (halves memory) and `int64` $\to$ `int8`/`int16`.
2. **Categorical Encoding**: Replace repeated strings with integer code tables.
3. **Chunked Processing**: Process datasets iteratively with `pd.read_csv(..., chunksize=100_000)`.

```python
import pandas as pd
import numpy as np

# Automatic Downcasting Utility
def optimize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    start_mem = df.memory_usage(deep=True).sum() / 1024 / 1024
    for col in df.columns:
        col_type = df[col].dtype
        if np.issubdtype(col_type, np.integer):
            df[col] = pd.to_numeric(df[col], downcast='integer')
        elif np.issubdtype(col_type, np.floating):
            df[col] = pd.to_numeric(df[col], downcast='float')
        elif col_type == 'object' and df[col].nunique() / len(df[col]) < 0.5:
            df[col] = df[col].astype('category')
    end_mem = df.memory_usage(deep=True).sum() / 1024 / 1024
    print(f"Optimized from {start_mem:.2f} MB to {end_mem:.2f} MB ({(1 - end_mem/start_mem)*100:.1f}% reduction)")
    return df
```

# Exercises

**🟢 Basic**: Read a 1M row CSV in chunks of 50,000 rows, computing the global running average of a column with constant $O(1)$ RAM.

**🟡 Intermediate**: Build an automated profiling pipeline that analyzes a DataFrame and outputs a dictionary of recommended dtypes for `pd.read_csv(dtype=...)`.

**🔴 Advanced**: Implement a parallel out-of-core CSV filtering engine using Python `multiprocessing` and memory-mapped Arrow tables.
""")

# ==============================================================================
# CHAPTER 17: PYTORCH FUNDAMENTALS
# ==============================================================================

write_file("content/part-02-scientific-python/chapter-17-pytorch-fundamentals/17.2-cuda-transfers.md", """---
id: "17.2"
part: 1
chapter: 17
title: "CUDA Streams, Pinned Memory & Host-to-Device Transfers"
slug: "cuda-transfers"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["17.1"]
tags: ["cuda", "pinned-memory", "cuda-streams", "gpu-transfers", "dma"]
status: "published"
---

# Concept

Data movement across the PCIe bus between CPU Host RAM and GPU Device VRAM is often the primary bottleneck in deep learning training. 

Standard pageable CPU memory cannot be copied to the GPU asynchronously via **Direct Memory Access (DMA)** because the OS might swap the memory pages to disk. **Pinned (Page-Locked) Memory (`tensor.pin_memory()`)** locks the pages in physical RAM, allowing the GPU's DMA controller to copy data across PCIe concurrently with GPU kernel execution via **CUDA Streams**.

```mermaid
flowchart TD
    subgraph HostCPU ["Host CPU System RAM"]
        Pageable["Standard Pageable Memory<br>(OS can swap to disk)"]
        Pinned["Pinned Page-Locked Memory<br>(tensor.pin_memory())"]
    end

    subgraph PCIe ["PCIe Gen 4/5 Bus (32-64 GB/s)"]
        SyncTransfer["Synchronous CPU-Stall Copy"]
        DMATransfer["Async Direct Memory Access (DMA)"]
    end

    subgraph GPUVRAM ["GPU Device VRAM (1-2 TB/s HBM)"]
        CUDAKernel["CUDA Kernel Execution (Stream 0)"]
    end

    Pageable --> SyncTransfer --> GPUVRAM
    Pinned --> DMATransfer --> GPUVRAM
    DMATransfer -. Overlaps with .- CUDAKernel
```

# PyTorch Asynchronous Data Transfer Pipeline

```python
import torch

if torch.cuda.is_available():
    device = torch.device('cuda:0')
    
    # 1. Allocate pinned memory buffer on Host CPU
    cpu_batch = torch.randn(1024, 1024, pin_memory=True)
    print("Is Pinned:", cpu_batch.is_pinned())

    # 2. Create non-default CUDA stream for asynchronous transfer
    transfer_stream = torch.cuda.Stream()

    with torch.cuda.stream(transfer_stream):
        # non_blocking=True executes DMA copy asynchronously without blocking CPU!
        gpu_batch = cpu_batch.to(device, non_blocking=True)

    # 3. Synchronize streams before computation
    torch.cuda.current_stream().wait_stream(transfer_stream)
    result = gpu_batch @ gpu_batch
```

# AI Connection: PyTorch DataLoader `pin_memory=True`

> [!AI]
> When configuring PyTorch `DataLoader(..., pin_memory=True, num_workers=4)`:
> - Worker processes load and preprocess data in parallel into pinned memory.
> - The main process transfers batches to the GPU asynchronously while the GPU computes the forward/backward pass of the *previous* batch, achieving **100% GPU compute utilization**.

# Exercises

**🟢 Basic**: Benchmark the transfer time of a 1GB tensor from CPU to GPU with `pin_memory=False` vs `pin_memory=True`.

**🟡 Intermediate**: Write a double-buffering prefetching loop in PyTorch using two CUDA streams that overlaps GPU computation with the next batch's PCIe transfer.

**🔴 Advanced**: Use NVIDIA Nsight Systems (`nsys profile`) to capture a timeline trace proving the concurrent overlap of compute kernels and D2H/H2D memory transfers.
""")

write_file("content/part-02-scientific-python/chapter-17-pytorch-fundamentals/17.3-tensor-ops-aliasing.md", """---
id: "17.3"
part: 1
chapter: 17
title: "Tensor Operations: In-Place vs Out-of-Place & Memory Aliasing"
slug: "tensor-ops-aliasing"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["17.1"]
tags: ["aliasing", "in-place", "autograd", "tensors"]
status: "published"
---

# Concept

In PyTorch:
- **Out-of-Place Operations (`y = x + 1` or `y = torch.add(x, 1)`)**: Allocate a new output tensor buffer.
- **In-Place Operations (`x.add_(1)` or `x += 1`)**: Mutate the underlying storage buffer directly (indicated by a trailing underscore `_`).

### The Autograd Version Counter (`_version`)
Every PyTorch tensor maintains an internal version counter: `x._version`. In-place mutations increment `_version`. If an operation mutates a tensor that was saved during the forward pass by autograd (`ctx.save_for_backward`), calling `.backward()` will raise a `RuntimeError` because the forward activation values required to compute the derivative were overwritten.

```python
import torch

x = torch.randn(4, requires_grad=True)
print("Initial version:", x._version)  # 0

# Out-of-place op (version unchanged)
y = x * 2
print("Version after out-of-place:", x._version)  # 0

# In-place mutation (version incremented!)
with torch.no_grad():
    x.add_(10.0)
print("Version after in-place mutation:", x._version)  # 1

try:
    y.backward(torch.ones(4))
except RuntimeError as e:
    print("Autograd Error Caught:", e)
```

# Exercises

**🟢 Basic**: Write a script demonstrating how `x.view(-1)` creates a view that shares storage with `x`, while `x.contiguous().view(-1)` might trigger a memory copy.

**🟡 Intermediate**: Profile the peak VRAM consumption of a deep network using out-of-place activations vs in-place activations (`nn.ReLU(inplace=True)`).

**🔴 Advanced**: Disassemble PyTorch's C++ `TensorIterator` dispatch mechanism and explain how in-place operations verify broadcast compatibility and stride overlap.
""")

# ==============================================================================
# CHAPTER 18: AUTOGRAD & COMPUTATIONAL GRAPHS
# ==============================================================================

write_file("content/part-02-scientific-python/chapter-18-autograd/18.2-micrograd-scratch.md", """---
id: "18.2"
part: 1
chapter: 18
title: "Building a Scalar Autograd Engine (Micrograd) From Scratch"
slug: "micrograd-scratch"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["18.1"]
tags: ["micrograd", "autograd", "backpropagation", "from-scratch"]
status: "published"
---

# Concept

To understand how PyTorch computes gradients across billions of parameters, we will build a complete, standalone **Scalar Automatic Differentiation Engine** from scratch (inspired by Andrej Karpathy's `micrograd`).

```mermaid
flowchart TD
    x["x: Value(2.0, grad=0.0)"] --> Mul["* (MulBackward)"]
    y["y: Value(-3.0, grad=0.0)"] --> Mul
    Mul --> z["z = x*y: Value(-6.0, grad=0.0)"]
    z --> Add["+ (AddBackward)"]
    c["c: Value(10.0, grad=0.0)"] --> Add
    Add --> L["L = z+c: Value(4.0, grad=1.0)"]
```

# Complete Micrograd Engine Implementation

```python
import math

class Value:
    def __init__(self, data, _children=(), _op=''):
        self.data = float(data)
        self.grad = 0.0
        self._backward = lambda: None
        self._prev = set(_children)
        self._op = _op

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), '+')
        
        def _backward():
            self.grad += 1.0 * out.grad
            other.grad += 1.0 * out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), '*')
        
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def __pow__(self, other):
        assert isinstance(other, (int, float)), "only supporting int/float powers"
        out = Value(self.data ** other, (self,), f'**{other}')
        
        def _backward():
            self.grad += (other * (self.data ** (other - 1))) * out.grad
        out._backward = _backward
        return out

    def relu(self):
        out = Value(0.0 if self.data < 0 else self.data, (self,), 'ReLU')
        
        def _backward():
            self.grad += (1.0 if self.data > 0 else 0.0) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        # Step 1: Build Topological Sort DAG of computation graph
        topo = []
        visited = set()
        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build_topo(child)
                topo.append(v)
        build_topo(self)

        # Step 2: Initialize root gradient dL/dL = 1.0
        self.grad = 1.0
        
        # Step 3: Traverse in reverse topological order
        for node in reversed(topo):
            node._backward()

    def __repr__(self):
        return f"Value(data={self.data:.4f}, grad={self.grad:.4f})"

# Verification: Compute gradient of L = (x * y + z).relu()
x = Value(2.0)
y = Value(-3.0)
z = Value(10.0)

q = x * y       # -6.0
L = (q + z)     # 4.0
L.backward()

print(f"L data: {L.data}")
print(f"dL/dx:  {x.grad} (Expected y = -3.0)")
print(f"dL/dy:  {y.grad} (Expected x = 2.0)")
print(f"dL/dz:  {z.grad} (Expected 1.0)")
```

# Exercises

**🟢 Basic**: Add `__sub__`, `__truediv__`, and `__neg__` magic methods to the `Value` class.

**🟡 Intermediate**: Implement `tanh()` and `sigmoid()` activation functions with their exact mathematical derivatives in `_backward()`.

**🔴 Advanced**: Build a 2-layer Neural Network (MLP) using list of `Value` objects and train it on binary XOR data using gradient descent.
""")

write_file("content/part-02-scientific-python/chapter-18-autograd/18.3-custom-autograd-function.md", """---
id: "18.3"
part: 1
chapter: 18
title: "Custom PyTorch autograd.Function & Gradient Hooks"
slug: "custom-autograd-function"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["18.1", "18.2"]
tags: ["custom-autograd", "grad_fn", "hooks", "derivatives"]
status: "published"
---

# Concept

When implementing custom CUDA kernels, memory-efficient activations, or non-differentiable operations with surrogate gradients (e.g. Straight-Through Estimators), you subclass **`torch.autograd.Function`** and implement static `forward()` and `backward()` methods.

```python
import torch

class FusedGELUFunction(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x):
        # Save input tensor for backward pass
        ctx.save_for_backward(x)
        # Exact GeLU approximation formula
        return x * 0.5 * (1.0 + torch.erf(x / (2.0 ** 0.5)))

    @staticmethod
    def backward(ctx, grad_output):
        x, = ctx.saved_tensors
        # Analytical derivative of GeLU
        s = 2.0 ** 0.5
        cdf = 0.5 * (1.0 + torch.erf(x / s))
        pdf = torch.exp(-0.5 * (x ** 2)) / ((2.0 * 3.1415926535) ** 0.5)
        d_gelu = cdf + x * pdf
        return grad_output * d_gelu

# Apply custom autograd function
custom_gelu = FusedGELUFunction.apply
x = torch.randn(4, requires_grad=True)
y = custom_gelu(x)
y.sum().backward()
print("Computed Custom Gradient:", x.grad)
```

# Tensor Gradient Hooks with `register_hook`

```python
# Inspect or modify gradients on the fly during backward pass
x = torch.tensor([2.0, 3.0], requires_grad=True)
y = x ** 3

# Register a hook that clips or prints gradients
def clip_hook(grad):
    print("Intercepted grad:", grad)
    return torch.clamp(grad, max=10.0)

x.register_hook(clip_hook)
y.sum().backward()
print("Final clipped grad:", x.grad)
```

# Exercises

**🟢 Basic**: Write a custom `autograd.Function` for the Huber Loss with parameter $\delta=1.0$.

**🟡 Intermediate**: Implement the Straight-Through Estimator (STE) for a binary sign activation (`x >= 0 ? 1 : -1`) where the backward pass treats it as an identity function ($dx/dy = 1$).

**🔴 Advanced**: Use `torch.autograd.gradcheck` to verify the mathematical correctness of a custom multi-input autograd function using finite difference testing.
""")

print("Parts 2 & 3 authored with supreme depth!")
