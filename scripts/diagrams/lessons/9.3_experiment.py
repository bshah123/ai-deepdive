"""Experiment for lesson 9.3: every number and message quoted in the lesson comes from this run."""
import sys
print("python", sys.version.split()[0])

def averager():
    total, count, average = 0.0, 0, None
    while True:
        value = yield average          # the sent value becomes the result of this yield
        total += value
        count += 1
        average = total / count

# A. priming with next(), then send() each value
avg = averager()
print("A next() ->", next(avg))
for x in [10, 30, 5, 3]:
    print(f"A send({x}) ->", avg.send(x))

# B. sending a non-None value to a just-started generator
g = averager()
try:
    g.send(10)
except TypeError as e:
    print("B TypeError:", e)

def counter():
    n = 0
    while True:
        try:
            delta = yield n
            n += delta
        except ValueError:
            n = 0                      # reset on injected error, then yield the new n

# C. throw() that is caught; throw() returns the next yielded value
c = counter()
print("C next() ->", next(c))
print("C send(5) ->", c.send(5))
print("C send(2) ->", c.send(2))
print("C throw(ValueError) ->", c.throw(ValueError("reset")))
print("C send(4) ->", c.send(4))

def plain():
    yield 1
    yield 2

# D. throw() that is not caught propagates to the caller and ends the generator
p = plain()
print("D next() ->", next(p))
try:
    p.throw(ValueError("boom"))
except ValueError as e:
    print("D propagated:", repr(e))
try:
    next(p)
except StopIteration:
    print("D next() after uncaught throw -> StopIteration")

# E. throw() into a just-started generator: it never reaches the try, so it exits at once
q = plain()
try:
    q.throw(ValueError("early"))
except ValueError as e:
    print("E raised at start:", repr(e))

# F. generator catches the error and returns: throw() raises StopIteration
def stop_on_error():
    try:
        yield 1
    except ValueError:
        return

f = stop_on_error()
next(f)
try:
    f.throw(ValueError("x"))
except StopIteration as e:
    print("F throw() raised StopIteration, value =", e.value)

def resource(name):
    print(f"open {name}")
    try:
        while True:
            yield
    finally:
        print(f"cleanup {name}")

# G. close() on a suspended generator runs the finally block; close() returns None
r = resource("A")
next(r)
print("G close() returned", r.close())

# H. close() before the first next(): the try block was never entered, so no cleanup runs
r2 = resource("B")
print("H close() before start returned", r2.close())

def stubborn():
    try:
        yield 1
    except GeneratorExit:
        yield 2                        # yielding while being closed is not allowed

# I. yielding inside GeneratorExit handling
s = stubborn()
next(s)
try:
    s.close()
except RuntimeError as e:
    print("I RuntimeError:", e)

# J. garbage collection calls close() (CPython reference counting)
r3 = resource("C")
next(r3)
print("J del r3:")
del r3
print("J after del")
