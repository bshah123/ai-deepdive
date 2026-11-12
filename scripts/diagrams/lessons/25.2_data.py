import numpy as np, torch
np.set_printoptions(precision=3, suppress=True)
def softmax(x, axis=-1):
    z = x - x.max(axis=axis, keepdims=True); e = np.exp(z); return e / e.sum(axis=axis, keepdims=True)
q = np.array([2., 0, 0, 2]); K = np.array([[2., 0, 0, 0], [0, 0, 0, 2], [1, 1, 1, 1]]); V = np.array([[10., 0, 10, 0], [0, 10, 0, 10], [5, 5, 5, 5]])
s1 = K @ q; w1 = softmax(s1 / 2); print("single", s1, s1/2, w1, w1 @ V)
outs = []
for name, sl in (("A", slice(0, 2)), ("B", slice(2, 4))):
    s = K[:, sl] @ q[sl]; w = softmax(s / np.sqrt(2)); o = w @ V[:, sl]; outs.append(o)
    print(name, s, s / np.sqrt(2), w, o, np.exp(s/np.sqrt(2)), np.exp(s/np.sqrt(2)).sum())
print("concat", np.concatenate(outs))

def gqa(X, Wq, Wk, Wv, Wo, h, h_kv):
    n, d = X.shape; dh = d // h; g = h // h_kv
    Q = (X @ Wq).reshape(n, h, dh).transpose(1, 0, 2)
    Kc = (X @ Wk).reshape(n, h_kv, dh).transpose(1, 0, 2)
    Vc = (X @ Wv).reshape(n, h_kv, dh).transpose(1, 0, 2)
    Kx = np.repeat(Kc, g, axis=0); Vx = np.repeat(Vc, g, axis=0)
    A = softmax(Q @ Kx.transpose(0, 2, 1) / np.sqrt(dh))
    O = (A @ Vx).transpose(1, 0, 2).reshape(n, d)
    return O @ Wo, Kc, A
rng = np.random.default_rng(0); n, d, h = 5, 16, 8; dh = d // h
X = rng.normal(size=(n, d)); Wq = rng.normal(size=(d, d)) / 4; Wo = rng.normal(size=(d, d)) / 4
for h_kv in (8, 2, 1):
    Wk = rng.normal(size=(d, h_kv * dh)) / 4; Wv = rng.normal(size=(d, h_kv * dh)) / 4
    out, Kc, A = gqa(X, Wq, Wk, Wv, Wo, h, h_kv)
    g = h // h_kv
    # tied MHA: duplicate each kv head's columns g times
    Wk_t = np.repeat(Wk.reshape(d, h_kv, dh), g, axis=1).reshape(d, d); Wv_t = np.repeat(Wv.reshape(d, h_kv, dh), g, axis=1).reshape(d, d)
    out2, Kc2, _ = gqa(X, Wq, Wk_t, Wv_t, Wo, h, h)
    params = Wq.size + Wk.size + Wv.size + Wo.size
    print(h_kv, out.shape, Kc.shape, 2 * Kc.size, params, np.abs(out - out2).max(), A.shape, A.sum(-1).min())
# cache
L, dm, hq, hd = 32, 4096, 32, 128
for hk in (32, 16, 8, 4, 2, 1):
    per_tok = 2 * L * hk * hd * 2
    print(hk, per_tok, per_tok / 1024, per_tok * 32768 / 2**30, per_tok*4096/2**30, "params/layer", 2 * dm * dm + 2 * dm * hk * hd)
print("quiz", 2*8*4096*32*32*128*2/2**30, 2*8*4096*32*8*128*2/2**30)
print(torch.__version__, np.__version__)
