# Experiment for Lesson 21.4 (perceptron learning algorithm, Novikoff bound).
# Run once; writes 21.4_data.json next to this file. Every number in the lesson text and diagrams comes from this run.
# Conventions: augmented inputs x = [x_1..x_d, 1] so the bias is the last weight; margin and radius are measured in that augmented space.
import json, os
import numpy as np
from scipy.optimize import minimize
import scipy

HERE = os.path.dirname(os.path.abspath(__file__))
out = {"versions": {"numpy": np.__version__, "scipy": scipy.__version__}}

def augment(X):
    return np.hstack([X, np.ones((len(X), 1))])

def pla(Xa, y, max_epochs=1000, record=False):
    """Cyclic perceptron: scan points in order, update at each mistake, keep scanning.
    One epoch = one full scan. Stops after the first epoch with zero mistakes."""
    n, dim = Xa.shape
    w = np.zeros(dim)
    updates, per_epoch, trace = 0, [], []
    for epoch in range(1, max_epochs + 1):
        m = 0
        for i in range(n):
            s = float(w @ Xa[i])
            if y[i] * s <= 0:                       # misclassified (zero counts as a mistake)
                if record:
                    w_before = w.tolist()
                w = w + y[i] * Xa[i]
                updates += 1
                m += 1
                if record:
                    trace.append({"update": updates, "epoch": epoch, "point": i, "score": s,
                                  "w_before": w_before, "w_after": w.tolist()})
        per_epoch.append(m)
        if m == 0:
            return {"w": w.tolist(), "updates": updates, "epochs": epoch, "mistakes_per_epoch": per_epoch,
                    "converged": True, "trace": trace}
    return {"w": w.tolist(), "updates": updates, "epochs": max_epochs, "mistakes_per_epoch": per_epoch,
            "converged": False, "trace": trace}

def max_margin(Xa, y):
    """Hard-margin SVM in augmented space: min 0.5||w||^2 s.t. y_i w.x_i >= 1.
    Geometric margin of the unit vector w/||w|| is gamma* = 1/||w||."""
    dim = Xa.shape[1]
    cons = {"type": "ineq", "fun": lambda w: y * (Xa @ w) - 1.0, "jac": lambda w: y[:, None] * Xa}
    res = minimize(lambda w: 0.5 * w @ w, np.full(dim, 0.1), jac=lambda w: w,
                   constraints=[cons], method="SLSQP", options={"ftol": 1e-12, "maxiter": 1000})
    w = res.x
    feasible = bool(np.all(y * (Xa @ w) >= 1 - 1e-6))
    return 1.0 / np.linalg.norm(w), w, feasible

# ------------------------------------------------------------------ A. worked example (4 points, by hand)
X_ex = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0], [-1.0, -1.0]])
y_ex = np.array([1, -1, 1, -1])
Xa_ex = augment(X_ex)
run = pla(Xa_ex, y_ex, record=True)
g_ex, w_svm_ex, feas_ex = max_margin(Xa_ex, y_ex)
R_ex = float(np.max(np.linalg.norm(Xa_ex, axis=1)))
out["worked"] = {
    "points": X_ex.tolist(), "labels": y_ex.tolist(), "augmented": Xa_ex.tolist(),
    "trace": run["trace"], "final_w": run["w"], "updates": run["updates"], "epochs": run["epochs"],
    "mistakes_per_epoch": run["mistakes_per_epoch"],
    "R": R_ex, "gamma_star": float(g_ex), "svm_w": w_svm_ex.tolist(), "svm_feasible": feas_ex,
    "bound": float((R_ex / g_ex) ** 2),
    "scores_final": (Xa_ex @ np.array(run["w"])).tolist(),
}
# unit-normal margin of the PLA solution (not the max margin): for reference in the text
w_pla = np.array(run["w"])
out["worked"]["gamma_pla_solution"] = float(np.min(y_ex * (Xa_ex @ w_pla)) / np.linalg.norm(w_pla))

# ------------------------------------------------------------------ B. random separable datasets
rng = np.random.default_rng(2024)
rows = []
for t in range(300):
    d = 2
    n = int(rng.integers(10, 60))
    u = rng.normal(size=d + 1)
    u /= np.linalg.norm(u)                             # generating unit separator in augmented space
    X = []
    while len(X) < n:
        p = rng.uniform(-3.0, 3.0, size=d)
        if abs(float(u @ np.append(p, 1.0))) >= 0.05:  # keep points away from the boundary
            X.append(p)
    X = np.array(X)
    Xa = augment(X)
    y = np.where(Xa @ u > 0, 1, -1)
    gamma_gen = float(np.min(y * (Xa @ u)))            # margin of the generating unit vector
    R = float(np.max(np.linalg.norm(Xa, axis=1)))
    g_star, _, feas = max_margin(Xa, y)
    assert feas, f"SVM infeasible at trial {t}"
    assert g_star >= gamma_gen - 1e-7, f"max margin below generating margin at trial {t}"
    res = pla(Xa, y)
    assert res["converged"], f"PLA did not converge at trial {t}"
    k = res["updates"]
    rows.append({"n": n, "R": R, "gamma_star": float(g_star), "gamma_gen": gamma_gen,
                 "updates": k, "bound_star": float((R / g_star) ** 2),
                 "bound_gen": float((R / gamma_gen) ** 2), "epochs": res["epochs"]})

