# Experiment for lesson 20.3 (Jacobians, Hessians, Taylor series).
# Writes 20.3_data.json next to this file; every number in the 20.3 diagrams comes from it.
# Run: <python> scripts/diagrams/lessons/20.3_experiment.py
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
np.set_printoptions(precision=6, suppress=True)
out = {}

def central_grad(f, x, h):
    x = np.asarray(x, float); g = np.zeros_like(x)
    for i in range(x.size):
        e = np.zeros_like(x); e[i] = h
        g[i] = (f(x + e) - f(x - e)) / (2 * h)
    return g

def central_jac(F, x, h):
    x = np.asarray(x, float); J = np.zeros((np.size(F(x)), x.size))
    for i in range(x.size):
        e = np.zeros_like(x); e[i] = h
        J[:, i] = (F(x + e) - F(x - e)) / (2 * h)
    return J

def central_hess(f, x, h):
    x = np.asarray(x, float); n = x.size; H = np.zeros((n, n)); E = np.eye(n) * h
    for i in range(n):
        for j in range(n):
            if i == j:
                H[i, i] = (f(x + E[i]) - 2 * f(x) + f(x - E[i])) / h**2
            else:
                H[i, j] = (f(x + E[i] + E[j]) - f(x + E[i] - E[j])
                           - f(x - E[i] + E[j]) + f(x - E[i] - E[j])) / (4 * h * h)
    return H

sig = lambda z: 1.0 / (1.0 + np.exp(-z))

# ---- 1. gradient of q(w) = w0^2 + w1^2 at (1, 2)
q = lambda w: w[0]**2 + w[1]**2
out["grad_q_at_1_2"] = central_grad(q, [1.0, 2.0], 1e-5).tolist()          # analytic (2, 4)

# ---- 2. Jacobian of F(x) = (x0^2 + x1^2, x0*x1) at (1, 2)
F = lambda x: np.array([x[0]**2 + x[1]**2, x[0] * x[1]])
J_num = central_jac(F, [1.0, 2.0], 1e-5)
J_an = np.array([[2.0, 4.0], [2.0, 1.0]])
out["jacobian_F_at_1_2"] = J_num.tolist()
out["jacobian_max_err"] = float(np.abs(J_num - J_an).max())

# ---- 3. chain rule: h(y) = y0 + 2 y1 composed with F; grad(h o F) = J^T grad h
hy = lambda y: y[0] + 2 * y[1]
comp = lambda x: hy(F(x))
out["chain_grad_numeric"] = central_grad(comp, [1.0, 2.0], 1e-5).tolist()  # analytic (6, 6)
out["chain_JT_gradh"] = (J_an.T @ np.array([1.0, 2.0])).tolist()          # (6, 6)

# ---- 4. logistic loss for one sample, a = (1, 2): l(w) = log(1 + exp(a.w)) = logaddexp(0, a.w)
a = np.array([1.0, 2.0])
ell = lambda w: np.logaddexp(0.0, a @ w)
w0 = np.array([0.0, 0.0]); z0 = a @ w0
g_an = sig(z0) * a                                    # gradient sigma(z) a
H_an = sig(z0) * (1 - sig(z0)) * np.outer(a, a)       # Hessian sigma(1-sigma) a a^T
out["logistic_grad_at_0"] = g_an.tolist()
out["logistic_hess_at_0"] = H_an.tolist()
H_num = central_hess(ell, w0, 1e-4)
out["logistic_hess_num"] = H_num.tolist()
out["logistic_hess_max_err"] = float(np.abs(H_num - H_an).max())
out["logistic_grad_num_err"] = float(np.abs(central_grad(ell, w0, 1e-5) - g_an).max())
out["logistic_eigs"] = np.linalg.eigvalsh(H_an).tolist()             # (0, 1.25)

# ---- 5. Hessian sign cards: quadratics with known Hessians
cards = {
    "x^2 + y^2":  (lambda w: w[0]**2 + w[1]**2,  np.diag([2.0, 2.0])),
    "x^2 - y^2":  (lambda w: w[0]**2 - w[1]**2,  np.diag([2.0, -2.0])),
    "-x^2 - y^2": (lambda w: -w[0]**2 - w[1]**2, np.diag([-2.0, -2.0])),
}
out["cards"] = {}
for name, (f, Han) in cards.items():
    Hn = central_hess(f, [0.0, 0.0], 1e-3)
    out["cards"][name] = {"hess": Hn.tolist(), "eigs": np.linalg.eigvalsh(Han).tolist(),
                          "max_err": float(np.abs(Hn - Han).max())}

# ---- 6. Taylor expansion of the logistic loss along u = (1, 0) from w0 = 0
phi = lambda t: np.logaddexp(0.0, t)
phi0 = np.log(2.0); phi1 = sig(0.0); phi2 = sig(0.0) * (1 - sig(0.0))   # 0.5 and 0.25
T1 = lambda t: phi0 + phi1 * t
T2 = lambda t: phi0 + phi1 * t + 0.5 * phi2 * t**2
out["taylor_coeffs"] = [phi0, phi1, 0.5 * phi2]
out["taylor_points"] = {}
for t in [1.0, 2.0]:
    out["taylor_points"][str(t)] = {"true": float(phi(t)), "first": float(T1(t)),
                                    "second": float(T2(t)), "err2": float(phi(t) - T2(t))}
ts = np.round(np.arange(-2.5, 2.5001, 0.25), 2)
out["curve_t"] = ts.tolist()
out["curve_true"] = [float(phi(t)) for t in ts]
out["curve_first"] = [float(T1(t)) for t in ts]
out["curve_second"] = [float(T2(t)) for t in ts]

# ---- 7. numerical-derivative error versus step size, derivative of softplus at x = 1
f1 = lambda x: np.logaddexp(0.0, x)
x1 = 1.0; exact = float(sig(x1))
sweep = []
for k in range(1, 15):
    h = 10.0 ** (-k)
    fwd = (f1(x1 + h) - f1(x1)) / h
    cen = (f1(x1 + h) - f1(x1 - h)) / (2 * h)
    sweep.append({"h": h, "forward_err": float(abs(fwd - exact)), "central_err": float(abs(cen - exact))})
out["exact_dsoftplus_at_1"] = exact
out["h_sweep"] = sweep

with open(os.path.join(HERE, "20.3_data.json"), "w") as fh:
    json.dump(out, fh, indent=2)

print(json.dumps({k: v for k, v in out.items() if k not in ("curve_t", "curve_true", "curve_first", "curve_second", "h_sweep")}, indent=1))
print("h_sweep:")
for r in sweep:
    print(f"  h={r['h']:.0e}  forward={r['forward_err']:.3e}  central={r['central_err']:.3e}")
