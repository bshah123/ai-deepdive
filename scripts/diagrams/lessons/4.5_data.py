"""Experiment script for lesson 4.5 (collections.deque vs list for FIFO queues).

Prints every number the lesson and the 4.5 diagrams use.
Run: <python> scripts/diagrams/lessons/4.5_data.py
Timings are wall-clock (time.perf_counter), best of REPEATS, and depend on the machine.
"""
import json, random, statistics, sys, time
from collections import deque

REPEATS = 3
R = {"python": sys.version.split()[0]}

# 1. Correctness: both containers give the same FIFO order on random operations
rng = random.Random(45)
ops = [("push", rng.randrange(1000)) if rng.random() < 0.6 else ("pop", None) for _ in range(20000)]
lst, dq, out_l, out_d = [], deque(), [], []
for op, v in ops:
    if op == "push":
        lst.append(v); dq.append(v)
    elif lst:
        out_l.append(lst.pop(0)); out_d.append(dq.popleft())
R["fifo_ops"] = len(ops)
R["fifo_popped"] = len(out_l)
R["fifo_same_order"] = out_l == out_d

# 2. The worked example: queue of 1,2,3, append 4, popleft
q_list, q_dq = [1, 2, 3], deque([1, 2, 3])
q_list.append(4); q_dq.append(4)
R["example_list_before_pop"] = list(q_list)
R["example_list_popped"] = q_list.pop(0)
R["example_list_after"] = list(q_list)
R["example_deque_popped"] = q_dq.popleft()
R["example_deque_after"] = list(q_dq)
R["example_list_pointers_moved"] = len(q_list)          # elements that must shift left after pop(0)
R["example_maxlen"] = [str(deque([1, 2, 3], maxlen=3))]
d = deque([1, 2, 3], maxlen=3); d.append(4)
R["maxlen_after_append"] = list(d)
d.appendleft(0)
R["maxlen_after_appendleft"] = list(d)

# 3. Drain timing: fill n items, then remove all of them from the front
def drain_list(n):
    q = list(range(n))
    t = time.perf_counter()
    while q:
        q.pop(0)
    return time.perf_counter() - t

def drain_deque(n):
    q = deque(range(n))
    t = time.perf_counter()
    while q:
        q.popleft()
    return time.perf_counter() - t

sizes = [1000, 3000, 10000, 30000, 100000]
R["drain_sizes"] = sizes
R["drain_list_s"] = []
R["drain_deque_s"] = []
for n in sizes:
    R["drain_list_s"].append(min(drain_list(n) for _ in range(REPEATS)))
    R["drain_deque_s"].append(min(drain_deque(n) for _ in range(REPEATS)))
R["drain_list_ratio"] = [R["drain_list_s"][i] / R["drain_list_s"][i - 1] for i in range(1, len(sizes))]
R["drain_list_n_ratio"] = [sizes[i] / sizes[i - 1] for i in range(1, len(sizes))]
R["list_pointer_moves_drain_1e5"] = 100000 * 99999 // 2   # sum of (n-1) + (n-2) + ... + 0 element shifts

# 4. Steady state: queue held at length L, one pop and one push per step (BFS-like)
L, steps = 100000, 20000
def steady_list():
    q = list(range(L))
    t = time.perf_counter()
    for i in range(steps):
        q.pop(0); q.append(i)
    return (time.perf_counter() - t) / steps

def steady_deque():
    q = deque(range(L))
    t = time.perf_counter()
    for i in range(steps):
        q.popleft(); q.append(i)
    return (time.perf_counter() - t) / steps

R["steady_len"] = L
R["steady_list_us_per_cycle"] = min(steady_list() for _ in range(REPEATS)) * 1e6
R["steady_deque_us_per_cycle"] = min(steady_deque() for _ in range(REPEATS)) * 1e6

# 5. Trap: middle indexing on a deque walks blocks
big_l, big_d = list(range(L)), deque(range(L))
def per_access(seq, idx, number=2000):
    return min(__import__("timeit").repeat(lambda: seq[idx], number=number, repeat=REPEATS)) / number * 1e9
R["index_middle_list_ns"] = per_access(big_l, L // 2)
R["index_middle_deque_ns"] = per_access(big_d, L // 2)
R["index_end_deque_ns"] = per_access(big_d, 0)

# 6. Per-element cost of one pop(0), at two queue lengths (linear growth check)
def one_pop_ns(n):
    q = list(range(n))
    t = time.perf_counter()
    for _ in range(200):
        q.pop(0)
        q.append(0)
    return (time.perf_counter() - t) / 200 * 1e9
R["one_pop0_ns_len1e3"] = min(one_pop_ns(1000) for _ in range(REPEATS))
R["one_pop0_ns_len1e5"] = min(one_pop_ns(100000) for _ in range(REPEATS))

print(json.dumps(R, indent=1))
