## What you learned

A Python list is a small header plus one contiguous array of pointers to objects that live elsewhere. That layout explains most of its costs: indexing and appending at the end are cheap, while removing or inserting at the front moves every pointer after the position. Over-allocation makes append amortized constant time. A slice, a repeat or a copy copies pointers, not the objects they point to, so nested lists stay shared unless you deep-copy them. Comprehensions are a compact loop that runs fewer bytecode instructions per element, and Timsort exploits runs that already exist in the data, so it does well on partly ordered input. The chapter ends where the list is the wrong container: a first-in-first-out queue, where `collections.deque` removes from the front in constant time. Timings and byte counts were measured on CPython 3.12.13 on macOS (arm64). They vary by machine and build. The growth rule and the memory layout are CPython implementation details, not language guarantees.

## Key ideas

- A list is a head (`ob_size`, `ob_item`, `allocated`) plus a contiguous array of pointers. The elements are separate objects (Lesson 4.1).
- `lst[i]` reads the slot at `ob_item + i * 8`, so its cost does not depend on the length (Lesson 4.1).
- The capacity grows by `(newsize + (newsize >> 3) + 6) & ~3`, so 25 appends leave room for 32 items (Lesson 4.1).
- Append is amortized O(1). With growth near 9/8, n appends copy at most about 9n pointers (Lesson 4.1).
- A list shrinks when its length falls below half its capacity (Lesson 4.1).
- `sys.getsizeof` counts only the head and the pointer array. A list of a million ints costs about 36 bytes per element, against 8 for an `array('q')` (Lesson 4.1).
- `a[:]`, `a.copy()` and `copy.copy(a)` are shallow copies: new pointers to the same objects. `copy.deepcopy` also copies nested objects (Lessons 4.1 and 4.4).
- `[[0] * 3] * 3` holds three references to one row. `[[0] * 3 for _ in range(3)]` builds three separate rows (Lessons 4.1 and 4.2).
- A comprehension runs 5 bytecode instructions per element; the equivalent loop with `append` runs 8. Python 3.12 inlines comprehensions (PEP 709) (Lesson 4.2).
- The comprehension was about 15% faster than the loop on one machine. A generator is the choice when you need one pass and memory matters (Lesson 4.2).
- Timsort finds natural runs, pads short runs to minrun with binary insertion, and merges stably. Sorted or reversed input costs n − 1 comparisons (Lessons 4.3 and 4.6).
- Sorting is in place but not free of memory: merging random data needs a temporary buffer of about n/2 pointers (Lesson 4.3).
- Equal keys keep their input order, so a multi-key sort can be built from stable sorts applied in turn (Lesson 4.3).
- Galloping mode starts after 7 consecutive wins. Merging two disjoint runs of 50,000 items costs about 40 comparisons beyond the n − 1 scan (Lesson 4.6).
- CPython 3.12 chooses the merge order with Powersort. The stack-and-length rule in Lesson 4.3 is a teaching model (Lessons 4.3 and 4.6).
- `pop(0)` and `insert(0, x)` move every later pointer. Draining 100,000 items from the front moves 4,999,950,000 pointers (Lesson 4.5).
- `collections.deque` is a chain of 64-slot blocks. `popleft` is constant time, but `deque[i]` walks the chain and is much slower in the middle (Lesson 4.5).
- `itertools.islice` slices any iterable lazily, and a generator cannot be sliced. `groupby` groups adjacent equal keys only, so sort first (Lesson 4.4).
- A NumPy basic slice is a view on the same memory, while a list slice is a copy of pointers (Lesson 4.4).

## Before moving on

- □ I can compute the capacity after n appends with the growth formula, and say when a resize happens.
- □ I can predict whether `a[:]`, `copy.copy` or `copy.deepcopy` shares a nested list with the original.
- □ I can explain why `[[0] * 3] * 3` aliases its rows and rewrite it as a comprehension.
- □ I can explain why removing items from a list while iterating skips elements, and rewrite the loop as a comprehension or a new list.
- □ I can count the bytecode instructions per element of a loop and of a comprehension with `dis`.
- □ I can predict the order `sorted()` gives for records with equal keys, and use stability to build a two-key sort.
- □ I can explain why sorted input costs n − 1 comparisons and random input costs about n log n.
- □ I can choose between a list and `collections.deque` for a FIFO queue, and show the cost difference with a timing run.
- □ I can take a slice of a generator with `islice`, and explain why `gen[1:3]` fails.
- □ I can say when a NumPy slice is a view, and check with `np.shares_memory`.
