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
# CHAPTER 5: TUPLES & IMMUTABILITY
# ==============================================================================

write_file("content/part-01-python-properly/chapter-05-tuples/5.1-tuples-vs-lists.md", """---
id: "5.1"
part: 1
chapter: 5
title: "PyTupleObject & Struct Optimization"
slug: "tuples-vs-lists"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["2.6", "4.1"]
tags: ["tuple", "immutable", "cpython", "free-list", "optimization"]
status: "published"
---

# Concept

A `tuple` in Python is an immutable sequence of object pointers. Unlike `PyListObject`, which overallocates memory for dynamic growth, `PyTupleObject` allocates memory **exactly to fit its elements** at creation time (`ob_size == allocated` always).

Because tuples cannot be modified, CPython implements aggressive internal memory optimizations, including a **free list** for recycling deallocated tuple structures.

```mermaid
flowchart LR
    subgraph PyTupleObject ["PyTupleObject (No Over-allocation)"]
        ref["ob_refcnt: 1"]
        type["ob_type: &PyTuple_Type"]
        size["ob_size: 3"]
        items["ob_item: [ ptr0 | ptr1 | ptr2 ]"]
    end

    subgraph Objects ["Referenced Objects"]
        o0["'AI' (str)"]
        o1["2026 (int)"]
        o2["3.14 (float)"]
    end

    items --> o0
    items --> o1
    items --> o2
```

# Memory & Allocation Speed Comparison

```python
import sys
import timeit

# 1. Memory Overhead Comparison
empty_tuple = ()
empty_list = []
print(f"Empty tuple size: {sys.getsizeof(empty_tuple)} bytes")  # 40 bytes
print(f"Empty list size:  {sys.getsizeof(empty_list)} bytes")   # 56 bytes

t3 = (1, 2, 3)
l3 = [1, 2, 3]
print(f"3-item tuple size: {sys.getsizeof(t3)} bytes")          # 64 bytes
print(f"3-item list size:  {sys.getsizeof(l3)} bytes")          # 80 bytes (+ over-allocation)

# 2. Allocation Speed Comparison (10 million iterations)
t_tuple = timeit.timeit("(1, 2, 3, 4, 5)", number=10_000_000)
t_list  = timeit.timeit("[1, 2, 3, 4, 5]", number=10_000_000)

print(f"Tuple creation time: {t_tuple:.3f} s")
print(f"List creation time:  {t_list:.3f} s")
print(f"Tuple is {t_list / t_tuple:.2f}x faster to allocate!")
```

### Why Tuple Allocation is Faster:
1. **No Over-allocation calculation**: Computes fixed byte size immediately.
2. **CPython Tuple Free List**: CPython maintains an array of recycled empty tuple objects and tuple structures up to length 20. Creating and destroying small tuples avoids hitting the system `malloc()`/`free()`.
3. **Compiler Constant Folding**: In bytecode, tuple literals composed of constants (e.g. `(1, 2, 3)`) are compiled directly into the code object's `co_consts` as a single pre-built tuple object.

# Hashability: When Can a Tuple Be a Dict Key?

A tuple is hashable **if and only if all of its elements are hashable**:

```python
# Hashable tuple: Contains only immutables (int, str)
coord = (10, 20, "grid_A")
print("Hash:", hash(coord))
d = {coord: "Target"}  # VALID!

# Unhashable tuple: Contains a mutable list
invalid_coord = (10, [20, 30])
try:
    hash(invalid_coord)
except TypeError as e:
    print("Error:", e)  # TypeError: unhashable type: 'list'
```

# AI Connection

> [!AI]
> In PyTorch, tensor shapes are instances of `torch.Size`, which subclasses Python's `tuple`. Because shapes are immutable tuples, they are hashable and can serve directly as cache keys in compiled kernel dispatch tables (e.g., in TorchDynamo and Triton kernel caches) without risk of mutation.

# Exercises

**🟢 Basic**: Demonstrate that `(42)` is an integer whereas `(42,)` is a tuple. Inspect their types and `sys.getsizeof()`.

**🟡 Intermediate**: Write a function `deep_freeze(data)` that takes any nested structure of lists and dictionaries and recursively converts all lists to tuples and all dicts to tuples of sorted items.

**🔴 Advanced**: Write a Cython or C extension that measures the allocation throughput of CPython's tuple free-list versus direct heap malloc calls across 10,000,000 allocations.
""")

