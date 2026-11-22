"""Numbers for lesson 12.3 (cProfile and sys.settrace). Stdlib only.

Run: <python> scripts/diagrams/lessons/12.3_experiment.py
Writes scripts/diagrams/lessons/12.3_data.json (read by 12.3.mjs).
Timing numbers are machine-specific; call counts and event counts are deterministic.
"""
import cProfile, json, pstats, sys, threading, time

print("python", sys.version.split()[0], sys.platform)
print("sys.monitoring present:", hasattr(sys, "monitoring"))

def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

def fib_loop(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

def fib_value(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

def fibs(n):  # F(n) as a reference (F(0)=0, F(1)=1)
    return fib_value(n)

def profiled_calls(fn, *args):
    """Return (total calls, primitive calls) recorded by cProfile for fn."""
    p = cProfile.Profile()
    p.enable()
    fn(*args)
    p.disable()
    for (fname, line, name), (cc, nc, tt, ct, callers) in pstats.Stats(p).stats.items():
        if name == fn.__name__:
            return nc, cc
    raise RuntimeError("not found")

# 1. Call counts: naive recursion vs loop, and the closed form 2*F(n+1)-1
calls_table = []
for n in (5, 10, 15, 20, 25):
    nc, cc = profiled_calls(fib, n)
    closed = 2 * fibs(n + 1) - 1
    loop_nc, _ = profiled_calls(fib_loop, n)
    calls_table.append({"n": n, "naive_calls": nc, "primitive": cc, "closed_form": closed, "loop_calls": loop_nc})
    print(f"n={n:2d} naive_calls={nc:7d} primitive={cc} closed_form={closed:7d} loop_calls={loop_nc}")
    assert nc == closed

ratios = [calls_table[i + 1]["naive_calls"] / calls_table[i]["naive_calls"] for i in range(len(calls_table) - 1)]
print("successive ratios per +5 in n:", [round(r, 2) for r in ratios])
# per +1 in n:
print("ratio per +1 n (from 2F(n+1)-1), n=24->25:", round((2*fibs(26)-1)/(2*fibs(25)-1), 4))

# 2. The sys.settrace event stream for fib(3)
events = []
depth = [0]
def tracer(frame, event, arg):
    if event == "call":
        depth[0] += 1
        events.append((depth[0], "call", frame.f_locals.get("n"), frame.f_lineno, None))
        return tracer
    if event == "line":
        events.append((depth[0], "line", frame.f_locals.get("n"), frame.f_lineno, None))
    elif event == "return":
        events.append((depth[0], "return", frame.f_locals.get("n"), frame.f_lineno, arg))
        depth[0] -= 1
    return tracer

sys.settrace(tracer)
r3 = fib(3)
sys.settrace(None)
print("fib(3) =", r3, "events:", len(events))
for e in events:
    print("  ", e)
calls3 = [e for e in events if e[1] == "call"]
print("fib(3) calls:", len(calls3), "n sequence:", [e[2] for e in calls3])
print("line events per call n:", {n: sum(1 for e in events if e[1] == "line" and e[2] == n) for n in (0, 1, 2, 3)})

# 3. Bug probe: a tracer that returns None on 'call' gets no line events
seen = []
def bad_tracer(frame, event, arg):
    if event == "call":
        return None          # no local tracer for this frame
    if event == "line":
        seen.append(frame.f_lineno)
    return bad_tracer
sys.settrace(bad_tracer)
fib(3)
sys.settrace(None)
print("line events with tracer returning None on call:", len(seen))

# 4. sys.settrace is per thread
thread_seen = []
def thread_tracer(frame, event, arg):
    if threading.current_thread() is not threading.main_thread():
        thread_seen.append(event)   # count only events raised in the worker thread
    return thread_tracer
def work():
    fib(3)
sys.settrace(thread_tracer)
t = threading.Thread(target=work)
t.start(); t.join()
sys.settrace(None)
print("events seen in worker thread while main thread traced:", len(thread_seen))

# 5. cProfile does not go through the Python-level sys.getprofile()
p = cProfile.Profile(); p.enable()
during = sys.getprofile()
p.disable()
print("sys.getprofile() during cProfile:", during)

# 6. Overhead on fib(22): time (best of 5) and event counts per mode
N = 22
def run_none():
    fib(N)
def run_cprofile():
    p = cProfile.Profile(); p.enable(); fib(N); p.disable()
def run_trace_calls_only():
    def t(frame, event, arg):
        return None           # global trace only: one 'call' event per call
    sys.settrace(t); fib(N); sys.settrace(None)
def run_trace_lines():
    counts = {"call": 0, "line": 0, "return": 0}
    def t(frame, event, arg):
        counts[event] += 1
        return t
    sys.settrace(t); fib(N); sys.settrace(None)
    return counts

def best(fn, reps=5):
    times = []
    for _ in range(reps):
        t0 = time.perf_counter(); fn(); times.append(time.perf_counter() - t0)
    return min(times)

base = best(run_none)
modes = {
    "none": base,
    "cProfile": best(run_cprofile),
    "settrace, call events only": best(run_trace_calls_only),
    "settrace, call+line+return": best(run_trace_lines),
}
counts_lines = run_trace_lines()
overhead = {}
for k, v in modes.items():
    overhead[k] = {"seconds": round(v, 5), "multiplier": round(v / base, 1)}
    print(f"{k:30s} {v*1000:9.2f} ms  x{v/base:6.1f}")
print("event counts for fib(22) with full tracer:", counts_lines)
print("cProfile total calls for fib(22):", profiled_calls(fib, N)[0])

data = {
    "python": sys.version.split()[0],
    "platform": sys.platform,
    "calls_table": calls_table,
    "fib3": {"result": r3, "events": events, "calls": len(calls3)},
    "bad_tracer_line_events": len(seen),
    "thread_events": len(thread_seen),
    "overhead_fib22": overhead,
    "event_counts_fib22": counts_lines,
    "fib22_calls": 2 * fibs(N + 1) - 1,
}
with open(__file__.replace("_experiment.py", "_data.json"), "w") as f:
    json.dump(data, f, indent=1)
print("wrote data json")
