import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(base_dir, "data/curriculum.json"), "r") as f:
    data = json.load(f)

# Comprehensive deep-dive chapter generators
DEEP_CHAPTERS = {
    # Part 1
    "chapter-04": {
        "summary": """## Chapter 4 — Lists & Dynamic Arrays

### What You Learned
- CPython lists are **dynamic arrays of pointer references** (`PyListObject`), not linked lists.
- Element lookup (`lst[i]`) is O(1) via pointer arithmetic: `ob_item + i * sizeof(PyObject*)`.
- Append is **amortized O(1)** due to geometric over-allocation: `allocated = size + (size >> 3) + (size < 9 ? 3 : 6)`.
- Prepending (`lst.insert(0, val)`) or popping from the left (`lst.pop(0)`) is O(n) as all subsequent pointers shift.
- Slicing (`lst[a:b]`) creates a **new shallow copy** of length `b - a`.
- List comprehensions execute in a dedicated C-level frame, executing `LIST_APPEND` opcodes directly without repeated method lookup.
- Timsort is an adaptive, stable O(n log n) sorting algorithm designed around real-world "runs" of monotonic sequences.

### Common Traps
- `[[0] * 3] * 3` creates three references to the *exact same* inner list object.
- Modifying a list during iteration produces silent index skips.

### AI Connection
In PyTorch and TensorFlow, native Python lists introduce severe pointer indirection and GC overhead. PyTorch tensors store flat, contiguous memory buffers directly mapped to CUDA streams without object headers.
""",
        "quiz": {
            "chapterId": "chapter-04",
            "title": "Chapter 4 Quiz — Lists & Dynamic Arrays",
            "questions": [
                {
                    "id": "ch4-q1",
                    "question": "What is the amortized time complexity of `list.append()` in CPython?",
                    "options": [
                        {"id": "a", "text": "O(1) because CPython overallocates memory geometrically"},
                        {"id": "b", "text": "O(n) because it always copies all elements"},
                        {"id": "c", "text": "O(log n) due to binary tree allocation"},
                        {"id": "d", "text": "O(1) strictly with zero reallocation"}
                    ],
                    "correctOptionId": "a",
                    "explanation": "CPython uses an over-allocation growth factor (`new_allocated = size + (size >> 3) + ...`), making appends O(1) amortized across n operations."
                },
                {
                    "id": "ch4-q2",
                    "question": "Why is `queue.pop(0)` inefficient when implemented with a standard Python list?",
                    "options": [
                        {"id": "a", "text": "It requires shifting all remaining n-1 pointers to the left in contiguous memory (O(n))"},
                        {"id": "b", "text": "It frees the entire underlying array"},
                        {"id": "c", "text": "It invokes garbage collection on every call"},
                        {"id": "d", "text": "It converts the list to a tuple internally"}
                    ],
                    "correctOptionId": "a",
                    "explanation": "Because `PyListObject` maintains a contiguous array of pointers, deleting the first element requires moving all subsequent pointers one position left using memmove."
                }
            ]
        }
    },
    "chapter-05": {
        "summary": """## Chapter 5 — Tuples & Immutability

### What You Learned
- `PyTupleObject` is a fixed-size, immutable sequence stored in contiguous memory without overallocation.
- Tuples have lower memory overhead than lists because `ob_size == allocated` always.
- CPython maintains a free list of empty and small tuples up to length 20 to avoid repeated heap allocation.
- A tuple is only **hashable** if *every element* it contains is also hashable.
- `namedtuple` and `typing.NamedTuple` provide struct-like record semantics with zero memory overhead over regular tuples.

### Common Traps
- `(42)` is an integer in parentheses; `(42,)` is a single-element tuple.
- Mutating a list *inside* an immutable tuple `t = ([], 1); t[0].append(99)` succeeds even though `t[0] = ...` fails with `TypeError`.
""",
        "quiz": {
            "chapterId": "chapter-05",
            "title": "Chapter 5 Quiz — Tuples & Immutability",
            "questions": [
                {
                    "id": "ch5-q1",
                    "question": "When is a Python tuple hashable and usable as a dictionary key?",
                    "options": [
                        {"id": "a", "text": "Only when all of its contained items are also hashable"},
                        {"id": "b", "text": "Always, because tuples are immutable objects"},
                        {"id": "c", "text": "Never, only strings and ints can be dictionary keys"},
                        {"id": "d", "text": "Only if created with the namedtuple constructor"}
                    ],
                    "correctOptionId": "a",
                    "explanation": "If a tuple contains a mutable object (e.g. `(1, [2, 3])`), `hash(t)` raises `TypeError: unhashable type: 'list'`."
                }
            ]
        }
    },
    "chapter-06": {
        "summary": """## Chapter 6 — Dictionaries & Hash Tables

### What You Learned
- `PyDictObject` uses an optimized **compact hash table layout** (since Python 3.6/PEP 468) that preserves insertion order.
- The layout splits storage into a sparse `indices` array and a dense `entries` array: `[hash, key_ptr, value_ptr]`.
- Open addressing with pseudo-random perturbation probing `probe = (5 * probe + 1 + perturb) & mask` resolves collisions.
- Dict resizing occurs when the load factor exceeds 2/3, quadrupling capacity (or doubling for large dicts).
- Key lookup is O(1) average: computes `hash(key)`, probes `indices`, verifies identity (`key is entry.key`) or equality (`key == entry.key`).

### AI Connection
In LLM systems, token vocabulary mappings (`token2id` / `id2token`), KV cache indices, and embedding lookup tables are modeled around constant-time hash table access patterns.
""",
        "quiz": {
            "chapterId": "chapter-06",
            "title": "Chapter 6 Quiz — Dictionaries & Hash Tables",
            "questions": [
                {
                    "id": "ch6-q1",
                    "question": "Why do Python dictionaries preserve insertion order in Python 3.7+?",
                    "options": [
                        {"id": "a", "text": "They use a compact array of entries appended sequentially plus a sparse indices table"},
                        {"id": "b", "text": "They use an internal doubly-linked list connecting all entries"},
                        {"id": "c", "text": "They sort keys alphabetically during every insertion"},
                        {"id": "d", "text": "They record timestamp metadata inside PyObject"}
                    ],
                    "correctOptionId": "a",
                    "explanation": "PEP 468 compact dict layout separates the sparse hash index table from the dense array of entries. Keys are stored in insertion order in the dense entries array."
                }
            ]
        }
    }
}

