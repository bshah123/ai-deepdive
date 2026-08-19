import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# LESSON 2.1: WHAT IS A VARIABLE IN PYTHON?
# Shape: Mental Model First | Opening: Surprising Fact
# ==============================================================================
write_file(r"content/part-01-python-properly/chapter-02-variables-objects-memory/2.1-what-is-a-variable.md", r"""---
id: "2.1"
part: 1
chapter: 2
title: "What Is a Variable in Python?"
slug: "what-is-a-variable"
difficulty: "beginner"
estimated_minutes: 15
prerequisites: ["1.2"]
tags: ["variables", "bindings", "names", "pointers", "memory"]
contentShape: "mental-model-first"
openingType: "surprising-fact"
status: "published"
---

# The Surprising Reality of Python Variables

In C, C++, and Java, a variable is a **named memory box** on the stack that directly stores a value:

```c
// C++: 'x' is a 4-byte box holding the integer value 42
int x = 42;
```

**In Python, a variable is NOT a box.** 

A Python variable is a **sticky name tag (reference pointer)** attached to an object living in the heap:

```mermaid
flowchart LR
    subgraph StackNamespace ["Local Namespace (Stack Frame)"]
        VarX["Variable Name 'x'"]
        VarY["Variable Name 'y'"]
    end

    subgraph HeapMemory ["Heap Memory (PyObject Allocation)"]
        Obj42["PyLongObject: value = 42<br>(ob_refcnt = 2, ob_type = int)"]
    end

    VarX -->|Points to data_ptr| Obj42
    VarY -->|Points to data_ptr| Obj42
```

---

# The Name Binding Operator (`=`)

In Python, the assignment operator `=` does **not** copy data; it performs **Name Binding** (attaching a name tag to an existing or newly created object):

```python
x = [1, 2, 3]   # 1. Allocate list on heap; attach tag 'x' to it
y = x           # 2. Attach tag 'y' to the SAME list in heap memory!

y.append(4)     # 3. Mutate the object via tag 'y'
print("x:", x)  # Prints: [1, 2, 3, 4] (x sees the change!)
```

### Rebinding vs In-Place Mutation
Notice what happens when you reassign a variable:

```python
a = 100         # Tag 'a' bound to integer object 100
a = a + 1       # Creates a NEW integer object 101; moves tag 'a' to 101!
```

```mermaid
flowchart TD
    TagA["Variable Tag 'a'"] -.->|Old Binding (ob_refcnt decrements)| Obj100["PyLongObject (100)"]
    TagA -->|New Binding| Obj101["PyLongObject (101)"]
```

---

# Under the Hood: CPython Frame Local Arrays

Inside the CPython virtual machine (`ceval.c`), local variable names are not looked up via dictionary string hashing at runtime. 

Instead, during bytecode compilation, Python assigns each local variable an index in a fixed C array: `f_localsplus`:

```mermaid
flowchart LR
    PyCode["Python Bytecode:<br>LOAD_FAST 0 (x)<br>STORE_FAST 1 (y)"] --> FrameArray["PyFrameObject -> f_localsplus Array:<br>[0] -> PyObject* (x)<br>[1] -> PyObject* (y)"]
```

This makes local variable access an $O(1)$ raw C pointer lookup with zero hash table overhead.

---

# Quick Check: Predict the Output

What will the following code print?

```python
a = [10, 20]
b = a
a = [30, 40]

print("b is:", b)
```

> [!TIP]
> **Answer**: `b is: [10, 20]`. Reassigning `a = [30, 40]` moved the tag `a` to a new list object, while `b` remained bound to the original list `[10, 20]`.

---

# Hands-On Challenges

**🟢 Challenge 1**: Verify object sharing using the `is` operator for two variables assigned to the same string literal.

**🟡 Challenge 2**: Explain why passing a list to a function allows the function to mutate the caller's list, while passing an integer does not change the caller's integer variable.

**🔴 Challenge 3**: Use Python's `dis` module to disassemble `x = 1; y = x` and explain the exact CPython opcodes (`LOAD_CONST`, `STORE_FAST`, `LOAD_FAST`).
""")

