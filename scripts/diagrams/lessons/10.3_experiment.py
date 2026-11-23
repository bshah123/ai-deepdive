"""Experiment for lesson 10.3 (super() mechanics). Standard library only.

Run:  python3 10.3_experiment.py      -> prints every number used in the lesson and
                                         writes 10.3_data.json next to this file.
"""
import json
import sys
from pathlib import Path

LOG = []


def run(factory):
    """Build one object with factory() and return the order in which __init__ bodies ran."""
    LOG.clear()
    factory()
    return list(LOG)


# ---- 1. Diamond, cooperative: every class calls super().__init__() ----------------
class A:
    def __init__(self):
        LOG.append("A")


class B(A):
    def __init__(self):
        LOG.append("B")
        super().__init__()


class C(A):
    def __init__(self):
        LOG.append("C")
        super().__init__()


class D(B, C):
    def __init__(self):
        LOG.append("D")
        super().__init__()


coop_trace = run(D)
diamond_mro = [k.__name__ for k in D.__mro__]


# ---- 2. Diamond, naive: each class names its base explicitly -----------------------
class NA:
    def __init__(self):
        LOG.append("NA")


class NB(NA):
    def __init__(self):
        LOG.append("NB")
        NA.__init__(self)


class NC(NA):
    def __init__(self):
        LOG.append("NC")
        NA.__init__(self)


class ND(NB, NC):
    def __init__(self):
        LOG.append("ND")
        NB.__init__(self)
        NC.__init__(self)


naive_trace = run(ND)


# ---- 3. Broken chain: a parent that forgets super() --------------------------------
class ParentA:
    def __init__(self):
        LOG.append("ParentA")
        self.a = "A"          # no super() call here


class ParentB:
    def __init__(self):
        LOG.append("ParentB")
        self.b = "B"


class Child(ParentA, ParentB):
    def __init__(self):
        LOG.append("Child")
        super().__init__()


broken_trace = run(Child)
child = Child()
has_b = hasattr(child, "b")
try:
    child.b
except AttributeError as e:
    broken_error = f"{type(e).__name__}: {e}"


# ---- 4. Binding happens at call time, from type(self).__mro__ ----------------------
class Base:
    def who(self):
        return "Base"


class Left(Base):
    def who(self):
        return "Left>" + super().who()


class Right(Base):
    def who(self):
        return "Right>" + super().who()


class Bottom(Left, Right):
    def who(self):
        return "Bottom>" + super().who()


bottom = Bottom()
left = Left()
bottom_mro = [k.__name__ for k in Bottom.__mro__]
who_bottom = bottom.who()                      # Bottom -> Left -> Right -> Base
who_left_on_left = left.who()                  # Left instance: super() in Left goes to Base
who_left_on_bottom = Left.who(bottom)          # same function, Bottom instance: goes to Right
explicit_two_arg = super(Left, bottom).who()   # what super() inside Left resolves to


# ---- 5. Zero-argument super() outside a method --------------------------------------
def outside_function():
    return super()


try:
    outside_function()
    zero_arg_outside = "no error"
except RuntimeError as e:
    zero_arg_outside = f"{type(e).__name__}: {e}"


class Odd:
    @staticmethod
    def s():
        return super()


try:
    Odd.s()
    zero_arg_static = "no error"
except RuntimeError as e:
    zero_arg_static = f"{type(e).__name__}: {e}"


# ---- 6. Keyword arguments passed up a cooperative chain -----------------------------
HOPS = []


class Named:
    def __init__(self, name, **kw):
        HOPS.append(("Named", {"name": name, **kw}))
        self.name = name
        super().__init__(**kw)


class Colored:
    def __init__(self, color, **kw):
        HOPS.append(("Colored", {"color": color, **kw}))
        self.color = color
        super().__init__(**kw)


class Shape(Named, Colored):
    def __init__(self, **kw):
        HOPS.append(("Shape", dict(kw)))
        super().__init__(**kw)


HOPS.clear()
shape = Shape(name="square", color="red")
kw_hops = [[name, d] for name, d in HOPS]

HOPS.clear()
try:
    Shape(name="square", color="red", size=3)
    kw_error = "no error"
except TypeError as e:
    kw_error = f"{type(e).__name__}: {e}"


# ---- Numbers used in the lesson ------------------------------------------------------
data = {
    "python": sys.version.split()[0],
    "diamond_mro": diamond_mro,
    "coop_trace": coop_trace,
    "naive_trace": naive_trace,
    "count_A_cooperative": coop_trace.count("A"),
    "count_A_naive": naive_trace.count("NA"),
    "broken_trace": broken_trace,
    "broken_has_b": has_b,
    "broken_error": broken_error,
    "bottom_mro": bottom_mro,
    "who_bottom": who_bottom,
    "who_left_on_left": who_left_on_left,
    "who_left_on_bottom": who_left_on_bottom,
    "explicit_two_arg": explicit_two_arg,
    "zero_arg_outside": zero_arg_outside,
    "zero_arg_static": zero_arg_static,
    "kw_hops": kw_hops,
    "kw_error": kw_error,
    "shape_attrs": {"name": shape.name, "color": shape.color},
}

for key, value in data.items():
    print(f"{key:22s} {value}")

Path(__file__).resolve().parent.joinpath("10.3_data.json").write_text(
    json.dumps(data, indent=2) + "\n"
)