write_file("content/part-01-python-properly/chapter-05-tuples/5.2-tuple-unpacking.md", """---
id: "5.2"
part: 1
chapter: 5
title: "Tuple Packing, Unpacking & Pattern Matching"
slug: "tuple-unpacking"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["5.1"]
tags: ["unpacking", "pattern-matching", "pep634", "syntax"]
status: "published"
---

# Concept

Tuple packing and unpacking are fundamental Python idioms that allow multi-variable assignment, function return clustering, and structural pattern matching (PEP 634).

```python
# Packing (commas create the tuple, not parentheses!)
point = 10, 20, 30  # Packed into tuple (10, 20, 30)

# Unpacking
x, y, z = point
print(f"x={x}, y={y}, z={z}")

# Variable Swap (atomic evaluation without temporary variable)
a, b = 100, 200
a, b = b, a  # Evaluates right side as tuple (200, 100) then unpacks into a, b
print(f"a={a}, b={b}")  # a=200, b=100
```

# Extended Iterable Unpacking (`*rest`)

Python 3 introduced the starred target `*` for unpacking variable-length sequences:

```python
record = ("John", "Doe", "Engineer", "Python", "C++", "Rust", 120000)

first_name, last_name, title, *skills, salary = record

print(f"Name:   {first_name} {last_name}")
print(f"Title:  {title}")
print(f"Skills: {skills}")  # ['Python', 'C++', 'Rust'] (always unpacked as list)
print(f"Salary: ${salary:,}")
```

# Structural Pattern Matching (PEP 634 `match/case`)

Introduced in Python 3.10, structural pattern matching allows declarative inspection and destructuring of tuple records:

```python
def process_command(event):
    match event:
        case ("MOVE", x, y) if x >= 0 and y >= 0:
            print(f"Moving to positive coordinates: ({x}, {y})")
        case ("MOVE", x, y):
            print(f"Moving to negative/origin coordinates: ({x}, {y})")
        case ("SET_COLOR", (r, g, b)):
            print(f"Setting RGB color: R={r}, G={g}, B={b}")
        case ("QUIT", *reasons):
            print(f"Quitting. Reason code: {reasons}")
        case _:
            print(f"Unknown command format: {event}")

process_command(("MOVE", 15, 30))
process_command(("SET_COLOR", (255, 128, 0)))
process_command(("QUIT", "User terminated", 101))
```

# Exercises

**🟢 Basic**: Write a function that accepts an arbitrary list of numbers and returns the first element, the last element, and the average of all middle elements using extended unpacking.

**🟡 Intermediate**: Implement a parser using Python 3.10 `match/case` that evaluates 2D geometric commands (`("RECT", w, h)`, `("CIRCLE", r)`, `("LINE", (x1, y1), (x2, y2))`) and computes their bounding areas.

**🔴 Advanced**: Analyze the bytecode produced by `a, b = b, a` using `dis.dis()` and explain why no temporary local name is allocated in the Python frame.
""")

