import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# CHAPTER 04: LISTS & DYNAMIC ARRAYS
# ==============================================================================

write_file(r"content/part-01-python-properly/chapter-04-lists/4.1-dynamic-arrays.md", r"""---
id: "4.1"
part: 1
chapter: 4
title: "Python Lists Under the Hood: PyListObject & Over-Allocation Strategy"
slug: "dynamic-arrays"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["2.2"]
tags: ["lists", "dynamic-arrays", "pylistobject", "memory", "cpython"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The Memory Architecture of `PyListObject`

In CPython, a Python `list` is **not a linked list**. It is a **contiguous array of pointers to heap `PyObject` instances**:

```mermaid
flowchart TD
    subgraph PyListHeader ["PyListObject C Struct in Heap Memory"]
        Header["ob_refcnt (8B) | ob_type (&PyList_Type: 8B)"]
        Size["ob_size = 3 (Number of active elements: 8B)"]
        Allocated["allocated = 6 (Total pointer capacity reserved: 8B)"]
        ItemPtr["ob_item (PyObject** array pointer: 8B)"]
    end

    subgraph PointerArray ["Contiguous Array of C Pointers (ob_item)"]
        Slot0["ob_item[0]"] --> Obj1["PyLongObject: 10"]
        Slot1["ob_item[1]"] --> Obj2["PyUnicodeObject: 'hello'"]
        Slot2["ob_item[2]"] --> Obj3["PyListObject: [True, False]"]
        Slot3["ob_item[3] (NULL - Reserved)"]
        Slot4["ob_item[4] (NULL - Reserved)"]
        Slot5["ob_item[5] (NULL - Reserved)"]
    end

    ItemPtr --> PointerArray
```

---

# CPython's Geometric Over-Allocation Formula

When you call `list.append()`, Python does not reallocate memory on every single append. Doing so would turn appending into an $\mathcal{O}(N^2)$ operation.

Instead, CPython (`Objects/listobject.c`) uses a **proportional over-allocation formula**:

```c
// CPython list_resize() formula:
new_allocated = ((size_t)newsize + (newsize >> 3) + (newsize < 9 ? 3 : 6)) & ~(size_t)1;
```

$$\text{new\_allocated} \approx \text{newsize} + \frac{\text{newsize}}{8} + (\text{newsize} < 9 \ ? \ 3 : 6)$$

### Allocation Growth Sequence in Practice:
When appending to an initially empty list, the capacity expands along this sequence:
$$0 \to 4 \to 8 \to 16 \to 24 \to 32 \to 40 \to 52 \to 64 \to 76 \to 92 \to 108 \to \dots$$

This guarantees that `list.append()` achieves **$\mathcal{O}(1)$ Amortized Constant Time**!

---

# Inspecting Dynamic List Growth in Pure Python

```python
import sys

def trace_list_growth(n_elements=30):
    data = []
    prev_size = sys.getsizeof(data)
    print(f"Empty list initial size: {prev_size} bytes\n")
    print(f"{'Length':<8} {'Size (Bytes)':<14} {'New Allocation Event?'}")
    print("-" * 45)

    for i in range(n_elements):
        data.append(i)
        current_size = sys.getsizeof(data)
        reallocated = current_size != prev_size
        if reallocated or i == 0:
            print(f"{len(data):<8} {current_size:<14} {'YES (Capacity Expanded!)' if reallocated else 'Initial'}")
            prev_size = current_size

trace_list_growth(30)
```

---

# Algorithmic Complexity of List Operations

| Operation | C Implementation | Time Complexity | Memory Impact |
|---|---|---|---|
| `list[i]` (Access) | Direct array indexing `ob_item[i]` | **$\mathcal{O}(1)$** | Zero allocation |
| `list.append(x)` | Writes to `ob_item[ob_size++]` | **$\mathcal{O}(1)$ Amortized** | Over-allocates pointer slots |
| `list.pop()` | Decrements `ob_size` | **$\mathcal{O}(1)$** | Memory retained until shrink threshold |
| `list.insert(0, x)` | `memmove` shifts all $N$ pointers right by 1 | **$\mathcal{O}(N)$ (VERY SLOW)** | Pointer shift overhead |
| `list.pop(0)` | `memmove` shifts all $N$ pointers left by 1 | **$\mathcal{O}(N)$ (VERY SLOW)** | Pointer shift overhead |

> [!WARNING]
> If you need high-frequency pushes and pops from **both ends**, NEVER use `list`. Use `collections.deque` (a doubly-linked list of 64-element contiguous memory blocks with true $\mathcal{O}(1)$ left/right operations).

---

# Exercises & Problem Set

**🟢 Challenge 1**: Trace the memory size difference between `[0] * 1000` (pre-allocated) vs appending 1,000 items in a loop.

**🟡 Challenge 2**: Explain why deleting an element from the middle of a 10-million-element list causes CPU cache thrashing.

**🔴 Challenge 3**: Implement a custom C-style Dynamic Array in Python using `ctypes.py_object` that doubles its capacity ($2\times$) on overflow and shrinks by half when 75% empty.
""")

