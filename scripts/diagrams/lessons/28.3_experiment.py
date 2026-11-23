"""Experiment for lesson 28.3 (SFT, RLHF with PPO, DPO). NumPy only.

Toy setting: one prompt, K = 5 candidate responses, a tabular softmax policy.
Every number used in the lesson and its diagrams is printed here and dumped to
28.3_data.json. Run: python3 scripts/diagrams/lessons/28.3_experiment.py <out.json>
"""
import json, sys
import numpy as np

K = 5
PI_REF = np.array([0.40, 0.25, 0.15, 0.12, 0.08])   # reference (SFT) policy
R_TRUE = np.array([0.20, 0.90, 1.50, -1.00, 0.00])  # hidden reward of each response
BETA = 0.5                                           # KL strength

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))

def log_softmax(z):
    z = z - z.max()
    return z - np.log(np.exp(z).sum())

def softmax(z):
    return np.exp(log_softmax(z))

def objective(pi, r=R_TRUE, beta=BETA, ref=PI_REF):
    """J(pi) = E_pi[r] - beta * KL(pi || ref)."""
    return float(pi @ r - beta * np.sum(pi * (np.log(pi) - np.log(ref))))

def kl(p, q):
    return float(np.sum(p * (np.log(p) - np.log(q))))

def sample_pairs(rng, n, r=R_TRUE):
    """Random response pairs labelled by Bradley-Terry with the hidden reward."""
    i = rng.integers(0, K, n)
    j = (i + rng.integers(1, K, n)) % K           # j != i, uniform
    p_i = sigmoid(r[i] - r[j])
    i_wins = rng.random(n) < p_i
    w = np.where(i_wins, i, j)
    l = np.where(i_wins, j, i)
    return w, l

def fit_reward_model(w, l, steps=3000, lr=0.5):
    """Tabular Bradley-Terry reward model: minimise -mean log sigmoid(r[w] - r[l])."""
    r = np.zeros(K)
    n = len(w)
    for _ in range(steps):
        g_pair = 1.0 - sigmoid(r[w] - r[l])        # = -d/dd log sigmoid(d)
        grad = np.zeros(K)
        np.add.at(grad, w, -g_pair)
        np.add.at(grad, l, g_pair)
        r -= lr * grad / n
    return r - r.mean()                            # reward is identified only up to a constant

def fit_dpo(w, l, beta=BETA, steps=3000, lr=2.0, ref=PI_REF):
    """DPO on tabular logits theta, initialised at the reference policy.
    Loss: -mean log sigmoid(beta * [(log pi(w) - log ref(w)) - (log pi(l) - log ref(l))]).
    Gradient wrt theta for one pair: -beta * sigmoid(-m) * (e_w - e_l); normaliser cancels."""
    theta = np.log(ref).copy()
    n = len(w)
    for _ in range(steps):
        lp = log_softmax(theta)
        m = beta * ((lp[w] - np.log(ref[w])) - (lp[l] - np.log(ref[l])))
        coef = -beta * sigmoid(-m)                 # per-pair weight
        grad = np.zeros(K)
        np.add.at(grad, w, coef)
        np.add.at(grad, l, -coef)
        theta -= lr * grad / n
    return softmax(theta)

def dpo_loss(pi, w, l, beta=BETA, ref=PI_REF):
    m = beta * ((np.log(pi[w]) - np.log(ref[w])) - (np.log(pi[l]) - np.log(ref[l])))
    return float(np.mean(np.logaddexp(0.0, -m)))  # -log sigmoid(m), stable form

def ascend_exact(steps=4000, lr=2.0):
    """Gradient ascent on the exact RLHF objective, parametrised by softmax logits."""
    theta = np.log(PI_REF).copy()
    for _ in range(steps):
        pi = softmax(theta)
        g = R_TRUE - BETA * (np.log(pi) - np.log(PI_REF))
        grad = pi * (g - pi @ g)                    # softmax chain rule
        theta += lr * grad
    return softmax(theta)

