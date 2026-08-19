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
# CHAPTER 7: FUNCTIONS & CALL STACK
# ==============================================================================

write_file("content/part-01-python-properly/chapter-07-functions-call-stack/7.1-call-stack.md", """---
id: "7.1"
part: 1
chapter: 7
title: "PyFrameObject & The CPython Call Stack"
slug: "call-stack"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["2.1", "2.2"]
tags: ["frame", "call-stack", "cpython", "ceval", "bytecode"]
status: "published"
---

# Concept

Every time a function is invoked in Python, CPython allocates a **`PyFrameObject`** on the system heap (not the CPU hardware execution stack). The frame encapsulates everything required to execute Python bytecode: the code object (`f_code`), the local variable array (`f_localsplus`), the evaluation value stack, and a pointer to the calling frame (`f_back`).

```mermaid
flowchart TD
    subgraph CallStack ["CPython Frame Linked List (Heap-Allocated)"]
        ModuleFrame["Module Frame (__main__)<br>f_back: NULL"]
        FuncAFrame["Function A Frame<br>f_back: points to ModuleFrame"]
        FuncBFrame["Function B Frame (Current Active Frame)<br>f_back: points to FuncAFrame"]
    end

    FuncBFrame --> FuncAFrame --> ModuleFrame
```

# Inside `PyFrameObject`

From CPython's `Include/cpython/frameobject.h`:

```c
struct _frame {
    PyObject_VAR_HEAD
    struct _frame *f_back;      /* Execution caller link */
    PyCodeObject *f_code;       /* Bytecode and constants */
    PyObject *f_builtins;       /* Builtin symbol table */
    PyObject *f_globals;        /* Global symbol table */
    PyObject *f_locals;         /* Local symbol dictionary (or NULL) */
    PyObject **f_valuestack;    /* Operand evaluation stack */
    int f_lasti;                /* Last evaluated instruction index */
    PyObject *f_localsplus[1];  /* Dynamic array: fast locals + cellvars + freevars */
};
```

# Inspecting Live Frames with `sys._getframe()`

```python
import sys

def func_b():
    frame = sys._getframe()
    print("=== Current Active Frame (func_b) ===")
    print(f"Function Name:  {frame.f_code.co_name}")
    print(f"File Name:      {frame.f_code.co_filename}")
    print(f"Line Number:    {frame.f_lineno}")
    print(f"Local Names:    {frame.f_locals}")
    
    caller_frame = frame.f_back
    print(f"\\nCaller Function: {caller_frame.f_code.co_name}")

def func_a(val):
    temp = val * 10
    func_b()

func_a(42)
```

# Step-by-Step Execution Lifecycle

```text
1. CALL_FUNCTION Opcode:
   - Evaluator pauses current frame and reads target PyFunctionObject.
2. Frame Allocation:
   - CPython allocates new PyFrameObject, setting `f_back` to caller.
   - Arguments are copied directly into the `f_localsplus` contiguous array.
3. Execution Loop:
   - _PyEval_EvalFrameDefault() executes opcodes, pushing/popping from `f_valuestack`.
4. RETURN_VALUE Opcode:
   - Result is pushed to caller's stack; active frame is decremented and returned to frame free-list.
```

# Exercises

**🟢 Basic**: Write a function `print_call_stack()` that traverses `frame.f_back` in a loop and prints the complete call stack trace from leaf to root.

**🟡 Intermediate**: Write a memory profiler that records the total heap memory consumed by allocating 500 nested frame objects.

**🔴 Advanced**: Implement a basic bytecode interpreter loop in Python that maintains its own value stack and executes `LOAD_CONST`, `BINARY_OP`, and `RETURN_VALUE` opcodes.
""")

