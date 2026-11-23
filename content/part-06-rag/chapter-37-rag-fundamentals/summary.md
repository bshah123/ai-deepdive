RAG (retrieval-augmented generation) answers a question from text you supply rather than from model weights alone. Vector search by itself returns the k most similar chunks with their scores and never an answer, and it always returns k results even when none is relevant. RAG adds a prompt that carries numbered chunks and asks for citations, a generator that answers only from them, and a rule for abstaining when the evidence is weak. The pipeline has an offline stage (ingestion: load, chunk, embed, index) and a per-question online stage (retrieval, then generation). Each stage can lose the answer, so check them in order: is the answer in some chunk, is it in the top k, and is it in the prompt. Lessons 37.1 to 37.3 measure these on small corpora with hand-checkable scores. The generator in 37.3 is a stand-in, so only retrieval, abstention and prompt format are measured there.

Key ideas:
- Vector search returns k ranked chunks with scores, and never an answer.
- For unit-normalised shared-word vectors, cosine similarity is $s/\sqrt{n_q n_c}$ (lesson 37.1).
- Chunk size and overlap decide what can be retrieved: a chunk shorter than the evidence cannot contain it.
- The embedder must be the same at ingestion and at retrieval, or the scores mean nothing.
- Diagnose by stage: answer in the index, then in the top k, then in the prompt.
- BM25 weights rare terms by idf, saturates repeated term counts, and normalises by chunk length (lesson 37.3).
- An abstention gate is a score rule outside search, and its threshold must be calibrated on labelled questions from your own corpus.
- Lexical retrieval misses inflection and synonyms, such as "lost" for "lose" and "annual" for "yearly".

## Before moving on

- [ ] I can state what vector search returns, and what RAG adds on top of it.
- [ ] I can compute a cosine similarity for two shared-word vectors by hand and check it in NumPy.
- [ ] I can predict whether a sentence survives intact for a given chunk size and overlap.
- [ ] I can name the stage that lost an answer, using the index, top-k and prompt checks.
- [ ] I can compute an idf value and a BM25 term contribution from the formulas.
- [ ] I can explain why a gate value measured on one corpus does not transfer to another.