write_file("content/part-01-python-properly/chapter-05-tuples/5.3-namedtuples.md", """---
id: "5.3"
part: 1
chapter: 5
title: "namedtuple vs typing.NamedTuple vs dataclass"
slug: "namedtuples"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["5.1"]
tags: ["namedtuple", "dataclass", "types", "memory-comparison"]
status: "published"
---

# Concept

When building lightweight data records, Python offers three primary abstractions:
1. `collections.namedtuple`: Factory function producing a tuple subclass with named field access.
2. `typing.NamedTuple`: Class-based syntax with type annotation support (subclasses `tuple`).
3. `dataclasses.dataclass`: Code generator for custom mutable or frozen classes with full `__dict__` or `__slots__` support.

# Comprehensive Comparison Matrix

| Feature | `collections.namedtuple` | `typing.NamedTuple` | `@dataclass` (default) | `@dataclass(slots=True)` |
|---|---|---|---|---|
| **Base Class** | Subclasses `tuple` | Subclasses `tuple` | Subclasses `object` | Subclasses `object` |
| **Mutability** | Immutable | Immutable | **Mutable** | **Mutable** (or `frozen=True`) |
| **Memory per Instance** | **Exact (No `__dict__`)** | **Exact (No `__dict__`)** | High (Has `__dict__`) | **Low (`__slots__`)** |
| **Indexable like Tuple** | Yes (`p[0]`) | Yes (`p[0]`) | No (`p[0]` fails) | No |
| **Type Annotations** | No | **Yes** | **Yes** | **Yes** |
| **Default Field Values** | Limited | **Yes** | **Yes** | **Yes** |
| **Method Customization** | Awkward | **Clean (class body)** | **Clean** | **Clean** |

# Code Implementations & Benchmarks

```python
import sys
from collections import namedtuple
from typing import NamedTuple
from dataclasses import dataclass

# 1. collections.namedtuple
PointNT = namedtuple('PointNT', ['x', 'y', 'z'])

# 2. typing.NamedTuple
class PointTyped(NamedTuple):
    x: float
    y: float
    z: float = 0.0

# 3. Standard dataclass (stores attributes in __dict__)
@dataclass
class PointDC:
    x: float
    y: float
    z: float = 0.0

# 4. Slotted dataclass (stores attributes in fixed C array slots)
@dataclass(slots=True)
class PointDCSlots:
    x: float
    y: float
    z: float = 0.0

p1 = PointNT(1.0, 2.0, 3.0)
p2 = PointTyped(1.0, 2.0, 3.0)
p3 = PointDC(1.0, 2.0, 3.0)
p4 = PointDCSlots(1.0, 2.0, 3.0)

print(f"PointNT (namedtuple) memory:      {sys.getsizeof(p1)} bytes")
print(f"PointTyped (typing.NamedTuple):  {sys.getsizeof(p2)} bytes")
print(f"PointDC (Standard dataclass):    {sys.getsizeof(p3)} bytes + __dict__ ({sys.getsizeof(p3.__dict__)} bytes) = {sys.getsizeof(p3) + sys.getsizeof(p3.__dict__)} bytes")
print(f"PointDCSlots (Slotted dataclass): {sys.getsizeof(p4)} bytes")
```

**Memory Footprint Output:**
```text
PointNT (namedtuple) memory:      64 bytes
PointTyped (typing.NamedTuple):  64 bytes
PointDC (Standard dataclass):    48 bytes + __dict__ (104 bytes) = 152 bytes
PointDCSlots (Slotted dataclass): 64 bytes
```

# When to Choose Which?

- Use **`typing.NamedTuple`** when: You need an immutable, hashable, lightweight record that must unpack like a tuple (e.g. `x, y, z = point`) with full IDE type hinting.
- Use **`@dataclass(slots=True)`** when: You need object-oriented methods, mutability, inheritance, custom `__post_init__` validation, or complex default factories.

# AI Connection

> [!AI]
> In LLM inference engines (e.g., Hugging Face Transformers), token generation outputs (`ModelOutput`, `GenerateOutput`) inherit from custom subclassed `NamedTuple` or dataclasses. This allows callers to either unpack outputs as a standard tuple `loss, logits = model(**inputs)` or access fields by name `output.logits`.

# Exercises

**🟢 Basic**: Define a `typing.NamedTuple` representing an RGB color with a custom method `to_hex()` returning `#RRGGBB`.

**🟡 Intermediate**: Measure the execution speed of field attribute access (`p.x`) versus index access (`p[0]`) across 10,000,000 accesses for `NamedTuple` vs slotted `dataclass`.

**🔴 Advanced**: Implement a serialization utility that automatically converts nested `typing.NamedTuple` hierarchies into JSON-compatible dictionaries while handling date/time and custom primitive encoders.
""")

# ==============================================================================
# CHAPTER 6: DICTIONARIES & HASH TABLES
# ==============================================================================

