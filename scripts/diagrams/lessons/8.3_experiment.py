"""Experiment for lesson 8.3 (function decorators and functools.wraps).

Every number used in the lesson text and diagrams comes from this script.
Run: python3 scripts/diagrams/lessons/8.3_experiment.py
Deterministic: no timing, no randomness, no addresses.
"""
import functools
import inspect
import sys

print("python", sys.version.split()[0])

# ---- 1. @deco is sugar for reassignment; wrapper keeps the original in a closure
def logged(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"-> {func.__name__}{args}")
        result = func(*args, **kwargs)
        print(f"<- {func.__name__} returned {result!r}")
        return result
    return wrapper

def add(a, b):
    """Return a plus b."""
    return a + b

add_decorated_by_hand = logged(add)          # what @logged does
print("manual call:", add_decorated_by_hand(2, 3))
print("closure cells:", [c.cell_contents.__name__ for c in add_decorated_by_hand.__closure__])
print("formula 2F(n+1)-1 at n=20:", 2 * 10946 - 1)

# ---- 2. metadata with and without functools.wraps
def plain(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def wrapped(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@plain
def add_plain(a, b):
    """Return a plus b."""
    return a + b

@wrapped
def add_wrapped(a, b):
    """Return a plus b."""
    return a + b

for label, f in (("plain", add_plain), ("wraps", add_wrapped)):
    print(f"{label:6s} __name__={f.__name__!r} __qualname__={f.__qualname__!r} "
          f"__doc__={f.__doc__!r} has __wrapped__={hasattr(f, '__wrapped__')} "
          f"signature={inspect.signature(f)}")

print("WRAPPER_ASSIGNMENTS:", functools.WRAPPER_ASSIGNMENTS)
print("WRAPPER_UPDATES:", functools.WRAPPER_UPDATES)
print("wraps copies __dict__ entries:", end=" ")
def tagged(func):
    func.tag = "original"
    return func
@tagged
def t(): pass
print(t.tag)

# ---- 3. call counting through a recursive function: the name is looked up at each call
calls = 0
def count_calls(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        global calls
        calls += 1
        return func(*args, **kwargs)
    return wrapper

@count_calls
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

for n in (5, 10, 15, 20):
    calls = 0
    value = fib(n)
    print(f"fib({n}) = {value}, wrapper calls = {calls}")

# ---- 4. stacking: @outer @inner f  ==  outer(inner(f))
def outer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print("outer: in")
        result = func(*args, **kwargs)
        print("outer: out")
        return result
    return wrapper

def inner(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print("inner: in")
        result = func(*args, **kwargs)
        print("inner: out")
        return result
    return wrapper

@outer
@inner
def greet():
    print("greet body")
    return "done"

print("stack result:", greet())

# ---- 5. the forgotten return
def broken(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        func(*args, **kwargs)            # result computed, then dropped
    return wrapper

@broken
def square(x):
    return x * x

print("broken square(4) =", square(4))
