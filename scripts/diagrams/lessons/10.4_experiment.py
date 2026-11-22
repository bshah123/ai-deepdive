# Experiment for lesson 10.4 (property descriptors: __get__, __set__, __delete__).
# Run: <python> scripts/diagrams/lessons/10.4_experiment.py
# Writes every number used in the lesson and its diagrams to 10.4_data.json.
import json, os, sys, timeit

out = {"python": sys.version.split()[0], "platform": sys.platform}

class Positive:
    """Data descriptor: an int that must be >= 0. The name comes from __set_name__."""
    def __set_name__(self, owner, name):
        self.name = name
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self                      # Account.balance returns the descriptor itself
        try:
            return obj.__dict__[self.name]
        except KeyError:
            raise AttributeError(self.name) from None
    def __set__(self, obj, value):
        if not isinstance(value, int):
            raise TypeError(f"{self.name} must be an int")
        if value < 0:
            raise ValueError(f"{self.name} must be >= 0")
        obj.__dict__[self.name] = value
    def __delete__(self, obj):
        del obj.__dict__[self.name]

class Account:
    balance = Positive()
    def __init__(self, balance):
        self.balance = balance

# ---- A. Worked example trace: acct.balance = -5 -------------------------
acct = Account(10)
out["trace_before"] = dict(acct.__dict__)
out["trace_is_data_descriptor"] = hasattr(type(Account.__dict__["balance"]), "__set__")
out["trace_name"] = Account.__dict__["balance"].name
out["class_access_type"] = type(Account.balance).__name__
try:
    acct.balance = -5
    out["trace_error"] = None
except ValueError as e:
    out["trace_error"] = f"ValueError: {e}"
out["trace_after"] = dict(acct.__dict__)
out["trace_read_after"] = acct.balance
out["getattr_unset"] = getattr(Account.__new__(Account), "balance", "missing")
del acct.balance
out["after_delete_getattr"] = getattr(acct, "balance", "missing")

# ---- B. Lookup precedence: instance dict vs descriptor kinds -------------
class DataD:
    def __get__(self, obj, objtype=None): return "descriptor"
    def __set__(self, obj, value): pass
class NonDataN:
    def __get__(self, obj, objtype=None): return "descriptor"
class Demo:
    data = DataD()
    nondata = NonDataN()
    plain = "class"
o = Demo()
o.__dict__.update(data="instance", nondata="instance", plain="instance")
out["precedence"] = {"data_descriptor": o.data, "non_data_descriptor": o.nondata, "class_attribute": o.plain}

# ---- C. Bug: per-instance state stored on the descriptor ------------------
class BadStore:
    def __init__(self): self.value = None
    def __get__(self, obj, objtype=None): return self.value
    def __set__(self, obj, value): self.value = value
class Shared:
    x = BadStore()
a, b = Shared(), Shared()
a.x, b.x = 1, 2
out["shared_bad_reads"] = [a.x, b.x]
class Good:
    x = Positive()
    def __init__(self, v): self.x = v
g1, g2 = Good(1), Good(2)
out["shared_good_reads"] = [g1.x, g2.x]

# ---- D. Measured cost per access (hardware dependent) --------------------
class Plain:
    def __init__(self): self.v = 10
class PropHolder:
    def __init__(self): self._v = 10
    @property
    def v(self): return self._v
class DescHolder:
    v = Positive()
    def __init__(self): self.v = 10
p, q, r = Plain(), PropHolder(), DescHolder()
N, REPEAT = 1_000_000, 5
env = {"p": p, "q": q, "r": r}
def ns(stmt):
    best = min(timeit.repeat(stmt, globals=env, number=N, repeat=REPEAT))
    return round(best / N * 1e9, 1)
out["timing_ns"] = {
    "plain_read": ns("p.v"),
    "property_read": ns("q.v"),
    "data_descriptor_read": ns("r.v"),
    "plain_write": ns("p.v = 10"),
    "data_descriptor_write": ns("r.v = 10"),
}
out["timing_n"] = N
out["timing_repeat"] = REPEAT

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "10.4_data.json"), "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