# ==============================================================================
# LESSON 2.2: PYOBJECT & PYTHON'S OBJECT MODEL
# Shape: Under the Hood | Opening: Visual
# ==============================================================================
write_file(r"content/part-01-python-properly/chapter-02-variables-objects-memory/2.2-objects.md", r"""---
id: "2.2"
part: 1
chapter: 2
title: "PyObject & Python's C-Level Object Model"
slug: "objects"
difficulty: "intermediate"
estimated_minutes: 20
prerequisites: ["2.1"]
tags: ["pyobject", "cpython", "memory-layout", "refcount", "types"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The Universal C Structure Behind Every Python Object

In CPython, **every single value in Python**—from integers and booleans to neural network models and functions—is a C struct on the heap conforming to the `PyObject` protocol:

```mermaid
flowchart TD
    subgraph PyObjectHeader ["Standard PyObject Header (16 Bytes in 64-bit CPython)"]
        RefCnt["ob_refcnt (uintptr_t / ssize_t: 8 Bytes)<br>Stores active reference count"]
        TypePtr["ob_type (struct _typeobject*: 8 Bytes)<br>Pointer to Type Descriptor (e.g. &PyLong_Type)"]
    end

    subgraph PyLongPayload ["Integer-Specific Payload (PyLongObject)"]
        Size["ob_size (ssize_t: 8 Bytes)<br>Number of 30-bit digits"]
        Digits["ob_digit[1] (uint32_t array: 4 Bytes)<br>Digit values for arbitrary precision"]
    end

    RefCnt --- TypePtr
    TypePtr --- Size
    Size --- Digits
```

---

# Why Does a Python Integer Take 28 Bytes?

In C++, a 32-bit integer takes exactly **4 bytes**. Why does `sys.getsizeof(0)` in Python report **28 bytes**?

```python
import sys

print("Memory for int 0:", sys.getsizeof(0))       # 24 bytes (Header + size=0)
print("Memory for int 1:", sys.getsizeof(1))       # 28 bytes (Header + size=1 + 1 digit)
print("Memory for int 2**60:", sys.getsizeof(2**60)) # 36 bytes (Header + size=3 + 3 digits)
```

### Breakdown of the 28 Bytes for `1`:
1. `ob_refcnt` (8 bytes): Reference counter.
2. `ob_type` (8 bytes): Pointer to `int` type descriptor.
3. `ob_size` (8 bytes): Number of limbs/digits.
4. `ob_digit` (4 bytes): The actual numerical value `1`.
$$\text{Total} = 8 + 8 + 8 + 4 = 28 \text{ Bytes!}$$

---

# CPython C Source Code (`object.h`)

From the official CPython source code:

```c
// Include/object.h
struct _object {
    _PyObject_HEAD_EXTRA // Double-linked list pointers in debug builds
    Py_ssize_t ob_refcnt;
    struct _typeobject *ob_type;
};

typedef struct _object PyObject;
```

For variable-length containers (lists, strings, tuples, bytearrays), CPython uses `PyVarObject`:

```c
typedef struct {
    PyObject ob_base;
    Py_ssize_t ob_size; // Number of items in container
} PyVarObject;
```

---

# Type Descriptors & Dynamic Method Dispatch

When you execute `len(obj)`, how does Python know what function to call?

```mermaid
flowchart LR
    PythonCall["len(obj)"] --> CheckType["obj->ob_type"]
    CheckType --> TypeMethods["PyTypeObject: tp_as_sequence->sq_length"]
    TypeMethods --> CFunction["Execute C Function pointer: list_length()"]
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Use `sys.getsizeof()` to measure the memory size of `""` (empty string), `[]` (empty list), `{}` (empty dict), and `()` (empty tuple).

**🟡 Challenge 2**: Explain why an empty tuple takes only 40 bytes while an empty list takes 56 bytes.

**🔴 Challenge 3**: Write a C extension using Python C-API that takes a `PyObject*`, reads its `ob_refcnt`, and prints the type name from `ob_type->tp_name`.
""")

