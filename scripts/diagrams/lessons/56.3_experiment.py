"""Numbers for lesson 56.3 (cost, budgets, fallback routing).
Run once: python3 scripts/diagrams/lessons/56.3_experiment.py
Writes scripts/diagrams/lessons/56.3_data.json. Standard library only.
Prices are ILLUSTRATIVE (USD per million tokens), not a real price list."""
import json, os, random

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- 1. cost per request -------------------------------------------------
SMALL = {"name": "small", "inp": 0.25, "out": 1.00}
LARGE = {"name": "large", "inp": 3.00, "out": 15.00}
IN_TOK, OUT_TOK = 1200, 300
cost = {}
for p in (SMALL, LARGE):
    ci = IN_TOK * p["inp"] / 1e6
    co = OUT_TOK * p["out"] / 1e6
    cost[p["name"]] = {"input_per_req": ci, "output_per_req": co,
                       "total_per_req": ci + co,
                       "input_per_10k": ci * 1e4, "output_per_10k": co * 1e4,
                       "total_per_10k": (ci + co) * 1e4}
cost_ratio = cost["large"]["total_per_req"] / cost["small"]["total_per_req"]

# ---- 2. budget under concurrency ----------------------------------------
LIMIT = 1.00
N_REQ = 200
WORST = (1200 * 3.00 + 1000 * 15.00) / 1e6   # max_tokens=1000 output, LARGE prices

class Budget:
    def __init__(self, limit):
        self.limit, self.spent, self.held = limit, 0.0, 0.0
    def reserve(self, worst):
        if self.spent + self.held + worst > self.limit:
            return False
        self.held += worst
        return True
    def settle(self, worst, actual):
        self.held -= worst
        self.spent += actual

def simulate(limit, K, n, holds, seed=1):
    rng = random.Random(seed)
    b = Budget(limit)
    admitted = 0
    pending = n
    while pending > 0:
        wave = min(K, pending)
        pending -= wave
        in_flight = []
        for _ in range(wave):
            if holds:
                if b.reserve(WORST):
                    in_flight.append(WORST); admitted += 1
            elif b.spent < limit:
                in_flight.append(0.0); admitted += 1
        for w in in_flight:
            b.settle(w, rng.uniform(0.005, WORST))
    return admitted, b.spent

sweep = {}
for K in (1, 2, 4, 8, 16, 32, 64):
    row = {}
    for holds in (False, True):
        adm, spent = simulate(LIMIT, K, N_REQ, holds)
        row["reserved" if holds else "naive"] = {"admitted": adm, "spent": spent,
                                                 "over_limit": max(0.0, spent - LIMIT)}
    sweep[str(K)] = row

# deterministic race: 4 requests start before any finishes
naive_race_spent = 4 * 0.018
b = Budget(0.05)
race_admits = [b.reserve(WORST) for _ in range(4)]
race_held = b.held

# ---- 3. fallback with circuit breaker -----------------------------------
class Breaker:
    def __init__(self, threshold, cooldown):
        self.threshold, self.cooldown = threshold, cooldown
        self.failures, self.opened_at = 0, None
    def allow(self, now):
        return self.opened_at is None or now - self.opened_at >= self.cooldown
    def record(self, now, ok):
        if ok:
            self.failures, self.opened_at = 0, None
        else:
            self.failures += 1
            if self.failures >= self.threshold:
                self.opened_at = now

def outage(t):
    return 30.0 <= t < 90.0

TIMEOUT = 5.0
def serve(n, use_breaker):
    br = Breaker(3, 10.0)
    primary_calls, wasted, prim_ok, fb = 0, 0.0, 0, 0
    for i in range(n):
        now = i * 0.5
        if not use_breaker or br.allow(now):
            primary_calls += 1
            ok = not outage(now)
            if use_breaker:
                br.record(now, ok)
            if ok:
                prim_ok += 1
                continue
            wasted += TIMEOUT
        fb += 1
    return {"primary_calls": primary_calls, "wasted_s": wasted,
            "served_primary": prim_ok, "served_fallback": fb}

outage_res = {"no_breaker": serve(240, False), "breaker": serve(240, True)}

# ---- 4. availability (independent failures; an assumption) ---------------
p, q = 0.99, 0.98
avail = 1 - (1 - p) * (1 - q)

data = {"cost": cost, "cost_ratio": cost_ratio,
        "limit": LIMIT, "n_req": N_REQ, "worst": WORST, "sweep": sweep,
        "race": {"naive_spent": naive_race_spent, "admits": race_admits,
                 "held": race_held, "limit": 0.05},
        "outage": outage_res, "avail": {"p": p, "q": q, "both_fail": avail}}
with open(os.path.join(HERE, "56.3_data.json"), "w") as f:
    json.dump(data, f, indent=2)
print(json.dumps({"cost_ratio": cost_ratio, "sweep": sweep, "race": data["race"],
                  "outage": outage_res, "avail": avail}, indent=1))
