## What you learned

You learned how to see inside a language model application and how to control what it costs. Lesson 56.1 explained traces and spans in OpenTelemetry (OTel), the `traceparent` header that carries a trace from one service to another, and why head sampling decides once, at the root span. Lesson 56.2 built a dependency-free tracer that records nested observations, batches them for export and turns token counts into cost, then mapped that mechanism onto Langfuse, Phoenix and Arize AX. Lesson 56.3 priced calls from their input and output tokens, enforced a spending limit with worst-case reservations, and used a circuit breaker to route around a failing provider.

## Key ideas

- A trace is the tree of spans that share one trace ID; each span stores its parent's ID, so a backend can rebuild the tree.
- The `traceparent` header carries four fields (version, trace-id, parent-id, flags); a receiving service joins the trace only if the sender writes the header.
- Context does not follow work into a new thread; capture it in the caller and run the worker inside it.
- Head sampling keeps or drops a whole trace from the root's decision, while per-observation sampling breaks trees.
- A call costs (input tokens × input price + output tokens × output price) ÷ 1,000,000, using the provider's own usage counts.
- A naive budget check overspends under concurrency; reserving the worst-case cost never overspends, but only if the server enforces `max_tokens`.
- A circuit breaker counts consecutive failures, opens, skips the primary during a cooldown and probes it again; in the simulation it cut wasted primary time from 600 s to 40 s.
- Failover helps only when the fallback fails independently of the primary, so test it under a real outage.

## Before moving on

- □ I can read a trace waterfall and say which step dominates a request's latency and what share of the total it takes.
- □ I can write and read a `traceparent` header and explain what breaks when the sender omits it.
- □ I can explain why a child span loses its parent in a thread pool, and how to pass the context across.
- □ I can explain why head sampling keeps whole traces but cannot keep only the failed requests.
- □ I can compute the cost of one call from its input and output token counts and per-million prices.
- □ I can explain why a budget reservation must hold the worst case, and why that depends on `max_tokens`.
- □ I can describe the closed, open and half-open states of a circuit breaker, and what must reset on success.
