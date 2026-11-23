"""The benchmark shown in Lesson 1.3 (same file as the lesson). The diagrams copy run 3 of 3 by hand into 1.3.mjs.
Run: python 1.3_data.py ; pypy3 1.3_data.py. Timings depend on the machine (Apple M-series, macOS arm64, CPython 3.12.13, PyPy 7.3.23 / Python 3.11.15).
"""
import sys, time, random

def loop_kernel(n):
    total = 0
    for i in range(n):
        total += (i * i) % 7
    return total

def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

def builtin_kernel(n):
    random.seed(0)
    data = [random.random() for _ in range(n)]
    data.sort()
    return len("".join(map(str, range(n // 5)))) + int(data[n // 2] * 1000)

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def dot(self):
        return self.x * self.y

def object_kernel(n):
    pts = [Point(i, i % 7) for i in range(n)]
    return sum(p.dot() for p in pts)

def seconds(f, *args):
    t = time.perf_counter()
    f(*args)
    return time.perf_counter() - t

print(sys.implementation.name, sys.version.split()[0])

# warm-up: the same call twelve times, fresh process
print("fib(24) call 1..12, ms:", " ".join(f"{seconds(fib, 24) * 1000:.2f}" for _ in range(12)))

# steady state: median of 5 runs
for name, f, arg in [("loop 10M", loop_kernel, 10_000_000), ("fib(30)", fib, 30),
                     ("sort+join 1M", builtin_kernel, 1_000_000), ("objects 1M", object_kernel, 1_000_000)]:
    runs = sorted(seconds(f, arg) for _ in range(5))
    print(f"{name:13s} {runs[2]:.3f} s")
