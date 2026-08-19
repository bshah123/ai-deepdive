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
# CHAPTER 11: PYTHON DATA MODEL
# ==============================================================================

write_file("content/part-01-python-properly/chapter-11-python-data-model/11.1-magic-methods.md", """---
id: "11.1"
part: 1
chapter: 11
title: "Magic Methods: __getitem__, __len__, __call__"
slug: "magic-methods"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["10.1"]
tags: ["data-model", "dunder", "magic-methods", "protocols"]
status: "published"
---

# Concept

The **Python Data Model** is the core set of interfaces through which Python objects interact with language operators and built-in functions. Rather than calling methods directly (`obj.getLength()`), Python calls **dunder (double underscore) special methods** like `len(obj) -> obj.__len__()`.

```mermaid
flowchart LR
    UserCode["User Expression:<br>1. len(obj)<br>2. obj[key]<br>3. obj(arg)<br>4. str(obj)"] --> TypeSlot["CPython Type Slot Table<br>(PyTypeObject):<br>1. tp_as_sequence->sq_length<br>2. tp_as_mapping->mp_subscript<br>3. tp_call<br>4. tp_str"]
    TypeSlot --> DunderMethod["Target Class Dunder Implementation:<br>1. def __len__(self)<br>2. def __getitem__(self, key)<br>3. def __call__(self, arg)<br>4. def __repr__(self) / __str__(self)"]
```

# Core Special Method Families

### 1. Callable Objects (`__call__`)
Making an instance behave like a function (with persistent state):

```python
class ExponentialMovingAverage:
    def __init__(self, alpha=0.1):
        self.alpha = alpha
        self.ema = None

    def __call__(self, new_val):
        if self.ema is None:
            self.ema = new_val
        else:
            self.ema = self.alpha * new_val + (1 - self.alpha) * self.ema
        return self.ema

ema_filter = ExponentialMovingAverage(alpha=0.2)
print("EMA(10):", ema_filter(10.0))  # 10.0
print("EMA(20):", ema_filter(20.0))  # 12.0
print("EMA(30):", ema_filter(30.0))  # 15.6
```

### 2. Sequence Emulation (`__len__`, `__getitem__`, `__setitem__`)

```python
class TensorDataset:
    def __init__(self, data_list):
        self._data = list(data_list)

    def __len__(self):
        return len(self._data)

    def __getitem__(self, index):
        if isinstance(index, slice):
            return TensorDataset(self._data[index])
        return self._data[index]

dataset = TensorDataset([100, 200, 300, 400, 500])
print(f"Dataset length: {len(dataset)}")
print(f"Index access:   {dataset[2]}")
print(f"Slice access:   {dataset[1:4]._data}")
```

# AI Connection

> [!AI]
> In PyTorch, every neural network layer inherits from `torch.nn.Module` and implements `forward()`. Invoking a model instance `output = model(inputs)` triggers `__call__()`, which runs pre-forward hooks, executes `forward()`, registers backward autograd hooks, and runs post-forward hooks automatically.

# Exercises

**🟢 Basic**: Implement a `Polynomial` class that overrides `__repr__`, `__add__`, and `__call__(x)` to evaluate $P(x) = a x^2 + b x + c$.

**🟡 Intermediate**: Write a 2D Matrix class that implements `__getitem__((row, col))` and `__setitem__((row, col), val)` supporting tuple slicing.

**🔴 Advanced**: Analyze CPython's `typeobject.c` slot-wrapper mechanism and explain why `obj.__len__()` is slower than `len(obj)` (which directly reads the C type slot `tp_as_sequence->sq_length`).
""")

