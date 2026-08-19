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
# CHAPTER 9: ITERATORS & GENERATORS
# ==============================================================================

write_file("content/part-01-python-properly/chapter-09-iterators-generators/9.1-iteration-protocol.md", """---
id: "9.1"
part: 1
chapter: 9
title: "The Iteration Protocol (__iter__ and __next__)"
slug: "iteration-protocol"
difficulty: "intermediate"
estimated_minutes: 20
prerequisites: ["2.2", "4.1"]
tags: ["iterator", "iterable", "protocol", "cpython", "dunder"]
status: "published"
---

# Concept

The **Iteration Protocol** is the universal interface in Python that powers `for` loops, comprehensions, `tuple()`, `list()`, and unpacking. It defines two distinct roles:
1. **Iterable**: An object that produces an iterator via `__iter__()` or indexed access via `__getitem__()`.
2. **Iterator**: A stateful object that produces successive elements via `__next__()` and raises `StopIteration` when exhausted.

```mermaid
flowchart TD
    ForLoop["for item in my_iterable:"] --> GetIter["1. iter_obj = iter(my_iterable)<br>(Calls my_iterable.__iter__())"]
    GetIter --> LoopStep["2. item = next(iter_obj)<br>(Calls iter_obj.__next__())"]
    LoopStep --> CheckStop{"StopIteration Raised?"}
    CheckStop -- No --> ExecBody["Execute loop body with item"] --> LoopStep
    CheckStop -- Yes --> CleanExit["Catch StopIteration & Exit Loop cleanly"]
```

# Implementing a Custom Range Iterator

```python
class CountDown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        # An iterator must return itself from __iter__()
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        val = self.current
        self.current -= 1
        return val

# Standard for-loop iteration
for num in CountDown(3):
    print("Countdown:", num)
```

# Why an Iterable is NOT an Iterator

- An **Iterable** can be iterated over multiple times (e.g. `[1, 2, 3]`).
- An **Iterator** is a one-pass disposable stream with active state. Once it raises `StopIteration`, it remains exhausted forever!

```python
data = [1, 2, 3]  # Iterable

# Calling iter() creates two INDEPENDENT iterators:
it1 = iter(data)
it2 = iter(data)

print(next(it1))  # 1
print(next(it1))  # 2
print(next(it2))  # 1 (Independent state!)
```

# Exercises

**🟢 Basic**: Write a custom `EvenNumbers(limit)` iterator that yields all even numbers up to `limit`.

**🟡 Intermediate**: Implement a `PeekableIterator(iterable)` wrapper that supports `peek()` to inspect the next element without advancing the iterator pointer.

**🔴 Advanced**: Write a multi-threaded iterator pipeline where producer threads push items to a thread-safe queue and a custom consumer iterator yields them as a standard Python iterable.
""")

