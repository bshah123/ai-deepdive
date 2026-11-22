# Experiment for lesson 10.1 (classes, __dict__ vs __slots__).
# Run: <python> scripts/diagrams/lessons/10.1_experiment.py
# Writes every number used in the lesson and its diagrams to 10.1_data.json.
import gc, json, sys, timeit, tracemalloc, weakref

out = {"python": sys.version.split()[0], "platform": sys.platform}

# ---- A. Behaviour -------------------------------------------------------
class Person:
    __slots__ = ['name', 'age']
    def __init__(self, name, age):
        self.name = name
        self.age = age

class DynamicPerson:
    def __init__(self, name, age):
        self.name = name
        self.age = age

p, d = Person("Alice", 30), DynamicPerson("Bob", 25)
out["has_dict_slots"] = hasattr(p, '__dict__')
out["has_dict_plain"] = hasattr(d, '__dict__')
out["hasattr_slots_on_slots_inst"] = hasattr(p, '__slots__')
out["hasattr_slots_on_plain_inst"] = hasattr(d, '__slots__')
out["class_dict_name_type"] = type(Person.__dict__['name']).__name__
out["plain_class_has_dict_getset"] = type(DynamicPerson.__dict__['__dict__']).__name__
try:
    p.address = "123 Main St"; out["slots_new_attr"] = "ok"
except AttributeError as e:
    out["slots_new_attr"] = str(e)
d.address = "456 Oak Ave"
out["plain_new_attr"] = d.address
out["vars_plain"] = sorted(vars(d))
try:
    weakref.ref(p); out["slots_weakref"] = "ok"
except TypeError as e:
    out["slots_weakref"] = str(e)
weakref.ref(d); out["plain_weakref"] = "ok"

class WithWeak:
    __slots__ = ['name', '__weakref__']
w = WithWeak(); w.name = 'x'; weakref.ref(w); out["slots_with_weakref_ok"] = True

class Sub(Person):
    pass
s = Sub("Carol", 41); s.extra = 1
out["subclass_without_slots_has_dict"] = hasattr(s, '__dict__')

try:
    class Clash:
        __slots__ = ['x']
        x = 1
    out["clash"] = "ok"
except ValueError as e:
    out["clash"] = str(e)

class Shared:
    items = []                    # one list, owned by the class
a, b = Shared(), Shared()
a.items.append(1)
out["shared_list_seen_by_b"] = b.items

# ---- B. Memory per instance (tracemalloc, CPython 3.12) -----------------
N = 100_000
def make_classes(k):
    names = [f"f{i}" for i in range(k)]
    def init_src(names):
        body = "\n".join(f"        self.{n} = {n}" for n in names) or "        pass"
        src = "def __init__(self, " + ", ".join(names) + "):\n" + body
        ns = {}; exec(src, ns); return ns["__init__"]
    plain = type("Plain", (), {"__init__": init_src(names)})
    slotted = type("Slotted", (), {"__slots__": names, "__init__": init_src(names)})
    return plain, slotted, names

def bytes_per_instance(cls, names, n):
    gc.collect()
    tracemalloc.start()
    objs = [None] * n                       # baseline: the list itself
    base, _ = tracemalloc.get_traced_memory()
    shared = 7                              # one shared int: measure containers only
    args = [shared] * len(names)
    for i in range(n):
        objs[i] = cls(*args)
    cur, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return (cur - base) / n

memory = {}
for k in (2, 4, 8):
    plain, slotted, names = make_classes(k)
    memory[str(k)] = {"dict": bytes_per_instance(plain, names, N),
                      "slots": bytes_per_instance(slotted, names, N)}
out["memory_bytes_per_instance"] = memory
out["memory_N"] = N

# single-instance sizes (no __dict__ materialised yet)
plain, slotted, names = make_classes(2)
ip, isl = plain(1, 2), slotted(1, 2)
out["getsizeof_plain_obj"] = sys.getsizeof(ip)
out["getsizeof_slots_obj"] = sys.getsizeof(isl)
out["getsizeof_plain_dict_after_access"] = sys.getsizeof(ip.__dict__)

# ---- C. Attribute access time (hardware dependent) ----------------------
timing = {}
for label, cls in (("dict", plain), ("slots", slotted)):
    o = cls(1, 2)
    read = min(timeit.repeat("o.f0", globals={"o": o}, number=3_000_000, repeat=7))
    write = min(timeit.repeat("o.f0 = 3", globals={"o": o}, number=3_000_000, repeat=7))
    timing[label] = {"read_ns": read / 3_000_000 * 1e9, "write_ns": write / 3_000_000 * 1e9}
out["timing_ns"] = timing

with open("/Users/bshah/Documents/Trial/Learning/scripts/diagrams/lessons/10.1_data.json", "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