write_file("content/part-01-python-properly/chapter-11-python-data-model/11.2-context-managers.md", """---
id: "11.2"
part: 1
chapter: 11
title: "Context Managers & The with Statement (__enter__/__exit__)"
slug: "context-managers"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["11.1"]
tags: ["context-manager", "with-statement", "contextlib", "resources"]
status: "published"
---

# Concept

The `with` statement guarantees deterministic resource acquisition and release (RAII pattern), ensuring cleanup logic executes even if unhandled exceptions occur.

A **Context Manager** implements the Context Management Protocol:
- `__enter__(self) -> target_object`
- `__exit__(self, exc_type, exc_val, exc_tb) -> bool`

```mermaid
sequenceDiagram
    participant Caller
    participant CM as Context Manager

    Caller->>CM: with MyContext() as target:
    CM->>CM: __enter__()
    CM-->>Caller: Returns target_object
    Note over Caller: Executes with-block body
    alt Successful Execution
        Caller->>CM: __exit__(None, None, None)
    else Exception Raised in Body
        Caller->>CM: __exit__(exc_type, exc_val, exc_tb)
        alt __exit__ returns True
            CM-->>Caller: Exception Suppressed
        else __exit__ returns False / None
            CM-->>Caller: Exception Re-raised
        end
    end
```

# Building a Custom High-Precision Timer Context Manager

```python
import time

class BenchmarkTimer:
    def __init__(self, task_name="Task"):
        self.task_name = task_name
        self.elapsed_ms = None

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed_ms = (time.perf_counter() - self.start_time) * 1000
        print(f"[{self.task_name}] finished in {self.elapsed_ms:.3f} ms")
        if exc_type is not None:
            print(f"[{self.task_name}] An exception occurred: {exc_val}")
        return False  # Do not suppress exception

with BenchmarkTimer("Matrix Multiplication") as timer:
    data = [x * x for x in range(1_000_000)]
```

# The `@contextlib.contextmanager` Generator Pattern

Using `contextlib.contextmanager`, a single generator function with a `try/finally` block becomes a full context manager:

```python
import contextlib

@contextlib.contextmanager
def temporary_flag_state(config_dict, key, temp_val):
    original_val = config_dict.get(key)
    config_dict[key] = temp_val
    try:
        yield config_dict  # Value yielded is bound to 'as target'
    finally:
        # Guaranteed cleanup on exit or exception!
        config_dict[key] = original_val

config = {"debug": False, "gpu_id": 0}
with temporary_flag_state(config, "debug", True):
    print("Inside context:", config["debug"])  # True

print("Outside context:", config["debug"])     # False (Restored!)
```

# AI Connection

> [!AI]
> In PyTorch, context managers govern critical execution modes:
> - `with torch.no_grad():` disables autograd graph construction, halving VRAM usage during inference.
> - `with torch.cuda.amp.autocast():` dynamically converts operations to FP16/BF16 mixed precision for Tensor Core acceleration.

# Exercises

**🟢 Basic**: Write a context manager `temporary_directory()` that creates a temporary directory on `__enter__` and deletes it recursively on `__exit__`.

**🟡 Intermediate**: Implement a `@contextlib.asynccontextmanager` for managing asynchronous database connections in `async with` blocks.

**🔴 Advanced**: Write a reentrant transaction context manager that supports nested transactions using savepoints in SQLite.
""")

write_file("content/part-01-python-properly/chapter-11-python-data-model/11.3-custom-containers.md", """---
id: "11.3"
part: 1
chapter: 11
title: "Custom Container Emulation & Sequence Protocols"
slug: "custom-containers"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["11.1", "11.2"]
tags: ["collections-abc", "containers", "sequence", "mapping"]
status: "published"
---

# Concept

When building custom data structures (such as KD-trees, LRU caches, or custom Tensor views), implementing raw dunder methods directly can leave subtle holes in your API.

The **`collections.abc`** module provides Abstract Base Classes that provide concrete mixin methods automatically when you implement the minimal abstract interface.

```mermaid
classDiagram
    class Iterable {
        <<Abstract>>
        __iter__()*
    }
    class Collection {
        <<Abstract>>
        __len__()*
        __contains__()*
    }
    class Sequence {
        <<Abstract>>
        __getitem__()*
        index() [Mixin]
        count() [Mixin]
        __reversed__() [Mixin]
    }
    class MutableSequence {
        <<Abstract>>
        __setitem__()*
        __delitem__()*
        insert()*
        append() [Mixin]
        extend() [Mixin]
        pop() [Mixin]
    }

    Iterable <|-- Collection
    Collection <|-- Sequence
    Sequence <|-- MutableSequence
```

# Building a Complete Custom Sequence

```python
from collections.abc import Sequence

class CircularReadOnlyBuffer(Sequence):
    def __init__(self, data):
        self._data = list(data)

    # Minimal abstract methods required by Sequence:
    def __len__(self):
        return len(self._data)

    def __getitem__(self, index):
        return self._data[index]

buf = CircularReadOnlyBuffer([10, 20, 30, 40, 50])

# FREE Mixin methods provided by Sequence ABC:
print("Contains 30?", 30 in buf)             # __contains__
print("Index of 40: ", buf.index(40))        # index()
print("Count of 20: ", buf.count(20))        # count()
print("Reversed:    ", list(reversed(buf)))  # __reversed__
```

# Exercises

**🟢 Basic**: Implement a custom `FrozenDict(Mapping)` using `collections.abc.Mapping` that behaves as a read-only dictionary.

**🟡 Intermediate**: Build a dynamic Circular Buffer implementing `collections.abc.MutableSequence`.

**🔴 Advanced**: Implement a multi-dimensional array container supporting N-dimensional slicing, strides, and transposition without copying underlying data.
""")