write_file("content/part-01-python-properly/chapter-09-iterators-generators/9.2-generators-yield.md", """---
id: "9.2"
part: 1
chapter: 9
title: "Generators & The yield Keyword Internals"
slug: "generators-yield"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["9.1", "7.1"]
tags: ["generators", "yield", "frame-suspension", "cpython", "memory"]
status: "published"
---

# Concept

A **generator function** is a function containing the `yield` keyword. When called, it does **not** execute the function body; instead, it compiles to a `PyGenObject` wrapping an execution frame (`PyFrameObject`) allocated on the heap.

When `next(gen)` is called, the frame is resumed, runs until encountering a `yield` expression, passes the value back to the caller, and **suspends its frame in place**, preserving all local variables and instruction pointers (`f_lasti`).

```mermaid
sequenceDiagram
    participant Caller
    participant GeneratorFrame as Heap Generator Frame

    Caller->>GeneratorFrame: gen = fibonacci() [Allocates PyGenObject, f_lasti=-1]
    Caller->>GeneratorFrame: next(gen) [Resumes execution]
    GeneratorFrame-->>Caller: yield 0 [Suspends at YIELD_VALUE, saves locals]
    Caller->>GeneratorFrame: next(gen) [Resumes from last instruction]
    GeneratorFrame-->>Caller: yield 1 [Suspends at YIELD_VALUE]
    Caller->>GeneratorFrame: next(gen) [Function completes]
    GeneratorFrame-->>Caller: raises StopIteration [Frame deallocated]
```

# Memory Comparison: List vs Generator Stream

```python
import sys

# 1. List: Allocates ALL 10,000,000 integers in RAM (~80 MB!)
def generate_list(n):
    return [i * 2 for i in range(n)]

# 2. Generator: Produces integers on-demand (O(1) Memory: ~104 bytes!)
def generate_stream(n):
    for i in range(n):
        yield i * 2

gen = generate_stream(10_000_000)
print(f"Generator memory footprint: {sys.getsizeof(gen)} bytes (Fixed O(1) RAM!)")
print(f"First 3 stream items: {next(gen)}, {next(gen)}, {next(gen)}")
```

# Inspecting Generator State with `inspect`

```python
import inspect

def simple_gen():
    yield 100
    yield 200

g = simple_gen()
print("State 1:", inspect.getgeneratorstate(g))  # GEN_CREATED
print("Yielded:", next(g))
print("State 2:", inspect.getgeneratorstate(g))  # GEN_SUSPENDED
print("Yielded:", next(g))
try:
    next(g)
except StopIteration:
    print("State 3:", inspect.getgeneratorstate(g))  # GEN_CLOSED
```

# AI Connection

> [!AI]
> In LLM API inference serving (e.g. streaming tokens from OpenAI / Anthropic / vLLM to a web client), generators stream each token chunk as it is generated by the GPU, reducing **Time-to-First-Token (TTFT)** from seconds to milliseconds.

# Exercises

**🟢 Basic**: Write an infinite generator `fibonacci()` that yields the Fibonacci sequence indefinitely.

**🟡 Intermediate**: Write a log file parser generator `filter_logs(file_path, pattern)` that streams lines from a 50GB file line-by-line using constant memory.

**🔴 Advanced**: Disassemble a generator function using `dis.dis()` and analyze how CPython's `YIELD_VALUE` and `RESUME` opcodes save and restore the operand stack.
""")

write_file("content/part-01-python-properly/chapter-09-iterators-generators/9.3-two-way-generators.md", """---
id: "9.3"
part: 1
chapter: 9
title: "Two-Way Generators: send(), throw(), and close()"
slug: "two-way-generators"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["9.2"]
tags: ["coroutines", "send", "throw", "close", "yield-from"]
status: "published"
---

# Concept

Generators in Python are not only data producers; they are **coroutines**. Using `.send()`, `.throw()`, and `.close()`, the caller can push data and exceptions *into* the suspended generator frame.

```mermaid
flowchart LR
    Caller["Caller Function"] -- "gen.send(value)" --> Gen["Suspended Generator<br>val = (yield output)"]
    Gen -- "yield output" --> Caller
    Caller -- "gen.throw(Exc)" --> Gen
    Caller -- "gen.close()" --> Gen
```

# Coroutine Averager with `.send()`

```python
def running_averager():
    total = 0.0
    count = 0
    average = None
    while True:
        # yield 'average' to caller, receive 'new_val' from .send()
        new_val = yield average
        if new_val is None:
            break
        total += new_val
        count += 1
        average = total / count

avg_gen = running_averager()
next(avg_gen)  # Prime the coroutine to advance to first yield!

print("Avg after 10:", avg_gen.send(10))  # 10.0
print("Avg after 20:", avg_gen.send(20))  # 15.0
print("Avg after 30:", avg_gen.send(30))  # 20.0
avg_gen.close()
```

# Sub-generator Delegation with `yield from`

`yield from <expr>` establishes a transparent two-way pipe between the outer caller and an inner sub-generator:

```python
def sub_worker():
    yield "Sub A"
    yield "Sub B"
    return "Result from Sub"

def delegating_gen():
    result = yield from sub_worker()
    print("Delegated sub-generator returned:", result)
    yield "Main End"

for item in delegating_gen():
    print("Received:", item)
```

# Exercises

**🟢 Basic**: Write a coroutine that receives strings via `.send()` and prints only strings matching a regex pattern.

**🟡 Intermediate**: Implement a stateful actor generator that maintains a key-value store, responding to commands like `("GET", key)` and `("SET", key, val)`.

**🔴 Advanced**: Implement a mini cooperative async multitasking scheduler using generators and `yield from` that executes 10 concurrent simulated I/O tasks.
""")

