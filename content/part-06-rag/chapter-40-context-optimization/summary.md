## What you learned

A long prompt costs more and can be used less well than its length suggests. Softmax attention divides a fixed total weight across every token in context, so each added distractor takes weight from the relevant chunk. The position effect that Liu et al. (2023) measured shows that where the answer sits also matters. Prompt compression shortens a prompt by removing tokens the model finds predictable (token pruning, the LLMLingua family) or by keeping whole sentences (extractive selection). Provider prompt caching reuses stored keys and values only when the prefix matches exactly, so a change early in the prompt invalidates everything after it. Caching pays off once the number of requests sharing a prefix exceeds (w - r) / (1 - r), where w is the cache write multiplier and r is the cache read multiplier.

## Key ideas

- Softmax weights sum to 1. With gold score 3 and distractors at score 0, the gold share is e^3 / (e^3 + n), which falls like 1/n (Lesson 40.1).
- The U-shaped position effect is measured by Liu et al. (2023). The positional-bias explanation of Hsieh et al. (2024) is their claim, and the toy model shows only what such a bias would do (Lesson 40.1).
- Token pruning keeps high-surprisal tokens, where surprisal is -log2 p(token | context). Sentence selection keeps whole sentences and keeps grammar (Lesson 40.2).
- The score is only as good as the scorer. A bigram toy cannot separate names it has never seen, and compression ratio alone does not predict answer quality (Lesson 40.2).
- A provider cache matches exact token prefixes, not similar questions. Causal attention makes a cached key at position p depend only on tokens 0 to p (Lesson 40.3).
- Put static content first and dynamic content (timestamps, user IDs) last, and check the cache usage fields to confirm a hit (Lesson 40.3).
- Provider prices and minimums change, so re-check them against the live pricing pages before budgeting (Lesson 40.3).

## Before moving on

- [ ] Compute the gold share in softmax for a given gold score and number of distractors.
- [ ] Explain why a positional-bias explanation needs measurement on real data, not only a toy model.
- [ ] Convert between a token's probability and its surprisal in bits.
- [ ] Choose between token pruning and sentence selection for a passage, and state the failure mode of each.
- [ ] Compute the break-even number of requests for given cache write and read multipliers.
- [ ] Restructure a prompt so its static part is a cacheable prefix, and predict which blocks survive an edit.
EOF2
