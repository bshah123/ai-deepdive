# Experiment for lesson 20.4 (condition number, sensitivity, stability).
# Run: <python> scripts/diagrams/lessons/20.4_experiment.py
# Writes every number used in the lesson and its diagrams to 20.4_data.json.
import json, sys
import numpy as np

out = {"python": sys.version.split()[0], "numpy": np.__version__}

# ---- A. Hand-sized example: nearly parallel rows ----------------------------
A = np.array([[1.0, 1.0], [1.0, 1.001]])
x_true = np.array([2.0, 3.0])
b = A @ x_true
db = np.array([1e-4, -1e-4])
x_noisy = np.linalg.solve(A, b + db)
dx = x_noisy - x_true
s = np.linalg.svd(A, compute_uv=False)
out["A_det"] = float(np.linalg.det(A))
out["A_inv"] = np.linalg.inv(A).tolist()
out["b"] = b.tolist()
out["db"] = db.tolist()
out["x_true"] = x_true.tolist()
out["x_noisy"] = x_noisy.tolist()
out["dx"] = dx.tolist()
out["sigma"] = s.tolist()
out["kappa_A"] = float(s[0] / s[1])
out["rel_b"] = float(np.linalg.norm(db) / np.linalg.norm(b))
out["rel_x"] = float(np.linalg.norm(dx) / np.linalg.norm(x_true))
out["amp_A"] = out["rel_x"] / out["rel_b"]

# ---- B. Orthogonal (rotation) matrix: kappa = 1 ------------------------------
th = np.pi / 6
R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]])
bR = R @ x_true
dxR = np.linalg.solve(R, bR + db) - x_true
sR = np.linalg.svd(R, compute_uv=False)
out["kappa_R"] = float(sR[0] / sR[1])
out["rel_x_R"] = float(np.linalg.norm(dxR) / np.linalg.norm(x_true))
out["rel_b_R"] = float(np.linalg.norm(db) / np.linalg.norm(bR))
out["amp_R"] = out["rel_x_R"] / out["rel_b_R"]

# ---- C. Rounding sweep: float64 vs float32 solves, kappa from 1 to 1e12 -----
rng = np.random.default_rng(0)
def orth(n):
    q, _ = np.linalg.qr(rng.standard_normal((n, n)))
    return q
sweep = []
for k in [1e0, 1e2, 1e4, 1e6, 1e8, 1e10, 1e12]:
    e64, e32 = [], []
    for trial in range(20):
        U, V = orth(4), orth(4)
        sv = np.logspace(0, -np.log10(k), 4)
        M = U @ np.diag(sv) @ V.T
        xt = rng.standard_normal(4)
        bt = M @ xt
        x64 = np.linalg.solve(M, bt)
        e64.append(np.linalg.norm(x64 - xt) / np.linalg.norm(xt))
        M32, b32 = M.astype(np.float32), bt.astype(np.float32)
        x32 = np.linalg.solve(M32, b32).astype(np.float64)
        e32.append(np.linalg.norm(x32 - xt) / np.linalg.norm(xt))
    sweep.append({"kappa": k,
                  "err64_median": float(np.median(e64)),
                  "err32_median": float(np.median(e32)),
                  "bound64": k * 2.220446e-16,
                  "bound32": k * 1.1920929e-07})
out["sweep"] = sweep

# ---- D. Gradient descent on f = 1/2 x^T Q x, Q = diag(1, kappa) ----------------
gd = []
for k in [1, 10, 100, 1000]:
    lam = np.array([1.0, float(k)])
    alpha = 2.0 / (lam[0] + lam[1])          # optimal fixed step for this quadratic
    x = np.array([1.0, 1.0])
    x0n = np.linalg.norm(x)
    it = 0
    while np.linalg.norm(x) > 1e-6 * x0n:
        x = x - alpha * lam * x              # gradient of 1/2 x^T Q x is Q x
        it += 1
    r = (k - 1) / (k + 1)
    pred = 1 if k == 1 else int(np.ceil(np.log(1e-6) / np.log(r)))
    gd.append({"kappa": k, "alpha": float(alpha), "rate": r,
               "iters_measured": it, "iters_predicted": pred})
out["gd"] = gd

# ---- E. Normal equations and ridge ---------------------------------------------
rng = np.random.default_rng(1)
t = np.linspace(0, 1, 50)
X = np.column_stack([t, t + 1e-3 * rng.standard_normal(50)])
kX = np.linalg.cond(X, 2)
kXtX = np.linalg.cond(X.T @ X, 2)
ridge = []
for lam in [1e-2, 1.0]:
    M = X.T @ X + lam * np.eye(2)
    ev = np.linalg.eigvalsh(X.T @ X)
    ridge.append({"lambda": lam, "kappa_ridge": float(np.linalg.cond(M, 2)),
                  "formula": float((ev[-1] + lam) / (ev[0] + lam))})
out["kappa_X"] = float(kX)
out["kappa_XtX"] = float(kXtX)
out["kappa_X_squared"] = float(kX ** 2)
out["ridge"] = ridge

with open(sys.argv[0].replace("20.4_experiment.py", "20.4_data.json"), "w") as f:
    json.dump(out, f, indent=2)

print("A: kappa", out["kappa_A"], "rel_b", out["rel_b"], "rel_x", out["rel_x"], "amp", out["amp_A"])
print("x_noisy", out["x_noisy"], "dx", out["dx"], "sigma", out["sigma"], "det", out["A_det"])
print("R: kappa", out["kappa_R"], "amp", out["amp_R"])
for r in sweep:
    print("sweep", r["kappa"], r["err64_median"], r["err32_median"])
for r in gd:
    print("gd", r)
print("X:", kX, kXtX, kX ** 2)
for r in ridge:
    print("ridge", r)