write_file("content/part-01-python-properly/chapter-09-iterators-generators/9.4-itertools-mastery.md", """---
id: "9.4"
part: 1
chapter: 9
title: "itertools: Infinite, Combinatoric & Terminating Iterators"
slug: "itertools-mastery"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["9.1", "9.2"]
tags: ["itertools", "combinatorics", "chain", "groupby"]
status: "published"
---

# Concept

The standard library `itertools` module provides high-performance, memory-efficient building blocks implemented in C for creating fast iterator pipelines.

# The 3 Families of `itertools`

```mermaid
flowchart TD
    Itertools["itertools Module"] --> Infinite["1. Infinite Iterators<br>count(), cycle(), repeat()"]
    Itertools --> Terminating["2. Terminating Pipelines<br>chain(), islice(), takewhile(), groupby()"]
    Itertools --> Combinatoric["3. Combinatorics<br>product(), permutations(), combinations()"]
```

# Code Demonstrations

```python
import itertools

# 1. itertools.groupby (Requires sorted input!)
data = [("HR", "Alice"), ("ENG", "Bob"), ("ENG", "Charlie"), ("HR", "David")]
# Sort by department primary key
data.sort(key=lambda x: x[0])
for dept, group in itertools.groupby(data, key=lambda x: x[0]):
    employees = [emp[1] for emp in group]
    print(f"{dept}: {', '.join(employees)}")

# 2. Cartesian Product vs Nested Loops
colors = ["red", "blue"]
sizes = ["S", "M", "L"]
combinations = list(itertools.product(colors, sizes))
print("\nCartesian Product:", combinations)

# 3. Combinations and Permutations
items = ["A", "B", "C"]
print("Permutations (order matters):", list(itertools.permutations(items, 2)))
print("Combinations (order agnostic):", list(itertools.combinations(items, 2)))
```

# Exercises

**🟢 Basic**: Use `itertools.count()` and `itertools.takewhile()` to generate all square numbers less than 1,000.

**🟡 Intermediate**: Implement a Run-Length Encoding (RLE) compressor using `itertools.groupby` that converts `'AAABBBCC'` to `[('A', 3), ('B', 3), ('C', 2)]`.

**🔴 Advanced**: Solve the N-Queens problem using `itertools.permutations` to generate non-colliding queen placements on an $N \times N$ chessboard.
""")

# ==============================================================================
# CHAPTER 10: OBJECT-ORIENTED PYTHON
# ==============================================================================

