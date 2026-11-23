import itertools, json, math
import numpy as np
from scipy.optimize import linprog
from scipy.special import comb

OUT = "/Users/bshah/Documents/Trial/Learning/scripts/diagrams/lessons/19.5_data.json"
np.set_printoptions(precision=4, suppress=True)
res = {}

# ---- A. shattering by 2D lines (affine classifier sign(w.x+b)) ----
def perceptron_separable(X, y, max_epochs=10000):
    w = np.zeros(X.shape[1]); b = 0.0
    for _ in range(max_epochs):
        mistakes = 0
        for xi, yi in zip(X, y):
            if yi * (w @ xi + b) <= 0:
                w = w + yi * xi; b += yi; mistakes += 1
        if mistakes == 0:
            return True
    return False

def lp_separable(X, y):
    # feasibility: y_i (w.x_i + b) >= 1 for all i (margin 1 is WLOG by scaling)
    n, d = X.shape
    A = -(y[:, None] * np.hstack([X, np.ones((n, 1))]))
    r = linprog(c=np.zeros(d + 1), A_ub=A, b_ub=-np.ones(n),
                bounds=[(None, None)] * (d + 1), method="highs")
    return r.status == 0

def shatter_report(P):
    n = len(P); P = np.asarray(P, float)
    labs = list(itertools.product([-1, 1], repeat=n))
    pc = [perceptron_separable(P, np.array(l, float)) for l in labs]
    lp = [lp_separable(P, np.array(l, float)) for l in labs]
    assert pc == lp, "perceptron and LP disagree"
    bad = [l for l, ok in zip(labs, lp) if not ok]
    return sum(lp), 2 ** n, bad

tri = [[0, 1], [1, 0], [0, 0]]
xor = [[0, 0], [1, 1], [0, 1], [1, 0]]
r3 = shatter_report(tri); r4 = shatter_report(xor)
res["lines_3pts"] = {"realized": r3[0], "total": r3[1]}
res["lines_4xor"] = {"realized": r4[0], "total": r4[1], "unrealized": [list(map(int, l)) for l in r4[2]]}
print("3 pts lines:", r3[0], "/", r3[1])
print("4 XOR pts lines:", r4[0], "/", r4[1], "failing:", r4[2])

# ---- B. axis-aligned rectangles: exact labelling count by brute force ----
def rect_realizable(P):
    P = np.asarray(P, float); n = len(P)
    real = set()
    for mask in range(2 ** n):
        T = [i for i in range(n) if mask >> i & 1]
        if not T:
            real.add(()); continue
        lo = P[T].min(0); hi = P[T].max(0)
        inside = tuple(i for i in range(n) if np.all(P[i] >= lo) and np.all(P[i] <= hi))
        if inside == tuple(T):
            real.add(tuple(T))
    return len(real)

cross = [[0, 1], [0, -1], [1, 0], [-1, 0]]
res["rect_cross4"] = {"realized": rect_realizable(cross), "total": 16}
print("rectangles, 4-point cross:", rect_realizable(cross), "/ 16")

rng = np.random.default_rng(1)
best5 = 0
for _ in range(3000):
    P5 = rng.random((5, 2))
    best5 = max(best5, rect_realizable(P5))
res["rect_max_over_random5"] = {"max_realized": best5, "total": 32, "trials": 3000}
print("rectangles, random 5-point sets, max realized over 3000 trials:", best5, "/ 32")

rng = np.random.default_rng(2)
growth = {}
for n in range(1, 9):
    m = 0
    for _ in range(300 if n > 4 else 200):
        m = max(m, rect_realizable(rng.random((n, 2))))
    growth[n] = m
res["rect_growth_random_lower"] = growth
print("max realized over random sets (lower bound on growth fn):", growth)

# ---- C. Sauer-Shelah, d = 4 (rectangles) ----
d = 4
ss = {}
for n in list(range(1, 11)) + [20, 50]:
    s = sum(int(comb(n, i, exact=True)) for i in range(d + 1))
    ss[n] = {"two_pow_n": 2 ** n, "sauer_sum": s, "poly_bound": (math.e * n / d) ** d}
res["sauer_d4"] = ss
for n, v in ss.items():
    print("n=%d  2^n=%d  sum=%d  (en/d)^d=%.1f" % (n, v["two_pow_n"], v["sauer_sum"], v["poly_bound"]))

# ---- D. 1D sine: infinite VC dimension (Vapnik construction) ----
n = 6
xs = np.array([10.0 ** -i for i in range(1, n + 1)])
ok_all = True; count = 0
for y in itertools.product([-1, 1], repeat=n):
    y = np.array(y)
    theta = math.pi * (1 + np.sum(10.0 ** np.arange(1, n + 1) * (1 - y) / 2))
    pred = np.sign(np.sin(theta * xs))
    count += int(np.all(pred == y))
res["sine_shattered"] = {"points": n, "realized": count, "total": 2 ** n}
print("sine, n=6 points x_i=10^-i: realized", count, "/", 2 ** n)

# ---- E. finite-class sample complexity (agnostic Hoeffding + union bound) ----
eps, delta = 0.05, 0.01
fc = []
for logH in [10, 20, 40, 64]:
    H = 2.0 ** logH
    n_req = math.ceil((math.log(2 * H) + math.log(1 / delta)) / (2 * eps ** 2))
    fc.append({"log2_H": logH, "n": n_req})
    print("|H|=2^%d  n >= %d" % (logH, n_req))
res["finite_class_eps005_delta001"] = fc
res["ln_2_pow_64"] = 64 * math.log(2)

# ---- F. Monte Carlo: realizable threshold class, grid of 101 thresholds ----
grid = np.arange(101) / 100.0
t_star = 0.37
err = np.abs(grid - t_star)           # R(h_t) under Uniform[0,1]
eps_mc = 0.05
B = int(np.sum(err > eps_mc + 1e-12))  # hypotheses with R > eps
rng = np.random.default_rng(3)
mc = {}
for n in [10, 20, 50, 100]:
    fails = 0; trials = 4000
    for _ in range(trials):
        x = rng.random(n); y = (x >= t_star).astype(int)
        pred = (x[None, :] >= grid[:, None]).astype(int)   # 101 x n
        consistent = np.all(pred == y[None, :], axis=1)
        k = int(np.argmax(consistent))                    # first consistent hypothesis
        if err[k] > eps_mc:
            fails += 1
    mc[n] = {"measured_fail_rate": fails / trials, "union_bound": min(1.0, B * (1 - eps_mc) ** n), "trials": trials}
    print("n=%d measured P(R>eps)=%.4f  union bound=%.4f" % (n, fails / trials, min(1.0, B * (1 - eps_mc) ** n)))
res["mc_threshold"] = {"B": B, "eps": eps_mc, "by_n": mc}
print("B (bad grid hypotheses) =", B)

with open(OUT, "w") as f:
    json.dump(res, f, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
print("wrote", OUT)
