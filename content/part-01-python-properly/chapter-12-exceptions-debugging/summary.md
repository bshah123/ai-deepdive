## Chapter 12 Summary — Exceptions & Debugging

### What you learned

Exceptions form a class tree under `BaseException`, and `except` clauses are checked in order. Chaining with `from` controls what a traceback shows about the cause. You also learned two profiling tools, `cProfile` and `sys.settrace`, and their costs.

### Key ideas

- `KeyboardInterrupt`, `SystemExit` and `GeneratorExit` sit outside `Exception`, so `except Exception` does not catch them.
- `except` clauses are tried top to bottom; the first whose class matches, including subclasses, runs.
- Each frame's `finally` runs as an exception leaves that frame.
- `raise X from Y` sets `X.__cause__ = Y`; a `raise` inside an `except` sets only `__context__`.
- `raise X from None` clears the cause and hides the context.
- A rule of thumb: default to `from e`, and use `from None` only when the low-level error is noise.
- `cProfile` gives exact call counts and timings that vary between runs.
- `sys.settrace` receives `call`, `line`, `return` and `exception` events; a line tracer is expensive (about 12 times slower on `fib(22)` in our run).
- Naive recursive `fib(n)` makes $2F(n+1)-1$ calls; the loop version makes one.

### Before moving on

- □ I can order `except` clauses correctly for a given class hierarchy.
- □ I can predict the traceback text for `raise ... from ...` and a plain `raise` inside `except`.
- □ I can choose between `from e` and `from None`.
- □ I can profile a function with `cProfile` and read the call counts.
- □ I can explain why a tracer slows the program down.
