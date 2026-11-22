"""Experiment script for lesson 3.2 (floats). Every number in the lesson and its diagrams comes from this output.
Run: <venv python> scripts/diagrams/lessons/3.2_data.py"""
import math, sys, struct
from decimal import Decimal, getcontext
from fractions import Fraction
import numpy as np

getcontext().prec = 80

def bits64(x):
    return struct.unpack(">Q", struct.pack(">d", x))[0]

def fields64(x):
    b = bits64(x)
    return b >> 63, (b >> 52) & 0x7FF, b & ((1 << 52) - 1)

print("== environment")
print("python", sys.version.split()[0], "numpy", np.__version__)

print("== format constants")
fi = sys.float_info
print("float64 mant_dig", fi.mant_dig, "epsilon", fi.epsilon, "max", fi.max, "min_normal", fi.min)
print("min subnormal", 5e-324)
for dt in (np.float16, np.float32, np.float64):
    f = np.finfo(dt)
    print(dt.__name__, "nmant", f.nmant, "nexp", f.nexp, "eps", float(f.eps), "max", float(f.max))
print("bfloat16 (emulated) nmant 7 nexp 8 eps", 2.0 ** -7, "max", (2 - 2.0 ** -7) * 2.0 ** 127)

print("== 0.1 and 0.2")
print("Decimal(0.1)", Decimal(0.1))
f01 = Fraction(0.1)
print("Fraction(0.1)", f01.numerator, "/", f01.denominator, "= 2^55?", f01.denominator == 2 ** 55)
print("0.1 field triple", fields64(0.1), "exponent unbiased", fields64(0.1)[1] - 1023)
print("0.1 hex", struct.pack(">d", 0.1).hex())
print("0.1 + 0.2 repr", repr(0.1 + 0.2), "== 0.3:", 0.1 + 0.2 == 0.3)

exact = Fraction(0.1) + Fraction(0.2)
lo = 0.3
hi = math.nextafter(0.3, 1.0)
print("exact sum (stored 0.1 + stored 0.2) =", Decimal(exact.numerator) / Decimal(exact.denominator))
print("lo (float 0.3) =", Decimal(lo))
print("hi (next float) =", Decimal(hi))
print("gap lo->hi", float(Fraction(hi) - Fraction(lo)), "= 2^-54?", Fraction(hi) - Fraction(lo) == Fraction(1, 2 ** 54))
print("exact - lo =", float(exact - Fraction(lo)), " hi - exact =", float(Fraction(hi) - exact))
print("exactly halfway:", exact - Fraction(lo) == Fraction(hi) - exact)
print("lo hex", struct.pack(">d", lo).hex(), "last bit", bits64(lo) & 1)
print("hi hex", struct.pack(">d", hi).hex(), "last bit", bits64(hi) & 1)
print("round(exact) to float ->", repr(float(exact)))

print("== ulp and absorption")
print("ulp(1.0)", math.ulp(1.0), "ulp(1e15)", math.ulp(1e15), "ulp(1e16)", math.ulp(1e16), "ulp(1e20)", math.ulp(1e20))
print("1e16 + 1.0 == 1e16:", 1e16 + 1.0 == 1e16, " 1e16 + 1.0 - 1e16 =", (1e16 + 1.0) - 1e16)
print("1e20 + 1.0 == 1e20:", 1e20 + 1.0 == 1e20)
print("1e20 + 8192 == 1e20:", 1e20 + 8192.0 == 1e20, " 1e20 + 16384 - 1e20 =", (1e20 + 16384.0) - 1e20)
f32 = np.float32
print("float32 ulp at 2^24", float(np.spacing(f32(2 ** 24))))
print("float32 2^24 + 1 == 2^24:", f32(2 ** 24) + f32(1) == f32(2 ** 24))
print("float32 2^24 + 2 - 2^24 =", float(f32(2 ** 24) + f32(2) - f32(2 ** 24)))
c = f32(0)
for _ in range(2 ** 24 + 10):
    c = f32(c + f32(1))
    if _ > 2 ** 24 + 5:
        break
print("float32 counter after 2^24 + 6 increments of 1.0:", float(c))
c = f32(2 ** 24)
for _ in range(10):
    c = f32(c + f32(1))
print("float32 starting at 2^24, 10 increments of 1.0:", float(c))

print("== tiny update vanishes (mixed precision motivation)")
print("float16 1.0 + 1e-4 == 1.0:", np.float16(1.0) + np.float16(1e-4) == np.float16(1.0))
print("float32 1.0 + 1e-4 == 1.0:", np.float32(1.0) + np.float32(1e-4) == np.float32(1.0))

def to_bfloat16(x):
    """Round a float32 to bfloat16 (top 16 bits, round-to-nearest-even)."""
    b = struct.unpack(">I", struct.pack(">f", x))[0]
    b = (b + 0x7FFF + ((b >> 16) & 1)) & 0xFFFF0000
    return struct.unpack(">f", struct.pack(">I", b))[0]

