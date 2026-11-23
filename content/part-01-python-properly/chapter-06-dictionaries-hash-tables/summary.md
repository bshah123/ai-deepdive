## Chapter 6 Summary — Dictionaries & Hash Tables

### What you learned

A dictionary turns a key into a slot using `hash(key)`. Collisions are resolved by probing, and the table grows as it fills. CPython's compact layout keeps an index table and an insertion-ordered entry list. You also saw the standard helpers built on dicts: `defaultdict` and `Counter`.

### Key ideas

- A lookup uses the hash to find a slot; it calls `__eq__` only when stored and lookup hashes match.
- Equal objects must have equal hashes. Defining `__eq__` without `__hash__` makes instances unhashable.
- A key must not change while it is in a dict, or its entry becomes unreachable.
- CPython keeps a signed index table (-1 empty, -2 dummy) and a dense, insertion-ordered entry list.
- The index width grows with table size: 1 byte to 128 slots, 2 bytes to 32768, 4 bytes above.
- Open addressing keeps one entry per slot; deletion uses a tombstone so probe chains stay intact.
- Under uniform hashing a miss costs about $1/(1-\alpha)$ probes; linear probing does worse at high load.
- A dict resizes when its entries reach two thirds of its slots; the new size is the smallest power of two at least 3 × used.
- Passing pairs to `dict()` does not presize, and deleting keys does not shrink the table until a resize.
- `defaultdict` creates keys on read through `[]`; `Counter` subtraction with `-` drops non-positive counts.

### Before moving on

- □ I can trace how `hash(key)` maps to a slot in a small table.
- □ I can explain why a mutable key breaks a dictionary.
- □ I can predict when a dict resizes, using the insert points in the lesson.
- □ I can explain tombstones and why deleting by emptying a slot is wrong.
- □ I can choose between `dict`, `defaultdict` and `Counter` for a counting task.
