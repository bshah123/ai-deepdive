"""Experiment for lesson 60.3 (audio and video tokenization). Writes 60.3_data.json.

Numpy only. Every number used in the lesson text or in the diagrams comes from this file.
Audio front end follows openai/whisper audio.py (N_FFT 400, HOP 160, 80 mels, log10 floor
of 8 below max, (x+4)/4) with a NumPy re-implementation. The mel filters are built here with
the Slaney scale and area norm (librosa's default); Whisper ships its own mel_80 asset, so
values differ slightly from Whisper's.
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR, NFFT, HOP, NMELS = 16000, 400, 160, 80
D = {}

# ---------- A. log-Mel front end ----------
def hann(n):                       # periodic Hann, as torch.hann_window default
    return 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / n)

def stft_power(x):                 # centre=True, reflect padding (torch.stft defaults)
    xp = np.pad(x, NFFT // 2, mode="reflect")
    n_frames = 1 + (len(xp) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n_frames)[:, None]
    spec = np.fft.rfft(xp[idx] * hann(NFFT), axis=1)
    return (np.abs(spec) ** 2).T   # (201, n_frames)

F_SP, MIN_LOG_HZ = 200.0 / 3, 1000.0
MIN_LOG_MEL, LOGSTEP = MIN_LOG_HZ / F_SP, np.log(6.4) / 27.0
def hz_to_mel(f):
    f = np.asarray(f, float)
    return np.where(f >= MIN_LOG_HZ, MIN_LOG_MEL + np.log(np.maximum(f, 1e-10) / MIN_LOG_HZ) / LOGSTEP, f / F_SP)
def mel_to_hz(m):
    m = np.asarray(m, float)
    return np.where(m >= MIN_LOG_MEL, MIN_LOG_HZ * np.exp(LOGSTEP * (m - MIN_LOG_MEL)), F_SP * m)

def mel_filters(n_mels=NMELS):
    fft_f = np.linspace(0, SR / 2, NFFT // 2 + 1)
    hz = mel_to_hz(np.linspace(hz_to_mel(0.0), hz_to_mel(SR / 2), n_mels + 2))
    fd = np.diff(hz)
    ramps = hz[:, None] - fft_f[None, :]
    w = np.maximum(0, np.minimum(-ramps[:-2] / fd[:-1, None], ramps[2:] / fd[1:, None]))
    return w * (2.0 / (hz[2:] - hz[:-2]))[:, None]

FILT = mel_filters()
def log_mel(x):
    lg = np.log10(np.maximum(FILT @ stft_power(x)[:, :-1], 1e-10))   # drop last frame, as Whisper does
    lg = np.maximum(lg, lg.max() - 8.0)
    return (lg + 4.0) / 4.0

t1 = np.arange(SR) / SR
t30 = np.arange(30 * SR) / SR
tone = lambda t: 0.5 * np.sin(2 * np.pi * 440 * t)
x30 = tone(t30) + 0.2 * np.sin(2 * np.pi * (300 + 150 * t30) * t30)   # tone + slow chirp
m1 = log_mel(x30[:SR])
m30 = log_mel(x30)
D["fft_bins"] = NFFT // 2 + 1
D["bin_hz"] = SR / NFFT
D["mel_1s_shape"] = list(m1.shape)
D["mel_30s_shape"] = list(m30.shape)
D["frames_1s"] = int(m1.shape[1])
D["frames_30s"] = int(m30.shape[1])
D["log_mel_min"] = round(float(m30.min()), 4)
D["log_mel_max"] = round(float(m30.max()), 4)
D["mel_of_1000Hz"] = round(float(hz_to_mel(1000.0)), 4)
D["mel_of_2000Hz"] = round(float(hz_to_mel(2000.0)), 4)
D["mel_of_440Hz"] = round(float(hz_to_mel(440.0)), 4)
# band whose centre is nearest 440 Hz, and the band with most energy in the 440 Hz stretch
centres = mel_to_hz(np.linspace(hz_to_mel(0.0), hz_to_mel(SR / 2), NMELS + 2))[1:-1]
D["band_nearest_440_hz"] = round(float(centres[np.argmin(np.abs(centres - 440))]), 1)
D["peak_band_frame40"] = int(np.argmax(m30[:, 40]))
D["peak_band_centre_hz"] = round(float(centres[D["peak_band_frame40"]]), 1)

# ---------- B. conv stem and token rate ----------
def conv_len(L, k, s, p):
    return (L + 2 * p - k) // s + 1
D["stem_len_30s"] = conv_len(conv_len(3000, 3, 1, 1), 3, 2, 1)
D["stem_len_1s"] = conv_len(conv_len(100, 3, 1, 1), 3, 2, 1)
D["enc_positions_per_s"] = D["stem_len_1s"]

# ---------- C. discrete codec (EnCodec numbers) and tokens per minute ----------
FRAME_HZ, BITS = 75, 10          # EnCodec 24 kHz: 75 latent steps/s, 1024 entries = 10 bits
streams = {}
for nq in (2, 8, 32):
    streams[f"encodec_nq{nq}"] = {
        "codes_per_s": FRAME_HZ * nq,
        "kbps": FRAME_HZ * nq * BITS / 1000,
        "codes_per_min": FRAME_HZ * nq * 60,
    }
streams["whisper_enc"] = {"codes_per_s": 50, "kbps": None, "codes_per_min": 50 * 60}
D["audio_streams"] = streams

# toy residual vector quantization on synthetic 8-D vectors (not a trained codec)
rng = np.random.default_rng(7)
centres8 = rng.normal(0, 3, size=(20, 8))
X = centres8[rng.integers(0, 20, 2000)] + rng.normal(0, 1.0, size=(2000, 8))

def kmeans(Z, K, iters=25, seed=1):
    r = np.random.default_rng(seed)
    C = Z[r.choice(len(Z), K, replace=False)].copy()
    for _ in range(iters):
        d = ((Z[:, None, :] - C[None]) ** 2).sum(-1)
        a = d.argmin(1)
        for k in range(K):
            if np.any(a == k):
                C[k] = Z[a == k].mean(0)
    d = ((Z[:, None, :] - C[None]) ** 2).sum(-1)
    return C, d.argmin(1)

K = 16
books, codes, R = [], [], X.copy()
for s in range(8):
    C, a = kmeans(R, K, seed=s + 1)
    books.append(C); codes.append(a); R = R - C[a]
D["rvq_K"] = K
D["rvq_bits_per_stage"] = 4
mse = [float((X ** 2).mean())]
recon = np.zeros_like(X)
for s in range(8):
    recon = recon + books[s][codes[s]]
    mse.append(float(((X - recon) ** 2).mean()))
D["rvq_mse_by_nq"] = [round(v, 4) for v in mse]
D["rvq_example_x"] = [round(float(v), 2) for v in X[0]]
res = X[0].copy(); ex = []
for s in range(3):
    res = res - books[s][codes[s]][0]
    ex.append({"code": int(codes[s][0]), "residual_norm": round(float(np.linalg.norm(res)), 3)})
D["rvq_example_stages"] = ex
D["rvq_norm_x0"] = round(float(np.linalg.norm(X[0])), 3)

# ---------- D. video tubelets and 3D convolution ----------
T, Hh, Ww, Cc = 16, 224, 224, 3
def tokens(t, p):
    return (T // t) * ((Hh // p) * (Ww // p))
D["video"] = {
    "frames": T, "h": Hh, "w": Ww,
    "tokens_2d_patch16_per_frame": tokens(1, 16),
    "tokens_tubelet_2x16x16": tokens(2, 16),
    "tokens_tubelet_4x16x16": tokens(4, 16),
    "values_per_tubelet_2x16x16": 2 * 16 * 16 * Cc,
}
d_model = 768
lin_params = 2 * 16 * 16 * Cc * d_model + d_model
conv_params = 64 * Cc * 27 + 64
D["video"]["linear_params_tubelet_to_768"] = lin_params
D["video"]["conv3d_3x3x3_c64_params"] = conv_params
D["video"]["macs_conv3d_3x3x3_full_res"] = (T * Hh * Ww) * (64 * Cc * 27)
D["video"]["macs_tubelet_linear_768"] = tokens(2, 16) * (2 * 16 * 16 * Cc * d_model)

def conv3d_naive(x, w, stride):          # x (C,T,H,W), w (O,C,kt,kh,kw), no padding
    C_, T_, H_, W_ = x.shape; O, _, kt, kh, kw = w.shape
    st, sh, sw = stride
    To, Ho, Wo = (T_ - kt) // st + 1, (H_ - kh) // sh + 1, (W_ - kw) // sw + 1
    y = np.zeros((O, To, Ho, Wo))
    for a in range(To):
        for b in range(Ho):
            for c in range(Wo):
                patch = x[:, a*st:a*st+kt, b*sh:b*sh+kh, c*sw:c*sw+kw]
                y[:, a, b, c] = np.tensordot(w, patch, axes=([1, 2, 3, 4], [0, 1, 2, 3]))
    return y

def tubelet_linear(x, Wl, t, p):
    C_, T_, H_, W_ = x.shape
    nt, nh, nw = T_ // t, H_ // p, W_ // p
    tub = x[:, :nt*t, :nh*p, :nw*p].reshape(C_, nt, t, nh, p, nw, p)
    tub = tub.transpose(1, 3, 5, 0, 2, 4, 6).reshape(nt, nh, nw, C_ * t * p * p)
    return (tub @ Wl.T).transpose(3, 0, 1, 2)

xs = rng.normal(size=(3, 4, 32, 32)); ws = rng.normal(size=(5, 3, 2, 8, 8))
y_conv = conv3d_naive(xs, ws, (2, 8, 8))
y_lin = tubelet_linear(xs, ws.reshape(5, -1), 2, 8)
D["equiv_shape"] = list(y_conv.shape)
D["equiv_max_abs_diff"] = float(np.abs(y_conv - y_lin).max())

with open(os.path.join(HERE, "60.3_data.json"), "w") as f:
    json.dump(D, f, indent=1)
print(json.dumps(D, indent=1))
