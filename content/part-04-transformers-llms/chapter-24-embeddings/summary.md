## Chapter 24 Summary — Embeddings & Positional Encodings

### What you learned

A language model needs two conversions that its attention arithmetic does not supply: a vector for each token id, and a signal that says where each token sits. This chapter built the token table and its output mirror in NumPy, and showed that one matrix can serve both ends through weight tying (Lesson 24.1). It then compared three ways to give attention a sense of order: fixed sinusoids added to the embeddings (Lesson 24.2), rotations of queries and keys that make each score depend on the offset between two positions (Lesson 24.3), and a linear distance penalty added to the attention scores (Lesson 24.4). The code in each lesson checks the mechanism it describes. The benchmark results come from the cited papers and were not reproduced here.

### Key ideas

- An embedding lookup is a one-hot vector times a V × d table, so it selects one row.
- Weight tying sets the output head equal to the input table. It removes V × d parameters (38.6 million for GPT-2 small) and saves no computation.
- The tied table gets gradient from two paths: a dense output path and a sparse input path. Both must be summed, and a finite-difference check catches a missing path.
- Self-attention is permutation-equivariant, so position information must be added to its input or to its scores.
- Sinusoidal encodings use pair frequencies ω_i = 10000^(−2i/d). For raw encodings, PE(p) · PE(p + k) = Σ cos(k ω_i) depends only on the offset k.
- A learned projection between the encoding and the dot product breaks that offset-only dependence.
- RoPE rotates each query and key by its position times θ_i. For the raw rotation, the score depends exactly on m − n, where m and n are the two positions.
- The adjacent-pair and half-split pairing conventions must match between queries and keys, and between training and inference. A mismatch changes the scores.
- ALiBi subtracts m_h (i − j) from each score before the causal mask and softmax. The slopes are fixed per head, so no position vectors are learned.
- Under uniform content, the ALiBi head with slope 1/2 covers about 4 tokens (D90 = 4) and the head with slope 1/256 covers about 589 (D90 = 589).
- Exact relative invariance (RoPE) and a distance-only bias (ALiBi) do not guarantee good behaviour at lengths the model never trained on.

### Before moving on

- □ I can build the tied logits and softmax probabilities for a small embedding table by hand, and state how many parameters tying removes.
- □ I can tie an output head to an input table in NumPy, and check its gradient with finite differences along both paths.
- □ I can build the sinusoidal table for an even width d, and explain why an odd width fails.
- □ I can show that PE(p) · PE(p + k) depends only on k, and say why learned projections break that property.
- □ I can rotate a 2-D query and key by position times angle, and predict the score from the angle between them.
- □ I can recognise a pairing-convention mismatch from a changed score on known inputs.
- □ I can build a causal ALiBi bias matrix with −∞ above the diagonal, and compute the softmax weights for one query.
- □ I can compute D90 for a given slope, and explain why different heads need different slopes.
- □ I can say what each method guarantees (exact invariance or a distance-only bias) and what it does not guarantee (correct behaviour at unseen lengths).
