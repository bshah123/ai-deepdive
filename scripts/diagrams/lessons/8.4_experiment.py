"""Lesson 8.4 experiment: every number used in the lesson text and diagrams comes from this script.

Run:  python3 scripts/diagrams/lessons/8.4_experiment.py
Writes scripts/diagrams/lessons/8.4_data.json and prints the results.
Stdlib only. Verified on Python 3.12 (see the 'python' field in the JSON).
"""
import contextlib
import dataclasses
import functools
import io
import json
import os
import platform
import sys

results = {"python": platform.python_version()}


def capture(fn, *args, **kwargs):
    """Run fn, return (printed text, return value)."""
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        ret = fn(*args, **kwargs)
    return buf.getvalue(), ret


# ---------------------------------------------------------------- 1. parameterized decorator
def repeat(num_times):
    def decorator_repeat(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(num_times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator_repeat


@repeat(num_times=3)
def greet(name):
    print(f"Hello, {name}!")
    return f"Hello, {name}!"


out, ret = capture(greet, "Alice")
results["repeat_print_count"] = out.count("Hello")
results["repeat_return"] = ret
results["wraps_name"] = greet.__name__
results["wraps_has_wrapped"] = hasattr(greet, "__wrapped__")

# Same decorator without functools.wraps
def repeat_bare(num_times):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for _ in range(num_times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator


@repeat_bare(2)
def hi():
    return "hi"


results["bare_name"] = hi.__name__
results["bare_doc"] = hi.__doc__

# Closure introspection, step by step: @repeat(3) means  greet = repeat(3)(greet)
step1 = repeat(3)                                   # returns decorator_repeat
results["step1_type"] = type(step1).__name__
results["step1_freevars"] = list(step1.__code__.co_freevars)
results["step1_cells"] = [c.cell_contents for c in step1.__closure__]


def plain(name):
    return name


step2 = step1(plain)                                # returns wrapper
results["step2_type"] = type(step2).__name__
results["step2_freevars"] = sorted(step2.__code__.co_freevars)
results["step2_cells"] = {k: (v.cell_contents if k == "num_times" else type(v.cell_contents).__name__)
                          for k, v in zip(step2.__code__.co_freevars, step2.__closure__)}

# ---------------------------------------------------------------- 2. forgotten parentheses
@repeat                       # BUG: no call, so repeat(greet) sets num_times = greet
def greet_bug(name):
    print(f"Hello, {name}!")
    return f"Hello, {name}!"


out, ret = capture(greet_bug, "Alice")          # no error is raised
results["noparen_type"] = type(greet_bug).__name__
results["noparen_prints"] = len(out)            # nothing printed
results["noparen_return_type"] = type(ret).__name__
results["noparen_return_name"] = ret.__name__

# ---------------------------------------------------------------- 3. stacking order
def tag(label):
    def deco(f):
        def w(*a, **k):
            print("enter", label)
            r = f(*a, **k)
            print("exit", label)
            return r
        return w
    return deco


@tag("outer")
@tag("inner")
def body():
    print("body")


out, _ = capture(body)
results["stack_trace"] = out.splitlines()

# ---------------------------------------------------------------- 4. class decorator (subclass)
events = []  # filled by the variant below


def debug(cls):
    class DebuggedClass(cls):
        def __getattribute__(self, name):
            events.append(("get", name))
            return super().__getattribute__(name)

        def __setattr__(self, name, value):
            events.append(("set", name))
            super().__setattr__(name, value)
    return DebuggedClass


class PersonRaw:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def greet(self):
        return f"Hello, my name is {self.name} and I am {self.age} years old."


Person = debug(PersonRaw)
results["decorated_name"] = Person.__name__
results["decorated_qualname"] = Person.__qualname__
results["decorated_bases"] = [b.__name__ for b in Person.__bases__]
events.clear()
p = Person("Bob", 30)
results["init_events"] = list(events)                  # two sets, zero gets
events.clear()
text = p.greet()
results["greet_events"] = list(events)                 # get greet, get name, get age
results["greet_event_count"] = len(events)
results["greet_text"] = text
results["isinstance_ok"] = isinstance(p, Person)
results["type_name"] = type(p).__name__

# Fix: copy the identity attributes back
def debug_fixed(cls):
    class DebuggedClass(cls):
        def __getattribute__(self, name):
            return super().__getattribute__(name)
    DebuggedClass.__name__ = cls.__name__
    DebuggedClass.__qualname__ = cls.__qualname__
    DebuggedClass.__doc__ = cls.__doc__
    return DebuggedClass


PersonFixed = debug_fixed(PersonRaw)
results["fixed_name"] = PersonFixed.__name__
results["fixed_qualname"] = PersonFixed.__qualname__

# Does functools.update_wrapper work on a class?
class Plain:
    """Plain docstring."""


class Sub(Plain):
    pass


try:
    functools.update_wrapper(Sub, Plain)
    results["update_wrapper_on_class"] = "ok"
except Exception as exc:  # record the exact failure
    results["update_wrapper_on_class"] = f"{type(exc).__name__}: {exc}"

# ---------------------------------------------------------------- 5. in-place class decorators
REGISTRY = {}


def register(name):
    def deco(cls):
        REGISTRY[name] = cls
        return cls
    return deco


@register("csv")
class CsvReader:
    pass


results["registry_keys"] = list(REGISTRY)
results["registry_is_same_class"] = REGISTRY["csv"] is CsvReader
results["csvreader_name"] = CsvReader.__name__


class PointRaw:
    x: int
    y: int


Point = dataclasses.dataclass(PointRaw)
results["dataclass_returns_same_class"] = Point is PointRaw
results["point_repr"] = repr(Point(1, 2))

# ---------------------------------------------------------------- write
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "8.4_data.json"), "w") as f:
    json.dump(results, f, indent=2, default=str)
    f.write("\n")

for k, v in results.items():
    print(f"{k}: {v!r}")
