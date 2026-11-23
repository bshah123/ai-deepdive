"""Experiment for lesson 10.5 (descriptors, attribute lookup precedence, metaclasses).

Writes every number used in the lesson and its diagrams to 10.5_data.json next to this file.
Run: <python> scripts/diagrams/lessons/10.5_experiment.py
"""
import json
import platform
import sys
import timeit
from pathlib import Path

HERE = Path(__file__).resolve().parent


# ----------------------------------------------------------------- A. precedence matrix
class DataDesc:
    """Data descriptor: defines __get__ and __set__."""
    def __get__(self, obj, owner=None):
        if obj is None:
            return self
        return "data descriptor"

    def __set__(self, obj, value):
        pass  # the value is not stored; reads always go through __get__


class NonDataDesc:
    """Non-data descriptor: defines __get__ only."""
    def __get__(self, obj, owner=None):
        if obj is None:
            return self
        return "non-data descriptor"


class Demo:
    dd = DataDesc()
    nd = NonDataDesc()
    plain = "class attribute"

    def __getattr__(self, name):
        return "__getattr__ fallback"


NAMES = ["dd", "nd", "plain", "absent"]


def make(name_in_instance_dict: bool) -> Demo:
    obj = Demo()
    if name_in_instance_dict:
        # write straight into __dict__ so that __set__ of a data descriptor is not invoked
        for n in NAMES:
            obj.__dict__[n] = "instance dict"
    return obj


def reference_lookup(obj, name):
    """Pure-Python model of the documented order (Descriptor HowTo, 'Invoking Descriptors')."""
    cls = type(obj)
    attr = None
    for klass in cls.__mro__:
        if name in klass.__dict__:
            attr = klass.__dict__[name]
            break
    if attr is not None:
        t = type(attr)
        if hasattr(t, "__set__") or hasattr(t, "__delete__"):      # 1. data descriptor
            return attr.__get__(obj, cls)
    if name in obj.__dict__:                                       # 2. instance dict
        return obj.__dict__[name]
    if attr is not None:
        if hasattr(type(attr), "__get__"):                         # 3. non-data descriptor
            return attr.__get__(obj, cls)
        return attr                                                # 4. class attribute
    if hasattr(cls, "__getattr__"):                                # 5. fallback
        return cls.__getattr__(obj, name)
    raise AttributeError(name)


precedence = {}
agree = 0
total = 0
for in_dict in (False, True):
    for n in NAMES:
        obj = make(in_dict)
        real = getattr(obj, n)
        ref = reference_lookup(make(in_dict), n)
        total += 1
        agree += real == ref
        precedence[f"{n}|dict={in_dict}"] = real

# ----------------------------------------------------------------- B. __get__ call counts
calls = {"n": 0}


class CountingData:
    def __get__(self, obj, owner=None):
        if obj is None:
            return self
        calls["n"] += 1
        return 0

    def __set__(self, obj, value):
        pass


class Counted:
    attr = CountingData()


o = Counted()
for _ in range(1000):
    _ = o.attr
get_calls_1000 = calls["n"]

# ----------------------------------------------------------------- C. property that raises AttributeError
class Masked:
    @property
    def value(self):
        raise AttributeError("real bug: self._missing was never set")

    def __getattr__(self, name):
        return f"fallback for {name}"


masked_result = Masked().value
try:
    Masked().__class__.value.fget(Masked())
    direct_error = None
except AttributeError as e:
    direct_error = str(e)

# ----------------------------------------------------------------- D. descriptor shared across instances
class StoresOnDescriptor:
    def __init__(self):
        self.value = None

    def __get__(self, obj, owner=None):
        return self.value

    def __set__(self, obj, value):
        self.value = value  # BUG: one slot shared by every instance


class BadHolder:
    x = StoresOnDescriptor()


class GoodDescriptor:
    def __set_name__(self, owner, name):
        self.key = "_" + name

    def __get__(self, obj, owner=None):
        return getattr(obj, self.key, None) if obj is not None else self

    def __set__(self, obj, value):
        setattr(obj, self.key, value)


class GoodHolder:
    x = GoodDescriptor()


a, b = BadHolder(), BadHolder()
a.x, b.x = 1, 2
bad_a = a.x
c, d = GoodHolder(), GoodHolder()
c.x, d.x = 1, 2
good_c = c.x

# ----------------------------------------------------------------- E. class creation trace
trace = []


class Tracked:
    def __set_name__(self, owner, name):
        trace.append(f"__set_name__({owner.__name__}, {name!r})")

    def __get__(self, obj, owner=None):
        return self


class Base:
    def __init_subclass__(cls, **kw):
        trace.append(f"Base.__init_subclass__({cls.__name__})")
        super().__init_subclass__(**kw)


class Meta(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kw):
        trace.append(f"Meta.__prepare__({name})")
        return {}

    def __new__(mcls, name, bases, ns, **kw):
        trace.append(f"Meta.__new__({name})")
        return super().__new__(mcls, name, bases, ns, **kw)

    def __init__(cls, name, bases, ns, **kw):
        trace.append(f"Meta.__init__({cls.__name__})")
        super().__init__(name, bases, ns, **kw)


class Child(Base, metaclass=Meta):
    x = Tracked()
    trace.append("class body executed")

trace_lines = list(trace)

# ----------------------------------------------------------------- F. metaclass data descriptor vs class attribute
class KindMeta(type):
    @property
    def kind(cls):
        return f"class {cls.__name__}"


class Thing(metaclass=KindMeta):
    kind = "class attribute"


kind_on_class = Thing.kind
kind_on_instance = Thing().kind

# ----------------------------------------------------------------- G. access cost (machine dependent)
class Timed:
    def __init__(self):
        self.inst = 1

    cls_attr = 2

    @property
    def prop(self):
        return 3

    nondata = NonDataDesc()

    def __getattr__(self, name):
        return 4


t = Timed()
g = {"t": t}
cases = {
    "instance attribute": "t.inst",
    "class attribute": "t.cls_attr",
    "non-data descriptor": "t.nondata",
    "property (data descriptor)": "t.prop",
    "__getattr__ fallback": "t.missing",
}
timing_ns = {}
for label, stmt in cases.items():
    number = 200_000 if "fallback" in label else 1_000_000
    best = min(timeit.repeat(stmt, globals=g, number=number, repeat=5))
    timing_ns[label] = round(best / number * 1e9, 1)
base = timing_ns["instance attribute"]
timing_ratio = {k: round(v / base, 2) for k, v in timing_ns.items()}

data = {
    "python": sys.version.split()[0],
    "platform": platform.platform(),
    "precedence": precedence,
    "reference_agree": f"{agree}/{total}",
    "get_calls_for_1000_accesses": get_calls_1000,
    "masked_property_result": masked_result,
    "masked_direct_error": direct_error,
    "shared_descriptor_bad_a": bad_a,
    "shared_descriptor_bad_b": b.x,
    "per_instance_good_c": good_c,
    "per_instance_good_d": d.x,
    "class_creation_trace": trace_lines,
    "metaclass_kind_on_class": kind_on_class,
    "metaclass_kind_on_instance": kind_on_instance,
    "timing_ns": timing_ns,
    "timing_ratio": timing_ratio,
}

out = HERE / "10.5_data.json"
out.write_text(json.dumps(data, indent=2))

print(json.dumps(data, indent=2))
