"""Experiment for lesson 7.3 (first-class functions, lambdas, higher-order functions).

Every number used in the lesson text and in 7.3.mjs comes from this file.
Run once:  <python> scripts/diagrams/lessons/7.3_experiment.py
Writes:    scripts/diagrams/lessons/7.3_data.json
"""
import dis
import functools
import json
import os
import sys
from collections.abc import Iterator

out = {"python": sys.version.split()[0]}

# --- 1. Functions are objects -------------------------------------------------
def square(x):
    return x * x

lam = lambda x: x * x
alias = square
out["type_of_def"] = type(square).__name__
out["name_def"] = square.__name__
out["name_lambda"] = lam.__name__
out["code_name_lambda"] = lam.__code__.co_name
out["alias_is_same_object"] = alias is square
out["square_5"] = square(5)

# --- 2. Lambda is a single expression, not a statement ------------------------
try:
    compile("lambda x: if x > 0: 1", "<lambda-test>", "eval")
    out["lambda_statement_error"] = None
except SyntaxError as e:
    out["lambda_statement_error"] = e.msg

# --- 3. def and lambda compile to the same bytecode ---------------------------
def square_def(x):
    return x * x

out["bytecode_equal_def_vs_lambda"] = square_def.__code__.co_code == lam.__code__.co_code
out["opnames_lambda"] = [i.opname for i in dis.get_instructions(lam) if i.opname != "CACHE"]

# --- 4. map and filter are lazy iterators; counting calls ---------------------
calls = {"n": 0}

def counted_square(x):
    calls["n"] += 1
    return x * x

data = [1, 2, 3, 4, 5]
m = map(counted_square, data)
out["map_type"] = type(m).__name__
out["map_is_iterator"] = isinstance(m, Iterator)
out["calls_before_consuming"] = calls["n"]
out["map_pass_1"] = list(m)
out["calls_after_pass_1"] = calls["n"]
out["map_pass_2"] = list(m)
out["calls_after_pass_2"] = calls["n"]

# A list comprehension does the same work without calling a function.
before = calls["n"]
out["comprehension_result"] = [x * x for x in data]
out["calls_from_comprehension"] = calls["n"] - before

out["filter_pass_1"] = list(filter(lambda x: x % 2 == 0, data))
f2 = filter(lambda x: x % 2 == 0, data)
out["filter_pass_1_obj"] = list(f2)
out["filter_pass_2_obj"] = list(f2)

# --- 5. sorted(key=...) calls the key once per element, comparisons separately -
class Key:
    comparisons = 0

    def __init__(self, v):
        self.v = v

    def __lt__(self, other):
        Key.comparisons += 1
        return self.v < other.v

key_calls = {"n": 0}

def key_fn(x):
    key_calls["n"] += 1
    return Key(x)

nums = [5, 2, 9, 1, 7, 3, 8, 6]
out["sort_input"] = nums
out["sort_result"] = sorted(nums, key=key_fn)
out["sort_n"] = len(nums)
out["sort_key_calls"] = key_calls["n"]
out["sort_comparisons"] = Key.comparisons

# --- 6. Closures: the captured variable lives in a cell -----------------------
def make_multiplier(multiplier):
    def multiplier_function(x):
        return x * multiplier
    return multiplier_function

double = make_multiplier(2)
out["closure_freevars"] = list(double.__code__.co_freevars)
out["closure_cell_value"] = double.__closure__[0].cell_contents
out["double_5"] = double(5)

# --- 7. Late binding trap and two fixes ---------------------------------------
late = [lambda: i for i in range(3)]
out["late_binding_result"] = [f() for f in late]
fixed_default = [lambda i=i: i for i in range(3)]
out["default_arg_fix_result"] = [f() for f in fixed_default]
fixed_factory = [(lambda i: (lambda: i))(i) for i in range(3)]
out["factory_fix_result"] = [f() for f in fixed_factory]

# --- 8. functools helpers ------------------------------------------------------
out["reduce_1_to_5"] = functools.reduce(lambda a, b: a + b, range(1, 6))
out["partial_binary"] = functools.partial(int, base=2)("1011")

# --- write data ----------------------------------------------------------------
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "7.3_data.json"), "w") as fh:
    json.dump(out, fh, indent=2)
for k, v in out.items():
    print(f"{k}: {v}")
