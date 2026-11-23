## What you learned

A serving engine is judged by several numbers that a single average hides: time to first token (TTFT), inter-token latency (ITL), time per output token (TPOT) and system throughput. They trade against each other. Batching raises total tokens per second and slows each user, and continuous batching, which refills a slot after every decode step, beats static batching when output lengths vary. Prefix caching reuses stored attention keys and values (KV) only when a new prompt starts with the same tokens, aligned to whole blocks. The lessons use simulators with stated assumptions, so the magnitudes are illustrative. The trends and the arithmetic are what carry over.

## Key ideas

- TTFT is the wait before the first token and includes queueing and prefill. TPOT is the mean gap between tokens of one request: $(t_n - t_1)/(n-1)$.
- Report percentiles of ITL and TTFT, not only means. Another request's prefill can stall every running decode and shows up in the tail.
- Per-user tokens/s falls and system tokens/s rises as batch size grows, because each decode step reads the model weights once for the whole batch.
- Static batching holds finished slots idle until the longest request ends. Continuous batching re-decides the batch after every decode step.
- Heavy-tailed output lengths widen the gap: the simulator gives 2.9 times the offline throughput at batch size 8.
- A prefix cache keys each full block by a hash chained with its parent block, so a block is reused only after an exact match of the whole prefix.
- Only full blocks are reusable, so a block-aligned cache loses up to $B-1$ tokens per request, where $B$ is the block size.
- A volatile token, such as a request ID or timestamp, at the start of a prompt drops the hit rate to zero. Put it last.
- The hit rate is capped by the shared share of traffic and limited by cache capacity. Least-recently-used eviction can push out shared system prompts when unique suffixes arrive.
- One shared copy of a long prompt's KV replaces one copy per user, which saves memory in proportion to the number of users.

## Before moving on

- [ ] Compute TTFT, TPOT, end-to-end latency and both tokens/s figures from a list of token timestamps.
- [ ] Explain why per-user and system tokens/s move in opposite directions as the batch size grows.
- [ ] Trace a small set of requests under static and under continuous batching, and count the makespan.
- [ ] Explain why a content-only block hash gives false hits, and why chaining the parent hash fixes it.
- [ ] Compute the reusable and recomputed token counts for a shared prefix, given the block size.
- [ ] Predict the effect of moving a request ID from the front of a prompt to the end.
- [ ] Compute KV bytes per token from layers, KV heads, head dimension and dtype, and the memory for a shared prompt.
