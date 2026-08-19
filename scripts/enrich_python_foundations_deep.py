import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
curriculum_path = os.path.join(base_dir, "data/curriculum.json")

with open(curriculum_path, "r", encoding="utf-8") as f:
    curriculum = json.load(f)

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# 1. NEW PYTHON CORE & SYSTEMS LESSONS METADATA
# ==============================================================================

new_python_lessons = [
    {
        "partId": "part-01",
        "chapterId": "chapter-01",
        "lesson": {
            "id": "1.6",
            "partId": "part-01",
            "chapterId": "chapter-01",
            "title": "Specializing Adaptive Interpreter & Tier-2 JIT (Python 3.11–3.13)",
            "slug": "specializing-adaptive-interpreter-jit",
            "file": "1.6-specializing-adaptive-interpreter-jit.md",
            "difficulty": "advanced",
            "estimatedMinutes": 35,
            "prerequisites": ["1.5"],
            "tags": ["jit", "tier2", "adaptive-interpreter", "quickening", "cpython"],
            "status": "published",
            "contentShape": "under-the-hood",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-01",
        "chapterId": "chapter-04",
        "lesson": {
            "id": "4.6",
            "partId": "part-01",
            "chapterId": "chapter-04",
            "title": "Timsort & Powersort: Natural Runs, Galloping Mode & Merge Invariants",
            "slug": "timsort-powersort-internals",
            "file": "4.6-timsort-powersort-internals.md",
            "difficulty": "advanced",
            "estimatedMinutes": 35,
            "prerequisites": ["4.3"],
            "tags": ["timsort", "powersort", "sorting", "galloping", "cpython"],
            "status": "published",
            "contentShape": "under-the-hood",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-01",
        "chapterId": "chapter-10",
        "lesson": {
            "id": "10.5",
            "partId": "part-01",
            "chapterId": "chapter-10",
            "title": "The Descriptor Protocol, Attribute Lookup Precedence & Metaclasses",
            "slug": "descriptors-metaclasses-internals",
            "file": "10.5-descriptors-metaclasses-internals.md",
            "difficulty": "advanced",
            "estimatedMinutes": 40,
            "prerequisites": ["10.4"],
            "tags": ["descriptors", "metaclasses", "getattr", "dunder-get", "cpython"],
            "status": "published",
            "contentShape": "under-the-hood",
            "openingType": "code"
        }
    },
    {
        "partId": "part-02",
        "chapterId": "chapter-15",
        "lesson": {
            "id": "15.4",
            "partId": "part-02",
            "chapterId": "chapter-15",
            "title": "Asyncio Event Loop Under the Hood: Epoll, Kqueue & Task Schedulers",
            "slug": "asyncio-event-loop-epoll-internals",
            "file": "15.4-asyncio-event-loop-epoll-internals.md",
            "difficulty": "advanced",
            "estimatedMinutes": 40,
            "prerequisites": ["15.1"],
            "tags": ["asyncio", "epoll", "kqueue", "event-loop", "coroutines"],
            "status": "published",
            "contentShape": "under-the-hood",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-02",
        "chapterId": "chapter-16",
        "lesson": {
            "id": "16.4",
            "partId": "part-02",
            "chapterId": "chapter-16",
            "title": "Free-Threaded Python (PEP 703): Biased Refcounting & Life Without the GIL",
            "slug": "free-threaded-python-no-gil",
            "file": "16.4-free-threaded-python-no-gil.md",
            "difficulty": "advanced",
            "estimatedMinutes": 45,
            "prerequisites": ["16.1"],
            "tags": ["gil", "pep-703", "free-threaded", "multithreading", "concurrency"],
            "status": "published",
            "contentShape": "case-study",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-02",
        "chapterId": "chapter-16",
        "lesson": {
            "id": "16.5",
            "partId": "part-02",
            "chapterId": "chapter-16",
            "title": "Zero-Copy Memory: The Python Buffer Protocol (Py_buffer) & memoryview",
            "slug": "zerocopy-memoryview-buffer-protocol",
            "file": "16.5-zerocopy-memoryview-buffer-protocol.md",
            "difficulty": "advanced",
            "estimatedMinutes": 35,
            "prerequisites": ["16.1", "2.2"],
            "tags": ["buffer-protocol", "memoryview", "zero-copy", "cpython", "performance"],
            "status": "published",
            "contentShape": "under-the-hood",
            "openingType": "code"
        }
    }
]

# Insert new lessons into curriculum.json
for item in new_python_lessons:
    pid = item["partId"]
    cid = item["chapterId"]
    new_l = item["lesson"]
    
    for part in curriculum["parts"]:
        if part["id"] == pid:
            for chapter in part["chapters"]:
                if chapter["id"] == cid:
                    existing_ids = [l["id"] for l in chapter["lessons"]]
                    if new_l["id"] not in existing_ids:
                        chapter["lessons"].append(new_l)
                        print(f"Added Lesson {new_l['id']} ({new_l['title']}) to Chapter {cid}!")

with open(curriculum_path, "w", encoding="utf-8") as f:
    json.dump(curriculum, f, indent=2)

# ==============================================================================
# 2. WRITE DETAILED LESSON CONTENT
# ==============================================================================

# Lesson 1.6: Specializing Adaptive Interpreter & Tier-2 JIT
write_file(r"content/part-01-python-properly/chapter-01-how-python-works/1.6-specializing-adaptive-interpreter-jit.md", r"""---
id: "1.6"
part: 1
chapter: 1
title: "Specializing Adaptive Interpreter & Tier-2 JIT (Python 3.11–3.13)"
slug: "specializing-adaptive-interpreter-jit"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["1.5"]
tags: ["jit", "tier2", "adaptive-interpreter", "quickening", "cpython"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The Faster CPython Architecture (PEP 659 & Python 3.13 JIT)

For three decades, CPython executed bytecode through a static `switch-case` loop inside `ceval.c`, dispatching generic opcodes with heavy type-checking overhead on every single instruction.

The **Faster CPython Project** (Guido van Rossum, Mark Shannon) introduced a multi-tier **Adaptive Specializing Interpreter and JIT**:

```mermaid
flowchart TD
    subgraph Tier0 ["Tier 0: Generic Bytecode (ceval.c)"]
        GenericOp["Generic Opcode: e.g. BINARY_OP_ADD<br>(Checks for int, float, str, list, custom __add__)"]
    end

    subgraph Tier1 ["Tier 1: Adaptive Quickening & Inline Caching (Python 3.11+)"]
        Counter["Execution Counter: Executes 8 times"]
        GenericOp --> Counter
        Counter --> SpecializedOp["Specialized Opcode in place:<br>BINARY_OP_ADD_INT (Direct C integer addition with overflow check!)"]
    end

    subgraph Tier2 ["Tier 2: Copy-and-Patch JIT Compiler (Python 3.13+)"]
        SpecializedOp --> HotTrace["Detects Hot Loop Trace (Super-Instructions)"]
        HotTrace --> JIT["Copy-and-Patch JIT Stencils:<br>Emits native x86-64 / ARM64 machine code directly into executable RAM!"]
    end
```

---

# How Inline Caching (Quickening) Works

When a generic opcode like `LOAD_ATTR` executes repeatedly on the same class, CPython rewrites the bytecode in memory to a specialized version:

```mermaid
flowchart LR
    Generic["LOAD_ATTR (Performs dictionary hash lookup in type __dict__)"] -->|After 8 identical calls| Special["LOAD_ATTR_INSTANCE_VALUE (Reads directly from fixed struct offset in obj->__dict__ array!)"]
    Special -->|Type De-optimization (if type changes)| Generic
```

### De-optimization Guard:
Each specialized opcode includes a lightweight **Type Guard Check**. If an unexpected type is passed, it cleanly de-optimizes back to the generic opcode without crashing.

---

# Inspecting Specialized Opcodes with `dis`

In Python 3.11+, you can pass `adaptive=True` to the `dis` module to inspect specialized opcodes:

```python
import dis

def add_numbers(a: int, b: int) -> int:
    return a + b

# Warm up the function to trigger specialization (needs ~8 calls)
for _ in range(50):
    add_numbers(10, 20)

# Disassemble with specialization enabled
print("Specialized Bytecode Trace:")
dis.dis(add_numbers, adaptive=True)
```

Notice that `BINARY_OP` is replaced at runtime with `BINARY_OP_ADD_INT`!

---

# The Copy-and-Patch JIT in Python 3.13

Traditional JITs (like PyPy or V8) use heavy intermediate representation (IR) optimization pipelines (LLVM), which add high compilation latency.

Python 3.13 uses **Copy-and-Patch JIT Compilation**:
1. At CPython build time, small C code fragments (stencils) are compiled into raw machine code with relocatable holes.
2. At runtime, the JIT simply **copies the pre-compiled binary machine code stencils into memory and patches the operand addresses**.
3. Compilation completes in **microseconds with zero runtime LLVM dependency**!

---

# Exercises & Challenges

**🟢 Challenge 1**: Write a benchmark loop adding integers vs adding custom class instances and observe the execution speedup from specialized opcodes.

**🟡 Challenge 2**: Explain why dynamic attribute deletion (`del obj.x`) or monkey-patching classes invalidates the specialized `LOAD_ATTR` inline cache.

**🔴 Challenge 3**: Inspect the CPython C source file `Python/bytecodes.c` and trace the C implementation of `BINARY_OP_ADD_INT` and its overflow fallback to `PyLong_Type.tp_as_number->nb_add`.
""")

# Lesson 4.6: Timsort & Powersort
write_file(r"content/part-01-python-properly/chapter-04-lists/4.6-timsort-powersort-internals.md", r"""---
id: "4.6"
part: 1
chapter: 4
title: "Timsort & Powersort: Natural Runs, Galloping Mode & Merge Invariants"
slug: "timsort-powersort-internals"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["4.3"]
tags: ["timsort", "powersort", "sorting", "galloping", "cpython"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The World's Most Successful Hybrid Sorting Algorithm

Python's built-in `list.sort()` and `sorted()` are powered by **Timsort** (Tim Peters, 2002) and its enhanced successor **Powersort** (Munro & Wild, integrated in Python 3.11+).

Timsort is an adaptive hybrid of **Binary Insertion Sort** and **Merge Sort** designed to exploit **natural existing order** in real-world data:

```mermaid
flowchart TD
    subgraph Phase1 ["1. Natural Run Identification & Minimum Run Extension"]
        RawData["Unsorted List"] --> FindRuns["Scan for Natural Strictly Increasing (a &lt;= b &lt;= c) or Strictly Decreasing runs (reversed in O(N))"]
        FindRuns --> MinRun["If Run &lt; minrun (32-64 elements): Extend using Binary Insertion Sort!"]
    end

    subgraph Phase2 ["2. Stack Invariant Management (Powersort Node Merging)"]
        MinRun --> Stack["Push Run to Pending Merge Stack"]
        Stack --> PowerMerge["Powersort: Computes merge power between adjacent runs to maintain near-optimal merge trees!"]
    end

    subgraph Phase3 ["3. Galloping Mode Merge"]
        PowerMerge --> Galloping["Merge adjacent runs with Galloping Mode exponential binary search!"]
    end
```

---

# The Mechanics of Galloping Mode

When merging two sorted runs $A$ and $B$, standard merge sort compares elements one-by-one ($A[0] < B[0]$).

If $A$ wins 7 consecutive times, Timsort switches into **Galloping Mode**:
1. It searches exponentially for where $B[0]$ belongs in $A$ by checking offsets $1, 3, 7, 15, 31, \dots, 2^k - 1$.
2. Once the bounding interval is found, it performs a **Binary Search** to copy a whole chunk of elements via high-speed `memmove` in a single operation!

$$\text{Reduces comparisons from } \mathcal{O}(N) \text{ to } \mathcal{O}(\log N) \text{ during one-sided streaks!}$$

---

# Powersort: Fixing the Timsort Merge Tree Imbalance

In 2018, researchers discovered that Timsort's stack merge invariant was slightly sub-optimal, sometimes producing unbalanced merge trees.

Python 3.11 adopted **Powersort**, which calculates the "power" (the most significant bit difference of midpoint fractions) between runs:

$$\text{Power}(R_1, R_2) = \text{MSB}\left( \frac{m_1}{N} \oplus \frac{m_2}{N} \right)$$

Powersort guarantees that runs are merged in a **near-optimal Huffman-like tree order**, minimizing total element comparisons.

---

# Python Simulation of Run Detection

```python
def find_natural_runs(arr: list[int]) -> list[list[int]]:
    if not arr:
        return []
    
    runs = []
    current_run = [arr[0]]
    
    for i in range(1, len(arr)):
        if arr[i] >= arr[i-1]:
            current_run.append(arr[i])
        else:
            runs.append(current_run)
            current_run = [arr[i]]
            
    runs.append(current_run)
    return runs

sample = [1, 2, 5, 8, 3, 4, 7, 2, 9, 10, 12]
detected_runs = find_natural_runs(sample)
print(f"Identified {len(detected_runs)} natural sorted runs:")
for idx, r in enumerate(detected_runs):
    print(f" Run {idx + 1}: {r}")
```

---

# Sorting Complexity Comparison

| Algorithm | Best Case (Already Sorted) | Average Case | Worst Case | Memory (Auxiliary) | Stable? |
|---|---|---|---|---|---|
| **QuickSort** | $\mathcal{O}(N \log N)$ | $\mathcal{O}(N \log N)$ | $\mathcal{O}(N^2)$ | $\mathcal{O}(\log N)$ | No |
| **Standard MergeSort** | $\mathcal{O}(N \log N)$ | $\mathcal{O}(N \log N)$ | $\mathcal{O}(N \log N)$ | $\mathcal{O}(N)$ | Yes |
| **Python Powersort / Timsort** | **$\mathcal{O}(N)$ (Linear Scan!)** | **$\mathcal{O}(N \log N)$** | **$\mathcal{O}(N \log N)$** | **$\mathcal{O}(N)$** | **Yes (Guaranteed)** |

---

# Exercises & Challenges

**🟢 Challenge 1**: Verify that sorting an already sorted 1,000,000-element list in Python takes $< 5\text{ ms}$ ($\mathcal{O}(N)$ run identification).

**🟡 Challenge 2**: Explain why Timsort strictly requires that reversed runs are strictly descending ($a > b > c$) to preserve stability when reversing.

**🔴 Challenge 3**: Implement a complete Binary Insertion Sort in Python and measure how many comparisons it saves over linear insertion sort on a 64-element list.
""")

# Lesson 10.5: Descriptors & Metaclasses
write_file(r"content/part-01-python-properly/chapter-10-oop/10.5-descriptors-metaclasses-internals.md", r"""---
id: "10.5"
part: 1
chapter: 10
title: "The Descriptor Protocol, Attribute Lookup Precedence & Metaclasses"
slug: "descriptors-metaclasses-internals"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["10.4"]
tags: ["descriptors", "metaclasses", "getattr", "dunder-get", "cpython"]
contentShape: "under-the-hood"
openingType: "code"
status: "published"
---

# Look at This Code: How `@property` and Methods Actually Work

In Python, functions, methods, `@property`, `@classmethod`, `@staticmethod`, and ORM fields (Django/SQLAlchemy/Pydantic) are all powered by a single fundamental CPython mechanism: **The Descriptor Protocol**.

```python
class Validator:
    def __set_name__(self, owner, name):
        self.private_name = f"_{name}"

    def __get__(self, instance, owner):
        if instance is None:
            return self # Accessed from class
        return getattr(instance, self.private_name, 0)

    def __set__(self, instance, value):
        if value < 0:
            raise ValueError("Value cannot be negative!")
        setattr(instance, self.private_name, value)

class BankAccount:
    balance = Validator() # Balance is a descriptor!

acc = BankAccount()
acc.balance = 500
print("Balance:", acc.balance) # Calls Validator.__get__
```

---

# CPython's 5-Step Attribute Lookup Precedence

When you execute `obj.attr`, CPython follows a strict, non-negotiable **5-Step Lookup Order** inside `type_getattro` (`Objects/typeobject.c`):

```mermaid
flowchart TD
    Start["obj.attr Access"] --> Step1{"1. Is 'attr' in type(obj) MRO and a DATA DESCRIPTOR (has __set__ or __delete__)?"}
    Step1 -- "Yes" --> CallDataDesc["Call data_descriptor.__get__(obj, type(obj))"]
    
    Step1 -- "No" --> Step2{"2. Is 'attr' in instance dictionary: obj.__dict__?"}
    Step2 -- "Yes" --> ReturnInstanceDict["Return obj.__dict__['attr']"]
    
    Step2 -- "No" --> Step3{"3. Is 'attr' in type(obj) MRO and a NON-DATA DESCRIPTOR (has only __get__, e.g. normal method)?"}
    Step3 -- "Yes" --> CallNonDataDesc["Call non_data_descriptor.__get__(obj, type(obj)) (Binds method to self!)"]
    
    Step3 -- "No" --> Step4{"4. Is 'attr' in type(obj) class dict?"}
    Step4 -- "Yes" --> ReturnClassDict["Return type(obj).__dict__['attr']"]
    
    Step4 -- "No" --> Step5{"5. Does type(obj) define __getattr__?"}
    Step5 -- "Yes" --> CallGetAttr["Call obj.__getattr__('attr')"]
    Step5 -- "No" --> RaiseAttrError["Raise AttributeError!"]
```

---

# Data Descriptors vs Non-Data Descriptors

| Descriptor Category | Defined Methods | Precedence Over `obj.__dict__` | Real-World Python Examples |
|---|---|---|---|
| **Data Descriptor** | Defines `__set__` or `__delete__` (and usually `__get__`) | **HIGHER than `obj.__dict__`** (Instance dict cannot shadow it!) | `@property`, SQLAlchemy Columns, Pydantic fields |
| **Non-Data Descriptor** | Defines **only `__get__`** | **LOWER than `obj.__dict__`** (Instance dict CAN shadow it!) | Standard functions/methods, `@staticmethod`, `@classmethod` |

---

# Metaclasses: The Class of a Class

Classes in Python are themselves objects at runtime instantiated by `type`. A **Metaclass** intercepts class creation:

```python
class ModelMeta(type):
    def __new__(mcs, name, bases, namespace):
        print(f"Creating class '{name}' with fields: {list(namespace.keys())}")
        # Enforce uppercase class names or register schemas
        cls = super().__new__(mcs, name, bases, namespace)
        return cls

class User(metaclass=ModelMeta):
    id: int
    username: str
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Explain why assigning `obj.method = lambda: "shadowed"` replaces a method on that specific instance, while assigning `obj.property = 50` invokes the descriptor's `__set__`.

**🟡 Challenge 2**: Implement an `@lru_cache` property descriptor (`@cached_property`) that computes the value on first access, writes it to `instance.__dict__`, and turns subsequent accesses into zero-overhead dict reads.

**🔴 Challenge 3**: Build a minimal Pydantic/ORM-style BaseModel using Metaclasses and Descriptors that enforces type validation on all class annotations at runtime.
""")

# Lesson 15.4: Asyncio Event Loop & Epoll
write_file(r"content/part-02-performance-systems/chapter-15-asyncio-concurrency/15.4-asyncio-event-loop-epoll-internals.md", r"""---
id: "15.4"
part: 2
chapter: 15
title: "Asyncio Event Loop Under the Hood: Epoll, Kqueue & Task Schedulers"
slug: "asyncio-event-loop-epoll-internals"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["15.1"]
tags: ["asyncio", "epoll", "kqueue", "event-loop", "coroutines"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The C10k Problem & Operating System Multiplexing

How can a single Python thread handle 50,000 concurrent WebSocket connections or FastAPI streaming requests without spawning 50,000 heavy OS threads?

The secret is **I/O Multiplexing via Kernel Polling (`epoll` on Linux, `kqueue` on macOS/BSD, `IOCP` on Windows)**:

```mermaid
flowchart TD
    subgraph KernelSpace ["Operating System Kernel Space"]
        Sockets["50,000 Active TCP Socket File Descriptors (fd_0 ... fd_50000)"]
        KernelPoller["Linux epoll_wait() / macOS kevent() Kernel System Call:<br>Sleeps until ANY socket has incoming bytes in its hardware RX buffer!"]
        Sockets --> KernelPoller
    end

    subgraph AsyncioLoop ["Asyncio Event Loop (Single Python Thread)"]
        KernelPoller -->|Returns list of ready file descriptors: [fd_42, fd_108]| Loop["Event Loop Iteration: loop._run_once()"]
        Loop --> ReadyQueue["Ready Queue: Step corresponding coroutine Tasks (task.step())"]
        ReadyQueue --> YieldTask["Coroutine executes until next 'await' -> Registers fd with selector -> Yields control!"]
    end
```

---

# The Lifecycle of an `asyncio.Task`

An `asyncio.Task` is a wrapper around a Python generator coroutine:

```mermaid
flowchart LR
    Create["1. asyncio.create_task(coro)"] --> Schedule["2. loop.call_soon(task._step)"]
    Schedule --> Resume["3. task._step(): Calls coro.send(None)"]
    Resume --> AwaitFuture["4. Hits 'await future' -> Future registers socket callback with selector"]
    AwaitFuture --> Sleep["5. Task pauses; Event loop processes other tasks"]
    Sleep --> IOReady["6. Epoll reports socket ready -> future.set_result()"]
    IOReady --> Schedule
```

---

# Pure Python Event Loop Implementation with `selectors`

```python
import selectors
import socket

class MiniEventLoop:
    def __init__(self):
        self.selector = selectors.DefaultSelector()
        self.tasks = []

    def register_read(self, sock: socket.socket, callback):
        self.selector.register(sock, selectors.EVENT_READ, callback)

    def run_forever(self):
        print("[EventLoop] Started single-threaded I/O multiplexing loop...")
        while True:
            # Sleep until kernel reports network I/O events (zero CPU consumption while idle!)
            events = self.selector.select(timeout=1.0)
            for key, mask in events:
                callback = key.data
                callback(key.fileobj)

# Test event loop instantiation
loop = MiniEventLoop()
print("Initialized MiniEventLoop with selector:", type(loop.selector).__name__)
```

---

# `asyncio` Anti-Patterns & Blocking Traps

> [!CAUTION]
> **The Golden Rule of Asyncio**: NEVER execute blocking synchronous calls (`time.sleep()`, heavy CPU number crunching, `requests.get()`) inside an async coroutine! Doing so freezes the entire event loop and blocks all other concurrent requests.

```python
# BROKEN: Freezes the entire server for 2 seconds
async def bad_handler():
    time.sleep(2) # BLOCKS THE ENTIRE EVENT LOOP!

# FIXED: Offload blocking CPU work to thread pool
async def good_handler():
    await asyncio.to_thread(blocking_cpu_heavy_function)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Verify why `asyncio.gather(*tasks)` executes multiple network requests concurrently while `for t in tasks: await t` executes them sequentially.

**🟡 Challenge 2**: Explain why `uvloop` (built on libuv in C) is $2\times$ to $4\times$ faster than standard `asyncio.DefaultEventLoop`.

**🔴 Challenge 3**: Implement a pure Python asynchronous TCP echo server from scratch using `socket`, non-blocking flags (`sock.setblocking(False)`), and `selectors.DefaultSelector`.
""")

# Lesson 16.4: Free-Threaded Python (No GIL)
write_file(r"content/part-02-performance-systems/chapter-16-concurrency-gil/16.4-free-threaded-python-no-gil.md", r"""---
id: "16.4"
part: 2
chapter: 16
title: "Free-Threaded Python (PEP 703): Biased Refcounting & Life Without the GIL"
slug: "free-threaded-python-no-gil"
difficulty: "advanced"
estimated_minutes: 45
prerequisites: ["16.1"]
tags: ["gil", "pep-703", "free-threaded", "multithreading", "concurrency"]
contentShape: "case-study"
openingType: "visual"
status: "published"
---

# The Historic Breakthrough: Free-Threaded Python (PEP 703)

For 33 years, the **Global Interpreter Lock (GIL)** prevented true multi-threaded CPU parallel execution in CPython.

In Python 3.13+, **PEP 703 (Making the Global Interpreter Lock Optional)** introduced the **Free-Threaded Build (`python3.13t`)**, allowing multiple native threads to execute Python bytecode concurrently across all CPU cores:

```mermaid
flowchart TD
    subgraph StandardCPython ["1. Standard CPython (The GIL Bottleneck)"]
        Thread1["Thread 1: Acquires GIL -> Runs Bytecode"]
        Thread2["Thread 2: Blocked waiting for GIL mutex"]
        Thread3["Thread 3: Blocked waiting for GIL mutex"]
        Thread1 --> GIL_Mutex["Single Global GIL Lock (1 CPU Core active at a time!)"]
    end

    subgraph FreeThreadedPython ["2. Free-Threaded CPython (PEP 703 / Python 3.13t)"]
        Core1["Thread 1 on Core 1: Biased Local Refcounting"]
        Core2["Thread 2 on Core 2: Biased Local Refcounting"]
        Core3["Thread 3 on Core 3: Biased Local Refcounting"]
        Core1 --- Parallel["True Linear Multi-Core CPU Scaling! (Zero Global Mutex!)"]
        Core2 --- Parallel
        Core3 --- Parallel
    end
```

---

# The 3 Technical Pillars of PEP 703

Removing the GIL without making single-threaded Python $2\times$ slower required three major architectural innovations:

### 1. Biased Reference Counting (BRC)
In standard multi-threading, every refcount increment `ob_refcnt++` requires an atomic CPU lock (`LOCK XADD`), which causes massive cache coherency bus penalties across cores.

**Biased Reference Counting**:
- Each object is "biased" towards the thread that created it (the owning thread).
- The owning thread modifies local refcounts with **standard non-atomic instructions**.
- Foreign threads write to a separate thread-safe shared atomic counter.

### 2. mimalloc Thread-Safe Memory Allocator
CPython's legacy `PyMalloc` allocator relied on the GIL for thread safety. Free-threaded Python replaces it with Microsoft's **mimalloc**, an ultra-fast, lock-free, page-isolated heap allocator.

### 3. Immortal Objects (PEP 683)
Global singletons (`None`, `True`, `False`, small ints, static strings) have their reference counts fixed at `0xFFFFFFFF` (immortal). Threads never increment or decrement immortal counters, eliminating cross-core cache invalidation!

---

# Benchmarking Free-Threaded Scaling in Python 3.13t

```python
import threading
import time

def cpu_heavy_task(n=50_000_000):
    count = 0
    for _ in range(n):
        count += 1
    return count

def run_multithreaded_benchmark(num_threads=4):
    threads = []
    start = time.perf_counter()
    
    for _ in range(num_threads):
        t = threading.Thread(target=cpu_heavy_task)
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    elapsed = time.perf_counter() - start
    print(f"Executed {num_threads} CPU threads in: {elapsed:.3f} seconds")

# In standard Python with GIL: takes ~4x time (serialized)
# In free-threaded Python 3.13t: takes ~1x time (true 4-core parallel scaling!)
run_multithreaded_benchmark(4)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Verify whether your current Python binary is running with GIL enabled using `import sys; print(getattr(sys, '_is_gil_enabled', lambda: True)())`.

**🟡 Challenge 2**: Explain why C extensions (like NumPy and PyTorch) must be recompiled with `Py_MOD_PER_INTERPRETER_GIL_SUPPORTED` for free-threaded builds.

**🔴 Challenge 3**: Implement a thread-safe lock-free Queue in Python using atomic compare-and-swap (CAS) primitives and benchmark throughput against `queue.Queue`.
""")

# Lesson 16.5: Zero-Copy Memory & Buffer Protocol
write_file(r"content/part-02-performance-systems/chapter-16-concurrency-gil/16.5-zerocopy-memoryview-buffer-protocol.md", r"""---
id: "16.5"
part: 2
chapter: 16
title: "Zero-Copy Memory: The Python Buffer Protocol (Py_buffer) & memoryview"
slug: "zerocopy-memoryview-buffer-protocol"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["16.1", "2.2"]
tags: ["buffer-protocol", "memoryview", "zero-copy", "cpython", "performance"]
contentShape: "under-the-hood"
openingType: "code"
status: "published"
---

# Look at This Code: Slicing Without Copying

In Python, slicing a `bytes` object `data[100:200]` allocates a **brand new heap object and copies 100 bytes of data**.

In high-throughput network servers or multi-gigabyte video/tensor pipelines, copying memory wastes CPU cycles and thrashes the L1/L2 CPU caches.

**`memoryview`** provides **Zero-Copy Memory Slices**:

```python
# 1. Standard bytes slicing (Slow / Memory Heavy):
raw_data = bytearray(b"X" * (100 * 1024 * 1024)) # 100 MB buffer
chunk_copy = raw_data[10_000:20_000]             # COPIES 10 KB to new heap object!

# 2. Zero-Copy memoryview slicing (Instant / Zero Allocation):
view = memoryview(raw_data)
chunk_view = view[10_000:20_000]                 # ZERO COPY! Points directly to raw buffer!
```

---

# Under the Hood: CPython's `Py_buffer` C Protocol

The **Buffer Protocol** (`Include/object.h`) allows C extensions (NumPy, PyTorch, PyArrow, OpenSSL) to share raw pointers to contiguous memory buffers without serialization:

```mermaid
flowchart LR
    subgraph PyBufferStruct ["Py_buffer C Struct"]
        BufPtr["buf (void* raw data pointer: 8B)"]
        Len["len (ssize_t length: 8B)"]
        ItemSize["itemsize (ssize_t: 8B)"]
        Format["format (char* format string: e.g. 'f' for float32)"]
        Shape["shape (Py_ssize_t* dimensions)"]
        Strides["strides (Py_ssize_t* step bytes)"]
    end

    subgraph RawHeapMemory ["Raw Contiguous Memory Buffer (e.g. GPU DMA Buffer or Network RX Buffer)"]
        Bytes["0x00 0x8a 0x3f 0x12 0x90 0x44 ..."]
    end

    BufPtr --> Bytes
```

---

# In-Place Mutation via `memoryview`

Because `memoryview` wraps the underlying raw memory, modifying the view mutates the original object in place:

```python
data = bytearray(b"Hello World")
view = memoryview(data)

# Mutate slice via view
view[6:11] = b"Python"

print("Original bytearray:", data) # b"Hello Python"!
```

---

# Zero-Copy Type Casting with `memoryview.cast()`

You can reinterpret raw binary bytes as 32-bit integers or 64-bit floats with zero memory copying:

```python
raw_bytes = bytearray(b"\x01\x00\x00\x00\x02\x00\x00\x00") # 8 bytes
byte_view = memoryview(raw_bytes)

# Reinterpret as 32-bit signed integers (format 'i')
int_view = byte_view.cast('i')
print("Cast to Integers:", list(int_view)) # [1, 2]

int_view[0] = 99
print("Mutated raw bytes:", raw_bytes) # b'c\x00\x00\x00\x02\x00\x00\x00' (99 in hex is 0x63 = 'c')
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Measure the execution time of slicing a 500MB `bytearray` 1,000 times using standard slicing `b[100:200]` vs `memoryview(b)[100:200]`.

**🟡 Challenge 2**: Explain why passing a `memoryview` to `socket.send_into()` enables true zero-copy network transmission from DMA memory.

**🔴 Challenge 3**: Implement a zero-copy circular ring buffer in Python using `bytearray` and `memoryview` for high-throughput streaming sensor data.
""")

print("All 6 new Python language and performance lessons successfully authored with supreme technical depth!")