out = {}

# 1. Closed-form optimum of the RLHF objective
pi_star = softmax(np.log(PI_REF) + R_TRUE / BETA)
pi_exact = ascend_exact()
out["pi_ref"] = PI_REF.tolist()
out["r_true"] = R_TRUE.tolist()
out["pi_star"] = pi_star.tolist()
out["max_abs_gap_ascent_vs_closed_form"] = float(np.max(np.abs(pi_exact - pi_star)))
out["J_ref"] = objective(PI_REF)
out["J_star"] = objective(pi_star)
out["expected_reward_ref"] = float(PI_REF @ R_TRUE)
out["expected_reward_star"] = float(pi_star @ R_TRUE)
out["kl_star_ref"] = kl(pi_star, PI_REF)
# random search: no sampled policy should beat pi_star
rng = np.random.default_rng(1)
cand = rng.dirichlet(np.ones(K), 200000)
J_cand = cand @ R_TRUE - BETA * np.sum(cand * (np.log(cand) - np.log(PI_REF)), axis=1)
out["best_random_J"] = float(J_cand.max())

# 2. Bradley-Terry: probability and loss for a reward gap
out["bt_examples"] = [{"gap": g, "p": float(sigmoid(g)), "loss": float(np.logaddexp(0, -g))}
                      for g in [0.0, 0.5, 1.0, 2.0]]

# 3. Main run: 4000 preference pairs
rng = np.random.default_rng(7)
w, l = sample_pairs(rng, 4000)
out["n_pairs"] = 4000
out["frac_chosen_is_true_better"] = float(np.mean(R_TRUE[w] > R_TRUE[l]))
r_hat = fit_reward_model(w, l)
out["r_hat"] = r_hat.tolist()
out["r_hat_minus_r_true_centred_max_abs"] = float(np.max(np.abs(r_hat - (R_TRUE - R_TRUE.mean()))))
pi_rm = softmax(np.log(PI_REF) + r_hat / BETA)     # RLHF optimum with the learned reward
pi_dpo = fit_dpo(w, l)
out["pi_rm"] = pi_rm.tolist()
out["pi_dpo"] = pi_dpo.tolist()
out["dpo_loss_init"] = dpo_loss(PI_REF, w, l)
out["dpo_loss_final"] = dpo_loss(pi_dpo, w, l)
out["max_abs_gap_dpo_vs_rm_optimum"] = float(np.max(np.abs(pi_dpo - pi_rm)))
out["kl_dpo_ref"] = kl(pi_dpo, PI_REF)
out["kl_dpo_star"] = kl(pi_dpo, pi_star)
out["expected_reward_dpo_true"] = float(pi_dpo @ R_TRUE)
out["J_dpo_true"] = objective(pi_dpo)
out["prob_best_dpo"] = float(pi_dpo[2])
out["prob_best_star"] = float(pi_star[2])

# DPO margin weights: gradient weight sigmoid(-m) on pairs the model already orders
m_all = BETA * ((np.log(pi_dpo[w]) - np.log(PI_REF[w])) - (np.log(pi_dpo[l]) - np.log(PI_REF[l])))
out["dpo_mean_weight_sigmoid_neg_margin"] = float(np.mean(sigmoid(-m_all)))
out["dpo_frac_pairs_margin_gt_2"] = float(np.mean(m_all > 2.0))

# 4. Data-size sweep: KL(pi_dpo || pi_star) averaged over 20 seeds
sweep = []
for n in [100, 400, 1600, 6400]:
    vals = []
    for s in range(20):
        rr = np.random.default_rng(1000 + s)
        ww, ll = sample_pairs(rr, n)
        vals.append(kl(fit_dpo(ww, ll), pi_star))
    sweep.append({"n_pairs": n, "mean_kl_to_star": float(np.mean(vals)), "min": float(np.min(vals)), "max": float(np.max(vals))})
