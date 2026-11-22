# Experiment for lesson 20.5 (quadratic forms, definiteness, Rayleigh quotient).
# Writes 20.5_data.json next to this file; every number in the 20.5 lesson and diagrams comes from it.
# Run: <python> scripts/diagrams/lessons/20.5_experiment.py
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
np.set_printoptions(precision=6, suppress=True)
out = {}

# 1. Symmetrisation: a non-symmetric A whose symmetric part is the test matrix.
A_raw = np.array([[5.0, 0.0], [-4.0, 2.0]])
S = 0.5 * (A_raw + A_raw.T)
K = 0.5 * (A_raw - A_raw.T)          # skew-symmetric part
x = np.array([3.0, 1.0])
out["A_raw"] = A_raw.tolist(); out["A_sym"] = S.tolist(); out["A_skew"] = K.tolist()
out["xAx_raw"] = float(x @ A_raw @ x)
out["xAx_sym"] = float(x @ S @ x)
out["xKx"] = float(x @ K @ x)
out["x"] = x.tolist()
out["xTx"] = float(x @ x)
out["RQ_x"] = float((x @ S @ x) / (x @ x))

# 2. Eigen-decomposition of the test matrix.
w, V = np.linalg.eigh(S)
order = np.argsort(w)[::-1]
w = w[order]; V = V[:, order]
out["eigs_desc"] = w.tolist()
out["v1"] = V[:, 0].tolist(); out["v2"] = V[:, 1].tolist()
out["v1_abs"] = np.abs(V[:, 0]).tolist()

# 3. Definiteness of three examples.
def eigs(M):
    return np.sort(np.linalg.eigvalsh(0.5 * (M + M.T)))[::-1]
D_saddle = np.array([[2.0, 0.0], [0.0, -3.0]])
out["eigs_saddle"] = eigs(D_saddle).tolist()
out["RQ_saddle_e1"] = float(np.array([1.0, 0.0]) @ D_saddle @ np.array([1.0, 0.0]))
out["RQ_saddle_e2"] = float(np.array([0.0, 1.0]) @ D_saddle @ np.array([0.0, 1.0]))

# 4. Rayleigh-Ritz range check on random unit vectors (seeded).
rng = np.random.default_rng(20)
U = rng.standard_normal((20000, 2))
U /= np.linalg.norm(U, axis=1, keepdims=True)
rq = np.einsum("ni,ij,nj->n", U, S, U)
out["rq_min_sampled"] = float(rq.min()); out["rq_max_sampled"] = float(rq.max())
out["rq_mean_sampled"] = float(rq.mean())
out["rq_samples_for_hist"] = np.round(rq[:400], 4).tolist()
out["n_samples"] = int(rq.size)

# 5. PCA: variance of projections Xv versus direction angle, on centred synthetic data (seeded).
rng2 = np.random.default_rng(7)
Z = rng2.standard_normal((500, 2)) * np.array([2.0, 0.6])    # axis-aligned spread
R = np.array([[np.cos(0.6), -np.sin(0.6)], [np.sin(0.6), np.cos(0.6)]])
X = Z @ R.T
X = X - X.mean(axis=0)
C = X.T @ X / X.shape[0]
cw, cv = np.linalg.eigh(C); idx = np.argsort(cw)[::-1]; cw = cw[idx]; cv = cv[:, idx]
out["cov"] = C.tolist(); out["cov_eigs"] = cw.tolist(); out["cov_v1"] = cv[:, 0].tolist()
angles = np.linspace(0, np.pi, 91)
var_curve = []
for th in angles:
    v = np.array([np.cos(th), np.sin(th)])
    var_curve.append(float(np.var(X @ v)))
out["pca_angles"] = np.round(angles, 6).tolist()
out["pca_var"] = np.round(var_curve, 6).tolist()
out["pca_var_max"] = float(max(var_curve))
out["pca_angle_at_max"] = float(angles[int(np.argmax(var_curve))])
out["pca_theta_v1"] = float(np.arctan2(cv[1, 0], cv[0, 0]) % np.pi)
out["pca_lambda_max"] = float(cw[0])

# 6. Level sets: f = 2 x^2 - 3 y^2 (saddle) and f = 5x^2 - 4xy + 2y^2 (bowl) sample points.
ts = np.linspace(0, 2 * np.pi, 121)
out["bowl_levels"] = [1.0, 2.0, 4.0]
out["saddle_levels"] = [1.0, -1.0, 2.0]

# 7. Cholesky check: does np.linalg.cholesky reject a non-symmetric input?
B = np.array([[1.0, 10.0], [0.0, 1.0]])   # lower triangle is the identity
try:
    L = np.linalg.cholesky(B)
    out["chol_nonsym_ok"] = True
    out["chol_nonsym_L"] = L.tolist()
except np.linalg.LinAlgError as e:
    out["chol_nonsym_ok"] = False
    out["chol_nonsym_err"] = str(e)
out["xBx_counter"] = float(np.array([1.0, -1.0]) @ B @ np.array([1.0, -1.0]))
out["B_eigs_sym"] = eigs(B).tolist()

out["numpy_version"] = np.__version__
with open(os.path.join(HERE, "20.5_data.json"), "w") as f:
    json.dump(out, f, indent=2)
for k in ["xAx_raw", "xAx_sym", "xKx", "RQ_x", "eigs_desc", "v1", "v1_abs", "eigs_saddle",
          "RQ_saddle_e1", "RQ_saddle_e2", "rq_min_sampled", "rq_max_sampled", "rq_mean_sampled",
          "pca_angle_at_max", "pca_theta_v1", "pca_var_max", "pca_lambda_max", "cov_eigs",
          "chol_nonsym_ok", "chol_nonsym_L", "xBx_counter", "B_eigs_sym", "numpy_version"]:
    print(k, "=", out[k])
