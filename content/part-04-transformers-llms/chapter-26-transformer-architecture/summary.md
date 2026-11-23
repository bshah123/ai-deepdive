## Chapter 26 Summary — Transformer Architecture

A Transformer block alternates two sub-layers, and each one is wrapped in a residual connection and a normalization step. Attention moves information between token positions, and the feed-forward network (FFN) transforms each position separately with the same weights. The encoder block uses bidirectional self-attention. The decoder block adds a causal mask and a cross-attention over the encoder output. Normalization can sit after the residual add (Post-LN, as in the original paper) or before the sub-layer (Pre-LN). The FFN can use ReLU, GELU or SwiGLU gating, and a mixture-of-experts (MoE) layer replaces it with several experts, of which each token uses only two. The numbers in this chapter come from small NumPy runs with random weights. They check the mechanics, not the quality of a trained model.

### Key ideas

- Attention mixes information across positions; the FFN transforms each position on its own (26.1).
- Post-LN wraps each sub-layer as LayerNorm(x + Sublayer(x)) (26.1).
- The encoder is bidirectional; the decoder's causal mask is applied to the scores before the softmax (26.1).
- A leak test checks the mask: changing a later target token must leave earlier decoder outputs unchanged (26.1).
- LayerNorm centres and scales each token's features; RMSNorm only scales them. The two agree on zero-mean input, and only LayerNorm ignores a constant added to every feature (26.2).
- In the 24-block toy, Pre-LN's residual RMS grows from 1.007 to 3.833, while Post-LN's stays at 1.000 (26.2).
- In seed 0 of the same toy, Pre-LN's gradient at block 0 is 3.29 times its gradient at block 23; over five seeds the ratio is 3.17 to 3.96 (26.2).
- A standard FFN with d_ff = 4d has 8d² weights, about two-thirds of a block's weights (26.3).
- SwiGLU has three matrices, so d_ff = 8d/3 keeps its weight count equal to the standard FFN's (26.3).
- Top-2 routing renormalizes the two selected softmax weights so that they sum to 1 (26.4).
- An expert's capacity is C = ceil(c·k·T/E). Overflow is dropped without changing the output shape, so log the dropped share (26.4).

### Before moving on

- [ ] Draw an encoder block and a decoder block, and name where the queries, keys and values come from in cross-attention.
- [ ] Compute LayerNorm and RMSNorm of a four-value vector by hand, and say which input change separates them.
- [ ] Apply a causal mask to the scores before the softmax, and check with a leak test that a later token does not move earlier outputs.
- [ ] Count the weights of a standard FFN and a SwiGLU FFN for a given d and d_ff, and choose d_ff = 8d/3 for an equal budget.
- [ ] Compute top-2 gate weights from four scores, with renormalization over the two selected experts.
- [ ] Compute an expert's capacity and the dropped share for a given capacity factor.