write_file("content/part-01-python-properly/chapter-10-oop/10.1-classes-mro.md", """---
id: "10.1"
part: 1
chapter: 10
title: "Classes, Instances & __dict__ vs __slots__"
slug: "classes-mro"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["2.2", "6.2"]
tags: ["oop", "slots", "dict", "cpython", "memory-optimization"]
status: "published"
---

# Concept

By default, every Python class instance stores its dynamic instance attributes inside an internal dictionary called **`instance.__dict__`**. While this enables dynamic attribute assignment at runtime (`obj.new_attr = 100`), each dictionary adds **~104 to 152 bytes of memory overhead per instance**.

Defining **`__slots__`** tells CPython to replace `__dict__` with a fixed-size array of C struct pointer descriptors, reducing per-instance memory by **~60% to 75%** and speeding up attribute access.

```mermaid
flowchart TD
    subgraph DefaultObject ["Default Python Instance (With __dict__)"]
        header1["PyObject Header (16B)"]
        dictptr["__dict__ Pointer (8B)"] --> InstDict["PyDictObject on Heap (104B+)<br>{ 'x': 10, 'y': 20 }"]
    end

    subgraph SlottedObject ["Slotted Python Instance (__slots__ = ('x', 'y'))"]
        header2["PyObject Header (16B)"]
        slot0["Slot x Pointer (8B) --> int(10)"]
        slot1["Slot y Pointer (8B) --> int(20)"]
    end
```

# Memory & Speed Benchmark

```python
import sys
import timeit

class StandardNode:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class SlottedNode:
    __slots__ = ('x', 'y')  # Pre-allocates fixed pointer slots!
    def __init__(self, x, y):
        self.x = x
        self.y = y

std_node = StandardNode(10, 20)
slot_node = SlottedNode(10, 20)

print(f"Standard instance size: {sys.getsizeof(std_node)} + __dict__ ({sys.getsizeof(std_node.__dict__)}) = {sys.getsizeof(std_node) + sys.getsizeof(std_node.__dict__)} bytes")
print(f"Slotted instance size:  {sys.getsizeof(slot_node)} bytes (Zero __dict__ overhead!)")

# Speed Benchmark (10 million reads)
t_std  = timeit.timeit("std_node.x", globals=globals(), number=10_000_000)
t_slot = timeit.timeit("slot_node.x", globals=globals(), number=10_000_000)
print(f"Standard access time: {t_std:.3f} s")
print(f"Slotted access time:  {t_slot:.3f} s ({t_std / t_slot:.2f}x faster!)")
```

# Trade-offs of `__slots__`

- **Cannot add arbitrary attributes**: `slot_node.z = 30` raises `AttributeError`.
- **Multiple Inheritance Constraints**: Classes with non-empty disjoint `__slots__` cannot be combined in multiple inheritance.
- **Weakrefs & Dicts**: To support `weakref` or dynamic dicts, you must explicitly include `'__weakref__'` or `'__dict__'` in `__slots__`.

# Exercises

**🟢 Basic**: Create a `Vector3D` class with `__slots__ = ('x', 'y', 'z')` and verify that attempting to set `vec.w = 1.0` raises `AttributeError`.

**🟡 Intermediate**: Write a metaclass `AutoSlots` that automatically inspects a class's `__init__` signature and injects `__slots__` dynamically.

**🔴 Advanced**: Simulate a Graph data structure with 1,000,000 Node instances and measure total process RSS memory consumption using `psutil` for standard vs slotted nodes.
""")

write_file("content/part-01-python-properly/chapter-10-oop/10.2-mro-c3.md", """---
id: "10.2"
part: 1
chapter: 10
title: "Method Resolution Order (MRO) & C3 Linearization"
slug: "mro-c3"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["10.1"]
tags: ["mro", "c3-linearization", "inheritance", "cpython"]
status: "published"
---

# Concept

When a method or attribute is accessed on an object (`obj.method()`), Python searches a deterministic sequence of classes known as the **Method Resolution Order (MRO)**.

Since Python 2.3, Python uses the **C3 Linearization Algorithm** to calculate MRO, ensuring three fundamental properties:
1. **Local Precedence Order**: Subclasses precede their parent classes.
2. **Monotonicity**: If class $A$ precedes class $B$ in $C$'s MRO, then $A$ must precede $B$ in any subclass of $C$.
3. **Consistency with Extended Precedence**: Preserves the left-to-right order specified in class definitions.

```mermaid
classDiagram
    class O["object"]
    class Base["Base"]
    class Left["Left"]
    class Right["Right"]
    class Derived["Derived"]

    O <|-- Base
    Base <|-- Left
    Base <|-- Right
    Left <|-- Derived
    Right <|-- Derived
```

# The C3 Linearization Formula

The linearization of class $C$ is defined as:

$$L(C) = [C] + \text{merge}(L(B_1), L(B_2), \dots, L(B_n), [B_1, B_2, \dots, B_n])$$

### Merge Algorithm Rules:
1. Take the head of the first list $L(B_1)$.
2. If this head does not appear in the **tail** (all elements except the first) of any other list in the merge, add it to the output and remove it from all lists.
3. Otherwise, look at the head of the next list.
4. Repeat until all lists are exhausted. If no candidate head can be selected, the inheritance hierarchy is inconsistent and Python raises `TypeError: Cannot create a consistent method resolution order (MRO)`.

# Step-by-Step Diamond Inheritance Calculation

```python
class O: pass
class Base(O): pass
class Left(Base): pass
class Right(Base): pass
class Derived(Left, Right): pass

print("MRO of Derived:")
for cls in Derived.__mro__:
    print(" ->", cls.__name__)
```

```text
Manual C3 Trace:
L(O) = [O]
L(Base) = [Base, O]
L(Left) = [Left, Base, O]
L(Right) = [Right, Base, O]

L(Derived) = [Derived] + merge(L(Left), L(Right), [Left, Right])
           = [Derived] + merge([Left, Base, O], [Right, Base, O], [Left, Right])

Step 1: Pick 'Left' (Not in tail of any list):
           = [Derived, Left] + merge([Base, O], [Right, Base, O], [Right])

Step 2: Can we pick 'Base'? NO! 'Base' is in tail of [Right, Base, O]!
        Pick 'Right' instead (Not in tail):
           = [Derived, Left, Right] + merge([Base, O], [Base, O])

Step 3: Pick 'Base', then 'O':
Final MRO: [Derived, Left, Right, Base, O]
```

# Exercises

**🟢 Basic**: Write a diamond inheritance class hierarchy and print `cls.mro()` to verify the resolution sequence.

**🟡 Intermediate**: Construct an inconsistent class hierarchy (e.g. `class A(X, Y)` and `class B(Y, X)` combined into `class C(A, B)`) and explain the `TypeError` produced by C3.

**🔴 Advanced**: Implement the complete C3 Linearization `merge()` algorithm in pure Python and calculate the MRO of arbitrary directed acyclic graphs of classes.
""")