write_file("content/part-01-python-properly/chapter-06-dictionaries-hash-tables/6.1-hash-table-foundations.md", """---
id: "6.1"
part: 1
chapter: 6
title: "Hash Table Foundations & __hash__"
slug: "hash-table-foundations"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["2.2", "2.6"]
tags: ["hash", "hash-table", "hashable", "cpython", "siphash"]
status: "published"
---

# Concept

A **hash table** is a data structure that maps keys to values in $O(1)$ average time. It computes an integer hash code from the key using a hash function, reduces that hash modulo the table capacity to find an index, and stores/retrieves the value.

In Python, for an object to be usable as a dictionary key or set element, it must be **hashable**.

```mermaid
flowchart LR
    Key["Key: 'user_name'"] --> HashFn["hash(key) -> 64-bit integer<br>(SipHash-2-4)"]
    HashFn --> Modulo["index = hash & (table_size - 1)"]
    Modulo --> BucketTable["Hash Table Bucket Array"]
    BucketTable --> Entry["Entry: (hash, key_ptr, value_ptr)"]
```

# The Hashability Contract

An object is hashable if:
1. It implements `__hash__()` which returns an integer that remains **constant for the object's entire lifetime**.
2. It implements `__eq__()` for equality comparison.
3. **The Invariant**: If two objects compare equal (`a == b`), they **must** produce the exact same hash value:
$$a == b \implies \text{hash}(a) == \text{hash}(b)$$

```python
# Demonstrating the contract
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return isinstance(other, Point) and self.x == other.x and self.y == other.y

    def __hash__(self):
        # Combine hashes of immutable coordinate tuple
        return hash((self.x, self.y))

p1 = Point(3, 4)
p2 = Point(3, 4)

print(f"p1 == p2: {p1 == p2}")          # True
print(f"Same hash? {hash(p1) == hash(p2)}")  # True
d = {p1: "Treasure Location"}
print(f"Lookup via p2: {d[p2]}")       # "Treasure Location" (O(1) success!)
```

# Hash Randomization & SipHash-2-4

To prevent **HashDoS attacks** (where an attacker crafts adversarial strings that collide into the same bucket, degrading $O(1)$ lookups into $O(N)$ Denial-of-Service attacks), Python uses **SipHash-2-4** with a random seed initialized at interpreter startup:

```python
# Strings have different hash values across different Python process runs!
import sys
print(f"String hash: {hash('hello_world')}")
print(f"Hash seed info: {sys.hash_info.algorithm}")  # 'siphash24'
```

# Common Mistakes & Anti-Patterns

## Mistake: Mutable Object Defining `__hash__`
```python
# FATAL TRAP: Modifying attributes changes hash, making it IMPOSSIBLE to find in dict!
class MutableKey:
    def __init__(self, val):
        self.val = val
    def __hash__(self):
        return hash(self.val)
    def __eq__(self, other):
        return self.val == other.val

key = MutableKey(10)
d = {key: "Secret Value"}

# Mutate key state
key.val = 99  # Hash changes!

# Lookup fails even though 'key' is the exact same object in memory!
print(key in d)  # False! (Looked up in wrong hash bucket)
```

# AI Connection

> [!AI]
> In Vector Search and Information Retrieval, **Locality-Sensitive Hashing (LSH)** flips standard hash table properties: instead of minimizing collisions, LSH hashes similar high-dimensional embedding vectors into the *same* hash bucket with high probability, enabling $O(1)$ sub-linear approximate nearest neighbor retrieval.

# Exercises

**🟢 Basic**: Write a custom immutable `FrozenColor` class with `r, g, b` attributes that satisfies the Python hashability contract and can be stored in a `set`.

**🟡 Intermediate**: Write a simulation that measures the collision rate of Python's built-in `hash()` versus a naive modulo hash function when inserting 100,000 random string keys into a table of size 16,384.

**🔴 Advanced**: Implement a custom dictionary class in pure Python that implements open addressing with linear probing and explain what happens when keys are deleted without using a tombstone marker.
""")

