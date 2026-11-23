## What you learned

Serving a decoder-only large language model (LLM) is usually limited by memory traffic rather than arithmetic. The key-value (KV) cache stores each token's keys and values once, so its size grows linearly with context length and batch size, as $2 \cdot L \cdot H_{\text{kv}} \cdot d \cdot T \cdot B \cdot b$ bytes. Each decode step reads every weight and every sequence's cache, so its time is at least the bytes read divided by memory bandwidth. Three techniques follow from this: a paged cache that allocates memory in fixed-size blocks, copy-on-write sharing of prompt pages between parallel samples, and speculative decoding, in which a cheap draft model proposes tokens that the target model checks in one parallel pass.

## Key ideas

- Cache bytes are $2 \cdot L \cdot H_{\text{kv}} \cdot d \cdot T \cdot B \cdot b$: the factor 2 covers keys and values, and $H_{\text{kv}}$ counts KV heads, not query heads.
- The illustrative 7B-class multi-head configuration costs 512 KiB per token and 2 GiB per 4,096-token sequence; 8 KV heads cut this fourfold.
- Batch size amortises the weight reads but not the cache reads, so throughput is capped at $BW / M_{\text{seq}}$ tokens per second (949 tokens per second in the worked example).
- Preallocate the cache. Growing it with `np.concatenate` copies the whole history at every step.
- A block table maps a logical token position to a physical page and slot, in the same way as operating-system virtual memory.
- Gather only the used slots, or mask the rest: unmasked empty slots changed the attention output by 0.0236 in the lesson's run.
- Copy-on-write lets parallel samples share prompt pages; four outputs of a 100-token prompt used 22 pages instead of 40.
- The paper's throughput gain comes from admitting more requests under the same memory (32 to 61 in our workload), not from faster single requests.
- The acceptance rule $\min(1, p/q)$, with resampling from $\max(0, p-q)$, keeps the output distribution equal to the target's.
- With a constant acceptance rate $\alpha$, the expected tokens per target call are $(1-\alpha^{\gamma+1})/(1-\alpha)$; the modelled speedup divides this by $\gamma c + 1$.
- Medusa replaces the draft model with extra decoding heads and checks a tree of candidates in one pass. Its reported speedups are self-reported and were not checked here.

## Before moving on

- □ I can compute the KV cache size for a given configuration, and convert between GB and GiB.
- □ I can bound decode throughput from memory bandwidth, and explain why a larger batch does not raise the cache ceiling.
- □ I can explain why a concatenating cache copies quadratically, and write a preallocated one.
- □ I can map a logical token position to a physical page and slot with a block table.
- □ I can explain copy-on-write for forked sequences, and say what breaks when it is removed.
- □ I can state the speculative acceptance rule and show by hand that it keeps the target's distribution.
- □ I can compute the expected tokens per round and the modelled speedup, and name the assumptions behind both.
