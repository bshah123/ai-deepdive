LlamaIndex, a Python framework for retrieval-augmented generation (RAG), turns source files into retrievable pieces and then answers questions over them. Lesson 44.1 covers the chain Document, Node, index and retriever, scores retrieval with cosine similarity, and shows that chunk size and overlap trade answer completeness against context per node. Lesson 44.2 adds a response synthesizer and a chat engine on top of the retriever, counts LLM calls for six synthesis modes, and shows how the context window limits packing. Lesson 44.3 adds the SubQuestionQueryEngine and the RouterQueryEngine, measures their call costs (N + 2 calls for N sub-questions) and shows how vague tool descriptions break routing. All numbers come from toy corpora with stand-in models, so they show mechanisms, not benchmark results.

### Key ideas

- A Document holds one source; a Node is a chunk with an id, metadata and SOURCE, PREVIOUS and NEXT links.
- A retriever ranks nodes by cosine similarity; the hand-worked scores 1.00, 0.50 and 0.00 match the NumPy dot product.
- Overlap repeats text to avoid cutting answers, at the cost of more nodes; metadata uses part of chunk_size (4 tokens in the kettle example, leaving 36 text words per node).
- A query engine is a retriever plus a response synthesizer; the synthesis mode sets the number of LLM calls (six chunks: refine 6, compact 2, tree_summarize 3, simple_summarize 1).
- Packing is limited by the window minus the template, question, answer and padding (78 words of chunks in the demo).
- A chat turn with history makes two LLM calls, one to condense the follow-up and one to synthesize; condensing did not change recall in the four-item toy test.
- A SubQuestionQueryEngine makes N + 2 LLM calls; in the toy test its gain was one query and one chunk at budget 2.
- A RouterQueryEngine picks an engine from its description; vague descriptions cause ties, and ties go to the first tool listed in the stand-in router.
- Stub-LLM runs verify wiring and call counts, not answer quality.

### Before moving on

- [ ] I can compute a bag-of-words or TF-IDF cosine by hand and check it with NumPy.
- [ ] I can say what each of Document, Node, index and retriever holds, and why each exists.
- [ ] I can predict the node count and words per node for a given chunk size and overlap, allowing for metadata.
- [ ] I can count the LLM calls each synthesis mode makes for k chunks, and check that each prompt fits the window.
- [ ] I can explain why a follow-up question must be condensed into a standalone question before retrieval.
- [ ] I can count the LLM calls of a SubQuestionQueryEngine run and explain what each call does.
- [ ] I can explain why a router with vague descriptions fails, and say what a real evaluation of routing would need.
