"""Numbers for lesson 12.1 (exception hierarchy, stack unwinding). Stdlib only.

Run: <python> scripts/diagrams/lessons/12.1_experiment.py
"""
import builtins
import sys
import traceback

print("python", sys.version.split()[0])

# 1. Hierarchy: method resolution order (MRO) of some builtin exceptions
for cls in (ZeroDivisionError, KeyError, KeyboardInterrupt):
    print("MRO", cls.__name__, [c.__name__ for c in cls.__mro__ if c is not object])

# 2. Direct builtin subclasses at each level (depends on the Python version)
def direct(cls):
    return sorted(s.__name__ for s in cls.__subclasses__() if s.__module__ == "builtins")

for cls in (BaseException, Exception, ArithmeticError, LookupError):
    print("direct subclasses of", cls.__name__, direct(cls))

all_builtin_excs = [v for v in vars(builtins).values()
                    if isinstance(v, type) and issubclass(v, BaseException)]
print("builtin exception classes (incl. warnings):", len(all_builtin_excs))
print("subclasses of Exception among them:",
      sum(issubclass(c, Exception) for c in all_builtin_excs))

# 3. Catch matrix: which except clause catches which raised exception (first match wins)
raisers = {
    "ZeroDivisionError": lambda: 1 / 0,
    "KeyError": lambda: {}["k"],
    "NameError": lambda: undefined_name_xyz,  # noqa: F821
    "KeyboardInterrupt": lambda: (_ for _ in ()).throw(KeyboardInterrupt()),
}
clauses = [ArithmeticError, LookupError, Exception, BaseException]

def which_clause(fn):
    try:
        fn()
    except ArithmeticError:
        return "ArithmeticError"
    except LookupError:
        return "LookupError"
    except Exception:
        return "Exception"
    except BaseException:
        return "BaseException"

print("\ncatch matrix (rows: raised, value: first clause that matched)")
for name, fn in raisers.items():
    print(f"  {name:18} -> {which_clause(fn)}")

# Same matrix as a clause-by-clause test
print("issubclass checks used for the matrix:")
for name, cls in (("ZeroDivisionError", ZeroDivisionError), ("KeyError", KeyError),
                  ("NameError", NameError), ("KeyboardInterrupt", KeyboardInterrupt)):
    print(f"  {name:18}", [c.__name__ for c in clauses if issubclass(cls, c)])

# 4. Stack unwinding: five frames, finally blocks log the order, traceback length measured
events = []

def d(x):
    try:
        events.append("enter d")
        return 1 / x                      # raises here
    finally:
        events.append("finally d")

def c(x):
    try:
        events.append("enter c")
        return d(x)
    finally:
        events.append("finally c")

def b(x):
    try:
        events.append("enter b")
        return c(x)
    finally:
        events.append("finally b")

def a(x):
    try:
        events.append("enter a")
        return b(x)
    finally:
        events.append("finally a")

def main_chain(x):
    try:
        return a(x)
    except ZeroDivisionError as exc:
        events.append("caught in main_chain")
        return len(traceback.extract_tb(exc.__traceback__))

frames_at_catch = main_chain(0)
print("\nunwinding events:")
for i, ev in enumerate(events, 1):
    print(f"  {i:2d}. {ev}")
print("traceback entries seen by the catching frame:", frames_at_catch)

# 5. Clause order: the same ZeroDivisionError handled by two orderings
def wrong_order():
    try:
        1 / 0
    except Exception:
        return "Exception clause"
    except ZeroDivisionError:
        return "ZeroDivisionError clause"

def right_order():
    try:
        1 / 0
    except ZeroDivisionError:
        return "ZeroDivisionError clause"
    except Exception:
        return "Exception clause"

print("\nclause order:")
print("  wrong order ->", wrong_order())
print("  right order ->", right_order())
try:
    compile("try:\n    pass\nexcept Exception:\n    pass\nexcept ValueError:\n    pass\n", "<s>", "exec")
    print("  compile() of the unreachable clause: no SyntaxError")
except SyntaxError as err:
    print("  compile() raised SyntaxError:", err)

# 6. Re-raise: bare raise vs raise exc (traceback length at the outer catch)
def inner_fail():
    return 1 / 0

def reraise_bare():
    try:
        inner_fail()
    except ZeroDivisionError:
        raise

def reraise_named():
    try:
        inner_fail()
    except ZeroDivisionError as exc:
        raise exc

def tb_len(fn):
    try:
        fn()
    except ZeroDivisionError as exc:
        return len(traceback.extract_tb(exc.__traceback__))

print("\nre-raise traceback entries:")
print("  bare raise      ->", tb_len(reraise_bare))
print("  raise exc       ->", tb_len(reraise_named))

# 7. Hidden bug: a typo is a NameError, which is an Exception
def total(xs):
    try:
        return sum(xs) / len(xss)  # noqa: F821  (typo: xss)
    except Exception:
        return None

print("\nbroad handler hides a typo:")
print("  total([1, 2, 3]) ->", total([1, 2, 3]))
print("  NameError is an Exception subclass:", issubclass(NameError, Exception))

# 8. KeyboardInterrupt is not an Exception: a broad handler lets it through
def run_with_handler(handler_base):
    try:
        raise KeyboardInterrupt
    except handler_base:
        return "handled"
    except BaseException:
        return "escaped the narrow handler, caught by BaseException"

print("\nKeyboardInterrupt:")
print("  narrow Exception handler ->", run_with_handler(Exception))
print("  BaseException handler    ->", run_with_handler(BaseException))

# 9. Dump the numbers for the diagram script (scripts/diagrams/lessons/12.1.mjs)
import json
import os

clause_names = ["ArithmeticError", "LookupError", "Exception", "BaseException"]
matrix = {}
for name, cls in (("ZeroDivisionError", ZeroDivisionError), ("KeyError", KeyError),
                  ("NameError", NameError), ("KeyboardInterrupt", KeyboardInterrupt)):
    matrix[name] = {
        "matches": [c for c, cn in zip(clauses, clause_names) if issubclass(cls, c)],
        "first": which_clause(raisers[name]),
    }
    matrix[name]["matches"] = [c.__name__ for c in clauses if issubclass(cls, c)]

reraise_lines = {}
def tb_lines(fn):
    try:
        fn()
    except ZeroDivisionError as exc:
        return [f"{f.name}:{f.lineno}" for f in traceback.extract_tb(exc.__traceback__)]
reraise_lines["bare"] = tb_lines(reraise_bare)
reraise_lines["named"] = tb_lines(reraise_named)
print("\nre-raise traceback lines (bare):", reraise_lines["bare"])
print("re-raise traceback lines (raise exc):", reraise_lines["named"])

data = {
    "python": sys.version.split()[0],
    "mro_zde": [c.__name__ for c in ZeroDivisionError.__mro__ if c is not object],
    "direct_base": direct(BaseException),
    "direct_exception": direct(Exception),
    "catch_matrix": matrix,
    "events": events,
    "unwind_tb_entries": frames_at_catch,
    "reraise_bare": tb_len(reraise_bare),
    "reraise_named": tb_len(reraise_named),
    "wrong_order": wrong_order(),
    "right_order": right_order(),
    "typo_total": total([1, 2, 3]),
}
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "12.1_data.json")
with open(path, "w") as fh:
    json.dump(data, fh, indent=2)
print("wrote", path)
