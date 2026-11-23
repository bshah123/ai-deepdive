"""Experiment for lesson 28.1 (Chinchilla scaling laws).

Run: <venv>/bin/python scripts/diagrams/lessons/28.1_data.py
Writes scripts/diagrams/lessons/28.1_data.json (read by 28.1.mjs) and prints every number used in the lesson.

Constants: Hoffmann et al. (2022), Eq. 10 and Table 2 (arXiv:2203.15556), fitted with approach 3.
Compute: C = 6 N D (Kaplan et al. 2020, quoted in Hoffmann et al. Appendix F).
"""
import json
import math
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares

E, A, B, ALPHA, BETA = 1.69, 406.4, 410.7, 0.34, 0.28   # Eq. 10
K_KAPLAN_N, K_KAPLAN_D = 0.73, 0.27                       # Kaplan et al. (2020) exponents, as quoted in Table 2


def loss(N, D):
    """Predicted final loss (nats per token) from the parametric fit, Eq. 2 / Eq. 10."""
    return E + A / N**ALPHA + B / D**BETA


def compute(N, D):
    return 6.0 * N * D


# ---- closed-form compute-optimal frontier (Hoffmann Eq. 4, approach 3)
a_exp = BETA / (ALPHA + BETA)
b_exp = ALPHA / (ALPHA + BETA)
G = (ALPHA * A / (BETA * B)) ** (1.0 / (ALPHA + BETA))


def n_opt(C):
    return G * (C / 6.0) ** a_exp


def d_opt(C):
    return (C / 6.0) ** b_exp / G


out = {}
print("== constants")
print(f"E={E} A={A} B={B} alpha={ALPHA} beta={BETA}")
print(f"exponent a=beta/(alpha+beta)={a_exp:.4f}  b=alpha/(alpha+beta)={b_exp:.4f}  G={G:.4f}")
out["a"], out["b"], out["G"] = a_exp, b_exp, G

print("\n== compute budgets C = 6 N D")
runs = {
    "Gopher": (280e9, 300e9),
    "Chinchilla": (70e9, 1.4e12),
}
for name, (N, D) in runs.items():
    C = compute(N, D)
    print(f"{name:11s} N={N:.3e} D={D:.3e} C={C:.3e} FLOPs  loss_pred={loss(N, D):.4f}")
    out[name] = {"N": N, "D": D, "C": C, "loss": loss(N, D)}
ratio_C = compute(70e9, 1.4e12) / compute(280e9, 300e9)
print(f"Chinchilla / Gopher compute ratio = {ratio_C:.3f}")
out["compute_ratio"] = ratio_C
print(f"Chinchilla tokens per parameter = {1.4e12 / 70e9:.1f}; Gopher = {300e9 / 280e9:.2f}")

print("\n== isoFLOP check at C = 1e21 (grid search over N, D = C / (6N))")
C0 = 1e21
Ns = np.logspace(7, 12, 20001)
Ls = loss(Ns, C0 / (6 * Ns))
i = int(np.argmin(Ls))
print(f"grid optimum N={Ns[i]:.4e}  D={C0 / (6 * Ns[i]):.4e}  loss={Ls[i]:.4f}")
print(f"closed form N_opt={n_opt(C0):.4e}  D_opt={d_opt(C0):.4e}")
out["iso"] = {"C": C0, "grid_N": Ns[i], "closed_N": n_opt(C0)}

print("\n== frontier across budgets (closed form, checked by grid for the first budget)")
budgets = [1e20, 1e21, 1e22, 1e23, 1e24]
rows = []
for C in budgets:
    N, D = n_opt(C), d_opt(C)
    rows.append({"C": C, "N": N, "D": D, "tok_per_param": D / N})
    print(f"C={C:.0e}  N_opt={N:.3e}  D_opt={D:.3e}  tokens/param={D / N:6.1f}  loss={loss(N, D):.4f}")
out["frontier"] = rows

print("\n== check against paper's Table A3 (approach 3) and Figure 4 (Gopher budget -> ~40B)")
C_gopher_paper = 5.76e23
print(f"N_opt(5.76e23)={n_opt(C_gopher_paper):.3e}  paper Fig. 4 says ~40B for the Gopher budget")
paper_A3 = [(1e9, 1.62e20, 27.1e9), (67e9, 1.71e24, 4.1e12), (280e9, 3.52e25, 20.1e12)]
for N_p, C_p, D_p in paper_A3:
    print(f"paper row N={N_p:.2e} C={C_p:.2e} D={D_p:.2e}: my N_opt(C)={n_opt(C_p):.3e} (ratio {n_opt(C_p) / N_p:.2f}); C/(6N)={C_p / (6 * N_p):.3e}")