write_file("content/part-01-python-properly/chapter-07-functions-call-stack/7.2-argument-passing.md", """---
id: "7.2"
part: 1
chapter: 7
title: "Argument Passing Mechanics (*args, **kwargs)"
slug: "argument-passing"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["7.1"]
tags: ["arguments", "kwargs", "positional-only", "keyword-only"]
status: "published"
---

# Concept

Python uses **Pass-by-Object-Reference** (also called Call-by-Sharing). When passing arguments to a function, Python copies the **pointer address** of the object into the function's local frame.

Modern Python provides full parameter specification syntax:
- Positional-only parameters (`/`)
- Standard positional-or-keyword parameters
- Variable positional parameters (`*args`)
- Keyword-only parameters (`*`)
- Variable keyword parameters (`**kwargs`)

```text
def func(pos_only, /, standard, *, kw_only, **kwargs):
          ▲              ▲          ▲          ▲
          │              │          │          └─ Dict of arbitrary keyword args
          │              │          └──────────── MUST be passed by name (kw_only=val)
          │              └─────────────────────── Can be passed by position or name
          └────────────────────────────────────── MUST be passed by position ONLY
```

# Full Syntax Example

```python
def configure_model(
    model_name: str,           # Positional or keyword
    embedding_dim: int = 768,  # Default evaluated at definition time!
    /,                         # End of positional-only
    batch_size: int = 32,      # Standard
    *,                         # End of positional; Keyword-only starts
    use_flash_attn: bool = True,
    **extra_hyperparams
):
    print(f"Model: {model_name} (dim={embedding_dim}) | Batch={batch_size} | FlashAttn={use_flash_attn}")
    print(f"Extra kwargs: {extra_hyperparams}")

configure_model("llama-3", 4096, batch_size=64, use_flash_attn=True, lr=1e-4, warmup_steps=500)
```

# Critical Trap: Mutable Default Arguments

Default argument expressions are evaluated **exactly once when the function definition is executed**, not every time the function is called:

```python
# FATAL BUG: The default list object is shared across ALL function calls!
def append_to_cache(item, cache=[]):
    cache.append(item)
    return cache

print(append_to_cache("A"))  # ['A']
print(append_to_cache("B"))  # ['A', 'B']  <-- Bug! Reuses previous list!

# CORRECT IDIOM: Use None sentinel
def append_to_cache_safe(item, cache=None):
    if cache is None:
        cache = []
    cache.append(item)
    return cache
```

# Exercises

**🟢 Basic**: Write a function that accepts arbitrary numbers via `*args` and keyword multipliers via `**kwargs` and returns the weighted product.

**🟡 Intermediate**: Inspect `func.__defaults__` and `func.__kwdefaults__` to demonstrate how Python stores default parameter values inside function objects.

**🔴 Advanced**: Build a function argument validator decorator that checks incoming `*args` and `**kwargs` against runtime type annotations in `func.__annotations__`.
""")

write_file("content/part-01-python-properly/chapter-07-functions-call-stack/7.3-first-class-functions.md", """---
id: "7.3"
part: 1
chapter: 7
title: "First-Class Functions, Lambdas & Higher-Order Functions"
slug: "first-class-functions"
difficulty: "intermediate"
estimated_minutes: 20
prerequisites: ["7.1"]
tags: ["first-class-functions", "lambdas", "higher-order", "functools"]
status: "published"
---

# Concept

In Python, **functions are first-class objects**. A function is an instance of `PyFunctionObject` (subclass of `object`) and can be:
- Assigned to variables
- Passed as arguments to other functions
- Returned from functions
- Stored inside data structures (lists, dictionaries)
- Augmented with arbitrary user-defined attributes

```python
def square(x):
    return x * x

# 1. Functions have attributes
square.author = "DeepDive"
square.call_count = 0
print(f"Function attribute: {square.author}")

# 2. Higher-Order Functions (Functions accepting or returning functions)
def apply_pipeline(data, *transforms):
    res = data
    for fn in transforms:
        res = fn(res)
    return res

pipeline_output = apply_pipeline("  Hello World  ", str.strip, str.lower, lambda s: s.replace(" ", "_"))
print("Pipeline Output:", pipeline_output)  # 'hello_world'
```

# Partial Functions with `functools.partial`

`functools.partial` pre-binds a subset of arguments to create a specialized callable without function call wrapping overhead:

```python
import functools

def power(base, exponent):
    return base ** exponent

square = functools.partial(power, exponent=2)
cube = functools.partial(power, exponent=3)

print("Square of 5:", square(5))  # 25
print("Cube of 5:  ", cube(5))    # 125
```

# Exercises

**🟢 Basic**: Write a higher-order function `retry(fn, max_retries)` that calls `fn()` up to `max_retries` times if exceptions occur.

**🟡 Intermediate**: Implement `curry(fn)` in pure Python that transforms a multi-argument function $f(a, b, c)$ into chained single-argument calls $f(a)(b)(c)$.

**🔴 Advanced**: Build a function composition pipeline operator class using Python's `__or__` magic method so functions can be chained with Unix pipe syntax: `(data | strip | lower | tokenize)`.
""")

