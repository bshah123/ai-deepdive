"""Numbers for the 4.3 lesson and diagrams. Run: python 4.3_data.py
Writes 4.3_data.json next to this file. Stdlib only.

Counts come from CPython's real sorted(): every comparison goes through __lt__, which is
counted by the Counted wrapper. The teaching timsort below is checked against sorted()."""
import json, math, os, random, sys
from bisect import bisect_right

HERE = os.path.dirname(os.path.abspath(__file__))
out = {"python": sys.version.split()[0]}


class Counted:
    count = 0
    __slots__ = ("v",)

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Counted.count += 1
        return self.v < other.v

    def __repr__(self):
        return repr(self.v)


def minrun(n):
    """CPython's rule (Objects/listsort.txt): shift n right until it is below 64,
    keeping a 1 if any shifted-out bit was 1."""
    r = 0
    while n >= 64:
        r |= n & 1
        n >>= 1
    return n + r


# checks of the minrun rule
assert all(minrun(n) == n for n in range(1, 64))
assert all(32 <= minrun(n) <= 64 for n in range(64, 100000))
out["minrun"] = {str(n): minrun(n) for n in (63, 64, 100, 1000, 2000, 10000)}


def count_run(a, lo, hi):
    """Natural run starting at lo. A strictly descending run is reversed in place.
    Strict '<' keeps equal elements in their original order (stability)."""
    if lo + 1 >= hi:
        return hi - lo
    end = lo + 2
    if a[lo + 1] < a[lo]:
        while end < hi and a[end] < a[end - 1]:
            end += 1
        a[lo:end] = a[lo:end][::-1]
    else:
        while end < hi and not a[end] < a[end - 1]:
            end += 1
    return end - lo


def binary_insertion(a, lo, hi, start):
    """a[lo:start] is already sorted. Insert a[start:hi] into it.
    bisect_right puts each new element after equal ones (stability)."""
    for i in range(start, hi):
        x = a[i]
        pos = bisect_right(a, x, lo, i)
        a[pos + 1:i + 1] = a[pos:i]
        a[pos] = x


def merge(a, lo, mid, hi):
    """Stable merge of a[lo:mid] and a[mid:hi]. Take from the right only if strictly smaller."""
    left, right = a[lo:mid], a[mid:hi]
    i = j = 0
    k = lo
    while i < len(left) and j < len(right):
        if right[j] < left[i]:
            a[k] = right[j]
            j += 1
        else:
            a[k] = left[i]
            i += 1
        k += 1
    a[k:hi] = left[i:] + right[j:]


def timsort_teaching(a, mr=None):
    """Simplified timsort: runs, binary insertion up to minrun, then bottom-up merges.
    Real CPython keeps a run stack with merge invariants (see lesson 4.6); this does not."""
    n = len(a)
    mr = mr or minrun(n)
    runs = []  # (start, final length, natural run length)
    lo = 0
    while lo < n:
        natural = count_run(a, lo, n)
        hi = min(lo + max(natural, mr), n)
        if natural < hi - lo:
            binary_insertion(a, lo, hi, lo + natural)
        runs.append((lo, hi - lo, natural))
        lo = hi
    segs = [(s, s + length) for s, length, _ in runs]
    merge_levels = 0
    while len(segs) > 1:
        merge_levels += 1
        new = []
        for p in range(0, len(segs) - 1, 2):
            (s1, e1), (_, e2) = segs[p], segs[p + 1]
            merge(a, s1, e1, e2)
            new.append((s1, e2))
        if len(segs) % 2:
            new.append(segs[-1])
        segs = new
    return runs, merge_levels


# ---------------------------------------------------------------- worked example (minrun forced to 4)
EX = [9, 7, 4, 1, 3, 5, 2, 8, 6, 0, 4, 9]
ex = list(EX)
runs, levels = timsort_teaching(ex, mr=4)
assert ex == sorted(EX)
out["worked"] = {"input": EX, "minrun": 4, "runs": [[s, L, nat] for s, L, nat in runs],
                 "merge_levels": levels, "output": ex}

# ---------------------------------------------------------------- correctness of the teaching version
rng = random.Random(7)
for trial in range(300):
    n = rng.randint(0, 400)
    data = [rng.randint(0, 50) for _ in range(n)]
    a = list(data)
    timsort_teaching(a)
    assert a == sorted(data), trial
    b = list(data)
    timsort_teaching(b, mr=rng.randint(1, 9))
    assert b == sorted(data), trial
out["teaching_checks"] = "300 random lists (n<=400, duplicates) and small forced minrun: equal to sorted()"

# ---------------------------------------------------------------- stability
recs = [(2, "a"), (1, "b"), (2, "c"), (1, "d"), (0, "e")]
out["stability"] = {"input": recs, "sorted_by_key": sorted(recs, key=lambda r: r[0])}

# ---------------------------------------------------------------- multi-key sort (Python docs example)
students = [("john", "A", 15), ("jane", "B", 12), ("dave", "B", 10)]
step1 = sorted(students, key=lambda s: s[2])                    # secondary key (age) first
step2 = sorted(step1, key=lambda s: s[1], reverse=True)         # then primary key (grade), descending
out["multikey"] = {"step1_by_age": step1, "final_grade_desc_then_age": step2,
                   "docs_expected": [("dave", "B", 10), ("jane", "B", 12), ("john", "A", 15)]}
assert step2 == out["multikey"]["docs_expected"]

# ---------------------------------------------------------------- comparisons of CPython's sorted()
def comparisons(data):
    Counted.count = 0
    sorted(Counted(x) for x in data)
    return Counted.count

def natural_runs(data):
    a = list(data)
    lo = runs = 0
    while lo < len(a):
        lo += count_run(a, lo, len(a))
        runs += 1
    return runs

N = 1000
rng = random.Random(2024)
inputs = {}
inputs["sorted"] = list(range(N))
inputs["reversed"] = list(range(N))[::-1]
nearly = list(range(N))
for _ in range(10):                  # 10 random swaps: about 1% of positions moved
    i, j = rng.randrange(N), rng.randrange(N)
    nearly[i], nearly[j] = nearly[j], nearly[i]
inputs["nearly_sorted"] = nearly
inputs["random"] = [rng.randrange(10 ** 6) for _ in range(N)]

cmp = {k: comparisons(v) for k, v in inputs.items()}
out["n"] = N
out["comparisons"] = cmp
out["natural_runs"] = {k: natural_runs(v) for k, v in inputs.items()}
out["reference"] = {"n_log2_n": round(N * math.log2(N)),
                    "log2_n_factorial": round(math.lgamma(N + 1) / math.log(2))}
out["random_over_bound_pct"] = round(100 * (cmp["random"] / out["reference"]["log2_n_factorial"] - 1), 1)

# sorted() must be right on the same inputs
for k, v in inputs.items():
    assert sorted(v) == sorted(sorted(v))

with open(os.path.join(HERE, "4.3_data.json"), "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