# ==============================================================================
# CHAPTER 06: HASH TABLES & COMPACT DICTS
# ==============================================================================

write_file(r"content/part-01-python-properly/chapter-06-dictionaries-hash-tables/6.2-compact-dict.md", r"""---
id: "6.2"
part: 1
chapter: 6
title: "The Compact & Ordered Dictionary Architecture in CPython"
slug: "compact-dict"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["6.1", "2.2"]
tags: ["dict", "hash-tables", "compact-dict", "cpython", "memory-optimization"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The Revolution: Python 3.6+ Compact Dictionary

Prior to Python 3.6, `dict` used a sparse table of 24-byte entry structs, wasting over **30% to 50% of heap memory on empty hash bucket slots**.

Raymond Hettinger and Inada Naoki redesigned the CPython dictionary into a **Two-Array Architecture**:

```mermaid
flowchart TD
    subgraph HashIndices ["1. Sparse Indices Array (Small 1-Byte Integers: dk_indices)"]
        Idx0["[0] -> -1 (Empty)"]
        Idx1["[1] ->  0 (Points to Entry 0)"]
        Idx2["[2] -> -1 (Empty)"]
        Idx3["[3] ->  1 (Points to Entry 1)"]
        Idx4["[4] -> -1 (Empty)"]
    end

    subgraph DenseEntries ["2. Dense Entries Array (Appended in Insertion Order: dk_entries)"]
        Entry0["Entry 0: hash=0x8a | key='name' | val='Alice' (24 Bytes)"]
        Entry1["Entry 1: hash=0x3f | key='role' | val='Admin' (24 Bytes)"]
    end

    Idx1 --> Entry0
    Idx3 --> Entry1
```

---

# Why Compact Dicts Guarantee Insertion Ordering

Because new keys are simply appended to the end of the dense `entries` array:
1. **Insertion Order is Naturally Preserved**: Iterating over the dict is a direct sequential scan through `entries[0], entries[1], ...`.
2. **Huge Memory Savings**: The sparse hash bucket table only stores small integer indices (`int8_t` for tables $\le 128$ slots), while the heavy 24-byte `(hash, key, value)` structs are packed densely with zero empty gaps!

---

# Memory Comparison: Legacy vs Modern Compact Dict

```python
import sys

# Modern compact dict representation in Python 3.12+
d = {"id": 101, "username": "alex", "email": "alex@ai.org", "active": True}
print("Dictionary Size:", sys.getsizeof(d), "bytes")
print("Preserved Keys Order:", list(d.keys()))
```

### Probing & Perturbation Sequence
When a hash collision occurs ($i = \text{hash} \ \& \ \text{mask}$ is occupied), CPython resolves it using **pseudo-random perturbation probing**:

$$j = (5 \times j + 1 + \text{perturb}) \pmod{\text{table\_size}}$$
$$\text{perturb} >>= 5$$

This ensures that all bits of the 64-bit hash code contribute to resolving the collision, preventing clustering.

---

# Exercises & Challenges

**🟢 Challenge 1**: Explain why mutating a dictionary while iterating over it raises `RuntimeError: dictionary changed size during iteration`.

**🟡 Challenge 2**: Calculate the memory saved by a compact dictionary with 10,000 entries compared to a legacy sparse-table dictionary.

**🔴 Challenge 3**: Implement a pure Python prototype of the Compact Dict two-array data structure with collision perturbation and `__iter__` traversal.
""")