write_file("content/part-01-python-properly/chapter-07-functions-call-stack/7.4-recursion-stack.md", """---
id: "7.4"
part: 1
chapter: 7
title: "Recursion Limits & Stack Overflow Prevention"
slug: "recursion-stack"
difficulty: "intermediate"
estimated_minutes: 20
prerequisites: ["7.1"]
tags: ["recursion", "stack-overflow", "sys-setrecursionlimit", "trampoline"]
status: "published"
---

# Concept

Because each function call allocates a `PyFrameObject` on the heap and consumes C execution stack space, unbounded recursion causes C-level stack overflow crashes. To protect the process, CPython enforces a strict recursion limit (default: 1,000 frames), raising `RecursionError` when exceeded.

Python **does NOT perform Tail Call Optimization (TCO)** by design (Guido van Rossum chose to preserve full stack traces for debugging).

```python
import sys
print("Default recursion limit:", sys.getrecursionlimit())  # 1000

# Exceeding the limit
def infinite_recursion(n):
    return infinite_recursion(n + 1)

try:
    infinite_recursion(1)
except RecursionError as e:
    print("Caught:", e)  # maximum recursion depth exceeded
```

# Technique 1: Converting Recursion to Iterative Stack

Any recursive algorithm can be rewritten into an iterative loop using an explicit Python list as a stack:

```python
# Recursive Tree DFS:
# def dfs(node):
#     if not node: return
#     visit(node)
#     dfs(node.left); dfs(node.right)

# Iterative DFS (Zero recursion risk! Can handle millions of nodes):
def iterative_dfs(root):
    if not root: return
    stack = [root]
    while stack:
        node = stack.pop()
        print(f"Visited node: {node['val']}")
        if node.get("right"): stack.append(node["right"])
        if node.get("left"): stack.append(node["left"])
```

# Technique 2: The Trampoline Pattern

The **Trampoline** pattern simulates tail-call optimization by having recursive functions return a thunk (a callable) rather than calling itself directly:

```python
class Trampoline:
    def __init__(self, fn):
        self.fn = fn
    def __call__(self, *args, **kwargs):
        res = self.fn(*args, **kwargs)
        while callable(res):
            res = res()
        return res

def factorial_tail(n, acc=1):
    if n <= 1:
        return acc
    # Returns a lambda thunk instead of recursive call
    return lambda: factorial_tail(n - 1, acc * n)

fact = Trampoline(factorial_tail)
print("Fact(5000) computed safely:", len(str(fact(5000))), "digits!")
```

# Exercises

**🟢 Basic**: Write a recursive Fibonacci function and benchmark its execution time with and without `functools.lru_cache`.

**🟡 Intermediate**: Convert a recursive JSON tree search algorithm into an iterative loop using an explicit stack.

**🔴 Advanced**: Implement a general-purpose `@tail_call_optimized` decorator that uses frame inspection or exception throwing to execute tail-recursive functions with $O(1)$ stack space.
""")

# ==============================================================================
# CHAPTER 8: SCOPE, CLOSURES & DECORATORS
# ==============================================================================

