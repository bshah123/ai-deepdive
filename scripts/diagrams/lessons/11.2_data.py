"""Experiment for lesson 11.2 (context managers). Every number used in the lesson and its
diagrams comes from this script. Run: python3 scripts/diagrams/lessons/11.2_data.py
Writes scripts/diagrams/lessons/11.2_data.json and prints a summary.
Standard library only; no timing, so every output is deterministic."""
import contextlib, json, os, sys, tempfile

LOG = []

class CM:
    """Logs every hook call; `swallow` controls the value __exit__ returns."""
    def __init__(self, name, swallow=False, fail_enter=False, fail_exit=False):
        self.name, self.swallow = name, swallow
        self.fail_enter, self.fail_exit = fail_enter, fail_exit
    def __enter__(self):
        LOG.append(f"enter {self.name}")
        if self.fail_enter:
            raise RuntimeError(f"{self.name}: enter failed")
        return self
    def __exit__(self, exc_type, exc_value, tb):
        LOG.append(f"exit {self.name} {exc_type.__name__ if exc_type else None}")
        if self.fail_exit:
            raise KeyError(f"{self.name}: exit failed")
        return self.swallow

def run(label, fn):
    LOG.clear()
    try:
        fn()
        outcome = "continues after with"
    except BaseException as e:
        outcome = f"propagates {type(e).__name__}"
    return {"case": label, "events": list(LOG), "outcome": outcome}

out = {}

# 1. Nested with: enter order and exit order
def nested():
    with CM("A"), CM("B"), CM("C"):
        LOG.append("body")
out["nested"] = run("nested", nested)

# 2. Exception paths: __exit__ returns False (re-raise) vs True (suppress)
def raise_false():
    with CM("X", swallow=False):
        raise ValueError("boom")
def raise_true():
    with CM("X", swallow=True):
        raise ValueError("boom")
def no_raise():
    with CM("X", swallow=True):
        pass
out["exc_false"] = run("exc_false", raise_false)
out["exc_true"] = run("exc_true", raise_true)
out["no_exc"] = run("no_exc", no_raise)

# 3. __enter__ raises: is __exit__ called?
def enter_fails():
    with CM("E", fail_enter=True):
        LOG.append("body")
out["enter_fails"] = run("enter_fails", enter_fails)

# 4. __exit__ raises while body raised ValueError: what is the final exception and its context?
chain = {}
def exit_fails():
    with CM("F", fail_exit=True):
        raise ValueError("body")
LOG.clear()
try:
    exit_fails()
except BaseException as e:
    chain = {"final": type(e).__name__, "context": type(e.__context__).__name__ if e.__context__ else None}
out["exit_raises"] = chain

# 5. @contextmanager: cleanup without try/finally vs with try/finally, body raises
@contextlib.contextmanager
def no_finally(name):
    LOG.append(f"open {name}")
    yield
    LOG.append(f"close {name}")          # skipped when the body raises

@contextlib.contextmanager
def with_finally(name):
    LOG.append(f"open {name}")
    try:
        yield
    finally:
        LOG.append(f"close {name}")      # always runs

def body_raises(cm):
    def f():
        with cm("R"):
            LOG.append("body")
            raise ValueError("boom")
    return f
out["gen_no_finally"] = run("gen_no_finally", body_raises(no_finally))
out["gen_with_finally"] = run("gen_with_finally", body_raises(with_finally))

def body_ok(cm):
    def f():
        with cm("R"):
            LOG.append("body")
    return f
out["gen_no_finally_ok"] = run("gen_no_finally_ok", body_ok(no_finally))

# 6. Reusing a one-shot @contextmanager object
shared = no_finally("S")
reuse = {}
try:
    with shared:
        pass
    with shared:
        pass
    reuse = {"second_use": "ok"}
except BaseException as e:
    reuse = {"second_use": f"{type(e).__name__}: {e}"}
out["reuse"] = reuse

# 7. File object: __exit__ closes the file, even on exception
fd, path = tempfile.mkstemp(suffix=".txt")
os.close(fd)
try:
    with open(path, "w") as f:
        f.write("hello")
    closed_after_normal = f.closed
    try:
        with open(path, "w") as g:
            g.write("x")
            raise ValueError("boom")
    except ValueError:
        pass
    closed_after_exc = g.closed
finally:
    os.remove(path)
out["file"] = {"closed_after_normal": closed_after_normal, "closed_after_exception": closed_after_exc}

# 8. suppress and ExitStack
LOG.clear()
with contextlib.suppress(KeyError):
    {}["missing"]
out["suppress"] = {"continued": True}
LOG.clear()
with contextlib.ExitStack() as stack:
    for n in ("one", "two", "three"):
        stack.enter_context(CM(n))
    LOG.append("body")
out["exitstack"] = list(LOG)

path_json = os.path.join(os.path.dirname(os.path.abspath(__file__)), "11.2_data.json")
with open(path_json, "w") as fh:
    json.dump(out, fh, indent=2)

print(json.dumps(out, indent=2))
