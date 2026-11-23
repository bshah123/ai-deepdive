"""Experiment for lesson 57.3 (standard benchmarks). Produces every number used in the
lesson text and diagrams, written to 57.3_data.json next to this file.

Run: python3 scripts/diagrams/lessons/57.3_experiment.py
Needs only the standard library and NumPy. Seeds are fixed, so the output is reproducible.
"""
import json
import math
import random
from math import comb
from pathlib import Path

import numpy as np

OUT = Path(__file__).with_name("57.3_data.json")
R = {}

# ---------------------------------------------------------------- 1. accuracy uncertainty
def hw95(p, n):
    """Half-width of a 95% normal-approximation interval for an accuracy p on n items."""
    return 1.96 * math.sqrt(p * (1 - p) / n)

MMLU_N = 14079   # MMLU test questions as stated in Hendrycks et al. (2020)
GSM_N = 1000     # "1K test problems" in Cobbe et al. (2021)
R["mmlu_n"] = MMLU_N
R["gsm_n"] = GSM_N
R["hw_mmlu_chance"] = hw95(0.25, MMLU_N)
R["hw_mmlu_70"] = hw95(0.70, MMLU_N)
R["hw_gsm_60"] = hw95(0.60, GSM_N)
R["hw_humaneval_60"] = hw95(0.60, 164)
R["curve"] = [[n, hw95(0.60, n)] for n in (100, 164, 500, 1000, 4000, 14079)]

def n_per_group(p1, p2, z_alpha=1.96, z_power=0.8416):
    """Items per model to detect p1 vs p2 with a two-sided two-proportion z-test at 80% power."""
    pbar = (p1 + p2) / 2
    num = z_alpha * math.sqrt(2 * pbar * (1 - pbar)) + z_power * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
    return num ** 2 / (p1 - p2) ** 2

R["n_per_group_60_vs_63"] = n_per_group(0.60, 0.63)

# Simulated power check at the formula's n (two-proportion pooled z-test, alpha = 0.05).
rng_np = np.random.default_rng(57)
n_check = math.ceil(R["n_per_group_60_vs_63"])
x1 = rng_np.binomial(n_check, 0.60, size=20000)
x2 = rng_np.binomial(n_check, 0.63, size=20000)
p1h, p2h = x1 / n_check, x2 / n_check
pool = (x1 + x2) / (2 * n_check)
se = np.sqrt(pool * (1 - pool) * 2 / n_check)
R["power_at_formula_n"] = float(np.mean(np.abs(p1h - p2h) / se > 1.96))
R["n_check"] = n_check
# Same test at GSM8K-sized n = 1000
x1 = rng_np.binomial(1000, 0.60, size=20000)
x2 = rng_np.binomial(1000, 0.63, size=20000)
p1h, p2h = x1 / 1000, x2 / 1000
pool = (x1 + x2) / 2000
se = np.sqrt(pool * (1 - pool) * 2 / 1000)
R["power_at_n1000"] = float(np.mean(np.abs(p1h - p2h) / se > 1.96))

# ---------------------------------------------------------------- 2. HumanEval pass@k
def pass_at_k(n, c, k):
    """Unbiased estimator from Chen et al. (2021), Eq. 1: 1 - C(n-c, k) / C(n, k)."""
    if n - c < k:
        return 1.0
    return 1.0 - comb(n - c, k) / comb(n, k)

def pass_at_k_naive(n, c, k):
    """Naive estimator 1 - (1 - p)^k with p = c/n (treats draws as independent)."""
    return 1.0 - (1.0 - c / n) ** k

def pass_at_k_product(n, c, k):
    """Same quantity as pass_at_k, computed as a product (avoids huge binomials)."""
    if n - c < k:
        return 1.0
    prod = 1.0
    for i in range(n - c + 1, n + 1):
        prod *= 1.0 - k / i
    return 1.0 - prod

R["pass1_n10_c3"] = pass_at_k(10, 3, 1)
R["pass5_n10_c3"] = pass_at_k(10, 3, 5)
R["naive5_n10_c3"] = pass_at_k_naive(10, 3, 5)

# Monte Carlo: draw 5 of the 10 samples without replacement, count draws with >= 1 pass.
rng_py = random.Random(57)
pool10 = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
hits = sum(any(rng_py.sample(pool10, 5)) for _ in range(200000))
R["mc_pass5_n10_c3"] = hits / 200000

