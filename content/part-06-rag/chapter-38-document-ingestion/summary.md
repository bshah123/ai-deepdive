Document ingestion turns a file into chunks that a retriever can match and a language model can read. A PDF stores glyphs at coordinates, not paragraphs or tables, so reading order and table structure must be rebuilt from positions, and a scanned page yields no text at all unless it goes through OCR. Once the text is clean, a chunking strategy decides where the cuts fall. Fixed-size windows ignore the text, recursive splitting avoids mid-word cuts but still cuts sentences, and semantic chunking is only as good as the similarity signal under it. Parent-child retrieval separates the two jobs: small children are indexed for matching, and their larger parents are returned for answering, at a measurable cost in context words. Every number in this chapter comes from one test page, one document or synthetic corpora, with TF-IDF standing in for a learned embedder, so the results show mechanisms rather than benchmarks.

## Key ideas

- A PDF is a list of glyphs at coordinates; reading order and tables must be rebuilt from positions.
- Stream order is the reading order only when the producer drew the page in that order.
- Adjacency (the fraction of consecutive pairs preserved) measures reading order; a random order scores 1/(n - 1), about 0.042 for 25 lines.
- XY-cut recursively cuts the page along whitespace gaps larger than min_gap, and its result depends on that parameter, so sweep it.
- Score table recovery with pairwise precision and recall; majority purity rewards over-splitting.
- Empty text from a page is a silent failure; count characters per page and send empty pages to OCR.
- Fixed-size windows cut inside words and sentences regardless of the text.
- Recursive splitting never cuts a word here, but its default separators do not include sentence ends.
- Overlap copies text (1.24 times the original length in our example) and does not guarantee that an answer sentence survives.
- Semantic chunking breaks where neighbouring windows differ; check its breaks against known topic changes before trusting it.
- Index small children for matching, store each child's parent id, and count distinct parents while walking the ranked list.
- Compare chunkers at equal context cost: the parent configuration's gain came mostly from returning more words.

## Before moving on

- [ ] I can compute the adjacency of a predicted order and state its chance level.
- [ ] I can explain why stream order is not guaranteed reading order, and I can read glyphs in stream order with PDFPageAggregator and laparams=None.
- [ ] I can sweep an XY-cut min_gap and identify the value where the column cut fails.
- [ ] I can score table clustering with pairwise precision, recall and F1.
- [ ] I can route pages with no extracted characters to OCR and record the page number.
- [ ] I can work out how many fixed windows a document yields, and where the last one starts, from its length, size and overlap.
- [ ] I can measure whether marked evidence sentences survive whole in some chunk, not only count chunks.
- [ ] I can check a semantic chunker's breakpoints against known topic changes and rank the true gaps.
- [ ] I can walk ranked children, deduplicate by parent, and compare configurations at equal word budget.
