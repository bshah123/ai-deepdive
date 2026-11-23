import json
from pathlib import Path
import numpy as np

P, T, F, N, SEED = 0.4, 0.9, 0.2, 200_000, 4831

def analytic(p, t, f, K):
    a = p * t + (1 - p) * f
    acc_any = 1 - (1 - a) ** K
    out_correct = acc_any * p * t / a + (1 - a) ** (K - 1) * p * (1 - t)
    acc_wrong = (1 - p) * f * acc_any / a
    return dict(a=a, accept_any=acc_any, out_correct=out_correct, accepted_wrong=acc_wrong)

def simulate(p, t, f, K, n=N, seed=SEED):
    rng = np.random.default_rng(seed)
    done = np.zeros(n, bool); out_correct = np.zeros(n, bool); last = np.zeros(n, bool)
    for _ in range(K):
        correct = rng.random(n) < p
        accept = np.where(correct, rng.random(n) < t, rng.random(n) < f)
        new = accept & ~done
        out_correct[new] = correct[new]
        done |= accept
        last = correct
    out_correct[~done] = last[~done]
    return out_correct.mean(), (done & ~out_correct).mean()

def simulate_reflexion(p0, p1, r, t, f, K, n=N, seed=SEED):
    rng = np.random.default_rng(seed)
    done = np.zeros(n, bool); out_correct = np.zeros(n, bool); last = np.zeros(n, bool)
    useful = np.zeros(n, bool); prof = []
    for _ in range(K):
        p_cur = np.where(useful, p1, p0)
        correct = rng.random(n) < p_cur
        prof.append(correct.mean())
        accept = np.where(correct, rng.random(n) < t, rng.random(n) < f)
        new = accept & ~done
        out_correct[new] = correct[new]
        rejected = ~accept & ~done
        useful |= rejected & (rng.random(n) < r)
        done |= accept
        last = correct
    out_correct[~done] = last[~done]
    return out_correct.mean(), (done & ~out_correct).mean(), prof

if __name__ == "__main__":
    out = {"worked": {"p_t": P * T, "one_minus_p_f": (1 - P) * F, "a": P * T + (1 - P) * F,
                      "precision": P * T / (P * T + (1 - P) * F)}}
    out["grid"] = {}
    for f in [0.0, 0.2, 0.4]:
        rows = []
        for K in range(1, 6):
            an = analytic(P, T, f, K); mc_c, mc_w = simulate(P, T, f, K)
            rows.append(dict(K=K, an_c=an["out_correct"], mc_c=mc_c, an_w=an["accepted_wrong"], mc_w=mc_w, acc=an["accept_any"]))
        out["grid"][str(f)] = rows
    out["reflexion"] = []
    for r in [0.0, 0.5, 1.0]:
        c, w, prof = simulate_reflexion(P, 0.7, r, T, F, 3)
        out["reflexion"].append(dict(r=r, out_correct=c, accepted_wrong=w, attempt=prof))
    out["plain_k3_analytic"] = analytic(P, T, F, 3)
    print(json.dumps(out, indent=1))
    (Path(__file__).resolve().parent / "48.3_data.json").write_text(json.dumps(out, indent=1))
