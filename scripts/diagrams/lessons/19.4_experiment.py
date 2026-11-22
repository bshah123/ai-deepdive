"""Experiment for lesson 19.4 (concentration inequalities).
Every number in the lesson and its diagrams comes from this script.

Run:    python3 scripts/diagrams/lessons/19.4_experiment.py
Writes: scripts/diagrams/lessons/19.4_data.json (read by 19.4.mjs)
Needs:  numpy, scipy (exact binomial tails)
"""
import json
import math
import os

import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
data = {}

# ---------------------------------------------------------------- 1. worked example
# X = number of errors in n = 100 independent predictions, each wrong with prob p = 0.1.
n, p = 100, 0.1
mu, var = n * p, n * p * (1 - p)               # 10, 9
t = 20                                          # event X >= 20 (error rate >= 0.2)
markov = mu / t                                 # E[X] / a
cheb = var / (t - mu) ** 2                      # Var / (distance from mean)^2
eps = 0.1                                       # deviation of the rate: 0.2 - 0.1
hoeff = math.exp(-2 * n * eps ** 2)             # one-sided Hoeffding
exact = float(stats.binom.sf(t - 1, n, p))      # P(X >= 20)
hoeff_two = 2 * hoeff
print("== 1. worked example: P(X >= 20), X ~ Binomial(100, 0.1)")
print("mu, var          :", mu, round(var, 6))
print("Markov           :", round(markov, 6))
print("Chebyshev        :", round(cheb, 6))
print("Hoeffding one-side:", round(hoeff, 6))
print("exact            :", round(exact, 6))
data["example"] = dict(n=n, p=p, t=t, markov=markov, cheb=cheb, hoeff=hoeff, exact=exact,
                       ratio_markov=markov / exact, ratio_cheb=cheb / exact, ratio_hoeff=hoeff / exact)
print("ratios to exact:", round(markov / exact, 1), round(cheb / exact, 1), round(hoeff / exact, 1))

# ---------------------------------------------------------------- 2. intuition histogram
np.random.seed(42)
n_h, p_h, trials = 100, 0.5, 50000
S = np.random.binomial(n_h, p_h, size=trials)        # integer counts: avoids float error in 0.6 - 0.5
means = S / n_h
eps_h = 0.1
emp_two = float(np.mean(np.abs(S - n_h * p_h) >= n_h * eps_h))
ks = list(range(20, 81))                              # one bar per integer count k (mean = k/100)
counts = np.bincount(S, minlength=n_h + 1)[20:81]
exact_two_h = float(stats.binom.cdf(40, n_h, p_h) + stats.binom.sf(59, n_h, p_h))
cheb_h = min(1.0, 0.25 / (n_h * eps_h ** 2))
hoeff_h = min(1.0, 2 * math.exp(-2 * n_h * eps_h ** 2))
print("\n== 2. histogram: n=100, p=0.5, 50,000 trials, eps=0.1")
print("empirical P(|Xbar-0.5|>=0.1):", round(emp_two, 6), " exact:", round(exact_two_h, 6))
print("Chebyshev:", round(cheb_h, 6), " Hoeffding two-sided:", round(hoeff_h, 6))
print("counts:", counts.tolist())
data["hist"] = dict(ks=ks, counts=counts.tolist(), mu=p_h, eps=eps_h,
                    n=n_h, trials=trials, emp_two=emp_two, exact_two=exact_two_h,
                    cheb=cheb_h, hoeff=hoeff_h)

# ---------------------------------------------------------------- 3. sweep over n
p_s, eps_s = 0.1, 0.1
ns = list(range(10, 1001, 10))
rows = []
for m in ns:
    k = int(round((p_s + eps_s) * m))           # event Xbar >= 0.2  <=>  X >= 0.2 n
    rows.append(dict(
        n=m,
        markov=p_s / (p_s + eps_s),              # does not depend on n
        cheb=min(1.0, p_s * (1 - p_s) / (m * eps_s ** 2)),
        hoeff=min(1.0, math.exp(-2 * m * eps_s ** 2)),
        exact=float(stats.binom.sf(k - 1, m, p_s)),
    ))
# crossover: smallest n from which Hoeffding stays below Chebyshev (integer grid 1..1000)
fine = []
for m in range(1, 1001):
    k = int(round((p_s + eps_s) * m))
    fine.append((m, math.exp(-2 * m * eps_s ** 2) < p_s * (1 - p_s) / (m * eps_s ** 2),
                 float(stats.binom.sf(k - 1, m, p_s))))
cross = next(m for m, _, _ in fine if all(ok for mm, ok, _ in fine if mm >= m))
cross_prev = cross - 1
print("sign at cross-1, cross:", [ok for mm, ok, _ in fine if mm in (cross_prev, cross)])
kl = (p_s + eps_s) * math.log((p_s + eps_s) / p_s) + (1 - p_s - eps_s) * math.log((1 - p_s - eps_s) / (1 - p_s))
r1 = next(r for r in rows if r["n"] == 500)
r2 = next(r for r in rows if r["n"] == 1000)
slope = (math.log(r2["exact"]) - math.log(r1["exact"])) / 500
print("\n== 3. sweep: p=0.1, eps=0.1, one-sided P(Xbar >= 0.2)")
print("first n where Hoeffding < Chebyshev:", cross)
print("KL(0.2 || 0.1) =", round(kl, 6), " 2 eps^2 =", round(2 * eps_s ** 2, 6))
print("measured exact decay slope per sample (n 500->1000):", round(-slope, 6))
for r in rows:
    if r["n"] in (20, 50, 100, 130, 140, 150, 200, 500, 1000):
        print(r["n"], {k: (round(v, 8) if isinstance(v, float) else v) for k, v in r.items() if k != "n"})
data["sweep"] = dict(rows=rows, cross=cross, kl=kl, slope=-slope, p=p_s, eps=eps_s)

# ---------------------------------------------------------------- 4. sample sizes
eps_n, delta = 0.05, 0.01
n_cheb = 0.25 / (delta * eps_n ** 2)
n_hoeff = math.log(2 / delta) / (2 * eps_n ** 2)
H = 1000
n_union = math.log(2 * H / delta) / (2 * eps_n ** 2)
print("\n== 4. sample sizes for eps=0.05, delta=0.01 (0-1 loss, sigma^2 <= 0.25)")
print("Chebyshev  n >=", n_cheb, "->", math.ceil(n_cheb))
print("Hoeffding  n >=", round(n_hoeff, 4), "->", math.ceil(n_hoeff))
print("Union |H|=1000 n >=", round(n_union, 4), "->", math.ceil(n_union))
data["sizes"] = dict(eps=eps_n, delta=delta, H=H, cheb=math.ceil(n_cheb),
                     hoeff=math.ceil(n_hoeff), union=math.ceil(n_union))

with open(os.path.join(HERE, "19.4_data.json"), "w") as f:
    json.dump(data, f, indent=1)
print("\nwrote 19.4_data.json")
