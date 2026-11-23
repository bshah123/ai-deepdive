"""Experiment for lesson 7.4 (recursion limits & stack overflow).

Each section mirrors one code block or claim in content/part-01-python-properly/
chapter-07-functions-call-stack/7.4-recursion-stack.md. Writes 7.4_data.json next to
this file. Run once:
    python3 scripts/diagrams/lessons/7.4_experiment.py
"""
import json
import random
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).with_name("7.4_data.json")
data = {"python_version": sys.version.split()[0], "default_limit": sys.getrecursionlimit()}


def depth_of_stack() -> int:
    """Number of Python frames on the stack, counting this one and <module>."""
    f, n = sys._getframe(), 0
    while f is not None:
        n += 1
        f = f.f_back
    return n


def rec(n: int) -> int:
    """Plain recursion: n + 1 frames at the deepest point."""
    return 0 if n == 0 else 1 + rec(n - 1)


def max_ok(fn, hi: int = 200_000) -> int:
    """Largest n for which fn(n) does not raise RecursionError (bisection)."""
    lo = 0
    while lo < hi:
        mid = (lo + hi + 1) // 2
        try:
            fn(mid)
            lo = mid
        except RecursionError:
            hi = mid - 1
    return lo


# --- Block 1: the limit is a count of frames; extra wrapper frames eat into it.
def wrapped(k: int) -> int:
    if k == 0:
        return depth_of_stack()          # frames on the stack at the call site
    return wrapped(k - 1)


def with_wrappers(k: int):
    """Same structure as the lesson's with_wrappers(k): no extra frame during max_ok."""
    def run(n: int) -> None:
        def wrap(j: int) -> None:
            if j == 0:
                rec(n)
            else:
                wrap(j - 1)
        wrap(k)
    return run


data["frames_at_call_k0"] = wrapped(0)
data["wrapper_sweep"] = []
for k in (0, 10, 50, 200):
    base = wrapped(k)
    m = max_ok(with_wrappers(k))
    data["wrapper_sweep"].append({"k": k, "frames_at_call": base, "max_n": m,
                                  "limit_minus_max_n": data["default_limit"] - m})

# --- Block 2: the RecursionError boundary for several limits (set, measure, restore).
data["limit_sweep"] = []
for lim in (100, 1000, 5000):
    sys.setrecursionlimit(lim)
    m = max_ok(rec, hi=lim * 2)
    data["limit_sweep"].append({"limit": lim, "max_n": m})
sys.setrecursionlimit(data["default_limit"])

# --- Block 3: a RecursionError is catchable, and the stack is usable afterwards.
try:
    rec(10**6)
    data["caught_message"] = None
except RecursionError as e:
    data["caught_message"] = str(e)
data["after_error_rec_500"] = rec(500)   # still works: the frames were unwound

# --- Block 4: raising the limit (same process). Python-to-Python calls: 100000 deep.
sys.setrecursionlimit(200_000)
data["deep_100000_ok"] = rec(100_000)
sys.setrecursionlimit(data["default_limit"])

# --- Block 5: memory per frame, one subprocess per depth so peak RSS is clean.
RSS_CODE = """
import resource, sys
sys.setrecursionlimit(200000)
def rec(n):
    return 0 if n == 0 else 1 + rec(n - 1)
rec(int(sys.argv[1]))
ru = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
print(ru if sys.platform == 'darwin' else ru * 1024)   # bytes on macOS, KiB on Linux
"""


def peak_rss_bytes(depth: int) -> int:
    r = subprocess.run([sys.executable, "-c", RSS_CODE, str(depth)],
                       capture_output=True, text=True, timeout=120, check=True)
    return int(r.stdout.strip())


rss = {d: peak_rss_bytes(d) for d in (0, 10_000, 100_000)}
data["rss_bytes"] = {str(d): v for d, v in rss.items()}
data["bytes_per_frame_est"] = round((rss[100_000] - rss[0]) / 100_000)

# --- Block 6: recursive sum vs loop, and recursive DFS vs explicit-stack DFS.
def recursive_sum(xs, i=0):
    if i == len(xs):
        return 0
    return xs[i] + recursive_sum(xs, i + 1)