out["sweep"] = sweep

# 5. PPO clipped surrogate: L = min(rho*A, clip(rho, 1-eps, 1+eps)*A), eps = 0.2
EPS = 0.2
rhos = [0.5, 0.8, 1.0, 1.2, 1.5]
clip_rows = []
for A in [1.0, -1.0]:
    for rho in rhos:
        unclipped = rho * A
        clipped = np.clip(rho, 1 - EPS, 1 + EPS) * A
        clip_rows.append({"A": A, "rho": rho, "unclipped": unclipped, "clipped": clipped,
                          "L": float(min(unclipped, clipped))})
out["ppo_clip"] = clip_rows
grid = np.round(np.arange(0.4, 1.81, 0.05), 2)
out["ppo_clip_curve"] = {
    "rho": grid.tolist(),
    "L_pos": np.minimum(grid * 1.0, np.clip(grid, 1 - EPS, 1 + EPS) * 1.0).tolist(),
    "L_neg": np.minimum(grid * -1.0, np.clip(grid, 1 - EPS, 1 + EPS) * -1.0).tolist(),
}

# 6. SFT: cross-entropy of one target token
out["sft_examples"] = [{"p_target": p, "nll_nats": float(-np.log(p)), "perplexity": float(1 / p)} for p in [0.9, 0.5, 0.1]]

json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "28.3_data.json", "w"), indent=1)

# ---- printed summary
np.set_printoptions(precision=4, suppress=True)
print("pi_ref      ", PI_REF)
print("r_true      ", R_TRUE)
print("pi_star     ", pi_star.round(4))
print("ascent vs closed-form max gap:", f"{out['max_abs_gap_ascent_vs_closed_form']:.2e}")
print(f"J(ref)={out['J_ref']:.4f}  J(star)={out['J_star']:.4f}  best random J={out['best_random_J']:.4f}")
print(f"E[r] ref={out['expected_reward_ref']:.4f}  star={out['expected_reward_star']:.4f}  KL(star||ref)={out['kl_star_ref']:.4f}")
print("BT:", [(b['gap'], round(b['p'], 4), round(b['loss'], 4)) for b in out['bt_examples']])
print("pairs:", out["n_pairs"], "frac true-better chosen:", round(out["frac_chosen_is_true_better"], 4))
print("r_hat (centred):", np.round(r_hat, 3), " max |err| vs true:", round(out["r_hat_minus_r_true_centred_max_abs"], 3))
print("pi_rm       ", pi_rm.round(4))
print("pi_dpo      ", pi_dpo.round(4))
print(f"DPO loss init={out['dpo_loss_init']:.4f} final={out['dpo_loss_final']:.4f}")
print(f"max |pi_dpo - pi_rm| = {out['max_abs_gap_dpo_vs_rm_optimum']:.2e}")
print(f"KL(dpo||ref)={out['kl_dpo_ref']:.4f}  KL(dpo||star)={out['kl_dpo_star']:.4f}  E_dpo[r]={out['expected_reward_dpo_true']:.4f}")
print(f"mean sigmoid(-margin) weight={out['dpo_mean_weight_sigmoid_neg_margin']:.4f}  frac margin>2={out['dpo_frac_pairs_margin_gt_2']:.4f}")
for s in sweep:
    print(f"N={s['n_pairs']:5d}  mean KL(dpo||star)={s['mean_kl_to_star']:.5f}  [{s['min']:.5f}, {s['max']:.5f}]")
for row in clip_rows:
    print(f"A={row['A']:+.0f} rho={row['rho']:.1f} unclipped={row['unclipped']:+.2f} clipped={row['clipped']:+.2f} L={row['L']:+.2f}")
for e in out["sft_examples"]:
    print(f"p={e['p_target']:.2f} NLL={e['nll_nats']:.4f} nats  perplexity={e['perplexity']:.2f}")