# ==============================================================================
# LESSON 2.4: IDENTITY VS EQUALITY (IS VS ==)
# Shape: Compare & Choose | Opening: Code
# ==============================================================================
write_file(r"content/part-01-python-properly/chapter-02-variables-objects-memory/2.4-is-vs-equals.md", r"""---
id: "2.4"
part: 1
chapter: 2
title: "Identity vs Equality (is vs ==)"
slug: "is-vs-equals"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["2.1", "2.3"]
tags: ["is", "equality", "identity", "memory", "interning"]
contentShape: "compare-choose"
openingType: "code"
status: "published"
---

# Look at This Code

```python
a = [1, 2, 3]
b = [1, 2, 3]

print("a == b:", a == b)  # True!
print("a is b:", a is b)  # False!
```

Why does `==` return `True` while `is` returns `False`?

```mermaid
flowchart TD
    subgraph TwoDistinctLists ["Two Separate Heap Objects with Identical Values"]
        ListA["List Object at 0x104a (Value: [1, 2, 3])"]
        ListB["List Object at 0x108f (Value: [1, 2, 3])"]
    end
    VarA["Name 'a'"] --> ListA
    VarB["Name 'b'"] --> ListB
```

---

# The Core Distinction

| Operator | Mechanism | What It Checks | Invokes Magic Method? |
|---|---|---|---|
| **`==` (Equality)** | Value Comparison | Do both objects contain equivalent data? | Calls `a.__eq__(b)` |
| **`is` (Identity)** | Pointer Comparison | Do both variables point to the **exact same memory address**? | Compares `id(a) == id(b)` in C |

```python
# 'is' is identical to pointer equality in C:
def custom_is(a, b):
    return id(a) == id(b)
```

---

# The Small Integer Cache Trap (`-5` to `256`)

Consider this surprising experiment:

```python
x = 256
y = 256
print("256 is 256:", x is y)  # True!

p = 257
q = 257
print("257 is 257:", p is q)  # False (in REPL / separate evaluations)!
```

```mermaid
flowchart LR
    subgraph CPythonIntCache ["CPython Small Integer Pre-allocation Array (-5 to 256)"]
        Cache256["Static Heap Integer: 256 (Never allocated twice!)"]
    end
    VarX["x"] --> Cache256
    VarY["y"] --> Cache256
```

### Why Does This Happen?
CPython pre-allocates an array of small integer objects from **`-5` to `256`** at interpreter startup. Any reference to `256` reuses the singleton instance from the cache. Numbers outside this range create fresh distinct heap allocations.

> [!WARNING]
> **Rule of Thumb**: NEVER use `is` to compare numbers or strings! Always use `==` for values, and reserve `is` strictly for singletons (`None`, `True`, `False`, `Ellipsis`).

---

# Hands-On Challenges

**🟢 Challenge 1**: Write a function that checks if an input is `None` using `if x is None:` vs `if x == None:` and explain why `is None` is faster and safer against custom classes that override `__eq__`.

**🟡 Challenge 2**: Use `sys.intern()` on two identical dynamically constructed strings and verify that `is` evaluates to `True`.

**🔴 Challenge 3**: Construct a custom Python class `Tricky` where `a == b` returns `True`, but `b == a` returns `False`.
""")