def loop_sum(xs):
    total = 0
    for x in xs:
        total += x
    return total


data["recursive_sum_max_len"] = max_ok(lambda n: recursive_sum(list(range(n))))
big = list(range(1_000_000))
data["loop_sum_1e6_ok"] = loop_sum(big) == 999_999 * 1_000_000 // 2


def dfs_rec(adj, node, seen):
    seen.add(node)
    for nxt in adj[node]:
        if nxt not in seen:
            dfs_rec(adj, nxt, seen)
    return seen


def dfs_stack(adj, start):
    seen, stack = set(), [start]
    while stack:
        node = stack.pop()
        if node in seen:
            continue
        seen.add(node)
        stack.extend(adj[node])
    return seen


def path_graph(n):
    adj = {i: [] for i in range(n)}
    for i in range(n - 1):
        adj[i].append(i + 1)
        adj[i + 1].append(i)
    return adj


data["dfs_rec_max_nodes"] = max_ok(lambda n: dfs_rec(path_graph(n), 0, set()))
data["dfs_stack_100000_nodes"] = len(dfs_stack(path_graph(100_000), 0))

# Both DFS versions must visit the same set on random graphs (a correctness check).
rng = random.Random(7)
agree = 0
for _ in range(200):
    n = 40
    adj = {i: [] for i in range(n)}
    for _ in range(60):
        a, b = rng.randrange(n), rng.randrange(n)
        adj[a].append(b)
        adj[b].append(a)
    if dfs_rec(adj, 0, set()) == dfs_stack(adj, 0):
        agree += 1
data["dfs_agree_of_200"] = agree

# --- Block 7: tail calls are not eliminated in CPython.
def count_down(n):
    return "done" if n == 0 else count_down(n - 1)


data["tail_call_max_n"] = max_ok(count_down)
data["tail_call_1e5_ok"] = None
try:
    count_down(100_000)
    data["tail_call_1e5_ok"] = True
except RecursionError:
    data["tail_call_1e5_ok"] = False

# --- Block 8: C-level recursion (repr of nested lists) has its own guard.
def nest(d):
    x = []
    for _ in range(d):
        x = [x]
    return x


data["repr_nest_max_default"] = max_ok(lambda d: repr(nest(d)), hi=50_000)
sys.setrecursionlimit(200_000)
try:
    repr(nest(200_000))
    data["repr_nest_200000_with_high_limit"] = "ok"
except RecursionError as e:
    data["repr_nest_200000_with_high_limit"] = str(e)
sys.setrecursionlimit(data["default_limit"])


# --- Block 9: count the frames the stack really holds at the deepest successful call.
def count_leaf(n: int) -> int:
    """Count frames from inside the deepest call without calling another function."""
    if n == 0:
        f, c = sys._getframe(), 0
        while f is not None:
            c += 1
            f = f.f_back
        return c
    return count_leaf(n - 1)


def via_helper(fn, n):
    return fn(n)


data["helper_boundary_max_n"] = max_ok(lambda n: via_helper(rec, n))
data["frames_at_helper_max_n"] = via_helper(count_leaf, data["helper_boundary_max_n"])
data["frames_at_helper_max_n_plus_1"] = None
try:
    via_helper(count_leaf, data["helper_boundary_max_n"] + 1)
    data["frames_at_helper_max_n_plus_1"] = "ok"
except RecursionError:
    data["frames_at_helper_max_n_plus_1"] = "RecursionError"

# --- DFS trace on a 5-node tree (explicit stack; pop, then push children).
TREE = {0: [1, 2], 1: [3, 4], 2: [], 3: [], 4: []}
trace = []
seen, stack = set(), [0]
while stack:
    node = stack.pop()
    if node in seen:
        continue
    seen.add(node)
    stack.extend(TREE[node])
    trace.append({"popped": node, "stack_after": list(stack), "seen": sorted(seen)})
data["dfs_trace"] = trace
data["dfs_trace_order"] = [t["popped"] for t in trace]

OUT.write_text(json.dumps(data, indent=2))
print(json.dumps(data, indent=2))
