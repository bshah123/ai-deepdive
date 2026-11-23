## What you learned

This chapter covers how synthetic training data is made, filtered and checked before it is used to train a small model. You built a Self-Instruct loop and an Evol-Instruct loop around a stub teacher, and used a ROUGE-L threshold and keyword rules to control what entered the pool. You derived the temperature-softened distillation loss, checked its gradient numerically, and measured on a synthetic 3-class task how much soft targets add beyond the teacher's labels. You then cleaned a planted-duplicate corpus with Jaccard similarity over word 3-grams, MinHash signatures, LSH banding, and a naive Bayes quality classifier. Every number comes from a toy setup, so the results show mechanisms, not what a real language model would do.

## Key ideas

- Self-Instruct grows an instruction pool by prompting a model with 8 demonstrations and keeping outputs with ROUGE-L below 0.7 to every existing instruction, plus keyword and length rules.
- ROUGE-L measures shared word order, so it catches copies and misses paraphrases; it can also reject two different topics that share a template.
- Accepted count is not diversity: in the stub sweep, the pool grew from 40 to 596 between thresholds 0.7 and 0.9, but distinct words stayed at 84.
- Evol-Instruct makes instructions harder by adding clauses, and drops a lineage when an evolution adds nothing new. Depth counts clauses, not quality.
- Pure self-training on generated data loses categories; in the toy, keeping half real data per sample held support near 40 of 50.
- Distillation matches the student to the teacher's softened distribution softmax(z/T). The soft-term loss is multiplied by T squared, which keeps its gradient from shrinking like 1/T squared at high T.
- A black-box teacher that returns only text gives one-hot sequence-level targets, not the probabilities that soft-target distillation needs.
- In the synthetic task, the teacher's argmax as hard labels recovered 23% to 54% of the T = 4 gain over hard labels, and soft targets added about 0.03 to 0.06 on top.
- Near-duplicate removal: MinHash with 128 hashes estimates Jaccard similarity with standard error about 0.04, and LSH with (b, r) = (32, 4) plus verification gave precision 0.97 and recall 0.96 at J of 0.5 or more on the synthetic corpus.
- A quality classifier learns the reference corpus's notion of quality; its AUC of 0.92 is a toy result, not a real-world measure.

## Before moving on

- □ I can compute ROUGE-L F1 from an LCS length and say whether a threshold accepts a candidate.
- □ I can explain why a threshold sweep should report distinct words, not only accepted count.
- □ I can compute a temperature-softened softmax by hand and say why the distillation loss has a T squared factor.
- □ I can say which training targets a text-only teacher can provide, and which it cannot.
- □ I can compute Jaccard similarity from shingle sets and the LSH candidate probability 1 − (1 − s^r)^b.
- □ I can choose b and r for a duplicate threshold, and say why LSH candidates still need verification.
