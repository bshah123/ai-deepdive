"""Numbers shown in Lesson 2.3 (object identity and id()). Run: python scripts/diagrams/lessons/2.3_data.py
Python 3.12 (CPython). Addresses are specific to one run and one machine; the diagrams copy the values
printed here by hand into 2.3.mjs. The lesson's code blocks print the same results."""
import ctypes
import platform
import sys

print("python:", sys.version.split()[0], "| implementation:", platform.python_implementation(),
      "| machine:", platform.machine())

# 1. Two names, one list vs two lists with equal values
a = [1, 2]
b = a
c = [1, 2]
print("1. id(a) =", hex(id(a)), " id(b) =", hex(id(b)), " id(c) =", hex(id(c)))
print("   a is b:", a is b, "| a is c:", a is c, "| a == c:", a == c)

# 2. Mutation keeps identity; rebinding creates a new object
x = [1, 2]
i0 = id(x)
x.append(3)
i1 = id(x)
x = x + [4]
i2 = id(x)
print("2. start", hex(i0), "| after append", hex(i1), "| after x = x + [4]", hex(i2))
print("   append kept id:", i0 == i1, "| concatenation changed id:", i1 != i2, "| x =", x)

# 3. Function arguments: the callee's name starts as the same object
def mutate(lst):
    inside = id(lst)
    lst.append("m")
    return inside

def rebind(lst):
    inside = id(lst)
    lst = ["r"]
    return inside

p = [0]
ip = id(p)
seen = mutate(p)
print("3. caller id", hex(ip), "| inside mutate", hex(seen), "| same:", seen == ip, "| p after mutate =", p)
q = [0]
iq = id(q)
seen2 = rebind(q)
print("   caller id", hex(iq), "| inside rebind", hex(seen2), "| same:", seen2 == iq, "| q after rebind =", q)

# 4. Small-int cache (CPython implementation detail): equal values built at run time
for n in (-6, -5, 5, 256, 257, 1000):
    u = int("%d" % n)
    v = int("%d" % n)
    print("4. n =", n, "| two runtime-built copies, same object:", u is v)

# 5. id reuse: ids are unique only among objects that are alive at the same time
t = [1]
freed_id = id(t)
del t
u = [2]
print("5. freed id", hex(freed_id), "| new list id", hex(id(u)), "| reused:", id(u) == freed_id)
temp_ids = {id([0]) for _ in range(5)}
print("   distinct ids for 5 temporary lists made one after another:", len(temp_ids))

# 6. CPython: id() is the address; the address maps back to the object
obj = {"k": 1}
back = ctypes.cast(id(obj), ctypes.py_object).value
print("6. round trip through the address returns the same object:", back is obj)

# 7. Compile-time constants: equal literals in one code object are merged, so `is` is True
def same_literals():
    a = 1000
    b = 1000
    return a is b

print("7. equal literals in one function body, is:", same_literals())
print("   equal runtime-built ints, is:", int("1000") is int("1000"))
t = (1, 2)
u = (1, 2)
print("   two tuple literals on separate lines, is:", t is u)

# 8. Augmented assignment: list += mutates in place; tuple += must build a new object
x8 = [1, 2]
before8 = id(x8)
x8 += [3]
print("8. list x += [3] keeps id:", id(x8) == before8, "| x =", x8)
t8 = (1, 2)
before_t8 = id(t8)
t8 += (3,)
print("   tuple t += (3,) keeps id:", id(t8) == before_t8, "| t =", t8)
