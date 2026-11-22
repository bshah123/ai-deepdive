"""Measured numbers for lesson 2.5 (object references and aliasing).

Run:   <venv python> scripts/diagrams/lessons/2.5_data.py
Output: scripts/diagrams/lessons/2.5_data.json (read by 2.5.mjs)

Targets CPython 3.12. Booleans and list contents are language-level facts.
sys.getrefcount values and tracemalloc byte counts are CPython- and
build-dependent; they are measured here, not guaranteed.
"""
import copy
import json
import sys
import tracemalloc
from pathlib import Path

R = {"python": sys.version.split()[0]}

# 1. Names are bindings: b = a copies nothing.
c = [1, 2, 3]
R["refcount_one_name"] = sys.getrefcount(c)
d = c
R["refcount_two_names"] = sys.getrefcount(c)
del d
R["refcount_after_del"] = sys.getrefcount(c)

# 2. Mutate vs rebind.
x = [1, 2, 3]
y = x
R["b_is_a_before_mutation"] = y is x
x.append(4)
R["y_after_mutate_x"] = repr(y)
x = [5, 6, 7]
R["x_after_rebind"] = repr(x)
R["y_after_rebind_x"] = repr(y)

# 3. Function arguments are bindings too.
def mutate_param(p):
    p.append(99)

def rebind_param(p):
    p = [0]
    return p

lst = [1]
mutate_param(lst)
R["lst_after_mutate_param"] = repr(lst)
rebind_param(lst)
R["lst_after_rebind_param"] = repr(lst)

# 4. Small-int cache (CPython implementation detail: -5..256 are cached).
R["int256_is_same"] = int("256") is int("256")
R["int257_is_same"] = int("257") is int("257")

# 5. Shallow vs deep copy.
nested = [[1], [2]]
shallow = copy.copy(nested)
deep = copy.deepcopy(nested)
R["shallow_inner_is_same"] = shallow[0] is nested[0]
R["deep_inner_is_same"] = deep[0] is nested[0]
nested[0].append(9)
R["shallow_after_change"] = repr(shallow)
R["deep_after_change"] = repr(deep)

# 6. Immutable container holding a mutable object.
t = ([1],)
t[0].append(2)
R["tuple_after_inner_append"] = repr(t)
try:
    t[0] = [3]
except TypeError as err:
    R["tuple_item_assign_error"] = str(err)

# 7. Mutable default argument: one list shared by every call.
def add_item(item, bag=[]):
    bag.append(item)
    return bag

first = add_item(1)
second = add_item(2)
R["default_first_call"] = repr(first)
R["default_second_call"] = repr(second)
R["default_same_object"] = first is second

# 8. Memory: bytes that stay allocated after an operation (tracemalloc).
def alive_bytes(make):
    tracemalloc.start()
    before = tracemalloc.get_traced_memory()[0]
    kept = make()
    after = tracemalloc.get_traced_memory()[0]
    tracemalloc.stop()
    return after - before, kept

N_FLAT = 1_000_000
big = [0] * N_FLAT
R["n_flat"] = N_FLAT
R["getsizeof_flat_list"] = sys.getsizeof(big)
b_alias, kept_alias = alive_bytes(lambda: big)
b_copy, kept_copy = alive_bytes(lambda: big.copy())
R["bytes_b_equals_a"] = b_alias
R["bytes_flat_shallow_copy"] = b_copy
R["flat_copy_equal"] = kept_copy == big
del kept_alias, kept_copy

N_NEST = 100_000
nested_big = [[i] for i in range(N_NEST)]
R["n_nested"] = N_NEST
b_sh, kept_sh = alive_bytes(lambda: copy.copy(nested_big))
R["bytes_nested_shallow"] = b_sh
R["nested_shallow_inner_is_same"] = kept_sh[5] is nested_big[5]
del kept_sh
b_dp, kept_dp = alive_bytes(lambda: copy.deepcopy(nested_big))
R["bytes_nested_deep"] = b_dp
R["nested_deep_equal"] = kept_dp == nested_big
R["nested_deep_inner_is_same"] = kept_dp[5] is nested_big[5]
del kept_dp

out = Path(__file__).with_name("2.5_data.json")
out.write_text(json.dumps(R, indent=2) + "\n")
print(json.dumps(R, indent=2))
