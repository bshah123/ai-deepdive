## What you learned

A Python variable is a name bound to an object, not a box that holds a value, so assignment copies a reference and never the object. From that one fact you can trace aliasing, the difference between `is` and `==`, mutable and immutable types, shallow and deep copies, and mutable default arguments. The second half of the chapter follows the object's memory: CPython keeps a reference count on each object and frees the object as soon as the count reaches zero, but a reference cycle keeps its counts above zero, so only the cyclic garbage collector can free it. A weak reference breaks a parent-child cycle. A reachable leak, such as a global cache that never evicts, is not freed by `gc.collect()`, so you find it with `tracemalloc` snapshots and fix it by bounding the cache. The measurements in this chapter come from CPython 3.12.13 on macOS (arm64); they illustrate the behaviour and are not language guarantees.

## Key ideas

- A variable is a name bound to an object; `y = x` adds a second name and copies nothing (Lesson 2.1).
- Every CPython object begins with a header holding its reference count and a pointer to its type; on the measured build the header is 16 bytes (Lesson 2.2).
- `id()` is unique and constant only while its object is alive; in CPython it is the object's address (Lesson 2.3).
- `is` tests identity and `==` tests value; use `is` only for singletons such as `None` (Lesson 2.4).
- Mutation is visible through every alias; rebinding moves one name and leaves the others alone (Lesson 2.5).
- `+=` mutates lists, dicts and sets in place, but builds a new object for ints, strings and tuples (Lesson 2.6).
- Only hashable objects can be dictionary keys or set members; a tuple is hashable only if everything inside it is (Lesson 2.6).
- A default argument is evaluated once, when `def` runs, so a mutable default is shared by every call (Lesson 2.6).
- `sys.getrefcount(x)` reports the stored count plus one for its own argument (Lessons 2.2 and 2.7).
- Reference counting frees an object at once when its count reaches zero, and `__del__` runs at that moment (Lesson 2.7).
- A reference cycle keeps every member's count above zero, so only the cyclic collector frees it (Lessons 2.7 and 2.8).
- On CPython 3.12 a generation 0 collection starts when allocations minus deallocations exceed 700 (Lesson 2.8).
- A weak back-pointer does not keep its target alive, so a parent-child cycle breaks and the parent is freed at `del` (Lesson 2.9).
- `gc.collect()` does not free reachable memory; bound the cache and use `tracemalloc` snapshots to find growth (Lesson 2.10).

## Before moving on

- □ I can draw the names and objects for a short program, and mark each line as a rebinding or a mutation.
- □ I can predict the output of `b = a` followed by a mutation through `b`, and of `a = a + [x]` compared with `a += [x]`.
- □ I can explain why `is` is correct for `None` and wrong for comparing numbers or strings built at run time.
- □ I can predict what a shallow copy shares with the original, and when `copy.deepcopy` is needed.
- □ I can explain why a mutable default argument accumulates values, and rewrite it with a `None` sentinel.
- □ I can explain why `sys.getrefcount` reports one more than the stored count.
- □ I can build a two-object cycle, show that it survives `del`, and free it with `gc.collect()`.
- □ I can break a parent-child cycle with `weakref.ref` and check that the parent is freed.
- □ I can use two `tracemalloc` snapshots to tell a reachable leak from cyclic garbage, and bound a cache to fix it.