# ==============================================================================
# CHAPTER 08: CLOSURES & DECORATORS
# ==============================================================================

write_file(r"content/part-01-python-properly/chapter-08-scope-closures-decorators/8.2-closures.md", r"""---
id: "8.2"
part: 1
chapter: 8
title: "Closures & Cell Objects: How Python Captures Lexical Scope"
slug: "closures"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["8.1", "7.3"]
tags: ["closures", "cells", "free-variables", "lexical-scope", "cpython"]
contentShape: "mental-model-first"
openingType: "surprising-fact"
status: "published"
---

# The Mystery of the Surviving Local Variable

When a function finishes execution, its stack frame is destroyed and all local variables are deallocated. 

So how can an inner function still access an outer variable long after the outer function has returned?

```python
def make_multiplier(factor):
    def multiply(x):
        return x * factor  # 'factor' is captured!
    return multiply

double = make_multiplier(2)
# 'make_multiplier' is GONE from the call stack!
print("double(5) =", double(5))  # Prints: 10!
```

---

# Under the Hood: `PyCellObject` & `__closure__`

Python solves this by allocating a special heap object called a **Cell Object (`PyCellObject`)** to wrap any variable shared across lexical scopes:

```mermaid
flowchart LR
    subgraph StackFrameOuter ["make_multiplier(2) Stack Frame"]
        LocalFactor["Name 'factor' in outer frame"]
    end

    subgraph HeapCell ["Shared Heap Memory"]
        Cell["PyCellObject at 0x10a8<br>(ob_ref = &PyLongObject(2))"]
        Val2["PyLongObject: 2"]
    end

    subgraph InnerClosure ["multiply Function Object"]
        ClosureTuple["multiply.__closure__ = (Cell,)"]
    end

    LocalFactor --> Cell
    ClosureTuple --> Cell
    Cell --> Val2
```

Both the outer function and the inner function hold a pointer to the **same heap Cell object**. When the outer stack frame terminates, the Cell object remains alive in heap memory because `multiply.__closure__` holds an active reference!

---

# Inspecting Closure Cells at Runtime

```python
def counter_factory(start=0):
    count = start
    def step():
        nonlocal count
        count += 1
        return count
    return step

counter = counter_factory(10)
print("Function __closure__ tuple:", counter.__closure__)
print("Cell Content:", counter.__closure__[0].cell_contents) # 10

counter()
print("Updated Cell Content:", counter.__closure__[0].cell_contents) # 11
```

---

# The Infamous Late-Binding Loop Bug

Consider this classic trap:

```python
# BROKEN: All closures capture the SAME cell variable 'i'!
funcs = [lambda x: x + i for i in range(4)]
print([f(10) for f in funcs])  # Prints: [13, 13, 13, 13]!

# FIXED: Default argument evaluates at definition time, creating local bindings!
funcs_fixed = [lambda x, i=i: x + i for i in range(4)]
print([f(10) for f in funcs_fixed])  # Prints: [10, 11, 12, 13]!
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Inspect the bytecode of `make_multiplier` using `dis.dis` and identify the `LOAD_DEREF` and `STORE_DEREF` opcodes.

**🟡 Challenge 2**: Explain why modifying an outer variable without `nonlocal` raises an `UnboundLocalError`.

**🔴 Challenge 3**: Implement a memoization decorator with an internal closure cache dictionary, measuring hit rates across recursive Fibonacci calls.
""")

print("Parts 1 and 2 enriched with deep CPython internals, cell structures, and dynamic array math!")
