## Chapter 9 Summary — Iterators & Generators

### What you learned

A `for` loop is built on two methods, `__iter__` and `__next__`. A generator function is a shortcut for writing an iterator: its frame pauses at each `yield`. You saw how values flow into a generator with `send()`, `throw()` and `close()`, and how `itertools` composes lazy pipelines.

### Key ideas

- A `for` loop calls `iter(obj)` once, then `next(it)` until `StopIteration`.
- An iterator returns itself from `__iter__`; an iterable returns a fresh iterator each time it is looped.
- An iterator stores only its position, so memory does not grow with the data (measured: 464 B against 40.4 MB at N = 10^6).
- Calling a generator function returns a generator object; its body runs on the first `next()`.
- `yield` suspends the function and keeps its locals alive between calls.
- The value of `yield` is whatever `send()` passes in; prime a generator with `next()` before the first `send()`.
- `throw()` raises an exception at the paused `yield`; `close()` raises `GeneratorExit`, which runs `finally` blocks.
- Generators are one-shot. Chained generators process one item at a time, so their stages interleave.
- `itertools` functions are lazy. Combinatoric counts have closed forms: $n^r$, $n!/(n-r)!$, $\binom{n+r-1}{r}$ and $\binom{n}{r}$.
- `groupby` merges only adjacent equal keys, so sort by the key first.

### Before moving on

- □ I can write the `__iter__` and `__next__` pair for a custom class.
- □ I can predict the output of a generator pipeline stage by stage.
- □ I can use `send()` to build a generator that accepts input.
- □ I can explain why `close()` runs `finally` blocks.
- □ I can pick the `itertools` function that solves a given problem, and say whether it is lazy.
