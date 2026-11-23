"""Experiment for Lesson 16.5 (buffer protocol, memoryview). Every number in the lesson comes from this output.
Run: <python> scripts/diagrams/lessons/16.5_experiment.py > scripts/diagrams/lessons/16.5_data.txt
"""
import array, gc, sys, timeit, tracemalloc
import numpy as np

MiB = 1024 * 1024

print("== E0 platform")
print("python", sys.version.split()[0], "| numpy", np.__version__, "| byteorder", sys.byteorder)
print("array('i') itemsize", array.array('i').itemsize)

print("\n== E1 Py_buffer fields seen from Python")
a = array.array('i', [1, 2, 3, 4, 5])
mv = memoryview(a)
for name in ['format', 'itemsize', 'ndim', 'shape', 'strides', 'readonly', 'c_contiguous', 'nbytes']:
    print(f"{name:12s} {getattr(mv, name)}")
f = np.arange(12, dtype=np.float64).reshape(3, 4)
mf = memoryview(f)
print("float64 3x4 :", "format", mf.format, "itemsize", mf.itemsize, "shape", mf.shape, "strides", mf.strides, "c_contiguous", mf.c_contiguous)

print("\n== E2 who shares memory")
buf = bytearray(b'abcdefgh')
mv = memoryview(buf)
sl = mv[2:5]
print("slice.obj is buf:", sl.obj is buf)
sl[0] = ord('X')
print("after sl[0] = 'X':", buf)
npv = np.frombuffer(buf, dtype=np.uint8)
npv[7] = ord('Z')
print("after frombuffer[7] = 'Z':", buf)
print("asarray(mv) shares:", np.shares_memory(np.asarray(mv), npv))
cp = np.array(mv)
print("np.array(mv) shares:", np.shares_memory(cp, npv))
cp[0] = 0
print("buf[0] after changing the copy:", buf[0], "== ord('a') =", ord('a'))

print("\n== E3 read-only and reinterpretation")
ro = memoryview(b'\x01\x00\x00\x00\x02\x00\x00\x00')
print("bytes view readonly:", ro.readonly)
try:
    ro[0] = 9
except TypeError as e:
    print("TypeError:", e)
ints = memoryview(bytearray(b'\x01\x00\x00\x00\x02\x00\x00\x00')).cast('I')
print("cast('I') ->", ints.tolist(), "format", ints.format, "itemsize", ints.itemsize)

print("\n== E4 strided slices")
m = memoryview(bytearray(range(10)))
ev = m[::2]
print("m[::2] tolist:", ev.tolist(), "| strides", ev.strides, "| c_contiguous", ev.c_contiguous)
print("tobytes() of strided view:", ev.tobytes())

print("\n== E5 exports lock resizing")
ba = bytearray(b'hello')
view = memoryview(ba)
try:
    ba.append(33)
except BufferError as e:
    print("BufferError:", e)
view.release()
ba.append(33)
print("after release:", ba)

print("\n== E6 objects without a buffer")
try:
    memoryview([1, 2, 3])
except TypeError as e:
    print("TypeError:", e)

print("\n== E7 peak and retained allocation, 16 MiB source")
src = bytearray(16 * MiB)

def measure(label, fn):
    gc.collect()
    tracemalloc.start()
    out = fn()
    cur, pk = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    print(f"{label:34s} peak {pk / MiB:7.2f} MiB   retained {cur / MiB:7.2f} MiB")
    return out

keep = []
keep.append(measure("memoryview(src)", lambda: memoryview(src)))
keep.append(measure("memoryview(src)[1024:]", lambda: memoryview(src)[1024:]))
keep.append(measure("np.frombuffer(src, uint8)", lambda: np.frombuffer(src, dtype=np.uint8)))
keep.append(measure("bytes(src)  (copy)", lambda: bytes(src)))
keep.append(measure("src[:]  (bytearray slice copy)", lambda: src[:]))
keep.append(measure("np.array(memoryview(src))  (copy)", lambda: np.array(memoryview(src))))

print("\n== E8 timing (machine-dependent, one run, best of 5 repeats)")
def best(stmt):
    return min(timeit.repeat(stmt, globals=globals(), number=20, repeat=5)) / 20
t_view = best("memoryview(src)")
t_copy = best("bytes(src)")
print(f"memoryview(src)  : {t_view * 1e6:10.3f} us")
print(f"bytes(src) copy : {t_copy * 1e3:10.3f} ms")
print(f"ratio copy/view : {t_copy / t_view:10.0f}x")
