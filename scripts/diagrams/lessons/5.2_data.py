import dis, sys

print("python", sys.version.split()[0])

# 1. packing: the comma makes the tuple, not the parentheses
t = 10, 20
print("t =", t, type(t).__name__)
print("(5) ->", type((5)).__name__, "| (5,) ->", type((5,)).__name__, len((5,)))
print("() ->", type(()).__name__, len(()))

# 2. unpacking works on any iterable
x, y = t
print("x, y =", x, y)
a, b = "hi"
print("str:", a, b)
k1, k2 = {"alpha": 1, "beta": 2}
print("dict keys:", k1, k2)

# 3. length mismatch
try:
    p, q = (1, 2, 3)
except ValueError as e:
    print("too many:", e)
try:
    p, q, r = (1, 2)
except ValueError as e:
    print("not enough:", e)
try:
    p, *q, r = [1]
except ValueError as e:
    print("star not enough:", e)

# 4. star unpacking
first, *middle, last = range(6)
print("star:", first, middle, last, type(middle).__name__)
head, *rest = [7]
print("single:", head, rest)
try:
    head, *rest = []
except ValueError as e:
    print("empty:", e)
try:
    compile("a, *b, *c = [1, 2, 3]", "<s>", "exec")
except SyntaxError as e:
    print("two stars:", e.msg)

# 5. swap: bytecode for a temp-variable swap vs a tuple swap
def swap_temp(a, b):
    tmp = a
    a = b
    b = tmp
    return a, b

def swap_tuple(a, b):
    a, b = b, a
    return a, b

def ops(f):
    return [i.opname for i in dis.get_instructions(f)
            if i.opname not in ("RESUME", "RETURN_VALUE", "RETURN_CONST", "LOAD_FAST", "STORE_FAST", "BUILD_TUPLE", "LOAD_FAST_LOAD_FAST", "STORE_FAST_STORE_FAST", "LOAD_FAST_CHECK")]

print("temp swap ops:", ops(swap_temp))
print("tuple swap ops:", ops(swap_tuple))
print("swap_tuple, all ops:", [i.opname for i in dis.get_instructions(swap_tuple)])
print("swap_temp, all ops:", [i.opname for i in dis.get_instructions(swap_temp)])
print("swap_tuple(1,2) ->", swap_tuple(1, 2), "| swap_temp(1,2) ->", swap_temp(1, 2))

# unpacking a 2-tuple of a single assignment
def unpack_one(t):
    x, y = t
    return x, y
print("unpack opnames:", [i.opname for i in dis.get_instructions(unpack_one) if "UNPACK" in i.opname])

# 6. pattern matching
def describe(p):
    match p:
        case (0, 0):
            return "origin"
        case (x, 0):
            return f"x-axis at {x}"
        case (0, y):
            return f"y-axis at {y}"
        case (x, y):
            return f"point ({x}, {y})"
        case _:
            return "not a point"

for p in [(0, 0), (5, 0), (0, 5), (10, 20), [3, 0], "ab", (1, 2, 3), 7]:
    print(repr(p), "->", describe(p))

# sequence patterns do not match str
def shape(s):
    match s:
        case [a, b]:
            return f"two items: {a}, {b}"
        case _:
            return "other"
print("str 'ab' with [a, b]:", shape("ab"), "| list:", shape(["a", "b"]))

# guard
def sign(p):
    match p:
        case (x, y) if x == y:
            return "diagonal"
        case (x, y):
            return "off-diagonal"
print("guard:", sign((3, 3)), sign((3, 4)))

# capture trap: a bare name captures everything
class Color:
    RED = 1
def trap(p):
    match p:
        case Color.RED:
            return "dotted value matched"
        case name:
            return f"capture bound {name!r}"
print("dotted:", trap(1), "| capture:", trap(5))
try:
    compile("match p:\n case ORIGIN:\n  pass\n case (0, 0):\n  pass\n", "<s>", "exec")
    print("bare name then literal: compiled without error")
except SyntaxError as e:
    print("bare name then literal SyntaxError:", e.msg)
try:
    compile("match p:\n case (x, y):\n  pass\n case (0, 0):\n  pass\n", "<s>", "exec")
    print("sequence then literal: compiled without error")
except SyntaxError as e:
    print("sequence then literal SyntaxError:", e.msg)
try:
    compile("match p:\n case z:\n  pass\n case (0, 0):\n  pass\n", "<s>", "exec")
    print("ordering2: compiled without error")
except SyntaxError as e:
    print("irrefutable SyntaxError:", e.msg)

# unreachable case (no error): sequence pattern before a literal
def order(p):
    match p:
        case (x, y):
            return "generic"
        case (0, 0):
            return "origin"
print("unreachable origin ->", order((0, 0)))

# 7. bytecode of the statements themselves (no return), to compare swaps
def temp_swap(a, b):
    tmp = a
    a = b
    b = tmp
def tuple_swap(a, b):
    a, b = b, a
def unpack_stmt(t):
    x, y = t
for f in (temp_swap, tuple_swap, unpack_stmt):
    ops = [i.opname for i in dis.get_instructions(f) if i.opname not in ("RESUME", "RETURN_CONST", "LOAD_CONST")]
    print(f.__name__, len(ops), ops)

# 8. divmod returns a tuple
q, r = divmod(17, 5)
print("divmod(17, 5) =", divmod(17, 5), "| q, r =", q, r)