# ==============================================================================
# CHAPTER 12: EXCEPTIONS & DEBUGGING
# ==============================================================================

write_file("content/part-01-python-properly/chapter-12-exceptions-debugging/12.1-exception-handling.md", """---
id: "12.1"
part: 1
chapter: 12
title: "Exception Hierarchy & Stack Unwinding"
slug: "exception-handling"
difficulty: "intermediate"
estimated_minutes: 20
prerequisites: ["7.1"]
tags: ["exceptions", "stack-unwinding", "try-except", "cpython"]
status: "published"
---

# Concept

Exceptions in Python are first-class `PyObject` instances inheriting from `BaseException`. When an exception is raised, CPython initiates **Stack Unwinding**: it halts execution in the current frame, looks for matching `except` handlers in the exception table, and if none exist, unwinds through `f_back` caller frames until caught or reaching the top-level interpreter loop.

```mermaid
classDiagram
    class BaseException
    class Exception
    class SystemExit
    class KeyboardInterrupt
    class ArithmeticError
    class ZeroDivisionError
    class LookupError
    class IndexError
    class KeyError

    BaseException <|-- Exception
    BaseException <|-- SystemExit
    BaseException <|-- KeyboardInterrupt
    Exception <|-- ArithmeticError
    ArithmeticError <|-- ZeroDivisionError
    Exception <|-- LookupError
    LookupError <|-- IndexError
    LookupError <|-- KeyError
```

# Proper Exception Handling Patterns

```python
# 1. Catching Specific Exceptions (Never use bare 'except:')
try:
    data = {"score": 95}
    val = data["unknown_key"]
except KeyError as e:
    print(f"Missing key: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
else:
    print("Executed only if NO exception occurred!")
finally:
    print("Guaranteed cleanup execution!")
```

# Zero-Cost Exception Handling (Python 3.11+)

In Python 3.11+ (PEP 657), `try` blocks have **zero runtime overhead during normal execution**. CPython creates an immutable static exception table in `PyCodeObject`. Only when an exception is actually thrown does the runtime lookup the handler table.

# Exercises

**🟢 Basic**: Create a custom exception hierarchy for an API client (`APIError` -> `RateLimitError`, `AuthError`).

**🟡 Intermediate**: Disassemble a `try/except` block with `dis.dis()` and trace the `CHECK_EXC_MATCH` opcode in Python 3.11+.

**🔴 Advanced**: Write an exception hook `sys.excepthook` that formats unhandled exceptions into JSON-structured log entries with full local variable snapshots.
""")

write_file("content/part-01-python-properly/chapter-12-exceptions-debugging/12.2-exception-chaining.md", """---
id: "12.2"
part: 1
chapter: 12
title: "Exception Chaining: raise ... from ..."
slug: "exception-chaining"
difficulty: "intermediate"
estimated_minutes: 20
prerequisites: ["12.1"]
tags: ["exception-chaining", "raise-from", "traceback", "debugging"]
status: "published"
---

# Concept

When translating low-level exceptions (e.g. `sqlite3.OperationalError`) into domain exceptions (`DatabaseConnectionError`), Python supports explicit **Exception Chaining** via `raise ... from ...` (PEP 3134).

- `raise NewError from original_error`: Sets `__cause__` explicitly ("The above exception was the direct cause of...").
- `raise NewError from None`: Suppresses the contextual traceback entirely (`__suppress_context__ = True`).

```python
class ModelInferenceError(Exception):
    pass

def load_weights(file_path):
    try:
        with open(file_path, "r") as f:
            return f.read()
    except FileNotFoundError as err:
        # Explicitly chain low-level IOError to domain ModelInferenceError
        raise ModelInferenceError(f"Model checkpoints missing at {file_path}") from err

try:
    load_weights("/invalid/checkpoint.pt")
except ModelInferenceError as e:
    print(f"Caught: {e}")
    print(f"Original Cause: {e.__cause__}")
```

# Exercises

**🟢 Basic**: Write a database query wrapper that catches `KeyError` and re-raises `RecordNotFoundError` using explicit `from err` chaining.

**🟡 Intermediate**: Write an exception sanitizer that catches security-sensitive errors and re-raises a generic error `from None` to prevent leaking internal database connection strings.

**🔴 Advanced**: Write a traceback analysis tool using the `traceback` standard library module that extracts the entire causal chain of an exception.
""")

