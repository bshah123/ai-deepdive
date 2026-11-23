## What you learned

Chapter 33 builds a BM25 search engine in three steps. Lesson 33.1 builds an inverted index, which maps each term to a sorted postings list. It answers AND queries by a two-pointer intersection and compresses document-ID gaps with VByte. Lesson 33.2 derives the BM25 score, a sum over query terms of an inverse document frequency (IDF) times a saturating term-frequency part, with length normalization set by the parameter b. Lesson 33.3 implements the scorer on top of the index in standard-library Python and checks it against a brute-force scorer on the same synthetic corpus. The two agree exactly, and the index touches far fewer entries as the collection grows.

## Key ideas

- An inverted index maps each term to a sorted list of (docID, term frequency) pairs, so a query reads only the lists of its own terms.
- The AND of two sorted postings lists is a two-pointer walk. It costs at most |p| + |q| comparisons, and it is correct only when both lists are sorted.
- VByte stores 7 data bits per byte, and a flag bit marks whether more bytes follow. With the lesson's convention, 300 is encoded as 10000010 00101100.
- Skip pointers help when the two lists differ a lot in length. For similar lengths they add comparisons.
- The BM25 score of a document is the sum over query terms of IDF times f(k1 + 1) / (f + k1(1 − b + b·|D|/avgdl)).
- The term-frequency part rises with the count f but never exceeds k1 + 1, so repeated words stop adding credit.
- The parameter b sets how much document length matters. At b = 0 length is ignored.
- The Lucene IDF, log(1 + (N − n + 0.5)/(n + 0.5)), stays positive. The Robertson–Spärck Jones form goes negative when a term appears in more than half the documents.
- The engine precomputes the length factors and IDF in build(), accumulates scores only over the postings of the query terms, and keeps the top k with heapq.nlargest.
- It ranks with OR semantics: any document containing at least one query term gets a score.
- Check a fast scorer against a brute-force one on the same corpus, and compare operation counts as well as timings.

## Before moving on

- □ I can build an inverted index from a few documents and count the comparisons of a two-pointer AND.
- □ I can encode and decode a small integer with VByte, given the flag-bit convention.
- □ I can compute a BM25 score by hand from N, n, f, |D|, avgdl, k1 and b.
- □ I can explain why the term-frequency part saturates, and what b controls.
- □ I can say which IDF form stays positive, and when the other one goes negative.
- □ I can check a fast scorer against a brute-force one, and explain why operation counts matter.
