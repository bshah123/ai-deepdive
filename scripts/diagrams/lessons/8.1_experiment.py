# Experiment for lesson 8.1 (LEGB scope and cell objects). Standard library only.
# Run: python3 scripts/diagrams/lessons/8.1_experiment.py
# Every number and output quoted in content/.../8.1-legb-scope.md comes from this file.
import dis
import sys
import types

print("python", sys.version.split()[0])

# ---- A. LEGB: which scope answers the lookup of `name`? ------------------------------
name = "global"                      # G
def outer_a():
    name = "enclosing"               # E
    def inner_a():
        name_local = None            # unrelated, only to show a local exists
        return name                  # not assigned here, so it is free: E
    return inner_a()
print("A1 enclosing hit:", outer_a())

def outer_b():
    def inner_b():
        return name                  # no local, no enclosing binding: G
    return inner_b()
print("A2 global hit   :", outer_b())

def f_c():
    return len("abc")                # no local, no E, no G: B (built-in)
print("A3 built-in hit :", f_c())

def f_d():
    len = 5                          # L: a local name shadows the built-in
    return len
print("A4 local shadow :", f_d(), "| builtins.len still", len("abc"))

# ---- B. The rule is decided at compile time: any assignment makes the name local ----
g = 1
def f_b():
    print(g)                         # reads local g before it is bound
    g = 2                            # this assignment makes g local to f_b everywhere
try:
    f_b()
except UnboundLocalError as e:
    print("B1 UnboundLocalError:", e)

def f_b2():
    g += 1                           # augmented assignment is an assignment too
try:
    f_b2()
except UnboundLocalError as e:
    print("B2 UnboundLocalError:", e)

def f_b3():
    global g
    g += 1                           # global declaration makes it refer to module g
f_b3()
print("B3 global g after f_b3:", g)

# ---- C. Code objects record which names are local, cell or free -----------------------
def make_counter():
    count = 0                        # captured by counter, so it becomes a cell variable
    total = 0                        # not captured, stays a plain local
    def counter():
        nonlocal count
        count += 1
        return count
    return counter
c = make_counter()
print("C1 make_counter co_cellvars :", make_counter.__code__.co_cellvars)
print("C2 make_counter co_varnames :", make_counter.__code__.co_varnames)
print("C3 counter co_freevars      :", c.__code__.co_freevars)

# ---- D. The cell: one object shared by the frame and every closure -------------------
print("D1 type of closure cell     :", type(c.__closure__[0]).__name__)
print("D2 cell_contents before     :", c.__closure__[0].cell_contents)
print("D3 cell_contents after 2 ca :", (c(), c())[1], "->", c.__closure__[0].cell_contents)

def make_pair():
    x = 10
    def get():
        return x
    def set_(v):
        nonlocal x
        x = v
    return get, set_
get, set_ = make_pair()
print("D4 get/set share one cell   :", get.__closure__[0] is set_.__closure__[0])
set_(99)
print("D5 get() after set_(99)     :", get())

# A new call creates a new frame and a new cell
c2 = make_counter()
print("D6 separate calls, cells differ:", c.__closure__[0] is not c2.__closure__[0])

# A freshly built cell, independent of any function
cell = types.CellType(5)
print("D7 CellType(5).cell_contents:", cell.cell_contents)
cell.cell_contents = 6
print("D8 after assignment         :", cell.cell_contents)

# ---- E. Late binding: closures capture the cell, not the value -----------------------
fs = [lambda: i for i in range(3)]
print("E1 lambdas in loop          :", [f() for f in fs])
print("E2 all share one cell       :", fs[0].__closure__[0] is fs[2].__closure__[0])

fs2 = [lambda i=i: i for i in range(3)]          # default argument copies the value now
print("E3 default-arg fix          :", [f() for f in fs2])

def make_fn(i):                                  # a factory gives each closure its own cell
    return lambda: i
fs3 = [make_fn(i) for i in range(3)]
print("E4 factory fix             :", [f() for f in fs3])
print("E5 factory cells differ     :", fs3[0].__closure__[0] is not fs3[2].__closure__[0])

# ---- F. Class bodies are not an enclosing scope for methods --------------------------
class Config:
    level = 3
    def get(self):
        return level                 # class name `level` is skipped; looks in G, then B
try:
    Config().get()
except NameError as e:
    print("F1 NameError:", e)

# ---- G. Bytecode: which opcode each kind of name uses (CPython 3.12) -----------------
def bytecode_demo():
    loc = 1
    def cell_user():
        return loc
    return loc + g + cell_user()
print("G1 bytecode_demo opcodes:")
for ins in dis.get_instructions(bytecode_demo):
    if ins.opname in ("LOAD_FAST", "LOAD_DEREF", "LOAD_GLOBAL", "STORE_DEREF", "STORE_FAST"):
        print("   ", ins.opname, ins.argrepr)
cell_user_code = next(k for k in bytecode_demo.__code__.co_consts if isinstance(k, types.CodeType))
print("G2 cell_user opcodes:")
for ins in dis.get_instructions(cell_user_code):
    if ins.opname in ("LOAD_FAST", "LOAD_DEREF", "LOAD_GLOBAL", "LOAD_CLOSURE", "LOAD_CONST"):
        print("   ", ins.opname, ins.argrepr)

# ---- H. An empty cell: a free variable that is referenced before it is bound ---------
def outer_h():
    def inner_h():
        return x_h                   # x_h is free in inner_h, bound in outer_h below
    cell = inner_h.__closure__[0]
    try:
        cell.cell_contents
    except ValueError as e:
        print("H1 empty cell ValueError:", e)
    x_h = 1
    print("H2 after binding        :", cell.cell_contents)
outer_h()
