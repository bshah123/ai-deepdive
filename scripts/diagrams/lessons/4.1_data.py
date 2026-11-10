"""Numbers for the 4.1 diagrams (capacity staircase and copy cost). Run: python 4.1_data.py
Writes 4.1_data.json next to this file. Real CPython 3.12 capacities come from sys.getsizeof."""
import json, os, struct, sys

SLOT = struct.calcsize("P")
EMPTY = sys.getsizeof([])
capacity = lambda L: (sys.getsizeof(L) - EMPTY) // SLOT

L, steps = [], [[0, 0]]
for n in range(1, 101):
    L.append(n)
    if capacity(L) != steps[-1][1]:
        steps.append([n, capacity(L)])

def resize(size, alloc, newsize):           # port of list_resize in Objects/listobject.c (3.12)
    if alloc >= newsize and newsize >= (alloc >> 1):
        return alloc
    new = (newsize + (newsize >> 3) + 6) & ~3
    if newsize - size > new - newsize:
        new = (newsize + 3) & ~3
    return 0 if newsize == 0 else new

def copies_per_append(n, grow):
    size = alloc = copies = 0
    for _ in range(n):
        if size == alloc:
            alloc = grow(size, alloc, size + 1)
            copies += size
        size += 1
    return copies / n

n = 100_000
cost = {
    "cpython": copies_per_append(n, resize),
    "double": copies_per_append(n, lambda s, a, k: max(1, 2 * a)),
    "plus8": copies_per_append(n, lambda s, a, k: a + 8),
}
out = {"steps": steps, "n": n, "cost": cost}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "4.1_data.json"), "w"))
print(out)
