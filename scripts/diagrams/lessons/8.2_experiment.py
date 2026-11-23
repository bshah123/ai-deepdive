# Experiment script for lesson 8.2 (Closures & Free Variables). Stdlib only, CPython.
import sys
import weakref

print("python:", sys.version.split()[0])

# 1. Structure: free variables, cells, __closure__
def outer_function(text):
    def inner_function():
        return text
    return inner_function

closure = outer_function("Hello, World!")
print("outer.co_cellvars   =", outer_function.__code__.co_cellvars)
print("inner.co_freevars   =", closure.__code__.co_freevars)
print("len(__closure__)    =", len(closure.__closure__))
print("cell type           =", type(closure.__closure__[0]).__name__)
print("cell_contents       =", closure.__closure__[0].cell_contents)
def plain():
    return 1
print("plain.__closure__   =", plain.__closure__)

# 2. Late binding: the cell is shared and read at call time
def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    def read():
        return count
    return increment, read

inc, read = make_counter()
print("cell before calls   =", inc.__closure__[0].cell_contents)
inc()
inc()
print("read() after 2 incs =", read())
print("same cell object    =", inc.__closure__[0] is read.__closure__[0])
print("cell after calls    =", inc.__closure__[0].cell_contents)

# 3. Without nonlocal, assignment makes count local -> error on read
def broken_counter():
    count = 0
    def increment():
        count += 1
        return count
    return increment
try:
    broken_counter()()
except UnboundLocalError as e:
    print("UnboundLocalError   =", e)

# 3b. Mutating an object needs no nonlocal
def make_log():
    items = []
    def add(x):
        items.append(x)
        return len(items)
    return add
add = make_log()
print("log lengths         =", add("a"), add("b"))

# 4. Late-binding trap in a loop
fs = [lambda: i for i in range(3)]
print("late binding        =", [f() for f in fs])
cells = [f.__closure__[0] for f in fs]
print("one shared cell     =", all(c is cells[0] for c in cells))
fixed = [lambda i=i: i for i in range(3)]
print("default-arg fix     =", [f() for f in fixed])
def make_adder(i):
    return lambda: i
factory = [make_adder(i) for i in range(3)]
print("factory fix         =", [f() for f in factory])
print("factory cells differ=", factory[0].__closure__[0] is not factory[1].__closure__[0])

# 5. Retention: a closure keeps its whole cell (and object) alive
class Blob:
    def __init__(self):
        self.data = list(range(10))

def make_first_leaky():
    blob = Blob()
    ref = weakref.ref(blob)
    def first():
        return blob.data[0]
    return first, ref

first, ref = make_first_leaky()
print("leaky: alive after return =", ref() is not None)
print("leaky: first()            =", first())
print("leaky: free vars          =", first.__code__.co_freevars)

def make_first_fixed():
    blob = Blob()
    ref = weakref.ref(blob)
    first_value = blob.data[0]
    def first():
        return first_value
    return first, ref

first2, ref2 = make_first_fixed()
print("fixed: alive after return =", ref2() is not None)
print("fixed: first()            =", first2())
