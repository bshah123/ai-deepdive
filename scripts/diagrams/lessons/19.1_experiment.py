# Experiment for lesson 19.1 (ML problem formulation & empirical risk).
# Run: <python> scripts/diagrams/lessons/19.1_experiment.py
# Writes every number used in the lesson and its diagrams to 19.1_data.json.
# NumPy only, so the lesson's visible code blocks reproduce the same numbers.
import json, sys
import numpy as np

out = {"python": sys.version.split()[0], "numpy": np.__version__}

# ---- A. Worked example: 4 points, hypothesis h_w(x) = w * x, squared loss ----
x = np.array([1.0, 2.0, 3.0, 4.0])
y = np.array([2.0, 3.0, 5.0, 4.0])

def empirical_risk(w, x, y):
    return float(np.mean((w * x - y) ** 2))

out["x"] = x.tolist()
out["y"] = y.tolist()
out["sum_xy"] = float(np.sum(x * y))
out["sum_xx"] = float(np.sum(x * x))
out["sum_yy"] = float(np.sum(y * y))
out["residuals_w1"] = (1.0 * x - y).tolist()
out["residuals_w1_5"] = (1.5 * x - y).tolist()
out["risk_w1"] = empirical_risk(1.0, x, y)
out["risk_w1_5"] = empirical_risk(1.5, x, y)
w_star = float(np.sum(x * y) / np.sum(x * x))          # closed form: set dR/dw = 0
out["w_star"] = w_star
out["risk_w_star"] = empirical_risk(w_star, x, y)
out["residuals_w_star"] = (w_star * x - y).tolist()
grid = np.linspace(0.0, 3.0, 30001)
risks = np.array([empirical_risk(w, x, y) for w in grid])
out["grid_argmin"] = float(grid[risks.argmin()])       # brute-force check of the closed form
out["curve_w"] = [round(float(w), 4) for w in np.linspace(0.0, 2.6, 27)]
out["curve_risk"] = [round(empirical_risk(w, x, y), 6) for w in np.linspace(0.0, 2.6, 27)]
# Closed form: R_S(w) = (30 w^2 - 78 w + 54) / 4 = 7.5 w^2 - 19.5 w + 13.5
out["quad_check_w1"] = 7.5 * 1 - 19.5 * 1 + 13.5

# ---- B. Overfitting: polynomial degree vs empirical and true risk ----
# Truth: y = sin(pi x) + N(0, 0.3^2), x ~ Uniform(-1, 1). n_train = 20.
# True risk R(h) is estimated with 20,000 fresh points. Averaged over 200 training sets.
NOISE, N_TRAIN, N_TEST, REPS = 0.3, 20, 20000, 200
DEGREES = list(range(1, 13))

def one_sweep(seed):
    rng = np.random.default_rng(seed)
    x_tr = rng.uniform(-1, 1, N_TRAIN)
    y_tr = np.sin(np.pi * x_tr) + rng.normal(0, NOISE, N_TRAIN)
    x_te = rng.uniform(-1, 1, N_TEST)
    y_te = np.sin(np.pi * x_te) + rng.normal(0, NOISE, N_TEST)
    tr, te = [], []
    for d in DEGREES:
        coef = np.polyfit(x_tr, y_tr, d)               # ERM over polynomials of degree d
        tr.append(float(np.mean((np.polyval(coef, x_tr) - y_tr) ** 2)))
        te.append(float(np.mean((np.polyval(coef, x_te) - y_te) ** 2)))
    return tr, te

TR = np.zeros((REPS, len(DEGREES)))
TE = np.zeros((REPS, len(DEGREES)))
for r in range(REPS):
    TR[r], TE[r] = one_sweep(r)

# Nested classes fit on the same sample: training risk cannot rise with degree.
out["train_monotone_every_rep"] = bool(np.all(np.diff(TR, axis=1) <= 1e-9))
out["degrees"] = DEGREES
out["mean_train"] = [round(float(v), 4) for v in TR.mean(axis=0)]
out["mean_true"] = [round(float(v), 4) for v in TE.mean(axis=0)]
out["sd_true"] = [round(float(v), 4) for v in TE.std(axis=0, ddof=1)]
out["best_degree"] = int(DEGREES[int(TE.mean(axis=0).argmin())])
out["best_true"] = round(float(TE.mean(axis=0).min()), 4)
out["bayes_floor"] = NOISE ** 2                         # E[(y - f(x))^2] for the best predictor f
out["deg1_train"], out["deg1_true"] = round(float(TR[:, 0].mean()), 4), round(float(TE[:, 0].mean()), 4)
out["deg12_train"], out["deg12_true"] = round(float(TR[:, -1].mean()), 4), round(float(TE[:, -1].mean()), 4)
out["deg12_true_sd"] = round(float(TE[:, -1].std(ddof=1)), 4)
out["median_true"] = [round(float(v), 4) for v in np.median(TE, axis=0)]
out["deg12_true_median"] = round(float(np.median(TE[:, -1])), 4)
out["max_cond_vander_deg12"] = float(max(np.linalg.cond(np.vander(
    np.random.default_rng(r).uniform(-1, 1, N_TRAIN), 13)) for r in range(REPS)))
# Basis check: Legendre basis spans the same polynomials of degree <= d, so the ERM
# minimiser is identical in exact arithmetic. Any gap here is floating-point error.
from numpy.polynomial import legendre as L
def leg_true_mean(d):
    vals = []
    for seed in range(REPS):
        rng = np.random.default_rng(seed)
        x_tr = rng.uniform(-1, 1, N_TRAIN); y_tr = np.sin(np.pi * x_tr) + rng.normal(0, NOISE, N_TRAIN)
        x_te = rng.uniform(-1, 1, N_TEST); y_te = np.sin(np.pi * x_te) + rng.normal(0, NOISE, N_TEST)
        c = L.legfit(x_tr, y_tr, d)
        vals.append(np.mean((L.legval(x_te, c) - y_te) ** 2))
    return float(np.mean(vals))
out["deg12_true_mean_legendre"] = leg_true_mean(12)

with open(__file__.replace("_experiment.py", "_data.json"), "w") as f:
    json.dump(out, f, indent=1)
for k, v in out.items():
    if k not in ("curve_w", "curve_risk"):
        print(k, "=", v)