# Exhaustive check that the product form equals the binomial form.
max_diff = 0.0
for n in range(1, 21):
    for c in range(0, n + 1):
        for k in range(1, n + 1):
            max_diff = max(max_diff, abs(pass_at_k(n, c, k) - pass_at_k_product(n, c, k)))
R["max_diff_product_vs_binomial"] = max_diff

# ---------------------------------------------------------------- 3. Elo and Bradley-Terry
def elo_expected(ra, rb):
    """Expected score of a player rated ra against rb, base-10 scale with 400 points per decade."""
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))

def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))

R["elo_E_diff100"] = elo_expected(1500, 1400)
R["elo_E_diff400"] = elo_expected(1800, 1400)
BT_SCALE = 400.0 / math.log(10)   # Elo points per unit of Bradley-Terry log-odds
R["bt_scale"] = BT_SCALE

TRUE_S = [0.0, 0.4, 0.8, 1.2]      # true Bradley-Terry log-odds strengths of 4 models
TRUE_ELO = [s * BT_SCALE for s in TRUE_S]
TRUE_ELO_C = [e - sum(TRUE_ELO) / 4 for e in TRUE_ELO]
R["true_elo_centered"] = TRUE_ELO_C

rng = random.Random(57)
battles = []   # (a, b, y): y = 1 if model a won, 0 if model b won
for _ in range(800):
    a, b = rng.sample(range(4), 2)
    y = 1 if rng.random() < sigmoid(TRUE_S[a] - TRUE_S[b]) else 0
    battles.append((a, b, y))

def elo_run(battles, order, K=32.0, start=1500.0):
    ratings = [start] * 4
    for idx in order:
        a, b, y = battles[idx]
        e = elo_expected(ratings[a], ratings[b])
        ratings[a] += K * (y - e)
        ratings[b] -= K * (y - e)
    mean = sum(ratings) / 4
    return [r - mean for r in ratings]

def fit_bt(battles, iters=500):
    """Maximum likelihood Bradley-Terry strengths via the fixed-point (MM) iteration,
    returned on the Elo scale and centred to mean 0."""
    a = np.array([x[0] for x in battles])
    b = np.array([x[1] for x in battles])
    y = np.array([x[2] for x in battles])
    winner = np.where(y == 1, a, b)
    wins = np.bincount(winner, minlength=4).astype(float)
    p = np.ones(4)
    for _ in range(iters):
        d = 1.0 / (p[a] + p[b])
        denom = np.bincount(a, d, minlength=4) + np.bincount(b, d, minlength=4)
        p_new = wins / denom
        p_new /= np.exp(np.mean(np.log(p_new)))
        done = np.max(np.abs(p_new - p)) < 1e-12
        p = p_new
        if done:
            break
    theta = np.log(p) * BT_SCALE
    return theta - theta.mean()

bt_point = fit_bt(battles)
R["bt_point_centered"] = [float(v) for v in bt_point]

order_rng = random.Random(11)
shuffled = []
for _ in range(200):
    order = list(range(len(battles)))
    order_rng.shuffle(order)
    shuffled.append(elo_run(battles, order))
top = [r[3] for r in shuffled]
R["elo_top_mean"] = float(np.mean(top))
R["elo_top_std"] = float(np.std(top))
R["elo_top_min"] = float(min(top))
R["elo_top_max"] = float(max(top))
R["elo_top_not_first_count"] = sum(1 for r in shuffled if int(np.argmax(r)) != 3)
R["elo_shuffled_top"] = top
R["elo_fixed_order_centered"] = elo_run(battles, range(len(battles)))

boot_rng = random.Random(23)
boots = []
for _ in range(200):
    sample = [boot_rng.choice(battles) for _ in battles]
    boots.append(float(fit_bt(sample)[3]))
R["bt_top_ci95"] = [float(np.percentile(boots, 2.5)), float(np.percentile(boots, 97.5))]
R["bt_top_point"] = float(bt_point[3])

OUT.write_text(json.dumps(R, indent=2))
for k, v in R.items():
    if k not in ("curve", "elo_shuffled_top"):
        print(k, v)
print("wrote", OUT)