write_file("content/part-01-python-properly/chapter-06-dictionaries-hash-tables/6.2-compact-dict.md", """---
id: "6.2"
part: 1
chapter: 6
title: "Compact Dict Layout (PEP 468) & Sparse Indices"
slug: "compact-dict"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["6.1"]
tags: ["cpython", "pep468", "memory-layout", "dict", "internals"]
status: "published"
---

# Concept

Prior to Python 3.6, `PyDictObject` was a sparse hash table array where each bucket stored `(hash, key_ptr, value_ptr)`. Because hash tables must maintain low load factors (at least 1/3 empty space) to avoid collisions, ~33% to 66% of this large 24-byte struct array was completely wasted memory.

In Python 3.6+ (standardized in Python 3.7 via PEP 468), CPython adopted the **Compact Dict Layout** invented by Raymond Hettinger and PyPy.

```mermaid
flowchart TD
    subgraph SparseIndices ["Sparse Indices Array (Small integers: int8 / int16)"]
        i0["Index 0: -1 (empty)"]
        i1["Index 1:  0 (points to entries[0])"]
        i2["Index 2: -1 (empty)"]
        i3["Index 3:  1 (points to entries[1])"]
        i4["Index 4: -1 (empty)"]
    end

    subgraph DenseEntries ["Dense Entries Array (Contiguous, Ordered by Insertion)"]
        e0["entries[0]: { hash: 0x4a1, key: 'name', value: 'Alice' }"]
        e1["entries[1]: { hash: 0x9b2, key: 'role', value: 'Lead' }"]
    end

    i1 --> e0
    i3 --> e1
```

# Why This Architecture is Revolutionary

1. **30% to 40% Memory Savings**:
   - The sparse table now stores only small integer indices (`int8_t` for tables $< 128$ items = 1 byte per slot).
   - The large 24-byte `PyDictKeyEntry` structs are packed densely in sequential insertion order without empty gaps.
2. **Guaranteed Insertion-Order Iteration**:
   - Iterating keys, values, or items is simply a linear scan over the dense `entries` array from index $0$ to `size - 1`.
3. **Fast Iteration Speed**:
   - Iteration no longer skips empty sparse buckets, eliminating CPU branch mispredictions.

# Under the Hood: CPython Struct Layout

From CPython's `Objects/dict-common.h`:

```c
struct _dictkeyentry {
    Py_hash_t me_hash;   /* 64-bit cached hash code */
    PyObject *me_key;    /* Pointer to key object */
    PyObject *me_value;  /* Pointer to value object */
};

typedef struct {
    PyObject_HEAD
    Py_ssize_t ma_used;      /* Number of active items */
    uint64_t ma_version_tag; /* Version counter for optimization */
    PyDictKeysObject *ma_keys; /* Pointer to shared/combined keys table */
    PyDictValues *ma_values; /* For split-table dicts in class instances */
} PyDictObject;
```

# Step-by-Step Lookup Trace (`d['name']`)

```text
Given: d = {'name': 'Alice', 'role': 'Lead'}

1. Compute hash: h = hash('name') = 0x...4a1
2. Find index bucket: bucket_idx = h & (indices_table_size - 1) = 1
3. Read sparse table: entry_idx = sparse_indices[1] = 0
4. Inspect dense entry: target = entries[0]
5. Verify match:
   a. target.me_hash == h (True)
   b. target.me_key is 'name' OR target.me_key == 'name' (True)
6. Return target.me_value ('Alice') -> O(1) Instant Return!
```

# Exercises

**🟢 Basic**: Write a script demonstrating that iterating `d.keys()` in Python 3.7+ strictly preserves insertion order even after deleting and inserting new keys.

**🟡 Intermediate**: Calculate the exact byte memory footprint of storing 1,000 key-value pairs in a legacy sparse dict versus the modern compact dict layout.

**🔴 Advanced**: Implement a compact dictionary in pure Python using an `array.array('b')` for sparse indices and a contiguous list for dense entry tuples.
""")

