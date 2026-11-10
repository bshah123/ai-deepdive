"""Data for the 25.1 'why scale' diagram: average attention weights (sorted, largest first)
over 2000 random trials, 16 keys, d_k = 512, components ~ N(0, 1). Prints JSON."""
import json
import numpy as np

rng = np.random.default_rng(0)
trials, n_keys, d_k = 2000, 16, 512
q = rng.standard_normal((trials, 1, d_k))
K = rng.standard_normal((trials, n_keys, d_k))
s = (q * K).sum(-1)

def softmax(x):
    z = x - x.max(-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(-1, keepdims=True)

out = {}
for name, scores in (("unscaled", s), ("scaled", s / np.sqrt(d_k))):
    w = np.sort(softmax(scores), axis=-1)[:, ::-1].mean(0)
    out[name] = [round(float(x), 3) for x in w]
print(json.dumps(out))