write_file("content/part-01-python-properly/chapter-10-oop/10.3-super-mechanics.md", """---
id: "10.3"
part: 1
chapter: 10
title: "super() Mechanics & Cooperative Multiple Inheritance"
slug: "super-mechanics"
difficulty: "advanced"
estimated_minutes: 25
prerequisites: ["10.2"]
tags: ["super", "cooperative-inheritance", "mro", "oop"]
status: "published"
---

# Concept

`super()` in Python does **not** simply call the method of the direct parent class. Instead, `super(Class, instance)` looks up the next class in the **runtime MRO sequence of `instance`**, continuing after `Class`.

This mechanism is what makes **Cooperative Multiple Inheritance** possible.

```mermaid
flowchart TD
    Caller["Derived().__init__()"] --> Super1["super().__init__() in Derived<br>Resolves to Left.__init__"]
    Super1 --> Super2["super().__init__() in Left<br>Resolves to Right.__init__ (NOT Base!)"]
    Super2 --> Super3["super().__init__() in Right<br>Resolves to Base.__init__"]
    Super3 --> Super4["Base.__init__() completes"]
```

# Demonstrating Cooperative `super()`

```python
class Base:
    def __init__(self):
        print("Base.__init__")

class Left(Base):
    def __init__(self):
        print("Left.__init__ (Entering)")
        super().__init__()  # Calls NEXT class in Derived MRO (Right!), NOT Base!
        print("Left.__init__ (Exiting)")

class Right(Base):
    def __init__(self):
        print("Right.__init__ (Entering)")
        super().__init__()  # Calls Base.__init__
        print("Right.__init__ (Exiting)")

class Derived(Left, Right):
    def __init__(self):
        print("Derived.__init__ (Entering)")
        super().__init__()
        print("Derived.__init__ (Exiting)")

d = Derived()
```

**Execution Output:**
```text
Derived.__init__ (Entering)
Left.__init__ (Entering)
Right.__init__ (Entering)
Base.__init__
Right.__init__ (Exiting)
Left.__init__ (Exiting)
Derived.__init__ (Exiting)
```

Notice that `Left.__init__` calls `Right.__init__` because `Right` is the next class in `Derived.__mro__`.

# AI Connection

> [!AI]
> In PyTorch's `nn.Module`, every custom neural network block must call `super().__init__()`. This cooperative call initializes internal state dictionaries (`_parameters`, `_buffers`, `_modules`, `_forward_hooks`) defined in base classes like `nn.Module` and any custom mixins.

# Exercises

**🟢 Basic**: Write a mixin class `LogMixin` that overrides `save()` using `super().save()` to log operations before delegating to the storage backend class.

**🟡 Intermediate**: Refactor a legacy multiple inheritance hierarchy using explicit parent calls (`Parent.__init__(self)`) to cooperative `super()` calls and demonstrate the elimination of duplicate base class initializations.

**🔴 Advanced**: Analyze how zero-argument `super()` in Python 3 automatically retrieves the enclosing class and local `self` instance via compiler-generated `__class__` closure cell variables.
""")

