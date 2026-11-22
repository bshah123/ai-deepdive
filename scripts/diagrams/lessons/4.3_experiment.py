"""Experiments for lesson 4.3 (Timsort). Writes 4.3_data.json next to this file.

Every number used in the lesson text and diagrams comes from this run.
Stdlib only, CPython 3.12. Comparison counts come from a wrapper class that
counts __lt__ calls: list.sort and bisect use only '<', so the count is exact.
Byte counts come from tracemalloc and depend on the build; read them as orders
of magnitude.
"""
import json
import math
import random
import sys
import tracemalloc
from bisect import bisect_right
from pathlib import Path

OUT = Path(__file__).resolve().parent / "4.3_data.json"
D = {"python": sys.version.split()[0], "platform": sys.platform}


class Counted:
    """Wraps a value and counts every '<' comparison made on it."""
    __slots__ = ("v",)
    calls = 0

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Counted.calls += 1
        return self.v < other.v


class Rec:
    """A record that compares by key only, so stability is visible."""
    __slots__ = ("k", "i")

    def __init__(self, k, i):
        self.k, self.i = k, i

    def __lt__(self, other):
        return self.k < other.k


# ---- Teaching Timsort (pure Python; no galloping, simpler merge policy) ----

def min_run(n):
    """CPython 3.12 minrun: top 6 bits of n, +1 if any dropped bit was 1."""
    r = 0
    while n >= 64:
        r |= n & 1
        n >>= 1
    return n + r


def count_run(a, lo, hi):
    """Length of the natural run starting at lo. A strictly descending run is reversed."""
    end = lo + 1
    if end == hi:
        return 1
    if a[end] < a[lo]:
        while end + 1 < hi and a[end + 1] < a[end]:
            end += 1
        a[lo:end + 1] = a[lo:end + 1][::-1]
    else:
        while end + 1 < hi and not a[end + 1] < a[end]:
            end += 1
    return end - lo + 1


def binary_insert(a, lo, start, hi):
    """Stable insertion of a[start:hi] into the sorted prefix a[lo:start]."""
    for i in range(start, hi):
        x = a[i]
        pos = bisect_right(a, x, lo, i)  # after equal items, so stable
        a[pos + 1:i + 1] = a[pos:i]
        a[pos] = x


def merge(a, lo, mid, hi):
    """Stable merge of sorted a[lo:mid] and a[mid:hi]. On ties, the left item goes first."""
    left = a[lo:mid]
    i, j, k = 0, mid, lo
    while i < len(left) and j < hi:
        if a[j] < left[i]:
            a[k] = a[j]
            j += 1
        else:
            a[k] = left[i]
            i += 1
        k += 1
    a[k:k + len(left) - i] = left[i:]  # leftover right items are already in place


def timsort(a, run=None):
    """Returns the event log: ('run', start, natural_length, final_length) and ('merge', start, len1, len2)."""
    n = len(a)
    if run is None:
        run = min_run(n)
    events, stack, lo = [], [], 0

    def merge_top():
        (s1, l1), (s2, l2) = stack[-2], stack[-1]
        del stack[-2:]
        merge(a, s1, s2, s2 + l2)
        stack.append((s1, l1 + l2))
        events.append(("merge", s1, l1, l2))

    while lo < n:
        natural = count_run(a, lo, n)
        length = natural
        if length < run:
            length = min(run, n - lo)
            binary_insert(a, lo, lo + natural, lo + length)
        events.append(("run", lo, natural, length))
        stack.append((lo, length))
        lo += length
        while len(stack) > 1 and stack[-2][1] <= stack[-1][1]:
            merge_top()
    while len(stack) > 1:
        merge_top()
    return events