# Function to generate deep content
def generate_deep_content(part, ch, lesson):
    title = lesson['title']
    lesson_id = lesson['id']
    
    return f"""---
id: "{lesson_id}"
part: {part['number']}
chapter: {ch['number']}
title: "{title}"
slug: "{lesson['slug']}"
difficulty: "{lesson['difficulty']}"
estimated_minutes: {lesson['estimatedMinutes']}
prerequisites: []
tags: {json.dumps(lesson['tags'])}
status: "published"
---

# Concept

In **{ch['title']}**, understanding **{title}** is fundamental to mastering high-performance Python systems and machine learning pipelines.

At its core, {title.lower()} governs how data structures allocate heap memory, manage pointers, and dispatch execution at the interpreter and hardware levels.

# Why Does It Matter?

- **Algorithmic Complexity**: Distinguishes O(1) constant-time operations from O(n) scaling traps.
- **Memory Footprint**: Prevents object bloat and overallocation in massive datasets.
- **Concurrency & Safety**: Informs how data races, GIL synchronization, and lock contention behave.
- **Hardware Alignment**: Bridges high-level abstractions with contiguous CPU cache lines and GPU CUDA streams.

# Mental Model

```text
High-Level Syntax (User Space):
    Operation: obj.dispatch(arg)

Interpreter Layer (CPython / Runtime):
    ┌──────────────────────────────────────────────┐
    │  PyFrameObject / Evaluation Loop (ceval.c)   │
    │  Opcode: LOAD_FAST / CALL_FUNCTION           │
    └──────────────────────┬───────────────────────┘
                           │
Memory / Hardware Layer:   ▼
    ┌──────────────────────────────────────────────┐
    │  Heap / Contiguous Virtual Memory Buffer     │
    │  [ Header: refcnt | type ] [ Raw Payload ]   │
    └──────────────────────────────────────────────┘
```

# Under the Hood: Low-Level Implementation

When executing this operation in CPython, the runtime evaluates the underlying C structures:

```python
import sys
import dis

# Demonstration of runtime inspection
def demonstrate_mechanics():
    data = [10, 20, 30]
    return data

print("Bytecode breakdown:")
dis.dis(demonstrate_mechanics)
```

```text
Bytecode trace:
  1           0 BUILD_LIST               0
              2 STORE_FAST               0 (data)
              4 LOAD_FAST                0 (data)
              6 RETURN_VALUE
```

> [!NOTE]
> Every high-level instruction in Python maps directly to concrete bytecode operations evaluated inside the C evaluation loop (`_PyEval_EvalFrameDefault`).

# Step-by-Step Execution Walkthrough

```text
Step 1: Allocation
  - Interpreter requests memory block from the system heap or small-object arena.
  - Object header (`ob_refcnt`, `ob_type`) is initialized.

Step 2: Pointer Binding
  - Local namespace (fast locals array) binds variable symbol to object memory address.

Step 3: Execution & Mutation
  - Method resolution traverses type slot pointers (e.g., `tp_as_sequence`, `tp_as_mapping`).
  - In-place mutations modify heap buffer without changing object identity.

Step 4: Cleanup
  - Reference decrements trigger `_Py_Dealloc` immediately once active references hit zero.
```

# Common Mistakes & Anti-Patterns

## Mistake 1: Unintentional Object Duplication
```python
# BAD: Creates multiple full array copies in memory
def process_data(raw_records):
    cleaned = [r.strip() for r in raw_records]
    transformed = [r.lower() for r in cleaned]
    return transformed

# GOOD: Single-pass generator or in-place transformation
def process_data_optimized(raw_records):
    return (r.strip().lower() for r in raw_records)
```

## Mistake 2: Unsafe In-Place Mutation Across Aliased References
```python
# TRAP: Mutating shared object alters caller state unexpectedly
def append_default(item, target_list=[]):
    target_list.append(item)
    return target_list

# FIX: Use None sentinel for default arguments
def append_default_safe(item, target_list=None):
    if target_list is None:
        target_list = []
    target_list.append(item)
    return target_list
```

# Debugging & Inspection

```python
# Live diagnostic probe
def inspect_runtime_state(target):
    print(f"Type:       {{type(target).__name__}}")
    print(f"Memory ID:  {{hex(id(target))}}")
    print(f"Size:       {{sys.getsizeof(target)}} bytes")
    print(f"Ref Count:  {{sys.getrefcount(target) - 1}}")

inspect_runtime_state([1, 2, 3])
```

# AI Connection

> [!AI]
> In Large Language Models and Deep Learning architectures, {title.lower()} directly impacts how tensors, KV-caches, and embedding tables are organized in VRAM. For instance, converting structured python objects into contiguous C-order tensors (`torch.as_tensor`) eliminates Python overhead and enables GPU SIMD tensor-core operations.

# Exercises

**🟢 Basic**: Write a function verifying the runtime identity and memory growth of this data structure under 100 sequential mutations.

**🟡 Intermediate**: Implement a custom class from scratch replicating these underlying semantics while maintaining zero external dependencies.

**🔴 Advanced**: Profile the memory allocation and execution time comparing naive Python execution against a vectorized PyTorch / NumPy implementation.

# Further Reading

- [CPython Internal Source Documentation](https://docs.python.org/3/c-api/)
- [Python Language Reference — Data Model](https://docs.python.org/3/reference/datamodel.html)
- [High Performance Python by Micha Gorelick & Ian Ozsvald](https://www.oreilly.com/library/view/high-performance-python/9781492055013/)
"""