out["paper_A3_ratio"] = [n_opt(C_p) / N_p for N_p, C_p, _ in paper_A3]
# sensitivity to the printed 2-decimal exponents
sens = []
for al_ in (0.335, 0.34, 0.345):
    for be_ in (0.275, 0.28, 0.285):
        a_ = be_ / (al_ + be_)
        G_ = (al_ * A / (be_ * B)) ** (1 / (al_ + be_))
        sens.append((al_, be_, a_, G_ * (C_gopher_paper / 6) ** a_))
lo = min(s_[3] for s_ in sens); hi = max(s_[3] for s_ in sens)
print(f"rounding sensitivity over alpha in [0.335,0.345], beta in [0.275,0.285]: a in [{min(s_[2] for s_ in sens):.3f}, {max(s_[2] for s_ in sens):.3f}], N_opt(5.76e23) in [{lo:.3e}, {hi:.3e}]")
out["sens_N_gopher"] = [lo, hi]

# sensitivity of the Gopher-minus-Chinchilla loss gap to the rounding of alpha and beta
gaps = []
for al_ in (0.335, 0.34, 0.345):
    for be_ in (0.275, 0.28, 0.285):
        lg = E + A / 280e9**al_ + B / 300e9**be_
        lc = E + A / 70e9**al_ + B / 1.4e12**be_
        gaps.append(lg - lc)
print(f"Gopher minus Chinchilla predicted loss gap: nominal {loss(280e9, 300e9) - loss(70e9, 1.4e12):.4f}; over the rounding box [{min(gaps):.4f}, {max(gaps):.4f}]")
out["gap_range"] = [min(gaps), max(gaps)]

print("\n== tokens per parameter on the approach-3 frontier, at C = 1e20..1e24 (above) vs paper Table 1 (approach 1 rule of thumb)")
print("paper Table 3 (approach 1): 1B -> 20.2B tokens (20.2 tokens/param); 67B -> 1.5T (22.4)")

print("\n== Kaplan (2020) exponent 0.73 vs Chinchilla approach 3 exponent 0.46, both through the Table 3 point 67B at 5.76e23 FLOPs")
C_anchor, N_anchor = 5.76e23, 67e9
rows2 = []
for C in [1e21, 1e23, 1e25]:
    kN = N_anchor * (C / C_anchor) ** 0.73
    cN = N_anchor * (C / C_anchor) ** 0.46
    kD, cD = C / (6 * kN), C / (6 * cN)
    print(f"C={C:.0e}  Kaplan N={kN:.3e} tok/param={kD / kN:8.1f} | Chinchilla N={cN:.3e} tok/param={cD / cN:6.1f}")
    rows2.append({"C": C, "kaplan_N": kN, "chin_N": cN, "kaplan_tpp": kD / kN, "chin_tpp": cD / cN})
out["kaplan_vs_chin"] = rows2

print("\n== recovery test: fit Eq. 10 to noisy synthetic runs with known constants (seeded)")
rng = np.random.default_rng(28)
Nr = np.repeat(np.logspace(7.5, 10, 8), 6)
Dr = np.tile(np.logspace(9.5, 11.5, 6), 8)
y = np.log(loss(Nr, Dr)) + rng.normal(0, 0.002, size=Nr.size)


def resid(p):
    e, lA, lB, al, be = p
    pred = np.log(np.exp(e) + np.exp(lA) / Nr**al + np.exp(lB) / Dr**be)
    return pred - y


p0 = [math.log(1.0), math.log(100.0), math.log(100.0), 0.3, 0.3]
sol = least_squares(resid, p0, loss="huber", f_scale=1e-3)
e, lA, lB, al, be = sol.x
print(f"n_runs={Nr.size} recovered E={math.exp(e):.3f} A={math.exp(lA):.1f} B={math.exp(lB):.1f} alpha={al:.3f} beta={be:.3f}")
print(f"planted: E={E} A={A} B={B} alpha={ALPHA} beta={BETA}  (synthetic test, not evidence)")
rec_a = be / (al + be)
print(f"recovered a={rec_a:.3f} (paper approach 3: 0.46)")
out["recovery"] = {"E": math.exp(e), "A": math.exp(lA), "B": math.exp(lB), "alpha": al, "beta": be, "a": rec_a}

out["consts"] = {"E": E, "A": A, "B": B, "alpha": ALPHA, "beta": BETA}
path = Path(__file__).with_name("28.1_data.json")
path.write_text(json.dumps(out, indent=2))
print("\nwrote", path)
