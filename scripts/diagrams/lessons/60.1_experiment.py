"""Lesson 60.1 experiment: every number used in the lesson and its diagrams.

Writes 60.1_data.json next to this file. Pure NumPy.
Run: python3 60.1_experiment.py
"""
import json
from pathlib import Path

import numpy as np

np.set_printoptions(precision=4, suppress=True)
HERE = Path(__file__).resolve().parent


def l2_normalize(x, axis=-1):
    return x / np.linalg.norm(x, axis=axis, keepdims=True)


def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)          # subtract max for stability
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)


def clip_loss(img, txt, scale):
    """Symmetric InfoNCE over an N x N batch (CLIP pseudocode, Fig. 3)."""
    I = l2_normalize(img, axis=1)
    T = l2_normalize(txt, axis=1)
    logits = scale * (I @ T.T)                       # logits[i, j] = scale * cos(img_i, txt_j)
    labels = np.arange(len(img))
    p_rows = softmax(logits, axis=1)                 # image i over texts j
    p_cols = softmax(logits, axis=0)                 # text j over images i
    loss_i = -np.log(p_cols[labels, labels]).mean()  # text -> image direction (per column)
    loss_t = -np.log(p_rows[labels, labels]).mean()  # image -> text direction (per row)
    return {
        "logits": logits, "p_rows": p_rows, "p_cols": p_cols,
        "loss_i": float(loss_i), "loss_t": float(loss_t),
        "loss": float((loss_i + loss_t) / 2),
    }


def manual_ce(logits_row, target):
    """Independent cross-entropy via log-sum-exp, to cross-check clip_loss."""
    m = logits_row.max()
    return float(m + np.log(np.exp(logits_row - m).sum()) - logits_row[target])


out = {}

# ---------- 1. Worked example: batch of N = 3 pairs, 2-D unit vectors, scale 10 ----------
I_raw = np.array([[1.0, 0.0], [0.6, 0.8], [0.0, 1.0]])   # image embeddings (already unit norm)
T_raw = np.array([[1.0, 0.0], [0.0, 1.0], [0.6, 0.8]])   # text embeddings (already unit norm)
assert np.allclose(np.linalg.norm(I_raw, axis=1), 1) and np.allclose(np.linalg.norm(T_raw, axis=1), 1)

cos = I_raw @ T_raw.T
out["cos_matrix"] = cos.round(4).tolist()
out["diag_cos"] = np.diag(cos).round(4).tolist()

ex10 = clip_loss(I_raw, T_raw, scale=10.0)
out["scale10_logits"] = ex10["logits"].round(4).tolist()
out["scale10_p_rows"] = ex10["p_rows"].round(4).tolist()
out["scale10_p_cols"] = ex10["p_cols"].round(4).tolist()
out["scale10_diag_p_rows"] = np.diag(ex10["p_rows"]).round(4).tolist()
out["scale10_row_loss"] = (-np.log(np.diag(ex10["p_rows"]))).round(4).tolist()
out["scale10_col_loss"] = (-np.log(np.diag(ex10["p_cols"]))).round(4).tolist()
out["scale10_loss_t"] = round(ex10["loss_t"], 4)
out["scale10_loss_i"] = round(ex10["loss_i"], 4)
out["scale10_loss"] = round(ex10["loss"], 4)

# cross-check one row against the independent log-sum-exp form
row1 = ex10["logits"][1]
assert abs(manual_ce(row1, 1) - (-np.log(ex10["p_rows"][1, 1]))) < 1e-9
out["check_row1_manual_ce"] = round(manual_ce(row1, 1), 4)

# ---------- 2. Temperature sweep on row 1 (image 1, true caption 1) ----------
scales = [1.0, 10.0, 1 / 0.07, 100.0]
sweep = []
for s in scales:
    r = clip_loss(I_raw, T_raw, scale=s)
    sweep.append({"scale": round(s, 4), "row1_p_true": round(float(r["p_rows"][1, 1]), 4),
                  "loss": round(r["loss"], 4)})
out["temperature_sweep"] = sweep
out["clip_init_scale"] = round(1 / 0.07, 4)           # CLIP init: tau = 0.07 -> logit scale 1/tau

# ---------- 3. Zero-shot classification (synthetic vectors, NOT CLIP's weights) ----------
classes = ["cat", "dog", "car"]
prompts = l2_normalize(np.array([[1.0, 0.2, 0.0],      # "a photo of a cat"
                                 [0.0, 1.0, 0.3],      # "a photo of a dog"
                                 [0.2, 0.1, 1.0]]))    # "a photo of a car"
image = l2_normalize(np.array([0.9, 0.35, 0.1]))       # an image embedding of a cat-like picture
sims = prompts @ image
probs = softmax(sims * (1 / 0.07))
out["zs_classes"] = classes
out["zs_cos"] = sims.round(4).tolist()
out["zs_probs"] = probs.round(4).tolist()
out["zs_pred"] = classes[int(np.argmax(sims))]

# ---------- 4. ViT patch arithmetic (ViT-B/16 at 224 px) ----------
img_px, patch = 224, 16
per_side = img_px // patch
n_patches = per_side * per_side
patch_dim = patch * patch * 3
d_model = 768
proj_params = patch_dim * d_model + d_model            # linear patch embedding, with bias
pos_params = (n_patches + 1) * d_model                 # learned position embeddings incl. [CLS]
out["vit"] = {"per_side": per_side, "n_patches": n_patches, "patch_dim": patch_dim,
              "d_model": d_model, "proj_params": proj_params, "pos_params": pos_params,
              "tokens_with_cls": n_patches + 1}

(HERE / "60.1_data.json").write_text(json.dumps(out, indent=2))
print(json.dumps(out, indent=2))
