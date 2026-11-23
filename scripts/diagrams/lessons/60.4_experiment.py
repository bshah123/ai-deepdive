"""Experiment for lesson 60.4 (DiT and latent video). NumPy only. Writes 60.4_data.json next to this file."""
import json, os
import numpy as np

np.set_printoptions(precision=4, suppress=True)
out = {}
rng = np.random.default_rng(0)

# 1. Worked example: forward noising of one scalar. x_t = sqrt(abar) x0 + sqrt(1-abar) eps
x0, abar, eps = 1.0, 0.25, 0.5
xt = np.sqrt(abar) * x0 + np.sqrt(1 - abar) * eps
out["worked"] = {"x0": x0, "abar": abar, "eps": eps, "sqrt_abar": float(np.sqrt(abar)),
                 "sqrt_1m_abar": float(np.sqrt(1 - abar)), "xt": float(xt)}

# 2. DDPM linear schedule, T = 1000 (Ho et al. 2020), beta from 1e-4 to 0.02
T = 1000
betas = np.linspace(1e-4, 0.02, T)
abar_all = np.cumprod(1 - betas)
ts = [0, 250, 500, 750, 999]
out["schedule"] = {str(t): {"abar": float(abar_all[t]), "signal": float(np.sqrt(abar_all[t])),
                            "noise": float(np.sqrt(1 - abar_all[t]))} for t in ts}
out["schedule_abar_T"] = float(abar_all[-1])

# 3. Latent compression numbers
pix = 512 * 512 * 3
lat = 64 * 64 * 4
out["compress_image"] = {"pixel_values": pix, "latent_values": lat, "ratio": pix / lat}
# Illustrative video clip: 16 frames of 256x256 RGB, latent assumed 8x spatial, 4x temporal, 8 channels
vpix = 16 * 256 * 256 * 3
vlat = (16 // 4) * (256 // 8) * (256 // 8) * 8
out["compress_video_illustrative"] = {"pixel_values": vpix, "latent_values": vlat, "ratio": vpix / vlat}

# 4. Patchify: tokens T = (I/p)^2 for images; spacetime patches (pt, ph, pw) for video latents
def tokens_image(I, p):
    return (I // p) ** 2
out["tokens_image"] = {"latent64_p2": tokens_image(64, 2), "latent64_p4": tokens_image(64, 4),
                       "latent32_p2": tokens_image(32, 2), "token_dim_p2_C4": 2 * 2 * 4}

def tokens_video(Tl, H, W, pt, ph, pw):
    return (Tl // pt) * (H // ph) * (W // pw)
vid = {
    "T4_H32_W32_p1x2x2": tokens_video(4, 32, 32, 1, 2, 2),
    "T4_H32_W32_p2x2x2": tokens_video(4, 32, 32, 2, 2, 2),
    "T8_H32_W32_p2x2x2": tokens_video(8, 32, 32, 2, 2, 2),
    "T16_H32_W32_p2x2x2": tokens_video(16, 32, 32, 2, 2, 2),
}
out["tokens_video"] = vid

# 5. Attention pair count (quadratic cost in tokens): pairs = T^2 per head per layer
cfg = {"image_latent64_p4": 256, "image_latent64_p2": 1024,
       "video_p1x2x2": vid["T4_H32_W32_p1x2x2"], "video_p2x2x2": vid["T4_H32_W32_p2x2x2"],
       "video_T16_p2x2x2": vid["T16_H32_W32_p2x2x2"]}
out["attention_pairs"] = {k: {"tokens": v, "pairs": v * v, "relative_to_1024": (v * v) / (1024 * 1024)}
                          for k, v in cfg.items()}

# 6. Clean-image recovery from the noise prediction: x0_hat = (x_t - sqrt(1-abar) eps) / sqrt(abar)
x0v = rng.normal(size=8)
ab = abar_all[500]
e = rng.normal(size=8)
xtv = np.sqrt(ab) * x0v + np.sqrt(1 - ab) * e
x0_hat = (xtv - np.sqrt(1 - ab) * e) / np.sqrt(ab)
out["recover_x0_max_err_true_eps"] = float(np.max(np.abs(x0_hat - x0v)))
# Loss of predicting zero noise vs true noise (MSE over many samples)
E = rng.normal(size=(100000, 1))
out["mse_predict_zero"] = float(np.mean(E ** 2))
out["mse_predict_true_noise"] = 0.0

# 7. AdaLN-Zero DiT-style block (single head, ReLU MLP), N tokens, width D
def layer_norm(x, eps=1e-6):
    m = x.mean(-1, keepdims=True); v = x.var(-1, keepdims=True)
    return (x - m) / np.sqrt(v + eps)

def make_block(D, rng):
    W = {k: rng.normal(scale=0.3, size=(D, D)) for k in ["q", "k", "v", "o", "m1", "m2"]}
    W["mod"] = rng.normal(scale=0.3, size=(D, 6 * D)); W["mod_b"] = np.zeros(6 * D)
    return W

def block(x, c, W, zero_init=True):
    D = x.shape[1]
    mod = c @ W["mod"] + W["mod_b"]
    s1, sc1, g1, s2, sc2, g2 = np.split(mod, 6)
    h = layer_norm(x) * (1 + sc1) + s1
    q, k, v = h @ W["q"], h @ W["k"], h @ W["v"]
    a = np.exp(q @ k.T / np.sqrt(D)); a /= a.sum(-1, keepdims=True)
    x = x + g1 * ((a @ v) @ W["o"])
    h = layer_norm(x) * (1 + sc2) + s2
    x = x + g2 * (np.maximum(h @ W["m1"], 0) @ W["m2"])
    return x

D, N = 8, 16
x = rng.normal(size=(N, D)); c = rng.normal(size=D)
Wz = make_block(D, rng); Wz["mod"] = np.zeros_like(Wz["mod"])  # zero-init modulation MLP
out["adaln_zero_identity_max_diff"] = float(np.max(np.abs(block(x, c, Wz) - x)))
Wr = make_block(D, rng)  # non-zero modulation
out["adaln_random_max_diff"] = float(np.max(np.abs(block(x, c, Wr) - x)))

# 8. Sampling cost: ancestral DDPM needs T network evaluations per sample
out["sampling_evals_ddpm"] = T

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "60.4_data.json")
with open(path, "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
