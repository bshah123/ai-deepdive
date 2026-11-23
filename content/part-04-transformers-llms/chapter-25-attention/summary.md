## Chapter 25 Summary: Attention

### What you learned

Attention is a soft dictionary lookup: each query is scored against every key, the scores are turned into weights by a row-wise softmax, and the output is the weighted average of the values, $\mathrm{softmax}(QK^\top/\sqrt{d_k})\,V$. You derived the $\sqrt{d_k}$ scale from a variance argument, split the computation into several heads, and saw why generation makes the key-value (KV) cache the main memory cost, and how multi-query (MQA) and grouped-query (GQA) attention shrink it. You built the causal mask and tested that it blocks the future, then wrote the autoregressive decoding loop. You then replaced the stored $N \times N$ score matrix with FlashAttention's tiles and online softmax, which give the same output, and finished with multi-head latent attention (MLA), which caches one small latent per token and needs decoupled rotary position embeddings (RoPE) to keep that cache usable.

### Key ideas

- Attention returns a blend of values, never one pick; the softmax keeps it differentiable.
- Dividing by $\sqrt{d_k}$ keeps the variance of the scores at 1 (assuming independent unit-variance components), so softmax does not saturate and gradients survive.
- Subtract the row maximum before `exp`, or float16 overflows at a score of about 11.
- Multi-head attention splits $d_{\text{model}}$ into $h$ slices of width $d_{\text{head}}$; the four weight matrices hold $4\,d_{\text{model}}^2$ numbers whatever $h$ is.
- The KV cache holds $2 \times L \times h_{kv} \times d_{\text{head}}$ numbers per token; MQA ($h_{kv} = 1$) and GQA (groups) shrink it by $h / h_{kv}$ but still compute $h$ score matrices.
- A causal mask adds $-\infty$ above the diagonal before the softmax, so output row $i$ depends only on tokens $1 \dots i$.
- Training scores every position in one pass with targets shifted by one; generation takes the last row of logits and repeats.
- Earlier rows never change as the sequence grows, which is what makes the KV cache correct.
- FlashAttention is exact: it keeps a running max $m$, sum $\ell$ and unnormalised output per row, and rescales by $e^{m_{\text{old}} - m_{\text{new}}}$. Extra memory is proportional to $N$, but time is still proportional to $N^2$.
- MLA caches a latent $c_t$ and absorbs $W_{UK}$ into the query and $W_{UV}$ into $W_O$; RoPE breaks that fold, so DeepSeek-V2 caches a separate shared positional key $k^R$.

### Before moving on

- □ I can compute single-query attention by hand (scores, scale, softmax, mix) and check it in NumPy.
- □ I can write attention with the shape of every tensor next to each line, and with softmax over the key axis.
- □ I can derive why the scale is $1/\sqrt{d_k}$ and say when that derivation stops holding.
- □ I can compute KV cache size from layers, key/value heads, head width, bytes per number and context length.
- □ I can build a causal mask with `k=1` and write the "change a late token, earlier outputs must not move" test.
- □ I can explain why a model without a mask can reach near-zero training loss and still be useless for generation.
- □ I can run online softmax over blocks by hand and name the bug when `acc` is not rescaled.
- □ I can explain why MLA's cache is $d_c + d_R$ numbers per token and why RoPE forces the separate positional key.