write_file("content/part-01-python-properly/chapter-12-exceptions-debugging/12.3-profiling-tracing.md", """---
id: "12.3"
part: 1
chapter: 12
title: "Profiling & Tracing with cProfile and sys.settrace"
slug: "profiling-tracing"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["12.1", "7.1"]
tags: ["cprofile", "pstats", "tracing", "sys-settrace", "performance"]
status: "published"
---

# Concept

Profiling identifies where CPU cycles and memory allocations are spent. Python provides:
1. **Deterministic Profilers (`cProfile`)**: C-extension measuring function call counts and cumulative execution time.
2. **Line Profilers (`line_profiler`)**: Line-by-line execution breakdown.
3. **Execution Tracers (`sys.settrace`)**: Hook function called on every bytecode instruction, line change, function call, and exception.

# Profiling with `cProfile` and `pstats`

```python
import cProfile
import pstats
import io

def heavy_computation():
    total = 0
    for i in range(100_000):
        total += i ** 2
    return total

def benchmark_pipeline():
    res = [heavy_computation() for _ in range(10)]
    return res

# Profile execution programmatically
profiler = cProfile.Profile()
profiler.enable()
benchmark_pipeline()
profiler.disable()

# Format statistics sorted by cumulative time
stream = io.StringIO()
stats = pstats.Stats(profiler, stream=stream).sort_stats(pstats.SortKey.CUMULATIVE)
stats.print_stats(5)
print(stream.getvalue())
```

# Custom Debugger Tracing with `sys.settrace`

```python
import sys

def trace_calls(frame, event, arg):
    if event == 'call':
        fn_name = frame.f_code.co_name
        lineno = frame.f_lineno
        print(f"[TRACE CALL] Function '{fn_name}' invoked at line {lineno}")
    return trace_calls

sys.settrace(trace_calls)

def sample_task(x):
    return x * 10

sample_task(5)
sys.settrace(None)  # Disable tracing hook
```

# Exercises

**🟢 Basic**: Profile a script with `python -m cProfile -s tottime script.py` and identify the top 3 bottleneck functions.

**🟡 Intermediate**: Write a custom memory allocation profiler using `tracemalloc` that takes memory snapshots before and after a model inference pass.

**🔴 Advanced**: Build a mini step-by-step interactive CLI debugger (like `pdb`) using `sys.settrace` that supports `step`, `next`, and variable printing.
""")

# ==============================================================================
# CHAPTER 13: MODULES, PACKAGES & ENVIRONMENTS
# ==============================================================================

