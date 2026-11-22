"""Experiment for lesson 19.3 (bias-variance, ridge, lasso). Run once; writes 19.3_data.json.

Part A (numpy only, identical to the lesson's visible code): polynomial fits to sin(2*pi*x),
  many training sets, exact bias^2 / variance decomposition on a grid.
Part B (ridge sweep at degree 12, numpy only).
Part C (scikit-learn, run locally): sparse linear problem, ridge vs lasso, alphas tuned by CV
  on the training data only.
"""
import json, os
import numpy as np

SIGMA = 0.3           # label noise standard deviation
N_TRAIN = 100         # points per training set (25 gave heavy-tailed variance, see lesson)
N_SETS = 500          # independent training sets
GRID = np.linspace(0, 1, 200)   # where error is measured

def f(x):
    return np.sin(2 * np.pi * x)

rng = np.random.default_rng(0)
X_TR = rng.uniform(0, 1, (N_SETS, N_TRAIN))
Y_TR = f(X_TR) + rng.normal(0, SIGMA, (N_SETS, N_TRAIN))
Y_TE = f(GRID) + rng.normal(0, SIGMA, (N_SETS, GRID.size))   # fresh noisy labels per set

def features(x, degree):
    # Legendre polynomials of t = 2x - 1 on [-1, 1]: well conditioned, so the variance we
    # measure is statistical, not a floating-point artefact of a monomial basis.
    return np.polynomial.legendre.legvander(2 * x - 1, degree)

def fit(x, y, degree, lam=0.0):
    X = features(x, degree)
    if lam == 0.0:
        return np.linalg.lstsq(X, y, rcond=None)[0]
    P = np.sqrt(lam) * np.diag([0.0] + [1.0] * degree)  # intercept not penalised
    A = np.vstack([X, P])
    b = np.concatenate([y, np.zeros(degree + 1)])
    return np.linalg.lstsq(A, b, rcond=None)[0]

def predict(w, x):
    return features(x, len(w) - 1) @ w

def decompose(degree, lam=0.0):
    preds = np.empty((N_SETS, GRID.size))
    for r in range(N_SETS):
        preds[r] = predict(fit(X_TR[r], Y_TR[r], degree, lam), GRID)
    mean_pred = preds.mean(axis=0)
    bias2 = float(np.mean((mean_pred - f(GRID)) ** 2))
    variance = float(np.mean(preds.var(axis=0)))
    test_mse = float(np.mean((preds - Y_TE) ** 2))   # Monte Carlo, fresh labels
    return {"bias2": bias2, "variance": variance,
            "expected": bias2 + variance + SIGMA ** 2, "test_mse": test_mse}

print("Part A: degree sweep (lam = 0)")
print(f"{'deg':>3} {'bias^2':>8} {'var':>8} {'bias2+var+s2':>13} {'test MSE':>9}")
degrees = {}
for d in range(1, 16):
    r = decompose(d)
    degrees[d] = r
    print(f"{d:3d} {r['bias2']:8.3f} {r['variance']:8.3f} {r['expected']:13.3f} {r['test_mse']:9.3f}")
best_d = min(degrees, key=lambda d: degrees[d]["expected"])
print("best degree:", best_d, round(degrees[best_d]["expected"], 3))

print("\nPart B: ridge sweep, degree 12")
lams = [0.0, 1e-6, 1e-4, 1e-2, 1e-1, 1.0, 10.0, 100.0]
ridge = {}
for lam in lams:
    r = decompose(12, lam)
    ridge[lam] = r
    print(f"lam={lam:8.0e} bias2={r['bias2']:.3f} var={r['variance']:.3f} expected={r['expected']:.3f} test={r['test_mse']:.3f}")
best_lam = min(lams, key=lambda l: ridge[l]["expected"])
print("best lam:", best_lam, round(ridge[best_lam]["expected"], 3))

print("\nPart C: sparse problem, ridge vs lasso (scikit-learn)")
import sklearn
from sklearn.linear_model import LinearRegression, RidgeCV, LassoCV
print("scikit-learn", sklearn.__version__)
P_FEAT, N_SP, SIG_SP, REPEATS = 20, 60, 0.5, 100
W_TRUE = np.zeros(P_FEAT); W_TRUE[:3] = [2.0, -1.5, 1.0]
rs = np.random.default_rng(1)
X_big = rs.normal(size=(2000, P_FEAT))
y_big_clean = X_big @ W_TRUE
sums = {"ols": [], "ridge": [], "lasso": []}
nz = []
coef_run = None
for rep in range(REPEATS):
    X = rs.normal(size=(N_SP, P_FEAT))
    y = X @ W_TRUE + rs.normal(0, SIG_SP, N_SP)
    y_test = y_big_clean + rs.normal(0, SIG_SP, 2000)
    models = {
        "ols": LinearRegression().fit(X, y),
        "ridge": RidgeCV(alphas=np.logspace(-3, 3, 25), cv=5).fit(X, y),
        "lasso": LassoCV(cv=5, random_state=0).fit(X, y),
    }
    for k, m in models.items():
        sums[k].append(float(np.mean((m.predict(X_big) - y_test) ** 2)))
    nz.append(int(np.sum(np.abs(models["lasso"].coef_) > 1e-12)))
    if rep == 0:
        coef_run = {k: [float(c) for c in m.coef_] for k, m in models.items()}
        coef_run["alpha_ridge"] = float(models["ridge"].alpha_)
        coef_run["alpha_lasso"] = float(models["lasso"].alpha_)
sparse = {k: float(np.mean(v)) for k, v in sums.items()}
sparse_sd = {k: float(np.std(v)) for k, v in sums.items()}
print("mean test MSE over", REPEATS, "runs:", {k: round(v, 3) for k, v in sparse.items()})
print("noise floor sigma^2 =", SIG_SP ** 2)
print("lasso nonzero coefficients: mean", round(float(np.mean(nz)), 2), "min", min(nz), "max", max(nz))
print("run 0 lasso coefs:", [round(c, 3) for c in coef_run["lasso"][:6]], "...")
print("run 0 ridge coefs:", [round(c, 3) for c in coef_run["ridge"][:6]], "...")

out = {
    "degrees": {str(d): v for d, v in degrees.items()},
    "ridge": {str(l): v for l, v in ridge.items()},
    "sigma": SIGMA,
    "sparse": {"mean_test_mse": sparse, "sd_test_mse": sparse_sd,
               "lasso_nonzero_mean": float(np.mean(nz)), "run0": coef_run,
               "w_true": W_TRUE.tolist(), "repeats": REPEATS},
    "sklearn_version": sklearn.__version__,
}
GRID100 = np.linspace(0, 1, 100)
out["fits"] = {
    "x": GRID100.tolist(),
    "degrees": {str(d): [predict(fit(X_TR[r], Y_TR[r], d), GRID100).tolist() for r in range(8)] for d in [1, 5, 15]},
    "points_x": X_TR[:8].tolist(),
    "points_y": Y_TR[:8].tolist(),
}
os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "19.3_data.json"), "w") as fh:
    json.dump(out, fh, indent=1)
