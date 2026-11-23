## Chapter 27 Summary: Decoder-Only GPT, Generation and Sampling

### What you learned

A decoder-only GPT is an embedding table, a stack of pre-LayerNorm blocks with residual connections, a final LayerNorm and an output matrix tied to the embedding table. Lesson 27.1 builds a two-block model of this kind in NumPy, counts its parameters with a formula that matches the arrays exactly, and tests the causal mask by editing a later token and checking that earlier outputs do not move. Lesson 27.2 writes the generation loop and shows that a key-value (KV) cache produces the same greedy tokens and logits as full recomputation, with 11 position passes instead of 60 for a 4-token prompt and 8 generated tokens. It also gives the cache-size formula and the reason keys and values can be cached while attention weights cannot. Lesson 27.3 turns logits into probabilities, applies temperature, top-k, top-p and min-p, and checks that a sampler's frequencies match the distribution it is meant to draw from.

### Key ideas

- The toy model has 26,880 parameters, and the same formula gives 124,439,808 for the GPT-2 small configuration (my count from the formula, not a loaded checkpoint).
- The causal mask sets future scores to $-\infty$ before the softmax. Zeroing them after the softmax is wrong, because the rows then sum to less than 1.
- A model that knows nothing should have a loss near $\ln V$, which is $\ln 28 = 3.332$ nats for 28 symbols. A loss far below that at the start suggests the model is reading the answer.
- With $P$ prompt tokens and $N$ generated tokens, recomputation runs $NP + N(N-1)/2$ position passes and a cache runs $P + N - 1$.
- Keys and values of a position depend only on that token and earlier ones, so they can be cached. Attention weights cannot: each new key changes the softmax denominator.
- Cache size is $2 L H_{kv} d_{\text{head}} b$ bytes per position. The hypothetical 32-layer, 32-KV-head, head-size-128, fp16 model needs 2 GiB per 4,096-token sequence, and fewer KV heads (GQA, MQA) shrink it.
- Verify a cache by comparing its logits with full recomputation after every step. Compare work by counting operations, not by timing.
- Temperature divides the logits by $T$ before the softmax. It never changes which token is most likely: in the worked example $p(\text{the})$ falls from 0.6364 at $T = 1$ to 0.4287 at $T = 2$.
- Top-k keeps a fixed count of tokens. Top-p keeps the smallest set whose probability reaches $p$. Min-p keeps tokens whose probability is at least $p_{\text{base}}$ times the top probability.
- Each cut must be followed by renormalization, and filters applied in sequence can keep different tokens from the same filters applied in another order.
- A correct sampler's frequencies over 200,000 draws match its renormalized target to within about two standard errors.

### Before moving on

- □ I can write the forward pass of a two-block decoder in NumPy and count its parameters with the formula.
- □ I can test a causal mask by editing a late token and checking that no earlier output changes.
- □ I can compute the initial loss of a $V$-symbol model and compare it with $\ln V$.
- □ I can count recomputation and cached position passes for a prompt of $P$ tokens and $N$ generated tokens.
- □ I can compute KV cache bytes per token from layers, KV heads, head size and bytes per number.
- □ I can explain why keys and values can be cached but attention weights cannot.
- □ I can compute a softmax with temperature by hand and say which tokens top-k, top-p and min-p keep on a peaked and on a flat distribution.
- □ I can check a sampler by comparing its frequencies with the renormalized target distribution.
