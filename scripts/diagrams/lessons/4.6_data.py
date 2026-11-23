"""Experiment for lesson 4.6 (Timsort / Powersort). Produces every number used in the lesson.

Counts the comparisons CPython's built-in sorted() makes, by wrapping each value in a class
whose __lt__ (the only comparison list.sort uses) increments a counter. Stdlib only.
Run: python3 scripts/diagrams/lessons/4.6_data.py   -> writes 4.6_data.json next to this file.
"""
import json
import random
import sys
from pathlib import Path


class Counted:
    count = 0

    __slots__ = ("v",)

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Counted.count += 1
        return self.v < other.v


def comparisons(values):
    Counted.count = 0
    sorted(Counted(v) for v in values)
    return Counted.count


def natural_runs(a):
    """Maximal runs as the scan finds them: non-decreasing, or strictly decreasing (reversed later)."""
    runs, i, n = [], 0, len(a)
    while i < n:
        j = i + 1
        if j < n and a[j] < a[i]:
            while j + 1 < n and a[j + 1] < a[j]:
                j += 1
            j += 1  # make j exclusive, as in the ascending branch
            kind = "desc"
        else:
            while j < n and a[j] >= a[j - 1]:
                j += 1
            kind = "asc"
        runs.append({"start": i, "len": j - i, "kind": kind})
        i = j
    return runs


def gallop_position(a, key):
    """Exponential probe from the left (offsets 0,1,3,7,...), then bisect. Returns (index, probes)."""
    probes = []

    def is_less(i):
        probes.append(i)
        return a[i] < key

    lo, k = -1, 0
    while True:
        i = (1 << k) - 1
        if i >= len(a):
            hi = len(a)
            break
        if is_less(i):
            lo, k = i, k + 1
        else:
            hi = i
            break
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if is_less(mid):
            lo = mid
        else:
            hi = mid
    return hi, probes


def bisect_probes(n, key):
    """Plain binary search over range(n) for comparison: count probes."""
    probes, lo, hi = [], 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        probes.append(mid)
        if mid < key:
            lo = mid + 1
        else:
            hi = mid
    return len(probes)


def main():
    N = 10000
    rng = random.Random(4)
    out = {"python": sys.version.split()[0], "n": N}

    # Worked example: a 16-element array with mixed runs
    example = [5, 9, 12, 3, 2, 8, 14, 10, 1, 4, 7, 11, 6, 13, 15, 16]
    out["example"] = example
    out["example_runs"] = natural_runs(example)
    out["example_comparisons"] = comparisons(example)

    # Input families, all of length N
    rand = [rng.randrange(10**6) for _ in range(N)]
    nearly = list(range(N))
    for _ in range(100):
        i, j = rng.randrange(N), rng.randrange(N)
        nearly[i], nearly[j] = nearly[j], nearly[i]
    chunks = [sorted(rand[k * N // 8:(k + 1) * N // 8]) for k in range(8)]
    eight_runs = [v for c in chunks for v in c]
    inputs = {
        "random": rand,
        "ascending": list(range(N)),
        "descending": list(range(N, 0, -1)),
        "nearly_sorted_100_swaps": nearly,
        "eight_ascending_runs": eight_runs,
        "two_interleaved_runs": list(range(0, N, 2)) + list(range(1, N, 2)),
        "two_disjoint_runs": [N + i for i in range(N // 2)] + list(range(N // 2)),
    }
    rows = []
    for name, data in inputs.items():
        c = comparisons(data)
        rows.append({
            "input": name,
            "comparisons": c,
            "per_n": round(c / N, 2),
            "natural_runs": len(natural_runs(data)),
        })
    out["inputs"] = rows
    out["n_log2_n"] = round(N * __import__("math").log2(N))

    # Scaling: disjoint vs interleaved two-run inputs
    scale = []
    for n in (1000, 10000, 100000):
        half = n // 2
        disjoint = [half + i for i in range(half)] + list(range(half))
        inter = list(range(0, n, 2)) + list(range(1, n, 2))
        scale.append({
            "n": n,
            "disjoint": comparisons(disjoint),
            "interleaved": comparisons(inter),
        })
    out["scaling"] = scale

    # Galloping probes on a sorted array 0..999
    arr = list(range(1000))
    g5, p5 = gallop_position(arr, 5)
    g700, p700 = gallop_position(arr, 700)
    out["gallop"] = {
        "key5": {"index": g5, "probes": p5, "bisect_probes": bisect_probes(1000, 5)},
        "key700": {"index": g700, "probes": p700, "bisect_probes": bisect_probes(1000, 700)},
    }

    here = Path(__file__).resolve().parent
    (here / "4.6_data.json").write_text(json.dumps(out, indent=2) + "\n")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
