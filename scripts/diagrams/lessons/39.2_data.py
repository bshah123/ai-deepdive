# Experiment for Lesson 39.2 (cross-encoders). Pure stdlib + NumPy so it runs in the browser too.
# Writes 39.2_data.json next to this file; the diagram script reads that JSON.
# Nothing here loads a pretrained model: the attention block is a hand-built toy, and the
# cost numbers are token counts under stated assumptions.
import json, os
import numpy as np

np.set_printoptions(precision=4, suppress=True)
out = {}

# ---------------------------------------------------------------- A. cost per query
L_Q, L_D, SPECIAL = 8, 120, 3          # assumed: 8-token query, 120-token passage, [CLS] + 2x[SEP]
PAIR = L_Q + L_D + SPECIAL             # tokens in one concatenated pair [CLS] q [SEP] d [SEP]
K_RERANK = 100                         # first stage keeps the top 100
N_DOCS = 1000                          # corpus size for the full cross-encoder scan

cost = {
    "pair_len": PAIR,
    "bi_online_tokens_per_query": L_Q,               # docs were encoded offline
    "bi_offline_tokens_corpus": N_DOCS * L_D,        # one-time, per corpus version
    "bi_dot_products": N_DOCS,
    "cross_full_tokens_per_query": N_DOCS * PAIR,
    "two_stage_tokens_per_query": L_Q + K_RERANK * PAIR,
}
cost["ratio_full_cross_vs_two_stage"] = round(cost["cross_full_tokens_per_query"] / cost["two_stage_tokens_per_query"], 2)
cost["ratio_full_cross_vs_bi_online"] = cost["cross_full_tokens_per_query"] // cost["bi_online_tokens_per_query"]
out["cost"] = cost
print("A. cost (tokens pushed through the transformer per query)")
for k, v in cost.items():
    print(f"  {k:36s} {v}")

# ---------------------------------------------------------------- B. toy joint attention
# One attention head, identity projections, no training. Shows only that every query token
# can read every document token in the same softmax. Word vectors are tied: the same word has
# the same vector in query and document, so the overlap is visible.
words_q = ["capital", "of", "france"]
words_d = ["paris", "is", "the", "capital"]
tokens = ["[CLS]"] + words_q + ["[SEP]"] + words_d + ["[SEP]"]
rng = np.random.default_rng(39)
vocab = {w: rng.normal(size=8) for w in set(words_q + words_d)}
vocab["[CLS]"] = np.zeros(8); vocab["[SEP]"] = np.zeros(8)
seg = np.array([0.0] + [0.0] * len(words_q) + [0.0] + [0.6] * len(words_d) + [0.6])  # doc segment shift
X = np.stack([vocab[t] for t in tokens]) + seg[:, None] * np.ones(8)
d = X.shape[1]
scores = X @ X.T / np.sqrt(d)
scores -= scores.max(axis=1, keepdims=True)
A = np.exp(scores); A /= A.sum(axis=1, keepdims=True)
q_idx = list(range(1, 1 + len(words_q)))
d_idx = list(range(1 + len(words_q) + 1, 1 + len(words_q) + 1 + len(words_d)))
block = A[np.ix_(q_idx, d_idx)]
out["attention"] = {
    "tokens": tokens,
    "query_rows": words_q,
    "doc_cols": words_d,
    "query_to_doc_weights": np.round(block, 3).tolist(),
    "query_to_doc_mass_per_row": np.round(block.sum(axis=1), 3).tolist(),
}
print("\nB. toy joint attention, query rows x doc columns")
print("  cols:", words_d)
for w, row in zip(words_q, block):
    print(f"  {w:8s}", np.round(row, 3))
print("  mass to doc per query row:", np.round(block.sum(axis=1), 3))

# ---------------------------------------------------------------- C. score heads
def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))

lt, lf = np.array([2.0, 0.4, -1.1]), np.array([-1.0, 0.1, 0.9])   # toy logits for "true" / "false"
p_true_two_way = softmax(np.stack([lt, lf], axis=-1))[:, 0]        # MonoT5 style: softmax over 2 tokens
p_true_sigmoid = sigmoid(lt - lf)                                  # identical by algebra
assert np.allclose(p_true_two_way, p_true_sigmoid)
out["monot5_style"] = {"logit_true": lt.tolist(), "logit_false": lf.tolist(),
                       "p_true": np.round(p_true_two_way, 4).tolist(),
                       "max_abs_diff_vs_sigmoid_of_difference": float(np.max(np.abs(p_true_two_way - p_true_sigmoid)))}
print("\nC. MonoT5-style score: softmax over {true,false} logits")
print("  p(true)            ", np.round(p_true_two_way, 4))
print("  sigmoid(lt - lf)   ", np.round(p_true_sigmoid, 4))

single = np.array([[3.2], [-1.0], [0.4]])                          # BGE-style head: one logit per pair
bge_bug = softmax(single, axis=1)                                  # the old lesson's softmax(dim=1)
out["single_logit_softmax_bug"] = {"logits": single.ravel().tolist(), "softmax_over_dim1": bge_bug.ravel().tolist()}
print("\nD. single-logit head with softmax over its only dimension")
print("  logits                ", single.ravel())
print("  softmax(dim=1)        ", bge_bug.ravel())
try:
    _ = single[:, 1]
except IndexError as e:
    out["single_logit_softmax_bug"]["index_1_error"] = str(e)
    print("  single[:, 1] ->", type(e).__name__, e)
sig_single = sigmoid(single.ravel())
out["single_logit_sigmoid"] = np.round(sig_single, 4).tolist()
print("  sigmoid(logit)        ", np.round(sig_single, 4))

# ---------------------------------------------------------------- E. truncation trap
DOC_TOKENS = 700
MAX_LEN = 512
budget_for_doc = MAX_LEN - (L_Q + SPECIAL)
rel_start, rel_end = 600, 608            # the one sentence that answers the query, at doc positions 600..607
kept = min(DOC_TOKENS, budget_for_doc)
trunc = {"max_len": MAX_LEN, "query_tokens": L_Q, "special_tokens": SPECIAL,
         "doc_tokens_kept": kept, "doc_tokens_total": DOC_TOKENS,
         "relevant_span": [rel_start, rel_end],
         "relevant_span_kept": bool(rel_end <= kept)}
out["truncation"] = trunc
print("\nE. truncation at max_length 512")
print("  doc tokens kept:", kept, "of", DOC_TOKENS, "| relevant span kept:", trunc["relevant_span_kept"])

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "39.2_data.json")
with open(path, "w") as f:
    json.dump(out, f, indent=2)
print("\nwrote", path)