write_file("content/part-01-python-properly/chapter-08-scope-closures-decorators/8.1-legb-scope.md", """---
id: "8.1"
part: 1
chapter: 8
title: "LEGB Scope & PyCellObject Internals"
slug: "legb-scope"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["7.1"]
tags: ["scope", "legb", "cpython", "global", "nonlocal"]
status: "published"
---

# Concept

Python resolves variable names using the **LEGB Rule** (Local $\to$ Enclosing $\to$ Global $\to$ Built-in). Variable scope is determined statically at compile-time based on assignment statements within the block.

```mermaid
flowchart LR
    L["1. Local (Function fast locals)"] --> E["2. Enclosing (Closure cells)"]
    E --> G["3. Global (Module __dict__)"]
    G --> B["4. Built-in (builtins module)"]
```

# The `global` vs `nonlocal` Keywords

```python
x = "GLOBAL"

def outer():
    x = "ENCLOSING"
    
    def inner_local():
        x = "LOCAL"  # Creates brand new local binding
        
    def inner_nonlocal():
        nonlocal x   # Rebinds 'x' in outer()'s scope!
        x = "MODIFIED_ENCLOSING"
        
    def inner_global():
        global x     # Rebinds 'x' in module globals!
        x = "MODIFIED_GLOBAL"

    inner_nonlocal()
    print("outer x:", x)  # 'MODIFIED_ENCLOSING'

outer()
```

# Critical Trap: UnboundLocalError

If a variable is assigned anywhere within a function, Python marks it as a **local variable for the entire function block** at compile-time:

```python
count = 10

def increment():
    # Compilation registers 'count' as LOCAL because 'count = ...' exists below!
    # print(count) fails because local 'count' has not been assigned yet!
    try:
        count += 1
    except UnboundLocalError as e:
        print("Error:", e)  # cannot access local variable 'count' where it is not associated with a value

increment()
```

# Exercises

**🟢 Basic**: Write a nested function demonstrating the LEGB lookup order by successively removing local, enclosing, and global variable declarations.

**🟡 Intermediate**: Disassemble a function using `global` vs `nonlocal` with `dis.dis()` and identify `STORE_FAST`, `STORE_DEREF`, and `STORE_GLOBAL` opcodes.

**🔴 Advanced**: Write a scope analysis tool using Python's `symtable` standard library module that prints all local, free, and global symbols of any given Python script.
""")

write_file("content/part-01-python-properly/chapter-08-scope-closures-decorators/8.2-closures.md", """---
id: "8.2"
part: 1
chapter: 8
title: "Closures & Free Variables (__closure__)"
slug: "closures"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["8.1"]
tags: ["closures", "free-variables", "pycellobject", "cpython"]
status: "published"
---

# Concept

A **closure** is a function that retains access to variables from its lexical enclosing scope even after the outer function has completed execution and its frame has been destroyed.

CPython implements closures by boxing shared variables inside **`PyCellObject`** instances on the heap.

```mermaid
flowchart LR
    subgraph FunctionObject ["Inner Function (PyFunctionObject)"]
        code["__code__: (co_freevars=('x',))"]
        closure["__closure__: (cell_0,)"]
    end

    subgraph HeapCell ["PyCellObject on Heap"]
        cell["ob_ref: pointer to int(10)"]
    end

    closure --> cell
```

# Inspecting Closure Cells

```python
def make_multiplier(factor):
    # 'factor' is stored in a PyCellObject
    def multiply(val):
        return val * factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print("Free variable names:", double.__code__.co_freevars)  # ('factor',)
print("Closure cell object:", double.__closure__[0])        # <cell at 0x...: int object at 0x...>
print("Cell value:          ", double.__closure__[0].cell_contents)  # 2

print(f"Double 10: {double(10)}")  # 20
print(f"Triple 10: {triple(10)}")  # 30
```

# Critical Trap: The Late-Binding Loop Closure

```python
# CLASSIC INTERVIEW BUG: All closures bind to the SAME variable in memory!
functions = []
for i in range(4):
    functions.append(lambda: i)  # Binds free variable 'i' by reference, not value!

# By the time functions run, 'i' has finished looping and equals 3!
print([f() for f in functions])  # [3, 3, 3, 3] <-- Bug!

# FIX: Default argument trick (forces immediate evaluation at definition time)
functions_fixed = [lambda i=i: i for i in range(4)]
print([f() for f in functions_fixed])  # [0, 1, 2, 3]
```

# Exercises

**🟢 Basic**: Create a stateful accumulator closure `make_accumulator(start=0)` that increases and returns its internal sum on every call.

**🟡 Intermediate**: Write a memoization closure `memoize(fn)` that caches return values based on input arguments without using global state.

**🔴 Advanced**: Demonstrate how long-lived closures capturing large objects (e.g. Pandas DataFrames) can cause memory retention leaks, and write a helper to explicitly clear cell contents.
""")