# ==============================================================================
# LESSON 2.5: OBJECT REFERENCES & ALIASING
# Shape: Mental Model First | Opening: Question
# ==============================================================================
write_file(r"content/part-01-python-properly/chapter-02-variables-objects-memory/2.5-references.md", r"""---
id: "2.5"
part: 1
chapter: 2
title: "Object References, Aliasing & Shallow vs Deep Copy"
slug: "references"
difficulty: "intermediate"
estimated_minutes: 20
prerequisites: ["2.1", "2.4"]
tags: ["aliasing", "references", "shallow-copy", "deep-copy", "memory"]
contentShape: "mental-model-first"
openingType: "question"
status: "published"
---

# Why Did Modifying the Nested List Corrupt Both Variables?

Consider this common bug:

```python
matrix = [[0] * 3] * 3
matrix[0][0] = 99

print(matrix)
# Prints: [[99, 0, 0], [99, 0, 0], [99, 0, 0]]!
```

Why did modifying row 0 modify all 3 rows?

```mermaid
flowchart TD
    OuterList["Outer List: matrix [row0, row1, row2]"] --> SharedSublist["Single Shared Sublist: [99, 0, 0]"]
    OuterList -->|row 0| SharedSublist
    OuterList -->|row 1| SharedSublist
    OuterList -->|row 2| SharedSublist
```

The multiplication operator `[[0] * 3] * 3` did **not** create 3 distinct rows; it created 3 duplicate reference pointers to the **same single sublist**!

---

# Shallow Copy vs Deep Copy

```mermaid
flowchart TD
    subgraph OriginalData ["Original Nested Structure"]
        OrigList["Original List [A, B]"] --> SubList["Sublist [10, 20]"]
    end

    subgraph ShallowCopyBlock ["Shallow Copy: copy.copy(list) / list[:]"]
        ShallowList["New Outer Container"] -->|Points to SAME child sublist!| SubList
    end

    subgraph DeepCopyBlock ["Deep Copy: copy.deepcopy(list)"]
        DeepList["New Outer Container"] --> NewSubList["Recursively Cloned Sublist [10, 20]"]
    end
```

# Python Copy Mechanics in Practice

```python
import copy

original = [1, [10, 20]]

# 1. Aliasing (Assignment) - Zero copying
alias = original

# 2. Shallow Copy - Copies outer list, shares nested objects
shallow = original.copy()

# 3. Deep Copy - Recursively clones all nested objects
deep = copy.deepcopy(original)

# Modify nested child
original[1].append(30)

print("Original:", original) # [1, [10, 20, 30]]
print("Alias:   ", alias)    # [1, [10, 20, 30]] (Mutated)
print("Shallow: ", shallow)  # [1, [10, 20, 30]] (Mutated!)
print("Deep:    ", deep)     # [1, [10, 20]] (Completely protected!)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Correct the 3x3 zero-matrix creation bug using a list comprehension: `[[0 for _ in range(3)] for _ in range(3)]`.

**🟡 Challenge 2**: Explain what happens when `copy.deepcopy()` encounters a self-referential list `lst = []; lst.append(lst)` and how its internal memo dictionary prevents infinite recursion.

**🔴 Challenge 3**: Implement a pure Python recursive `custom_deepcopy()` function supporting dicts, lists, and primitives with a cycle-detection memo dictionary.
""")

# ==============================================================================
# LESSON 2.7: REFERENCE COUNTING
# Shape: Under the Hood | Opening: Visual
# ==============================================================================
write_file(r"content/part-01-python-properly/chapter-02-variables-objects-memory/2.7-reference-counting.md", r"""---
id: "2.7"
part: 1
chapter: 2
title: "Reference Counting & CPython Memory Reclamation"
slug: "reference-counting"
difficulty: "intermediate"
estimated_minutes: 20
prerequisites: ["2.2"]
tags: ["refcount", "memory", "gc", "deallocation", "cpython"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The Lifecycle of a Python Object

In CPython, memory management is primarily governed by **Deterministic Reference Counting**:

```mermaid
flowchart LR
    Alloc["1. Allocate PyObject on Heap<br>(ob_refcnt = 1)"] --> Bind["2. Additional Name Binding / Pass to function<br>(ob_refcnt increments via Py_INCREF)"]
    Bind --> Unbind["3. Name goes out of scope / del x<br>(ob_refcnt decrements via Py_DECREF)"]
    Unbind --> CheckZero{"Is ob_refcnt == 0?"}
    CheckZero -- "Yes" --> Free["4. Immediate Deallocation via tp_dealloc!"]
    CheckZero -- "No" --> Retain["Retain Object in Heap"]
```

---

# Inspecting Reference Counts with `sys.getrefcount()`

```python
import sys

# Create a fresh object
x = [1, 2, 3]
print("Initial Refcount:", sys.getrefcount(x))  # Prints: 2!

y = x
print("After y = x:", sys.getrefcount(x))       # Prints: 3!

del y
print("After del y:", sys.getrefcount(x))       # Prints: 2!
```

> [!NOTE]
> **Why does a brand new object have a refcount of 2?**
> Passing `x` into `sys.getrefcount(x)` passes `x` as an argument to the function, which creates a temporary reference on the stack during the call! The true count is always `sys.getrefcount(x) - 1`.

---

# C-Level Macros: `Py_INCREF` and `Py_DECREF`

In CPython's C source code, every pointer assignment is guarded by reference macros:

```c
#define Py_INCREF(op) ( ((PyObject*)(op))->ob_refcnt++ )

#define Py_DECREF(op) \
    do { \
        if (--((PyObject*)(op))->ob_refcnt == 0) \
            _Py_Dealloc((PyObject*)(op)); \
    } while (0)
```

### Deterministic Destruction (`__del__`)
Because CPython deallocates an object the exact moment its `ob_refcnt` hits zero, file handles, sockets, and memory buffers are closed **immediately** when going out of scope.

---

# Exercises & Challenges

**🟢 Challenge 1**: Trace the refcount of an object inside a list: `a = []; b = [a]; sys.getrefcount(a)`.

**🟡 Challenge 2**: Explain why deterministic reference counting eliminates the unpredictable "stop-the-world" latency pauses found in JVM / Go garbage collectors.

**🔴 Challenge 3**: Explain the fundamental limitation of pure reference counting: why can reference counting never reclaim cyclic reference graphs (`a.ref = b; b.ref = a`)?
""")

