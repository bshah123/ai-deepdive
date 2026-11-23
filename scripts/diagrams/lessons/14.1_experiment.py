# Experiment for lesson 14.1. Produces every number used in the lesson and the diagrams.
# Run: venv-14.1/bin/python scripts/diagrams/lessons/14.1_experiment.py  (writes 14.1_data.json next to this file)
# Each snippet is a toy written for this lesson, not a benchmark. Outcome per snippet:
#   mypy: does mypy (default settings) print an error?   runtime: what happens when the file runs under CPython?
import json, os, subprocess, sys, tempfile, pathlib

HERE = pathlib.Path(__file__).resolve().parent
PY = sys.executable
SNIPPETS = {
    "A_arg_type": ("int + str argument", "def add_numbers(a: int, b: int) -> int:\n    return a + b\n\nprint(add_numbers(5, \"7\"))\n"),
    "B_return_type": ("returns str from -> int", "def label(n: int) -> int:\n    return \"item \" + str(n)\n\nprint(label(3))\n"),
    "C_optional_none": ("str | None used as str", "def shout(name: str | None) -> str:\n    return name.upper()\n\nprint(shout(None))\n"),
    "C_fixed_guard": ("control: None guarded", "def shout(name: str | None) -> str:\n    if name is None:\n        return \"\"\n    return name.upper()\n\nprint(shout(None))\n"),
    "D_typo_attr": ("misspelled attribute", "class Sensor:\n    def __init__(self, reading: float) -> None:\n        self.reading = reading\n\ns = Sensor(2.5)\nprint(s.readng)\n"),
    "E_arity": ("missing argument", "def area(w: float, h: float) -> float:\n    return w * h\n\nprint(area(3.0))\n"),
    "F_unannotated_call": ("unannotated def, bad call", "def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(5, \"7\"))\n"),
    "G_unexecuted_branch": ("bug on a branch not run", "def pick(flag: bool) -> int:\n    if flag:\n        return \"oops\"\n    return 1\n\nprint(pick(False))\n"),
    "H_missing_return": ("missing else return", "def sign(x: int) -> int:\n    if x > 0:\n        return 1\n    elif x < 0:\n        return -1\n\nprint(sign(0))\n"),
    "I_unannotated_body": ("unannotated def, bad body", "def total(prices):\n    x: int = \"3\"\n    return sum(prices) + x\n\nprint(total([1, 2]))\n"),
}

def run_mypy(path, *flags):
    p = subprocess.run([PY, "-m", "mypy", "--no-incremental", "--no-pretty", *flags, path],
                       capture_output=True, text=True, cwd=os.path.dirname(path))
    lines = [l for l in p.stdout.splitlines() if ": error:" in l]
    return len(lines), lines

def run(path):
    p = subprocess.run([PY, "-I", path], capture_output=True, text=True)
    err = p.stderr.strip().splitlines()
    if p.returncode == 0:
        return {"status": "ran", "stdout": p.stdout.strip(), "error": None}
    return {"status": "crash", "stdout": p.stdout.strip(), "error": err[-1] if err else "?"}

def main():
    import mypy.version
    out = {"python": sys.version.split()[0], "mypy": mypy.version.__version__, "snippets": {}}
    with tempfile.TemporaryDirectory() as tmp:
        for key, (label, code) in SNIPPETS.items():
            path = os.path.join(tmp, key + ".py")
            pathlib.Path(path).write_text(code)
            n, msgs = run_mypy(path)
            entry = {"label": label, "mypy_errors": n, "mypy_messages": msgs, "runtime": run(path)}
            if key == "I_unannotated_body":
                n2, msgs2 = run_mypy(path, "--check-untyped-defs")
                entry["mypy_errors_check_untyped_defs"] = n2
                entry["mypy_messages_check_untyped_defs"] = msgs2
            out["snippets"][key] = entry
        # Annotations are stored, not checked: the function object keeps them as plain data.
        probe = os.path.join(tmp, "probe.py")
        pathlib.Path(probe).write_text("def add_numbers(a: int, b: int) -> int:\n    return a + b\nprint(add_numbers.__annotations__)\n")
        out["annotations_probe"] = subprocess.run([PY, "-I", probe], capture_output=True, text=True).stdout.strip()
    caught = [k for k, v in out["snippets"].items() if k != "C_fixed_guard" and v["mypy_errors"] > 0]
    total_bugs = [k for k in out["snippets"] if k not in ("C_fixed_guard",)]
    out["summary"] = {"bug_snippets": len(total_bugs), "mypy_flagged": len(caught),
                      "runtime_crash_on_given_input": sum(1 for k in total_bugs if out["snippets"][k]["runtime"]["status"] == "crash"),
                      "runtime_silent_wrong_or_unseen": sum(1 for k in total_bugs if out["snippets"][k]["runtime"]["status"] == "ran")}
    (HERE / "14.1_data.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
