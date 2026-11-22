"""Experiment for lesson 7.1 (PyFrameObject & the CPython call stack).

Each section mirrors one code block in content/part-01-python-properly/
chapter-07-functions-call-stack/7.1-call-stack.md. Produces every number the
lesson and the diagram script use, and writes 7.1_data.json next to this file.
Run once:
    python3 scripts/diagrams/lessons/7.1_experiment.py
"""
import dis
import json
import sys
from pathlib import Path

OUT = Path(__file__).with_name("7.1_data.json")
data = {"python_version": sys.version.split()[0], "recursion_limit": sys.getrecursionlimit()}

# --- Block 1: walk f_back from the innermost frame up to the module frame.
names = []        # every frame up to the bottom (script run: includes <module>)
probe_only = []   # the lesson's walk: stops at the first non-probe frame


def probe(n: int) -> int:
    if n == 0:
        frame = sys._getframe()
        while frame is not None:
            names.append(f"{frame.f_code.co_name}(n={frame.f_locals.get('n')})")
            frame = frame.f_back
        frame = sys._getframe()
        while frame.f_code.co_name == "probe":
            probe_only.append(f"{frame.f_code.co_name}(n={frame.f_locals.get('n')})")
            frame = frame.f_back
        return 1
    return n * probe(n - 1)


probe(3)
data["chain"] = names
data["chain_depth"] = len(names)
data["chain_probe_only"] = probe_only

# --- Block 2: unwinding, values on the way down and up.
lines = []


def fact(n: int, depth: int = 0) -> int:
    lines.append("  " * depth + f"enter fact({n})")
    result = 1 if n == 0 else n * fact(n - 1, depth + 1)
    lines.append("  " * depth + f"return {result}")
    return result


data["fact_value"] = fact(3)
data["fact_trace"] = lines

# --- Block 3: a frame object keeps its locals after the call has returned.
def make_frame():
    secret = 42
    return sys._getframe()


frame = make_frame()
data["captured_name"] = frame.f_code.co_name
data["captured_secret"] = frame.f_locals["secret"]
data["captured_f_back"] = frame.f_back.f_code.co_name


# --- Block 4: bytecode and value-stack depth along the recursive branch.
def factorial(n: int) -> int:
    if n == 0:
        return 1
    return n * factorial(n - 1)


data["co_stacksize"] = factorial.__code__.co_stacksize
data["co_nlocals"] = factorial.__code__.co_nlocals
instrs = list(dis.get_instructions(factorial))
start = next(k for k, i in enumerate(instrs) if i.opname.startswith("RETURN")) + 1
depth = 0
trace = []
for ins in instrs[start:]:
    depth += dis.stack_effect(ins.opcode, ins.arg)
    trace.append({"offset": ins.offset, "opname": ins.opname, "depth_after": depth})
    if ins.opname == "RETURN_VALUE":
        break
data["stack_trace"] = trace
data["max_depth_on_path"] = max(t["depth_after"] for t in trace)

OUT.write_text(json.dumps(data, indent=2))

# Echo, so the run can be checked by eye.
print("python", data["python_version"], "| recursion limit", data["recursion_limit"])
print("chain", data["chain"], "depth", data["chain_depth"])
print("probe-only walk", data["chain_probe_only"])
print("\n".join(lines))
print("fact value", data["fact_value"])
print("captured", data["captured_name"], data["captured_secret"], "f_back", data["captured_f_back"])
print("co_stacksize", data["co_stacksize"], "co_nlocals", data["co_nlocals"],
      "max depth on path", data["max_depth_on_path"])
for t in trace:
    print(f"{t['offset']:>3} {t['opname']:<16} depth after = {t['depth_after']}")