# ==============================================================================
# LESSON 2.8: GARBAGE COLLECTION (CYCLIC GC)
# Shape: Under the Hood | Opening: Problem
# ==============================================================================
write_file(r"content/part-01-python-properly/chapter-02-variables-objects-memory/2.8-garbage-collection.md", r"""---
id: "2.8"
part: 1
chapter: 2
title: "Generational Garbage Collection & The Cyclic GC Engine"
slug: "garbage-collection"
difficulty: "advanced"
estimated_minutes: 25
prerequisites: ["2.7"]
tags: ["gc", "cyclic-gc", "generations", "mark-and-sweep", "cpython"]
contentShape: "under-the-hood"
openingType: "problem"
status: "published"
---

# The Problem: The Invisible Memory Leak

Consider this circular graph:

```python
class Node:
    def __init__(self):
        self.cycle = self

node = Node()
del node  # Variable tag deleted, but Node still points to itself!
```

```mermaid
flowchart LR
    NodeA["Node Object on Heap<br>(ob_refcnt = 1 because self.cycle points to itself!)"] -->|cycle pointer| NodeA
    DeadRef["Variable tag 'node' deleted!"] -.x NodeA
```

Even though `node` is completely unreachable from the root program namespace, its `ob_refcnt` remains **1**. Pure reference counting will **never** free this object!

---

# CPython's Solution: The 3-Generation Cyclic Collector

To detect and collect cyclic references, CPython runs a **Generational Mark-and-Sweep Cyclic Garbage Collector** (`gc` module) alongside reference counting:

```mermaid
flowchart TD
    subgraph Gen0 ["Generation 0: Young Objects (Collected Frequently)"]
        G0_Objs["Newly allocated container objects (lists, dicts, tuples, classes)"]
    end

    subgraph Gen1 ["Generation 1: Intermediate Survival"]
        G1_Objs["Objects that survive 1 Gen 0 collection cycle"]
    end

    subgraph Gen2 ["Generation 2: Long-Lived Objects (Collected Rarely)"]
        G2_Objs["Modules, functions, global constants, long-lived caches"]
    end

    G0_Objs -->|Survives collection| G1_Objs
    G1_Objs -->|Survives collection| G2_Objs
```

### The Weak Generational Hypothesis:
Most newly created objects die very young (temporary local variables, comprehension intermediates). By collecting **Generation 0** frequently and **Generation 2** rarely, Python avoids expensive full-heap scans.

---

# Controlling the GC in Python

```python
import gc

# Inspect collection thresholds: (threshold0, threshold1, threshold2)
print("GC Thresholds:", gc.get_threshold()) # (700, 10, 10)

# Inspect generation counts: (count0, count1, count2)
print("GC Counts:", gc.get_count())

# Force an immediate full collection across all generations
unreachable_count = gc.collect()
print("Collected unreachable cyclic objects:", unreachable_count)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Disable the GC using `gc.disable()` and verify that non-cyclic objects are still immediately freed by reference counting.

**🟡 Challenge 2**: Explain why Instagram famously disabled the cyclic GC in their Django web server worker processes to optimize shared memory utilization across fork processes (`copy-on-write`).

**🔴 Challenge 3**: Use `gc.set_debug(gc.DEBUG_STATS | gc.DEBUG_LEAK)` to log all cyclic objects identified and destroyed by the collector.
""")

print("Chapter 2 re-authored with diverse pedagogical shapes and zero monotonic boilerplate!")