write_file("content/part-01-python-properly/chapter-06-dictionaries-hash-tables/6.3-collision-resolution.md", """---
id: "6.3"
part: 1
chapter: 6
title: "Collision Resolution: Open Addressing & Probing"
slug: "collision-resolution"
difficulty: "advanced"
estimated_minutes: 25
prerequisites: ["6.1", "6.2"]
tags: ["open-addressing", "probing", "cpython", "algorithms", "collisions"]
status: "published"
---

# Concept

When two distinct keys produce hash values that map to the same bucket index ($h_1 \pmod N == h_2 \pmod N$), a **hash collision** occurs.

Unlike Java (which uses Separate Chaining with linked lists/red-black trees), CPython uses **Open Addressing** with a proprietary **Pseudo-Random Perturbation Probing** sequence.

# CPython's Perturbation Probing Formula

Linear probing ($i = (i + 1) \pmod N$) suffers from severe **clustering** (contiguous blocks of occupied slots that slow down lookups). CPython avoids clustering by incorporating the upper bits of the 64-bit hash code into the probe sequence:

$$j = (5 \cdot j + 1 + \text{perturb}) \pmod N$$
$$\text{perturb} \gg= 5$$

```python
# Simulation of CPython's probe sequence calculation
def simulate_cpython_probes(hash_code, table_size=8):
    mask = table_size - 1
    j = hash_code & mask
    perturb = hash_code
    probes = [j]
    
    while len(probes) < table_size:
        j = (5 * j + 1 + perturb) & mask
        perturb >>= 5
        probes.append(j)
        if len(set(probes)) == table_size:
            break
            
    return probes

print("Probe sequence for hash 0x12345678 (size 8):", simulate_cpython_probes(0x12345678))
```

# Deletion & Tombstones (Dummy Entries)

In open addressing, you cannot simply erase a bucket on deletion; doing so would break the probe chain for keys inserted *after* the deleted item.

CPython replaces deleted entries with a special sentinel marker called a **Dummy (Tombstone)** entry. During lookup:
- **Search probe**: Continues past dummy entries.
- **Insert probe**: Can reuse dummy slots for new insertions.

# Exercises

**🟢 Basic**: Write a python script that forces a hash collision between two custom objects and verifies that both keys can still be retrieved correctly from a single dictionary.

**🟡 Intermediate**: Simulate a hash table with deletion and demonstrate why removing an item without leaving a tombstone marker causes subsequent lookups to raise `KeyError`.

**🔴 Advanced**: Implement CPython's exact perturbation probing formula in C or Rust and benchmark probe lengths under load factors of 50%, 66%, and 90%.
""")

write_file("content/part-01-python-properly/chapter-06-dictionaries-hash-tables/6.4-dict-resizing-collections.md", """---
id: "6.4"
part: 1
chapter: 6
title: "Dict Resizing, Load Factor & defaultdict/Counter"
slug: "dict-resizing-collections"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["6.2", "6.3"]
tags: ["resizing", "collections", "defaultdict", "counter", "load-factor"]
status: "published"
---

# Concept

To maintain $O(1)$ average lookup times, a hash table must never become too full. The **Load Factor** is defined as:

$$\text{Load Factor} = \frac{\text{Active Items}}{\text{Total Capacity}}$$

CPython enforces a maximum load factor of **$2/3$ ($\approx 66.6\%$)**. As soon as $2/3$ of the available slots are filled, the dictionary automatically triggers a **resize operation** (quadrupling capacity from 8 $\to$ 32 $\to$ 128 $\to$ 512 for small dicts, and doubling for large dicts).

# Specialized Collections: `defaultdict` & `Counter`

The standard library `collections` module provides specialized, high-performance dictionary subclasses implemented in C:

```python
import collections

# 1. collections.defaultdict (Eliminates KeyError via factory function)
graph = collections.defaultdict(list)
graph["node_A"].append("node_B")  # Automatically initializes empty list on first access!
print(dict(graph))  # {'node_A': ['node_B']}

# 2. collections.Counter (Multiset with O(N) frequency counting)
token_stream = ["the", "transformer", "attention", "the", "transformer", "the"]
counts = collections.Counter(token_stream)
print("Top 2 tokens:", counts.most_common(2))  # [('the', 3), ('transformer', 2)]

# Counter arithmetic
c1 = collections.Counter(a=3, b=1)
c2 = collections.Counter(a=1, b=2)
print("Combined:", c1 + c2)  # Counter({'a': 4, 'b': 3})
```

# Exercises

**🟢 Basic**: Use `collections.Counter` to find the 5 most frequent 2-character n-grams in a text corpus.

**🟡 Intermediate**: Implement an inverted document index using `collections.defaultdict(set)` that maps words to document IDs.

**🔴 Advanced**: Write a custom dictionary subclass `LRUDict` using a doubly-linked list that evicts the least-recently accessed key when reaching a capacity limit of $K$ items.
""")

print("Chapters 5 & 6 authored with supreme depth!")