print("bfloat16(1.0 + 1e-3) =", to_bfloat16(1.0 + 1e-3), " equal to 1.0:", to_bfloat16(1.0 + 1e-3) == 1.0)
print("bfloat16(1.0 + 4e-3) =", to_bfloat16(1.0 + 4e-3), " equal to 1.0:", to_bfloat16(1.0 + 4e-3) == 1.0)
print("bfloat16(1.0 + 1e-2) =", to_bfloat16(1.0 + 1e-2))
print("bfloat16 of 0.1 =", repr(to_bfloat16(0.1)))

print("== accumulation of 0.1, n = 1,000,000 (target 100000)")
n = 1_000_000
naive = 0.0
for _ in range(n):
    naive += 0.1
print("float64 loop repr", repr(naive), "error", naive - 100000.0)
print("float64 math.fsum", repr(math.fsum([0.1] * n)), "error", math.fsum([0.1] * n) - 100000.0)
a64 = np.full(n, 0.1)
print("float64 np.sum repr", repr(float(a64.sum())), "error", float(a64.sum()) - 100000.0)
a32 = np.full(n, 0.1, dtype=np.float32)
acc32 = f32(0.0)
for x in a32:
    acc32 = f32(acc32 + x)
print("float32 loop repr", repr(float(acc32)), "error", float(acc32) - 100000.0)
print("float32 np.sum repr", repr(float(a32.sum())), "error", float(a32.sum()) - 100000.0)
exact_stored = Fraction(0.1) * n
print("exact sum of stored float64 0.1 values minus 100000 =", float(exact_stored - 100000))
print("fsum error vs exact stored sum", float(Fraction(math.fsum([0.1] * n)) - exact_stored))
print("float64 loop error vs exact stored sum", float(Fraction(naive) - exact_stored))
print("float64 loop relative error", abs(naive - 100000.0) / 100000.0)
print("float32 loop relative error", abs(float(acc32) - 100000.0) / 100000.0)

print("== order matters")
a, b, c3 = 1.0, 1e-16, -1.0
print("(1 + 1e-16) - 1 =", (a + b) + c3, " 1 + (1e-16 - 1) =", a + (b + c3))

print("== cancellation: sqrt(x+1) - sqrt(x)")
for x in (1e3, 1e8, 1e15):
    naive_v = math.sqrt(x + 1) - math.sqrt(x)
    stable_v = 1 / (math.sqrt(x + 1) + math.sqrt(x))
    ref = Decimal(x + 1).sqrt() - Decimal(x).sqrt()
    rel_n = float(abs(Decimal(naive_v) - ref) / ref)
    rel_s = float(abs(Decimal(stable_v) - ref) / ref)
    print("x", x, "naive", repr(naive_v), "stable", repr(stable_v), "ref", f"{float(ref):.16e}",
          "rel_err naive %.3e" % rel_n, "rel_err stable %.3e" % rel_s)
print("sqrt(1e15 + 1) =", repr(math.sqrt(1e15 + 1)), " sqrt(1e15) =", repr(math.sqrt(1e15)))
print("ulp(sqrt(1e15)) =", math.ulp(math.sqrt(1e15)), " half ulp =", math.ulp(math.sqrt(1e15)) / 2)
print("sqrt(1e15+1) - sqrt(1e15) exact digits:", f"{Decimal(1e15 + 1).sqrt() - Decimal(1e15).sqrt():.20e}")

print("== variance of 1e9 + [4, 7, 13, 16] (true population variance 22.5)")
data = [1e9 + v for v in (4, 7, 13, 16)]
n_ = len(data)
s1 = sum(data)
s2 = sum(x * x for x in data)
print("naive E[x^2] - E[x]^2 =", repr(s2 / n_ - (s1 / n_) ** 2))
mean = s1 / n_
print("two-pass =", repr(sum((x - mean) ** 2 for x in data) / n_))
w_mean, w_m2 = 0.0, 0.0
for k, x in enumerate(data, 1):
    d = x - w_mean
    w_mean += d / k
    w_m2 += d * (x - w_mean)
print("welford =", repr(w_m2 / n_))
print("ulp(1e18) =", math.ulp(1e18), " s2/n =", repr(s2 / n_))

print("== comparisons and special values")
print("math.isclose(0.1+0.2, 0.3):", math.isclose(0.1 + 0.2, 0.3))
print("math.isclose(0.0, 1e-20):", math.isclose(0.0, 1e-20), " abs_tol=1e-12:", math.isclose(0.0, 1e-20, abs_tol=1e-12))
nan = float("nan")
print("nan == nan:", nan == nan, " isnan:", math.isnan(nan))
print("1e308 * 10 =", 1e308 * 10)
print("5e-324 / 2 =", 5e-324 / 2)
print("0.0 == -0.0:", 0.0 == -0.0, " copysign sign bit:", math.copysign(1.0, -0.0))
