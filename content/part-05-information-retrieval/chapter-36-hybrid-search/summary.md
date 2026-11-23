## What you learned

Hybrid search runs a lexical retriever, BM25 (Best Matching 25), and a dense retriever over the same corpus, then merges the two ranked lists. BM25 matches exact tokens, so it misses synonyms and gives a document with no shared token a score of 0.00. A dense retriever compares vectors, so it matches meaning, but a compressed vector space can lose a rare term that appears in only one document. Reciprocal rank fusion (RRF) merges the lists using only ranks, and min-max normalization with a convex combination merges them using scores. In the controlled experiments, equal-weight RRF helped topic queries and hurt identifier queries, so the hybrid beat BM25 alone on topic queries and fell below it on identifiers. The numbers come from 12 hand-written documents and a simulated 3,000-document corpus, so they show mechanisms, not benchmark results.

## Key ideas

- BM25 scores a document by summing, over query terms, an inverse-document-frequency weight times a saturating term-frequency factor, so repeating a word gives diminishing returns.
- A score of 0.00 from BM25 means no shared token, not irrelevance. Check relevant documents by reading them.
- A dense retriever can lose a rare identifier when a low-rank projection keeps only the strongest co-occurrence patterns.
- RRF adds 1/(k + rank) over every list that contains a document, with k = 60. It ignores score units and the gaps between scores.
- Min-max maps each list onto [0, 1] using its own candidates, so one outlier compresses the rest, and a nearly flat list gets stretched into noise.
- Under RRF, a document ranked well in several lists accumulates score, but equal weights let a noisy list pull an exact match down.
- An approximate index such as an inverted file (IVF) trades recall for work. In the experiment, higher recall did not improve the fused nDCG@10.
- A post-filter needs a candidate depth of about k divided by the filter's selectivity, or a pre-filter should apply the mask inside each retriever.
- Fusion weights must be tuned on held-out queries. The selected weight sat at the edge of its grid, so the optimum may lie beyond it.

## Before moving on

- □ I can compute a BM25 term contribution from its term frequency, document length, average length and document frequency, and explain why repeated words saturate.
- □ I can compute an RRF score from two ranks with k = 60, and explain why changing the units of one retriever's scores does not change the RRF order.
- □ I can apply min-max normalization to a candidate list, and explain why it is sensitive to outliers.
- □ I can name the failure mode of each retriever (vocabulary mismatch for BM25, rare identifiers lost under compression for dense) and check a failure by reading the document.
- □ I can explain why a hybrid system can score below its lexical part, and why its weights must be tuned on data that is not used for reporting.
- □ I can choose a post-filter candidate depth from a filter's selectivity, or decide when a pre-filter is the better choice.
