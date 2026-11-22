"""Experiment for lesson 6.1 (Hash Table Foundations & __hash__). Every number in the lesson comes from this output.

Only the standard library is used, so the same code can run in the browser (Pyodide).
Counts of __eq__ calls are used instead of timings because they do not depend on hardware.
"""
import os
import subprocess
import sys
from collections import Counter

print("python", sys.version.split()[0])

# 1. hash() of small ints and of equal values of different types
print("hash(1) =", hash(1))
print("hash(-1) =", hash(-1))
print("hash(-2) =", hash(-2))
print("hash(True) =", hash(True), " hash(1.0) =", hash(1.0))
print("sys.hash_info.modulus =", sys.hash_info.modulus)
print("hash(2**61 - 1) =", hash(2**61 - 1), " hash(2**61) =", hash(2**61))

d = {1: "int key"}
print("d[True] =", d[True], " d[1.0] =", d[1.0])

# 2. slot index = hash & mask, for a table of 8 slots (mask = 7)
MASK = 7
for key in [13, 8, -1]:
    print(f"key {key:3d}: hash & 7 = {hash(key) & MASK}  ({hash(key) & MASK:03b} in binary)")
print("slots for keys 0..63:", sorted(Counter(k & MASK for k in range(64)).items()))
print("slots for keys 0, 8, ..., 56:", sorted(Counter(k & MASK for k in range(0, 64, 8)).items()))

# 3. equal-compare counting: list scan vs dict lookup
class Key:
    eq_calls = 0
    def __init__(self, v):
        self.v = v
    def __hash__(self):
        return hash(self.v)
    def __eq__(self, other):
        Key.eq_calls += 1
        return isinstance(other, Key) and self.v == other.v

print("\nn, list miss eq calls, dict miss eq calls, dict hit eq calls")
for n in [10, 100, 1000, 10000]:
    lst = [Key(i) for i in range(n)]
    dct = {Key(i): i for i in range(n)}
    Key.eq_calls = 0; Key(-1) in lst; list_miss = Key.eq_calls
    Key.eq_calls = 0; Key(-1) in dct; dict_miss = Key.eq_calls
    Key.eq_calls = 0; Key(n // 2) in dct; dict_hit = Key.eq_calls
    print(n, list_miss, dict_miss, dict_hit)

# 4. every key has hash 0: all keys share a probe chain
class Bad:
    eq_calls = 0
    def __init__(self, v):
        self.v = v
    def __hash__(self):
        return 0
    def __eq__(self, other):
        Bad.eq_calls += 1
        return isinstance(other, Bad) and self.v == other.v

print("\nn, eq calls for one miss when all hashes are 0")
for n in [10, 100, 1000]:
    bd = {Bad(i): i for i in range(n)}
    Bad.eq_calls = 0
    Bad(-1) in bd
    print(n, Bad.eq_calls)

# 5. mutable key and missing __hash__
try:
    {[1, 2]: "x"}
except TypeError as e:
    print("\nlist key:", e)

class Person:
    def __init__(self, name):
        self.name = name
    def __eq__(self, other):
        return isinstance(other, Person) and self.name == other.name

print("Person.__hash__ =", Person.__hash__)
try:
    {Person("a"): 1}
except TypeError as e:
    print("Person key:", e)

class Pt:
    def __init__(self, name):
        self.name = name
    def __eq__(self, other):
        return isinstance(other, Pt) and self.name == other.name
    def __hash__(self):
        return hash(self.name)

p = Pt("a")
table = {p: "value"}
p.name = "b"   # mutate after insertion: the stored hash is now stale
print("after mutation: p in table =", p in table, "; Pt('b') in table =", Pt("b") in table, "; len =", len(table))

# 6. equal objects with different hashes
class Tag:
    def __init__(self, s):
        self.s = s
    def __eq__(self, other):
        return isinstance(other, Tag) and self.s == other.s
    __hash__ = object.__hash__   # identity-based hash: violates the contract

t = {Tag("x"): 1}
print("\nTag('x') == Tag('x'):", Tag("x") == Tag("x"), "; Tag('x') in table:", Tag("x") in t)

# 7. string hashes change between processes unless PYTHONHASHSEED is fixed
for seed in ["0", "1", "2"]:
    env = dict(os.environ, PYTHONHASHSEED=seed)
    out = subprocess.run([sys.executable, "-c", "print(hash('abc'))"], env=env, capture_output=True, text=True).stdout.strip()
    print("PYTHONHASHSEED", seed, "-> hash('abc') =", out)