write_file("content/part-01-python-properly/chapter-13-modules-packages-environments/13.1-import-engine.md", """---
id: "13.1"
part: 1
chapter: 13
title: "The CPython Import Engine & sys.modules Cache"
slug: "import-engine"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["1.4"]
tags: ["import", "sys-modules", "importlib", "cpython"]
status: "published"
---

# Concept

When Python executes `import math` or `from utils import helper`, it does **not** re-read or re-execute the file if it has already been loaded.

CPython executes an import through the following deterministic pipeline:
1. **Cache Check (`sys.modules`)**: If the module name exists in `sys.modules`, return the cached module `PyModuleObject` immediately ($O(1)$).
2. **Finders & Importers (`sys.meta_path`)**: Traverse finders (e.g. `PathFinder`) to locate module source code or bytecode.
3. **Module Loading (`importlib.machinery.SourceFileLoader`)**: Compile source code to `PyCodeObject` and execute it in a fresh module namespace dictionary (`module.__dict__`).
4. **Cache & Bind**: Add new module to `sys.modules` and bind symbol in current local namespace.

```mermaid
flowchart TD
    ImportStmt["import my_module"] --> CacheCheck{"Is 'my_module' in sys.modules?"}
    CacheCheck -- Yes --> ReturnCache["Return cached module object (Instant)"]
    CacheCheck -- No --> TraverseFinders["Traverse sys.meta_path Finders"]
    TraverseFinders --> Found{"Source found in sys.path?"}
    Found -- No --> RaiseModule["Raise ModuleNotFoundError"]
    Found -- Yes --> CreateMod["Create fresh module object & __dict__"]
    CreateMod --> ExecCode["Execute module bytecode inside module.__dict__"]
    ExecCode --> AddSys["Add module to sys.modules"]
    AddSys --> BindLocal["Bind variable name in local scope"]
```

# Inspecting Module State and `sys.modules`

```python
import sys
import math

print("Is math loaded?", "math" in sys.modules)  # True
print("Module file:", getattr(math, "__file__", "C-Builtin"))
print("Module __name__:", math.__name__)
```

# Exercises

**🟢 Basic**: Write a function that inspects `sys.modules` and returns the memory size of all loaded modules.

**🟡 Intermediate**: Write a dynamic reload utility using `importlib.reload()` and explain why existing references to imported functions are not updated automatically.

**🔴 Advanced**: Implement a custom import hook by creating a subclass of `importlib.abc.MetaPathFinder` that can import Python modules directly from a remote HTTP URL or ZIP archive.
""")

write_file("content/part-01-python-properly/chapter-13-modules-packages-environments/13.2-packages-imports.md", """---
id: "13.2"
part: 1
chapter: 13
title: "Packages, __init__.py & Relative vs Absolute Imports"
slug: "packages-imports"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["13.1"]
tags: ["packages", "init", "relative-imports", "namespaces"]
status: "published"
---

# Concept

A **package** is a directory containing a special `__init__.py` file (or a namespace package under PEP 420). The `__init__.py` file is executed when the package is imported and defines its public API via `__all__`.

# Package Directory Structure

```text
my_ai_package/
├── __init__.py          <-- Defines package exports (__all__ = ['Model', 'DataLoader'])
├── models/
│   ├── __init__.py
│   ├── transformer.py   <-- Defines Transformer class
│   └── attention.py     <-- Defines MultiHeadAttention
└── utils/
    ├── __init__.py
    └── metrics.py       <-- Defines compute_loss
```

# Relative vs Absolute Imports

```python
# Inside my_ai_package/models/transformer.py:

# 1. Absolute Import (Recommended in production):
from my_ai_package.models.attention import MultiHeadAttention
from my_ai_package.utils.metrics import compute_loss

# 2. Explicit Relative Import:
from .attention import MultiHeadAttention      # Same directory (.)
from ..utils.metrics import compute_loss       # Parent directory (..)
```

# Controlling Public Exports with `__all__`

```python
# Inside my_ai_package/__init__.py
from .models.transformer import Transformer
from .utils.metrics import compute_loss

# Restricts what is imported during 'from my_ai_package import *'
__all__ = ["Transformer", "compute_loss"]
```

# Exercises

**🟢 Basic**: Create a 2-tier package structure with `__init__.py` files and export a clean public interface via `__all__`.

**🟡 Intermediate**: Demonstrate why relative imports fail when running a submodule directly as a script (`python my_ai_package/models/transformer.py`) due to `__name__ == '__main__'`.

**🔴 Advanced**: Implement a PEP 420 Namespace Package split across two separate physical directories and demonstrate how Python merges their namespaces.
""")

