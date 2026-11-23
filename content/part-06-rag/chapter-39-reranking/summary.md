## What you learned

Reranking is the second stage of a retrieval pipeline. A cheap first stage, usually a bi-encoder, keeps a short list of candidates, and a more accurate scorer orders that list. This chapter compared three scorers. A bi-encoder encodes query and document apart, so document vectors can be stored in advance. A cross-encoder reads the query and document together and costs one transformer pass per pair. Late interaction, as in ColBERT, keeps one vector per token and scores with MaxSim. You counted passes, tokens, FLOPs (floating-point operations) and index bytes for each design, checked the three score heads and the 512-token input budget, and saw that one pooled vector cannot separate two sentences with the same words in a different order. The numbers come from toy constructions or stated assumptions, not from benchmarks.

## Key ideas

- A bi-encoder encodes query and document separately, so its document vectors can be computed once and indexed.
- A cross-encoder reads the pair in one pass, so its document representation depends on the query, but it costs one pass per pair.
- Two-stage reranking costs $k$ pair passes per query, not one per corpus document: 100 instead of $10^6$ in the lesson's example.
- First-stage recall caps the final result, because a reranker cannot recover a document that stage 1 dropped.
- The three score heads differ: a BERT-style logit trained as a probability, MonoT5's two-way softmax over true and false logits, and BGE's raw logit with no stated range.
- A softmax over a single logit is always 1.0, so rank by the raw logit or apply a sigmoid.
- Truncation drops evidence without an error: with a 512-token limit, a 12-token query leaves 497 document tokens.
- MaxSim sums, over query tokens, the best dot product with any document token; the worked example gives 2.76.
- Late interaction trades index size for accuracy: a million 100-token passages need 25.6 GB at 16-bit precision (fp16) and 51.2 GB at 32-bit precision (fp32).

## Before moving on

- [ ] Count model passes per query for a full cross-encoder scan and for a two-stage pipeline, given N and k.
- [ ] Explain why a bi-encoder can cache document vectors and a cross-encoder cannot.
- [ ] Compute a MaxSim score from a query-by-document dot-product matrix, and name the axis the maximum runs over.
- [ ] Compute the document token budget for a given query length and input limit, and say what truncation drops.
- [ ] Convert a single logit to $p(\text{true})$ with a sigmoid, and recognise the one-logit softmax bug.
- [ ] Compute a late-interaction index size from the number of passages, tokens per passage, dimension and bytes per number.
