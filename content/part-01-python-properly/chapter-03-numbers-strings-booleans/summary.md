## What you learned

Python's `int` is an object that holds an array of 30-bit digits, so it never overflows but pays in memory, while NumPy and PyTorch integers are fixed-width and wrap silently. A `float` is an IEEE 754 (Institute of Electrical and Electronics Engineers standard) binary value, so most decimal fractions are stored approximately: every result is rounded to the nearest float, and the error depends on magnitude and on the order of operations. A `str` is a sequence of Unicode code points, and its length in bytes depends on the encoding, usually UTF-8 (Unicode Transformation Format, 8-bit). Strings are immutable, so `+=` rebinds a name and leaves other names alone. A `bool` is an `int`, and every `if` runs a truth test defined by `bool()`. Identity results for small integers and strings are CPython 3.12 behaviour (CPython is the reference implementation of Python), not language guarantees, so compare values with `==`. The measurements in this chapter come from CPython 3.12.13 and NumPy 2.5; they illustrate the behaviour and are not guarantees.

## Key ideas

- A Python `int` is a header plus 30-bit digits, least significant first; size is 24 + 4 × digits bytes, so `0` already takes 28 bytes (Lesson 3.1).
- NumPy `int64` wraps silently: `np.prod` over 1 to 21 gives a negative number, because 21! exceeds 2^63 − 1 (Lesson 3.1).
- A float has a sign, an exponent and a fraction; the gap to the next float doubles at each power of two (Lesson 3.2).
- `0.1 + 0.2` is `0.30000000000000004` because the exact sum lies halfway between two floats, and the tie rounds to the even neighbour (Lesson 3.2).
- A value smaller than half the gap is absorbed: `1e16 + 1.0 == 1e16` (Lesson 3.2).
- Naive float loops accumulate error; `math.fsum` sums exactly to the nearest float, and subtracting nearly equal numbers cancels leading digits (Lesson 3.2).
- Compare floats with `math.isclose` and an explicit `abs_tol`, and test NaN (not-a-number) with `math.isnan`, because NaN is unequal to everything (Lesson 3.2).
- Mixed-precision training trades range and precision for memory; bfloat16 keeps float32's exponent range with 7 fraction bits, so small updates can vanish (Lesson 3.2).
- `len()` counts code points, while the UTF-8 byte count is 1 to 4 per code point; the lead byte gives the length (Lesson 3.3).
- Visually identical text can hold different code points, so normalise with `unicodedata.normalize` before comparing (Lesson 3.3).
- A `str` is immutable, and CPython stores each string at the width of its widest character (PEP 393) (Lesson 3.3).
- `bool` is a subclass of `int`: `True` is 1, `True + True` is 2, and there is one shared `True` and one shared `False` (Lesson 3.4).
- `if x:` calls `__bool__`, then `__len__`, and otherwise treats the object as true; there are 15 false built-in values (Lesson 3.4).
- `and` and `or` return one of their operands and short-circuit; `not` always returns a Boolean (Lesson 3.4).
- `x == True` is not a truth test: `2` is true but unequal to `True` (Lesson 3.4).
- CPython shares one integer object for each value from -5 to 256 at run time, and literals in one compilation share a constant table; both are implementation details (Lesson 3.5).
- The integer cache saves about 28 MB per million distinct ints and about 8 ns per operation on the machine measured, so measure your own code with `timeit` before optimising (Lesson 3.5).

## Before moving on

- □ I can compute the base-2^30 digits of a Python int and predict `sys.getsizeof` from its bit length.
- □ I can explain why `np.prod` on `int64` gives a negative result for 21!, and how to get the exact value with Python integers.
- □ I can explain why `0.1 + 0.2 != 0.3`, and predict which neighbour a halfway value rounds to.
- □ I can predict when a small addend is absorbed by a large float, and choose `math.fsum` or a two-pass formula to avoid accumulated error.
- □ I can compare floats with `math.isclose` using an explicit `abs_tol`, and detect NaN with `math.isnan`.
- □ I can count a string's code points, UTF-8 bytes and UTF-16 units, and encode or decode between `str` and `bytes`.
- □ I can normalise user text with `unicodedata.normalize` before comparing or using it as a key.
- □ I can explain why `s += t` leaves other names that point at `s` unchanged.
- □ I can list the 15 false built-in values and predict truthiness with the `__bool__`, then `__len__`, rule.
- □ I can predict the result of `and`/`or` chains and rewrite `count = count or 10` so that a valid `0` survives.
- □ I can explain why `is` results for ints and strings are implementation details, and use `==` for values.