ratios = np.array([r["updates"] / r["bound_star"] for r in rows])
violations = int(sum(r["updates"] > r["bound_star"] + 1e-9 for r in rows))
out["random"] = {
    "rows": rows,
    "n_datasets": len(rows),
    "violations_star": violations,
    "violations_gen": int(sum(r["updates"] > r["bound_gen"] + 1e-9 for r in rows)),
    "ratio_updates_over_bound": {"min": float(ratios.min()), "median": float(np.median(ratios)),
                                 "max": float(ratios.max())},
    "updates": {"min": int(min(r["updates"] for r in rows)), "median": float(np.median([r["updates"] for r in rows])),
                "max": int(max(r["updates"] for r in rows))},
    "bound_star": {"min": float(min(r["bound_star"] for r in rows)), "median": float(np.median([r["bound_star"] for r in rows])),
                   "max": float(max(r["bound_star"] for r in rows))},
}

# ------------------------------------------------------------------ C. scaling: whole augmented vector vs features only
base = pla(Xa_ex, y_ex)
scale_rows = []
for c in [0.1, 1.0, 10.0, 100.0]:
    r_full = pla(c * Xa_ex, y_ex)                      # scale the whole augmented vector (homogeneous case)
    Xs = Xa_ex.copy(); Xs[:, :2] *= c                 # scale features only; the constant 1 is untouched
    r_feat = pla(Xs, y_ex)
    R_s = float(np.max(np.linalg.norm(Xs, axis=1)))
    g_s, _, _ = max_margin(Xs, y_ex)
    scale_rows.append({"c": c, "updates_full_scale": r_full["updates"], "updates_features_only": r_feat["updates"],
                       "bound_full_scale": float((c * R_ex / (c * g_ex)) ** 2),
                       "bound_features_only": float((R_s / g_s) ** 2), "R_features_only": R_s, "gamma_features_only": float(g_s)})
out["scaling"] = {"base_updates": base["updates"], "rows": scale_rows}

# ------------------------------------------------------------------ D. non-separable (XOR) vs separable
X_xor = np.array([[1.0, 1.0], [-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0]])
y_xor = np.array([1, 1, -1, -1])
xor = pla(augment(X_xor), y_xor, max_epochs=20)
out["nonseparable"] = {"xor_points": X_xor.tolist(), "xor_labels": y_xor.tolist(),
                       "xor_mistakes_per_epoch": xor["mistakes_per_epoch"], "xor_updates_after_20_epochs": xor["updates"],
                       "xor_converged": xor["converged"]}
out["separable"] = {"mistakes_per_epoch": run["mistakes_per_epoch"], "updates": run["updates"]}

path = os.path.join(HERE, "21.4_data.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)

# ------------------------------------------------------------------ print the numbers the text uses
print("worked trace:")
for tr in run["trace"]:
    print(f"  update {tr['update']} epoch {tr['epoch']} point {tr['point']} score {tr['score']:.0f} -> w {tr['w_after']}")
print("worked final w:", run["w"], "updates", run["updates"], "epochs", run["epochs"], "mistakes/epoch", run["mistakes_per_epoch"])
print(f"worked R={R_ex:.4f} gamma*={g_ex:.4f} bound={out['worked']['bound']:.2f} svm_feasible={feas_ex}")
print(f"worked gamma of PLA solution={out['worked']['gamma_pla_solution']:.4f}")
print("random:", len(rows), "datasets; violations (max-margin bound):", violations,
      "; violations (generating-margin bound):", out["random"]["violations_gen"])
print("ratio updates/bound min/median/max:", {k: round(v, 5) for k, v in out["random"]["ratio_updates_over_bound"].items()})
print("updates min/median/max:", out["random"]["updates"], " bound_star median:", round(out["random"]["bound_star"]["median"], 1))
print("scaling base updates:", base["updates"])
for r in scale_rows:
    print(f"  c={r['c']}: full-scale updates {r['updates_full_scale']} bound {r['bound_full_scale']:.4f} | "
          f"features-only updates {r['updates_features_only']} bound {r['bound_features_only']:.4f}")
print("XOR mistakes/epoch:", xor["mistakes_per_epoch"], "converged:", xor["converged"])
print("separable mistakes/epoch:", run["mistakes_per_epoch"])
print("wrote", path)
