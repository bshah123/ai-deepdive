"""Experiment for lesson 3.4 (Booleans & Truth Value Testing). Prints every number the lesson uses.

Run: <python> scripts/diagrams/lessons/3.4_data.py
"""
import sys
import fractions
import decimal
import numpy as np

print("python", sys.version.split()[0], "| numpy", np.__version__)
print()

# 1. bool is a subclass of int
print("issubclass(bool, int):", issubclass(bool, int))
print("bool.__mro__:", [c.__name__ for c in bool.__mro__])
print("True == 1:", True == 1, "| False == 0:", False == 0)
print("True + True:", True + True, "| True * 3:", True * 3, "| sum([T,F,T]):", sum([True, False, True]))
print("type(True):", type(True).__name__, "| isinstance(True, int):", isinstance(True, int))
try:
    class MyBool(bool):
        pass
except TypeError as e:
    print("class MyBool(bool): TypeError:", e)
print()

# 2. singletons
print("bool(5) is True:", bool(5) is True, "| bool([]) is False:", bool([]) is False)
print("bool(7) is bool(9):", bool(7) is bool(9))
print("id(True) == id(bool(3)):", id(True) == id(bool(3)))
print()

# 3. falsy and surprising truthy values
falsy = [0, 0.0, -0.0, 0j, "", [], (), {}, set(), range(0), None, False,
         decimal.Decimal(0), fractions.Fraction(0), b""]
for v in falsy:
    print(f"falsy  {v!r:>22} -> bool = {bool(v)}")
print("count falsy in list above:", sum(1 for v in falsy if not bool(v)), "of", len(falsy))
truthy = [1, -1, 1e-300, float("nan"), "0", " ", "False", [0], [None], range(1), decimal.Decimal("1e-30")]
for v in truthy:
    print(f"truthy {v!r:>22} -> bool = {bool(v)}")
print()

# 4. protocol: __bool__ first, then __len__, else True
class Plain:
    pass
class LenZero:
    def __len__(self):
        return 0
class LenFive:
    def __len__(self):
        return 5
class BoolFalseLenFive:
    def __bool__(self):
        return False
    def __len__(self):
        return 5
class BoolReturnsInt:
    def __bool__(self):
        return 0
print("Plain() ->", bool(Plain()))
print("LenZero() ->", bool(LenZero()), "| LenFive() ->", bool(LenFive()))
print("BoolFalseLenFive() ->", bool(BoolFalseLenFive()), "(__bool__ wins over __len__)")
try:
    bool(BoolReturnsInt())
except TypeError as e:
    print("__bool__ returning 0: TypeError:", e)
print()

# 5. and / or return an operand
print("'' or 'guest' ->", repr('' or 'guest'))
print("'Ada' or 'guest' ->", repr('Ada' or 'guest'))
print("0 and 'x' ->", repr(0 and 'x'))
print("[] or None ->", repr([] or None))
print("None or 0 ->", repr(None or 0))
print("1 and 2 and 3 ->", repr(1 and 2 and 3))
print("not [] ->", repr(not []), "| not 'x' ->", repr(not 'x'))
print()

# 6. short-circuit evaluation counts calls
calls = 0
def side_effect():
    global calls
    calls += 1
    return True
False and side_effect(); print("False and f(): calls =", calls)
True or side_effect(); print("True or f(): calls =", calls)
True and side_effect(); print("True and f(): calls =", calls)
print()

# 7. == True versus truth testing versus is True
probe = [0, 1, 2, -1, 0.5, 0.0, "", "a", [], [1], None, True, False]
print(f"{'x':>8} | {'bool(x)':>7} | {'x == True':>9} | {'x is True':>9}")
for x in probe:
    print(f"{x!r:>8} | {str(bool(x)):>7} | {str(x == True):>9} | {str(x is True):>9}")
print("mismatch count (bool(x) != (x == True)):", sum(1 for x in probe if bool(x) != (x == True)))
print()

# 8. chained comparisons
print("0 < 5 < 3 ->", 0 < 5 < 3, "| 5 > 3 > 1 ->", 5 > 3 > 1)
print()

# 9. numpy arrays: truth value is ambiguous for size != 1
print("bool(np.array([0])) ->", bool(np.array([0])), "| bool(np.array([3])) ->", bool(np.array([3])))
try:
    bool(np.array([1, 2]))
except ValueError as e:
    print("bool(np.array([1, 2])): ValueError:", e)
try:
    bool(np.array([]))
except ValueError as e:
    print("bool(np.array([])): ValueError:", e)