def shapes(n, rng):
    """Five input shapes of length n, all with fixed seeds."""
    rand = rng.sample(range(10**6), n)
    blocks = []
    for _ in range(8):
        blocks += sorted(rng.sample(range(10**6), n // 8))
    near = list(range(n))
    for _ in range(10):
        i, j = rng.randrange(n), rng.randrange(n)
        near[i], near[j] = near[j], near[i]
    return {
        "random": rand,
        "sorted": list(range(n)),
        "reversed": list(range(n, 0, -1)),
        "8 sorted blocks": blocks,
        "sorted + 10 swaps": near,
        "all equal": [7] * n,
    }


def main():
    rng = random.Random(4300)

    # 1. minrun: the formula, checked over every n in a range
    mr = {n: min_run(n) for n in (10, 63, 64, 100, 1000, 1024, 2112, 100000)}
    D["minrun"] = {str(k): v for k, v in mr.items()}
    D["minrun_in_32_64_for_n_ge_64"] = all(32 <= min_run(n) <= 64 for n in range(64, 200000))
    D["minrun_power_of_2_is_32"] = all(min_run(2**e) == 32 for e in range(6, 17))

    # 2. Comparison counts: real CPython list.sort vs teaching timsort, n = 1024
    n = 1024
    D["n"] = n
    D["n_log2_n"] = round(n * math.log2(n), 1)
    D["lg_n_factorial"] = round(math.lgamma(n + 1) / math.log(2), 1)
    real, teach, ok = {}, {}, {}
    for name, vals in shapes(n, rng).items():
        items = [Counted(v) for v in vals]
        Counted.calls = 0
        items.sort()
        real[name] = Counted.calls
        ok[name] = [x.v for x in items] == sorted(vals)
        items = [Counted(v) for v in vals]
        Counted.calls = 0
        timsort(items)
        teach[name] = Counted.calls
        ok[name] = ok[name] and [x.v for x in items] == sorted(vals)
    D["cpython_comparisons"] = real
    D["teaching_comparisons"] = teach
    D["all_sorted_correctly"] = ok

    # 3. Stability: the hand example, then 300 random trials for each sort
    people = [("Asha", 3), ("Ben", 1), ("Chen", 3), ("Dara", 2), ("Eli", 1)]
    D["stability_example"] = [p[0] for p in sorted(people, key=lambda p: p[1])]
    trials_ok_real, trials_ok_teach = True, True
    for _ in range(300):
        m = rng.randrange(1, 60)
        recs = [(rng.randrange(4), i) for i in range(m)]
        out = sorted(recs, key=lambda p: p[0])
        trials_ok_real &= all(out[t] < out[t + 1] for t in range(m - 1)
                              if out[t][0] != out[t + 1][0] or out[t][1] < out[t + 1][1])
        rs = [Rec(k, i) for k, i in recs]
        timsort(rs)
        trials_ok_teach &= all(rs[t].k < rs[t + 1].k or (rs[t].k == rs[t + 1].k and rs[t].i < rs[t + 1].i)
                               for t in range(m - 1))
    D["stable_real_300_trials"] = trials_ok_real
    D["stable_teaching_300_trials"] = trials_ok_teach

    # 4. key function is called once per item
    calls = [0]

    def key(x):
        calls[0] += 1
        return x

    vals = rng.sample(range(10**6), 1000)
    sorted(vals, key=key)
    D["key_calls_for_1000_items"] = calls[0]

    # 5. Teaching timsort: worked example by hand (forced run length 4)
    example = [5, 6, 8, 1, 2, 9, 4, 3, 7, 10, 0, 11]
    ex = list(example)
    events = timsort(ex, run=4)
    D["worked_example_input"] = example
    D["worked_example_events"] = [list(e) for e in events]
    D["worked_example_output"] = ex
    D["worked_example_ok"] = ex == sorted(example)

    # 6. Teaching timsort correctness on 2000 random arrays with duplicates and runs
    good = True
    for _ in range(2000):
        m = rng.randrange(0, 300)
        arr = [rng.randrange(20) for _ in range(m)]
        if rng.random() < 0.5:
            arr.sort()
        timsort(arr)
        good &= arr == sorted(arr)
    D["teaching_random_arrays_ok"] = good

    # 7. Memory: peak temporary allocation during list.sort, n = 100000
    big_n = 100000
    D["big_n"] = big_n
    D["pointer_array_bytes"] = 8 * big_n
    mem = {}
    for name, vals in shapes(big_n, random.Random(4301)).items():
        if name in ("sorted + 10 swaps", "all equal"):
            continue
        lst = list(vals)
        tracemalloc.start()
        tracemalloc.reset_peak()
        lst.sort()
        peak = tracemalloc.get_traced_memory()[1]
        tracemalloc.stop()
        mem[name] = peak
    D["peak_sort_bytes"] = mem

    OUT.write_text(json.dumps(D, indent=1))
    for k, v in D.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
