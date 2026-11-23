## What you learned

Chapter 41 covers three ways to make retrieval-augmented generation (RAG) more reliable than the basic retrieve-then-generate loop. HyDE (hypothetical document embeddings) changes the query: it embeds a hypothetical answer written by a language model (LM) instead of the question, so the vector can land nearer to passages that use the same wording. Self-RAG (self-reflective RAG) has the model decide whether to retrieve, and grade its own candidate answers with reflection tokens. Corrective RAG (CRAG) scores each retrieved document, routes the query to a Correct, Ambiguous or Incorrect action, and filters the text it passes on. Each lesson uses a small runnable toy (NumPy or pure Python) to show the mechanism, and each one also states what a six- or twelve-query toy cannot show about published benchmarks.

## Key ideas

- HyDE embeds a hypothetical answer as the query vector. The answer may contain invented details; it only has to point the vector toward the right passages.
- A query with no word in the corpus vocabulary has a zero vector. Every cosine is 0, and its rank comes from the sort's tie-break, so it carries no signal.
- In the toy experiment, a scripted hypothesis raised recall@2 from 4 of 6 to 6 of 6. This is an illustration of the mechanism, not a benchmark result.
- The Self-RAG retrieve gate fires when P(Retrieve = yes) exceeds a threshold. The threshold is a tunable setting, and changing it changes how often retrieval runs.
- A Self-RAG candidate's total is its generation term plus weighted critique terms. The critique terms can add up to 2.5, so their weights matter as much as the generation term.
- The selection rule trusts the critic. In the failure case, a confidently wrong critic raised an ungrounded candidate's total from 0.625 to 2.83, above the correct candidate's 2.45.
- CRAG's Correct, Ambiguous and Incorrect actions come from two thresholds on the evaluator's score scale. The paper's thresholds are tied to its own evaluator and do not transfer to another scorer.
- A high relevance score is not an answer. A document can match every query term and still not say why something happened.
- A strip filter can remove the answer sentence when that sentence depends on earlier context. An empty context is not an abstention, so the generator must be instructed to abstain.

## Before moving on

- [ ] I can explain why embedding a hypothetical answer can move a question's vector closer to the right passage, and name the failure mode of a fluent but wrong hypothesis.
- [ ] I can recognise a zero-vector query, explain why its rank carries no signal, and say how to report it.
- [ ] I can compute a Self-RAG candidate's total from its generation term and its normalised critique probabilities, using weights 1.0, 1.0 and 0.5.
- [ ] I can state which queries pass a retrieve gate at a given threshold, and explain why thresholds between two probabilities give the same decision.
- [ ] I can apply CRAG's upper and lower thresholds to a set of document scores and name the resulting action, including the boundary cases.
- [ ] I can apply the lexical stand-in score, 2 × (matched query terms / query terms) − 1, and say which strips a threshold of 0 keeps.
- [ ] I can explain why one run on six or twelve queries is not evidence about a method's benchmark performance.