write_file("content/part-01-python-properly/chapter-08-scope-closures-decorators/8.3-decorators.md", """---
id: "8.3"
part: 1
chapter: 8
title: "Function Decorators & functools.wraps"
slug: "decorators"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["8.2"]
tags: ["decorators", "functools", "wraps", "metaprogramming"]
status: "published"
---

# Concept

A **decorator** is a callable that takes a function as input, extends or alters its behavior, and returns a replacement callable. The `@decorator` syntax is syntactic sugar for:

```python
@my_decorator
def target(): pass
# Equivalent to: target = my_decorator(target)
```

# The `functools.wraps` Standard

When wrapping a function, the wrapper replaces the original function object. Without `functools.wraps`, metadata (`__name__`, `__doc__`, `__annotations__`, `__module__`) is lost:

```python
import functools
import time

def timing_decorator(fn):
    @functools.wraps(fn)  # Copies __name__, __doc__, __annotations__ to wrapper!
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        elapsed = (time.perf_counter() - start) * 1000
        print(f"[{fn.__name__}] executed in {elapsed:.3f} ms")
        return result
    return wrapper

@timing_decorator
def compute_heavy_sum(n: int) -> int:
    \"\"\"Computes arithmetic sum of 1 to n.\"\"\"
    return sum(range(n))

compute_heavy_sum(1_000_000)
print("Function Name:", compute_heavy_sum.__name__)  # 'compute_heavy_sum' (Preserved!)
print("Docstring:    ", compute_heavy_sum.__doc__)   # 'Computes arithmetic...'
print("Unwrapped Fn: ", compute_heavy_sum.__wrapped__) # Access to original function!
```

# Exercises

**🟢 Basic**: Write a `@logger` decorator that logs the input arguments and return value of any function.

**🟡 Intermediate**: Implement an `@enforce_types` decorator that checks arguments against type annotations at runtime and raises `TypeError` on mismatch.

**🔴 Advanced**: Implement a thread-safe `@rate_limiter(max_calls, period_seconds)` decorator with a token bucket algorithm.
""")

write_file("content/part-01-python-properly/chapter-08-scope-closures-decorators/8.4-advanced-decorators.md", """---
id: "8.4"
part: 1
chapter: 8
title: "Parameterized Decorators & Class Decorators"
slug: "advanced-decorators"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["8.3"]
tags: ["decorators", "metaprogramming", "class-decorators"]
status: "published"
---

# Concept

When a decorator takes arguments (e.g. `@retry(max_retries=3, delay=1.0)`), it requires a **3-layer nested function hierarchy**:
1. Factory function that accepts decorator configuration arguments.
2. Decorator function that accepts the target function.
3. Wrapper function that intercepts the actual runtime call.

```mermaid
flowchart TD
    Factory["1. retry(max_attempts=3) -> Returns Decorator"] --> Decorator["2. decorator(fn) -> Returns Wrapper"]
    Decorator --> Wrapper["3. wrapper(*args, **kwargs) -> Executes Retries"]
```

# Parameterized Decorator Pattern

```python
import functools
import time

def retry(max_attempts=3, delay=0.1, exceptions=(Exception,)):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_err = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    last_err = e
                    print(f"[Attempt {attempt}/{max_attempts}] {fn.__name__} failed: {e}. Retrying...")
                    time.sleep(delay)
            raise last_err
        return wrapper
    return decorator

@retry(max_attempts=3, delay=0.05, exceptions=(ValueError,))
def unstable_network_call(success=False):
    if not success:
        raise ValueError("Connection timeout")
    return "SUCCESS"

try:
    unstable_network_call(success=False)
except ValueError:
    print("All retries exhausted cleanly.")
```

# Class-Based Decorator Pattern

Classes implementing `__call__` can serve as stateful decorators:

```python
class CallCounter:
    def __init__(self, fn):
        self.fn = fn
        self.count = 0
        functools.update_wrapper(self, fn)

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"{self.fn.__name__} called {self.count} times")
        return self.fn(*args, **kwargs)

@CallCounter
def predict(prompt):
    return f"Prediction for {prompt}"

predict("test 1")
predict("test 2")
print("Total calls tracked in instance:", predict.count)
```

# Exercises

**🟢 Basic**: Write a parameterized decorator `@repeat(num_times=3)` that runs a function multiple times and returns a list of results.

**🟡 Intermediate**: Implement a `@singleton` class decorator that ensures only one instance of any decorated class is created.

**🔴 Advanced**: Build a declarative API routing registry `@app.route(path, methods=['GET'])` similar to Flask / FastAPI.
""")

print("Chapters 7 & 8 authored with supreme depth!")