write_file("content/part-01-python-properly/chapter-13-modules-packages-environments/13.3-venvs-packaging.md", """---
id: "13.3"
part: 1
chapter: 13
title: "Virtual Environments, Site-Packages & Package Resolution"
slug: "venvs-packaging"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["13.1", "13.2"]
tags: ["venv", "site-packages", "pip", "pyproject-toml"]
status: "published"
---

# Concept

A **Virtual Environment** (`venv`) is an isolated Python directory tree containing its own Python executable, `site-packages` directory, and binary scripts (`bin/` or `Scripts/`).

When you activate a venv, it modifies `PATH` and sets `sys.prefix` to the venv directory, causing Python's `site.py` startup script to load libraries exclusively from the isolated `site-packages`.

```mermaid
flowchart LR
    SystemPy["System Python (/usr/bin/python3)"] --> SystemSite["/usr/lib/python3.11/site-packages"]
    VenvPy[".venv/bin/python3 (sys.prefix = .venv)"] --> VenvSite[".venv/lib/python3.11/site-packages"]
```

# Modern Packaging with `pyproject.toml` (PEP 517 / 621)

Modern Python packages use `pyproject.toml` instead of legacy `setup.py`:

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "ai-deepdive"
version = "0.1.0"
description = "Modern AI Systems Deep Dive"
dependencies = [
    "torch>=2.2.0",
    "transformers>=4.40.0",
    "pydantic>=2.7.0"
]
```

# Exercises

**🟢 Basic**: Inspect `sys.prefix`, `sys.base_prefix`, and `sys.path` inside vs outside an active virtual environment.

**🟡 Intermediate**: Write a shell script that provisions a clean Python virtual environment, installs dependencies from `pyproject.toml`, and runs automated tests.

**🔴 Advanced**: Build a wheel package (`.whl`) using `build` (`python -m build`) and inspect the wheel archive's metadata and directory layout.
""")

# ==============================================================================
# CHAPTER 14: TYPE SYSTEMS & DATA VALIDATION
# ==============================================================================

write_file("content/part-01-python-properly/chapter-14-type-systems/14.1-type-annotations.md", """---
id: "14.1"
part: 1
chapter: 14
title: "Python Type Annotations & Mypy Static Checking"
slug: "type-annotations"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["10.1"]
tags: ["typing", "mypy", "type-hints", "static-analysis"]
status: "published"
---

# Concept

Python is **dynamically typed** at runtime, but supports **gradual static typing** via Type Annotations (PEP 484). Type annotations are parsed into `__annotations__` dictionaries on functions and classes at runtime, but are ignored by CPython's execution engine.

Static type checkers like **Mypy** and **Pyright** analyze code ahead-of-time to catch type errors before execution.

```python
from typing import Optional, Union

def calculate_attention(
    query_tensor: list[float],
    key_tensor: list[float],
    scale_factor: float = 1.0,
    dropout_rate: Optional[float] = None
) -> float:
    dot_product = sum(q * k for q, k in zip(query_tensor, key_tensor))
    return (dot_product / scale_factor)

# Inspecting annotations at runtime:
print("Function Annotations:", calculate_attention.__annotations__)
```

# Union Types and the `|` Operator (Python 3.10+)

```python
# Modern Python 3.10+ syntax:
def parse_id(raw_value: int | str | None) -> str:
    if raw_value is None:
        return "UNKNOWN"
    return str(raw_value).upper()
```

# Exercises

**🟢 Basic**: Add complete type annotations to a function that computes the cosine similarity between two float vectors.

**🟡 Intermediate**: Configure a `mypy.ini` file with strict settings (`disallow_untyped_defs = True`) and eliminate all static type errors in a module.

**🔴 Advanced**: Use `typing.overload` to define multi-signature functions with strict static return types based on input argument literal types.
""")

