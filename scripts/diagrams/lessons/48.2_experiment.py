from dataclasses import dataclass
from graphlib import TopologicalSorter

REVENUE = {("Acme", 2023): 120, ("Acme", 2024): 150,      # millions of dollars, invented for this example
           ("Bolt", 2023): 200, ("Bolt", 2024): 230,
           ("Cobalt", 2023): 80, ("Cobalt", 2024): 104}

@dataclass
class Step:
    id: str
    needs: tuple          # ids of the steps whose results this step reads
    fn: object            # fn(results of the needed steps) -> value

def lookup(company, year):
    return lambda r: REVENUE[(company, year)]

def growth(before, after):
    return lambda r: (r[after] - r[before]) / r[before]

def pick_fastest(r):
    growth_id = {"Acme": "s7", "Bolt": "s8", "Cobalt": "s9"}
    return max(growth_id, key=lambda c: r[growth_id[c]])

PLAN = [
    Step("s1", (), lookup("Acme", 2023)),
    Step("s2", (), lookup("Acme", 2024)),
    Step("s3", (), lookup("Bolt", 2023)),
    Step("s4", (), lookup("Bolt", 2024)),
    Step("s5", (), lookup("Cobalt", 2023)),
    Step("s6", (), lookup("Cobalt", 2024)),
    Step("s7", ("s1", "s2"), growth("s1", "s2")),
    Step("s8", ("s3", "s4"), growth("s3", "s4")),
    Step("s9", ("s5", "s6"), growth("s5", "s6")),
    Step("s10", ("s7", "s8", "s9"), pick_fastest),
    Step("s11", ("s10",), lambda r: f"answer: {r['s10']}"),
]

def validate(steps):
    ids = {s.id for s in steps}
    for s in steps:
        for d in s.needs:
            if d not in ids:
                raise ValueError(f"{s.id} needs unknown step {d}")

def run_sequential(steps):
    results = {}
    for s in steps:                       # plan order, one call at a time
        results[s.id] = s.fn({d: results[d] for d in s.needs})
    return results

def run_waves(steps):
    validate(steps)
    by_id = {s.id: s for s in steps}
    ts = TopologicalSorter({s.id: s.needs for s in steps})
    ts.prepare()
    results, waves = {}, []
    while ts.is_active():
        ready = ts.get_ready()            # every step whose dependencies are done
        waves.append(list(ready))
        for sid in ready:                 # these calls could run in parallel
            s = by_id[sid]
            results[sid] = s.fn({d: results[d] for d in s.needs})
        ts.done(*ready)
    return results, waves

seq = run_sequential(PLAN)
res, waves = run_waves(PLAN)
print("sequential calls:", len(PLAN), "| result:", seq["s11"])
print("parallel rounds :", len(waves))
for i, w in enumerate(waves, 1):
    print(f"  round {i}: {w}")
print("growth:", {c: round(res[i], 3) for c, i in [("Acme", "s7"), ("Bolt", "s8"), ("Cobalt", "s9")]})
print("same answer both ways:", seq["s11"] == res["s11"])

bad = PLAN[:9] + [Step("s10", ("s7", "s8", "s99"), pick_fastest), PLAN[10]]
try:
    run_waves(bad)
except ValueError as e:
    print("rejected:", e)
import random

P = 0.95              # assumed per-step success probability (illustrative, not measured)

for n in (6, 12, 24):
    print(f"{n:2d} steps, no checks: {P**n:.3f}")

def run_flat(rng, n):
    return all(rng.random() < P for _ in range(n))

def run_checkpointed(rng, block=3, blocks=2, attempts=3):
    for _ in range(blocks):
        for _ in range(attempts):
            if all(rng.random() < P for _ in range(block)):   # a block passes only if all its steps do
                break
        else:
            return False                  # a block failed every attempt
    return True

rng = random.Random(0)
N = 200_000
print(f"Monte Carlo, 6 steps, no checks:     {sum(run_flat(rng, 6) for _ in range(N)) / N:.4f}")
print(f"Monte Carlo, 2 blocks of 3, retried: {sum(run_checkpointed(rng) for _ in range(N)) / N:.4f}")
print(f"Analytic, 2 blocks of 3, retried:    {(1 - (1 - P**3)**3)**2:.4f}")

# ---- experiment extras: numbers for the diagrams and the text ----
import json, os
def run_checkpointed_count(rng, block=3, blocks=2, attempts=3):
    executed = 0
    for _ in range(blocks):
        for _ in range(attempts):
            executed += block
            if all(rng.random() < P for _ in range(block)):
                break
        else:
            return False, executed
    return True, executed

rng2 = random.Random(1)
outs = [run_checkpointed_count(rng2) for _ in range(N)]
data = {
    "n_steps": len(PLAN), "seq_rounds": len(PLAN), "wave_rounds": len(waves),
    "waves": waves, "answer": seq["s11"][len("answer: "):],
    "growth": {"Acme": 0.25, "Bolt": 0.15, "Cobalt": 0.3},
    "P": P,
    "flat_analytic": {str(n): P**n for n in (6, 12, 24)},
    "flat_mc6": sum(run_flat(rng, 6) for _ in range(N)) / N,
    "ckpt_analytic": (1 - (1 - P**3)**3)**2,
    "ckpt_mc": sum(o[0] for o in outs) / N,
    "ckpt_exec_mc": sum(o[1] for o in outs) / N,
    "flat6_exec": 6,
}
s = P**3
data["ckpt_exec_analytic"] = 2 * 3 * sum((1 - s)**k for k in range(3))
print(json.dumps(data, indent=1))
out = os.environ["DATA_OUT"]
json.dump(data, open(out, "w"), indent=1)
