"""Numbers shown in the Lesson 3.1 diagrams. Run: python scripts/diagrams/lessons/3.1_data.py (CPython 3.12+, 64-bit)."""
import ctypes, sys

W = ctypes.sizeof(ctypes.c_void_p)

def peek(n):
    tag = ctypes.c_size_t.from_address(id(n) + 2 * W).value
    count = tag >> 3
    return tag, list((ctypes.c_uint32 * count).from_address(id(n) + 3 * W))

for n in (10**12, 2**100):
    print("value", n, "tag", peek(n)[0], "digits", peek(n)[1], "getsizeof", sys.getsizeof(n))

print("size steps (bit length -> getsizeof):")
last = None
for bits in range(0, 131):
    s = sys.getsizeof(2**bits - 1)
    if s != last:
        print("  from", bits, "bits:", s, "bytes")
        last = s
print("int64 max bit length:", (2**63 - 1).bit_length())