write_file("content/part-01-python-properly/chapter-10-oop/10.4-descriptors.md", """---
id: "10.4"
part: 1
chapter: 10
title: "Property Descriptors (__get__, __set__, __delete__)"
slug: "descriptors"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["10.1"]
tags: ["descriptors", "property", "cpython", "metaprogramming"]
status: "published"
---

# Concept

A **descriptor** is an object attribute with binding behavior, whose attribute access is overridden by methods in the **Descriptor Protocol**:
- `__get__(self, instance, owner=None) -> value`
- `__set__(self, instance, value) -> None`
- `__delete__(self, instance) -> None`

Descriptors are the fundamental engine behind:
1. Properties (`@property`)
2. Methods and Bound Methods (`def method(self): ...`)
3. Class methods (`@classmethod`) & Static methods (`@staticmethod`)
4. ORM fields (Django / SQLAlchemy / Pydantic models)

```mermaid
flowchart TD
    AttrAccess["obj.attribute Access"] --> CheckDesc{"Is 'attribute' a Data Descriptor<br>in type(obj) with __set__/__get__?"}
    CheckDesc -- Yes --> CallGet["Call type(obj).attribute.__get__(obj, type(obj))"]
    CheckDesc -- No --> CheckDict{"Is 'attribute' in obj.__dict__?"}
    CheckDict -- Yes --> ReturnDict["Return obj.__dict__['attribute']"]
    CheckDict -- No --> CheckNonData{"Is it a Non-Data Descriptor<br>with __get__ only (e.g. methods)?"}
    CheckNonData -- Yes --> CallGetNonData["Call descriptor.__get__(obj, type(obj))"]
    CheckNonData -- No --> RaiseAttr["Raise AttributeError"]
```

# Building a Validated Attribute Descriptor

```python
class ValidatedRange:
    def __init__(self, min_val, max_val):
        self.min_val = min_val
        self.max_val = max_val

    def __set_name__(self, owner, name):
        # Automatically called at class creation time (Python 3.6+)
        self.public_name = name
        self.private_name = f"_{name}"

    def __get__(self, instance, owner=None):
        if instance is None:
            return self  # Accessed via Class.attr
        return getattr(instance, self.private_name, None)

    def __set__(self, instance, value):
        if not (self.min_val <= value <= self.max_val):
            raise ValueError(f"{self.public_name} must be between {self.min_val} and {self.max_val} (got {value})")
        setattr(instance, self.private_name, value)

class NeuralLayer:
    hidden_dim = ValidatedRange(16, 4096)
    dropout_rate = ValidatedRange(0.0, 1.0)

layer = NeuralLayer()
layer.hidden_dim = 768
layer.dropout_rate = 0.1
print(f"Layer: dim={layer.hidden_dim}, dropout={layer.dropout_rate}")

try:
    layer.hidden_dim = 10000  # Raises ValueError!
except ValueError as e:
    print("Caught validation error:", e)
```

# Exercises

**🟢 Basic**: Implement a `@LazyProperty` descriptor that computes an expensive attribute value on first access and caches it directly in `instance.__dict__`.

**🟡 Intermediate**: Re-implement Python's `@classmethod` decorator from scratch using a non-data descriptor.

**🔴 Advanced**: Build a mini Object-Relational Mapping (ORM) model class where fields are descriptors that serialize and deserialize types from an in-memory SQLite database table.
""")

print("Chapters 9 & 10 authored with supreme depth!")