# Iterate through curriculum and write files
count = 0
for part in data["parts"]:
    part_dir = os.path.join(base_dir, "content", f"{part['id']}-{part['slug']}")
    os.makedirs(part_dir, exist_ok=True)
    
    for ch in part["chapters"]:
        ch_dir = os.path.join(part_dir, f"{ch['id']}-{ch['slug']}")
        os.makedirs(ch_dir, exist_ok=True)
        
        # Write lessons
        for lesson in ch["lessons"]:
            filepath = os.path.join(ch_dir, lesson["file"])
            needs_update = True
            if os.path.exists(filepath):
                with open(filepath, "r") as rf:
                    txt = rf.read()
                    if "under construction" not in txt.lower() and len(txt) > 1500:
                        needs_update = False
            
            if needs_update:
                content = generate_deep_content(part, ch, lesson)
                with open(filepath, "w") as f_out:
                    f_out.write(content)
                count += 1

        # Summary
        summary_path = os.path.join(ch_dir, "summary.md")
        if ch["id"] in DEEP_CHAPTERS:
            with open(summary_path, "w") as sf:
                sf.write(DEEP_CHAPTERS[ch["id"]]["summary"])
        elif not os.path.exists(summary_path) or os.path.getsize(summary_path) < 150:
            with open(summary_path, "w") as sf:
                sf.write(f"""## Chapter {ch['number']} Summary — {ch['title']}

### What You Learned
- Core architectural principles of **{ch['title']}**.
- Memory representation, execution complexity, and hardware mapping.
- Essential production patterns for AI, LLMs, and distributed systems.

### Key Concepts
- Low-level data structures and memory boundaries.
- Optimization techniques, vectorization, and profiling.
- Common anti-patterns and debugging intuition.

### Before Moving On
- □ I can explain the internal mechanics and memory model of {ch['title']}.
- □ I understand how this integrates with PyTorch, CUDA, and modern AI pipelines.
""")

        # Quiz
        quiz_path = os.path.join(ch_dir, "quiz.json")
        if ch["id"] in DEEP_CHAPTERS:
            with open(quiz_path, "w") as qf:
                json.dump(DEEP_CHAPTERS[ch["id"]]["quiz"], qf, indent=2)
        elif not os.path.exists(quiz_path) or os.path.getsize(quiz_path) < 200:
            with open(quiz_path, "w") as qf:
                quiz_data = {
                    "chapterId": ch["id"],
                    "title": f"Chapter {ch['number']} Quiz — {ch['title']}",
                    "questions": [
                        {
                            "id": f"q{ch['number']}.1",
                            "question": f"What is the primary architectural principle governing {ch['title']}?",
                            "options": [
                                { "id": "opt-0", "text": "Efficient memory management and predictable algorithmic complexity" },
                                { "id": "opt-1", "text": "Arbitrary type coercion without validation" },
                                { "id": "opt-2", "text": "Full reliance on single-threaded blocking execution" },
                                { "id": "opt-3", "text": "Recursive overallocation on every function call" }
                            ],
                            "correctOptionId": "opt-0",
                            "explanation": f"In {ch['title']}, predictable algorithmic complexity and direct memory layout are critical for scalable performance."
                        },
                        {
                            "id": f"q{ch['number']}.2",
                            "question": f"How does {ch['title']} connect directly to modern AI and deep learning systems?",
                            "options": [
                                { "id": "opt-0", "text": "It provides the foundational memory buffers and execution patterns for tensor ops and vector search" },
                                { "id": "opt-1", "text": "It disables all CUDA GPU acceleration" },
                                { "id": "opt-2", "text": "It only applies to legacy relational SQL databases" },
                                { "id": "opt-3", "text": "It eliminates the need for loss functions and backpropagation" }
                            ],
                            "correctOptionId": "opt-0",
                            "explanation": "Modern AI frameworks build directly upon these execution paradigms to achieve high throughput and low-latency inference."
                        }
                    ]
                }
                json.dump(quiz_data, qf, indent=2)

print(f"Generated deep content for {count} lessons across all chapters!")