write_file("content/part-01-python-properly/chapter-14-type-systems/14.2-generics-protocols.md", """---
id: "14.2"
part: 1
chapter: 14
title: "Generics, TypeVar, Protocol & Structural Subtyping"
slug: "generics-protocols"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["14.1"]
tags: ["generics", "protocol", "typevar", "structural-typing"]
status: "published"
---

# Concept

Python supports both:
1. **Nominal Subtyping**: Standard inheritance (`class Cat(Animal)`).
2. **Structural Subtyping (Static Duck Typing)**: Via `typing.Protocol` (PEP 544). If an object has the required methods and attributes, it is accepted by the type checker regardless of class inheritance.

# Defining a `typing.Protocol`

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class TokenizerProtocol(Protocol):
    vocab_size: int
    def encode(self, text: str) -> list[int]: ...
    def decode(self, ids: list[int]) -> str: ...

# Independent class with zero inheritance from TokenizerProtocol:
class CustomBPE:
    vocab_size: int = 50257
    def encode(self, text: str) -> list[int]:
        return [ord(c) for c in text]
    def decode(self, ids: list[int]) -> str:
        return "".join(chr(i) for i in ids)

bpe = CustomBPE()

# Runtime validation via @runtime_checkable
print("Is instance of TokenizerProtocol?", isinstance(bpe, TokenizerProtocol))  # True!
```

# Generic Classes with `TypeVar` (and Python 3.12+ `[T]` Syntax)

```python
from typing import TypeVar, Generic

T = TypeVar('T')

class BoundedQueue(Generic[T]):
    def __init__(self, capacity: int):
        self._items: list[T] = []
        self._capacity = capacity

    def push(self, item: T) -> None:
        if len(self._items) < self._capacity:
            self._items.append(item)

    def pop(self) -> T:
        return self._items.pop(0)

int_queue: BoundedQueue[int] = BoundedQueue(5)
int_queue.push(10)
# int_queue.push("string")  <-- Mypy flags this as an error!
```

# Exercises

**🟢 Basic**: Define a `Serializable` Protocol requiring a `to_json() -> str` method and verify that conforming classes pass type checking.

**🟡 Intermediate**: Implement a generic Repository class `Repository[T]` with CRUD operations (`get(id: str) -> T`, `save(entity: T) -> None`).

**🔴 Advanced**: Explore covariance (`TypeVar('T_co', covariant=True)`) and contravariance in generic collection type annotations.
""")

write_file("content/part-01-python-properly/chapter-14-type-systems/14.3-pydantic-validation.md", """---
id: "14.3"
part: 1
chapter: 14
title: "Data Validation with Pydantic V2 & Rust Backend"
slug: "pydantic-validation"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["14.1", "14.2"]
tags: ["pydantic", "validation", "rust", "pydantic-core", "json-schema"]
status: "published"
---

# Concept

While Mypy validates types **statically at compile-time**, **Pydantic** validates, coerces, and sanitizes data **dynamically at runtime**.

Pydantic V2 is powered by **`pydantic-core`**, a high-performance Rust validation engine that processes JSON payloads and nested structures **5x to 50x faster** than pure Python validation libraries.

```mermaid
flowchart LR
    RawJSON["Untrusted Raw JSON Payload"] --> PydanticCore["pydantic-core (Rust Engine)"]
    PydanticCore --> ValidatedModel["Typed, Sanitized Python Object<br>(Validated Model)"]
    PydanticCore -- Invalid Data --> ValidationError["Detailed ValidationError<br>(Path, Type, Message)"]
```

# Defining Pydantic Models

```python
from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Optional

class LLMGenerationConfig(BaseModel):
    model_id: str = Field(..., description="Target model identifier")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=512, gt=0, le=8192)
    api_endpoint: Optional[HttpUrl] = None

    @field_validator("model_id")
    @classmethod
    def validate_model_name(cls, val: str) -> str:
        if not val.startswith(("gpt-", "claude-", "llama-")):
            raise ValueError(f"Unsupported model provider: {val}")
        return val.lower()

# Valid Input: Automatic type coercion (string "0.8" converted to float 0.8)
cfg = LLMGenerationConfig(model_id="gpt-4o", temperature="0.8", max_tokens=1024)
print("Validated Config:", cfg.model_dump())
print("JSON Schema:\n", cfg.model_json_schema())
```

# AI Connection: Structured Outputs & Tool Calling

> [!AI]
> When building LLM tool calling (Function Calling) pipelines with OpenAI, Anthropic, or Gemini:
> 1. Pydantic models define the tool argument schema.
> 2. `model.model_json_schema()` converts the Python class directly into JSON Schema required by the LLM API.
> 3. LLM response JSON strings are validated back into verified Python objects via `model.model_validate_json(raw_response)`.

# Exercises

**🟢 Basic**: Create a Pydantic model for an Embedding Search Query with fields `query_text: str`, `top_k: int` (default 5, max 100), and `score_threshold: float` (0.0 to 1.0).

**🟡 Intermediate**: Write a custom field validator that parses and verifies ISO-8601 date strings.

**🔴 Advanced**: Benchmark the validation throughput (JSON docs/sec) of Pydantic V2 versus Python's built-in `dataclasses` with manual `isinstance` checks.
""")

print("Chapters 11 through 14 authored with supreme depth!")
