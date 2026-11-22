"""Experiment behind lesson 7.2 (argument passing). Writes 7.2_data.json.

Every number and message used in 7.2-argument-passing.md and in 7.2.mjs comes from this file.
Run: <python> scripts/diagrams/lessons/7.2_experiment.py
"""
import dis
import inspect
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent / "7.2_data.json"
D = {"python": sys.version.split()[0]}


def err(fn, *args, **kwargs):
    """Return the TypeError message raised by a call, or None if it succeeds."""
    try:
        fn(*args, **kwargs)
    except TypeError as e:
        return str(e)
    return None


# A. Reference semantics: the parameter is a name bound to the caller's object.
a = [1]


def rebind(x):
    x = [99]          # rebinding the local name; the caller's object is untouched


def mutate(x):
    x.append(99)      # mutating the shared object; the caller sees it


rebind(a)
D["after_rebind"] = list(a)            # [1]
mutate(a)
D["after_mutate"] = list(a)            # [1, 99]


def is_same(x):
    return x is a


D["same_object_inside"] = is_same(a)   # True


def bump(n):
    n += 1            # ints are immutable: this creates a new int object
    return n


m = 5
D["int_inside"] = bump(m)              # 6
D["int_outside"] = m                   # 5


# B. Binding a call to a signature.
def f(a, b, *args, c, d=4, **kwargs):
    return {"a": a, "b": b, "args": args, "c": c, "d": d, "kwargs": kwargs}


D["signature_f"] = str(inspect.signature(f))
D["kinds_f"] = [[p.name, p.kind.name] for p in inspect.signature(f).parameters.values()]
bound = f(1, 2, 3, 4, c=5, z=9)
D["bound_a"] = bound["a"]
D["bound_b"] = bound["b"]
D["bound_args"] = repr(bound["args"])
D["bound_c"] = bound["c"]
D["bound_d"] = bound["d"]
D["bound_kwargs"] = repr(bound["kwargs"])


def order(**kwargs):
    return list(kwargs)


D["kwarg_order"] = order(z=1, a=2, m=3)            # ['z', 'a', 'm']: call order kept


def collect(*args, **kwargs):
    return args, kwargs


def greet(*args, **kwargs):
    """Greet with any number of positional and keyword arguments."""
    if args:
        print(f"Hello, {' '.join(args)}!")
    else:
        print("Hello, stranger!")
    if kwargs:
        print("Additional information:")
        for key, value in kwargs.items():
            print(f"{key}: {value}")


D["empty_call"] = [repr(collect()[0]), repr(collect()[1])]   # ['()', '{}']

kw = {"x": 1}
inner = [1]
args, kwargs = collect(*[inner], **kw)
D["kwargs_is_copy"] = kwargs is not kw             # True: a new dict is built
D["args_elem_shared"] = args[0] is inner           # True: shallow, elements shared

# Error messages (CPython 3.12 wording).
D["err_missing_kwonly"] = err(f, 1, 2)
D["err_multiple_values"] = err(f, 1, 2, a=0)


def p(a, /, b, *, c):
    return (a, b, c)


D["signature_p"] = str(inspect.signature(p))
D["kinds_p"] = [[q.name, q.kind.name] for q in inspect.signature(p).parameters.values()]
D["posonly_ok"] = repr(p(1, b=2, c=3))
D["err_posonly_as_kw"] = err(p, a=1, b=2, c=3)
D["err_too_many"] = err(p, 1, 2, 3, c=0)


# C. Mutable default argument: evaluated once, at def time.
def append_bad(item, bucket=[]):
    bucket.append(item)
    return bucket


s1 = list(append_bad(1))           # snapshot at call time
s2 = list(append_bad(2))
s3 = list(append_bad(3))
D["bad_snapshots"] = [s1, s2, s3]                  # [[1], [1, 2], [1, 2, 3]]
D["bad_default_after"] = append_bad.__defaults__[0]  # [1, 2, 3]


def append_ok(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket


t1 = list(append_ok(1))
t2 = list(append_ok(2))
t3 = list(append_ok(3))
D["fixed_snapshots"] = [t1, t2, t3]                # [[1], [2], [3]]


# D. Call-site unpacking compiles to a different opcode.
def call_ops(src):
    code = compile(src, "<call>", "exec")
    return [i.opname for i in dis.get_instructions(code) if i.opname.startswith("CALL")]


D["ops_plain"] = call_ops("g(1, 2, c=3)")
D["ops_star"] = call_ops("g(*t)")
D["ops_dstar"] = call_ops("g(**d)")

if __name__ == "__main__":
    OUT.write_text(json.dumps(D, indent=2) + "\n")
    for k, v in D.items():
        print(f"{k}: {v}")
    print("\ngreet demo output:")
    greet("John", "Doe", age=30, occupation="Software Engineer")
    greet()
    greet("Alice", city="New York")
    print(f"\nwrote {OUT}")
