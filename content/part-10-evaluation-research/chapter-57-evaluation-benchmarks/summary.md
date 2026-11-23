## What you learned

A language model's output has to be turned into a number before it can be compared, and each number carries measurement error and, for judge models, bias. This chapter covered three tools. For retrieval-augmented generation (RAG), the RAG triad puts one check on each edge of query, retrieved context and answer, so a low score points at the retriever, the generator or the answer's focus. For open-ended outputs, a judge model's probability-weighted score, a swap test for position bias, and agreement with human labels on your own data make a judge checkable. For standard benchmarks, a standard error says whether a gap is real, pass@k needs the unbiased estimator, and a Bradley-Terry fit over all battles replaces order-dependent Elo ratings.

## Key ideas

- Groundedness is the fraction of supported claims, F = supported claims / all claims, at a stated threshold θ.
- Answer relevance can be high while groundedness is zero, so read the three RAG triad scores together.
- A judge's probability-weighted score, the sum of p(s) × s, has finer resolution than its hard score but needs token probabilities.
- The swap test keeps only verdicts that survive both orders. It cannot detect a bias that is the same in both orders.
- Judge validity is measured on your own labelled sample, not inherited from published agreement figures.
- The 95% interval half-width is 1.96 × √(p(1−p)/n). At 1,000 items a three-point gap sits inside the noise.
- Detecting a 60% against 63% gap at 80% power needs about 4,129 items per model.
- pass@k uses the unbiased estimator 1 − C(n−c, k)/C(n, k). The naive form 1 − (1 − c/n)^k is biased low.
- Sequential Elo depends on battle order. A Bradley-Terry fit over all battles does not, and it comes with an interval.
- A public benchmark may be partly memorised from training data. Check contamination before you report a score.

## Before moving on

- [ ] Compute the three RAG triad scores for a toy answer and name the component that fails.
- [ ] Compute a probability-weighted judge score from a distribution over score tokens, and say why it is only as good as the judge's calibration.
- [ ] Apply the swap rule to two verdicts and decide whether the result is a win or a tie.
- [ ] Compute a 95% interval for an accuracy and decide whether a given gap between two models is reliable.
- [ ] Compute pass@k from n and c with the unbiased formula, and explain why it differs from the naive form.
- [ ] Explain why sequential Elo is order-dependent, and name the estimator to report instead.
