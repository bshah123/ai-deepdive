"""Every number used in lesson 4.2. Stdlib only.
Run: /Users/bshah/.local/bin/python3.12 scripts/diagrams/lessons/4.2_data.py
Writes 4.2_data.json next to this file (or the path given as argv[1]).
Timings are machine-specific: min of 7 repeats, per call. Bytecode and output checks are not."""
import dis, json, os, platform, sys, timeit, tracemalloc

HERE = os.path.dirname(os.path.abspath(__file__))


def comp(n):
    return [x * x for x in range(n)]


def loop(n):
    squares = []
    for x in range(n):
        squares.append(x * x)
    return squares


def loop_hoisted(n):
    """Fairer baseline: the bound method is looked up once, outside the loop."""
    squares = []
    append = squares.append
    for x in range(n):
        append(x * x)
    return squares


def mapped(n):
    return list(map(lambda x: x * x, range(n)))


def loop_code(fn):
    """The code object that contains the loop: the function itself (3.12 inlines comprehensions)
    or its nested <listcomp> code object (3.11 and earlier)."""
    if any(x.opname == "FOR_ITER" for x in dis.get_instructions(fn)):
        return fn
    return next(c for c in fn.__code__.co_consts if hasattr(c, "co_code"))


def loop_body(fn):
    """Opcodes executed once per element: from FOR_ITER to the backward jump."""
    ins = list(dis.get_instructions(loop_code(fn)))
    start = next(i for i, x in enumerate(ins) if x.opname == "FOR_ITER")
    end = next(j for j in range(start + 1, len(ins)) if ins[j].opname.startswith("JUMP_BACKWARD"))
    return [x.opname for x in ins[start + 1:end]]


def list_append_arg(fn):
    """The oparg of LIST_APPEND inside the comprehension (how deep the list sits on the stack)."""
    return [x.arg for x in dis.get_instructions(loop_code(fn)) if x.opname == "LIST_APPEND"]


def specialised_ops(fn, n=1000):
    """Opcodes the adaptive interpreter rewrote after warm-up (names containing CALL or LIST)."""
    for _ in range(3):
        fn(n)
    return sorted({x.opname for x in dis.get_instructions(loop_code(fn), adaptive=True)
                   if "CALL" in x.opname or "LIST" in x.opname})


def per_call_us(fn, n, number, repeat=7):
    t = timeit.Timer(lambda: fn(n))
    return min(t.repeat(repeat=repeat, number=number)) / number * 1e6


def peak_bytes(thunk):
    tracemalloc.start()
    thunk()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak


def leaks_loop_variable():
    def f():
        [x for x in range(3)]
        return "x" in locals()
    return f()


if __name__ == "__main__":
    out = {"python": sys.version.split()[0], "implementation": platform.python_implementation(),
           "machine": platform.machine(), "system": platform.system()}

    # Correctness: all four give the same list.
    for n in range(200):
        assert comp(n) == loop(n) == loop_hoisted(n) == mapped(n), n
    out["equal_for_n_0_to_199"] = True
    out["comp_small"] = comp(5)

    # Bytecode: operations executed per element.
    out["loop_body_loop"] = loop_body(loop)
    out["loop_body_comp"] = loop_body(comp)
    out["loop_body_hoisted"] = loop_body(loop_hoisted)
    out["ops_per_element_loop"] = len(out["loop_body_loop"])
    out["ops_per_element_comp"] = len(out["loop_body_comp"])
    out["ops_per_element_hoisted"] = len(out["loop_body_hoisted"])
    out["list_append_arg"] = list_append_arg(comp)
    out["specialised_loop"] = specialised_ops(loop)
    out["specialised_comp"] = specialised_ops(comp)
    out["nested_code_objects_comp"] = sum(hasattr(c, "co_code") for c in comp.__code__.co_consts)
    out["nested_code_objects_loop"] = sum(hasattr(c, "co_code") for c in loop.__code__.co_consts)

    # Timing per call (microseconds), min of 7 repeats.
    timings = {}
    for n, number in [(10, 20000), (1000, 200), (1_000_000, 2)]:
        row = {"loop": per_call_us(loop, n, number),
               "loop_hoisted": per_call_us(loop_hoisted, n, number),
               "comp": per_call_us(comp, n, number),
               "map_lambda": per_call_us(mapped, n, number)}
        timings[str(n)] = {k: round(v, 3) for k, v in row.items()}
    out["timing_us"] = timings
    out["speedup_loop_over_comp"] = {k: round(v["loop"] / v["comp"], 3) for k, v in timings.items()}
    out["speedup_hoisted_over_comp"] = {k: round(v["loop_hoisted"] / v["comp"], 3) for k, v in timings.items()}
    out["speedup_map_over_comp"] = {k: round(v["map_lambda"] / v["comp"], 3) for k, v in timings.items()}

    # Memory: list materialised vs generator, sum() of x*x over 10**6 items (tracemalloc peak).
    N = 10 ** 6
    out["peak_bytes_sum_list"] = peak_bytes(lambda: sum([x * x for x in range(N)]))
    out["peak_bytes_sum_genexpr"] = peak_bytes(lambda: sum(x * x for x in range(N)))
    out["sum_check"] = sum(x * x for x in range(N))

    # Clauses and scoping.
    data = [3, 8, -1, 6]
    out["filter_even"] = [x for x in data if x % 2 == 0]
    out["nested"] = [[r * c for c in range(3)] for r in range(2)]
    seen = []
    out["side_effect_return"] = [seen.append(x) for x in range(3)]
    out["side_effect_seen"] = seen
    out["x_leaks_into_locals"] = leaks_loop_variable()

    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "4.2_data.json")
    with open(path, "w") as fh:
        json.dump(out, fh, indent=2)
    print(json.dumps(out, indent=2))
    print("wrote", path)
