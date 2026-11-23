## What you learned

Serving a large language model is limited by memory and scheduling more than by arithmetic. This chapter followed three serving setups. In the first, vLLM stores the key-value (KV) cache in fixed-size blocks and refills batch slots as requests finish. In the second, Triton Inference Server and TensorRT-LLM fuse kernels, batch requests within a queueing delay, and compile fixed-shape engines. In the third, a local server (Ollama) runs quantized weights on a laptop, and decode speed there is bounded by memory bandwidth. Every number came from a counting model, a seeded simulation, or a stub server, not from a GPU. Treat the results as mechanisms and trends.

## Key ideas

- A KV cache costs 2 × L × H_kv × d × b bytes per token, so memory grows with batch size times sequence length.
- Reserving the maximum length per request left 22% of KV slots in use in the simulation. Paging in 16-token blocks left 98% in use.
- A block table maps logical blocks to physical blocks that need not be adjacent. Preemption frees blocks but repeats work.
- Continuous batching re-decides the batch at every step, so a freed slot is refilled at once. Static batching waits for the whole group.
- Fusing bias, GELU and a residual add cuts the simulated memory traffic from 7 tensor passes to 3.
- A dynamic batcher trades queueing delay for batch size. A longer delay adds no throughput when arrivals are the limit.
- In a Triton model config, dims excludes the batch dimension, which max_batch_size supplies.
- Weight memory is parameters times bits per weight divided by 8. Symmetric int4 with group size 32 costs 4.5 bits per weight once the scale is counted.
- At batch size 1, decode speed is at most memory bandwidth divided by bytes read per token.
- A local Ollama request returns its text in response, and "stream": false gives one JSON object.

## Before moving on

- Size a KV cache for a given model configuration, and say how many blocks a prompt of a given length needs.
- Read a block table and find the physical block that holds token t.
- Explain why static batching loses slot-steps, using a small schedule like the six-request example.
- Count the bytes moved by an unfused and a fused elementwise chain.
- Check a Triton config.pbtxt for the dims and batch-dimension rule.
- Quantize a short weight vector to symmetric int4 by hand and compute its reconstruction error.
- Estimate whether a quantized model fits on a machine, including the KV cache for a chosen context length.
- Write a client that sends "stream": false and reads response, eval_count and eval_duration.
