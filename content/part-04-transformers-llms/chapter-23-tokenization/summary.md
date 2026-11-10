## Chapter 23 Summary — Tokenization

### What you learned

A language model reads integer ids, not text. This chapter built the three subword tokenizers used in practice by hand: Byte-Pair Encoding (BPE, Lesson 23.1), WordPiece and the Unigram language model (Lesson 23.2). It then showed how the Hugging Face `tokenizers` library packages them for production, and how byte fallback and byte-level BPE guarantee that no input character is lost (Lesson 23.3).

### Key ideas

- **Subwords** sit between words (unseen words become `[UNK]`) and characters (sequences get several times longer).
- **BPE training** counts adjacent pairs weighted by word frequency, merges the most frequent pair, and recounts after every merge.
- **Vocabulary size** = starting alphabet + number of merges + hand-added special tokens (GPT-2: 256 + 50,000 + 1 = 50,257).
- **The tokenizer is the ordered merge list.** Encoding replays merges by rank, earliest first, and training needs a fixed tie-breaking rule to be reproducible.
- **Byte-level BPE** (GPT-2) starts from the 256 byte values, so nothing is unknown, provided all 256 are in the vocabulary.
- **Pre-tokenization** cuts text into word-like chunks first, so merges never cross a chunk boundary.
- **WordPiece encoding** is greedy longest-match-first with `##` on word-internal pieces; if any position fails, the whole word becomes `[UNK]`.
- **WordPiece training** (the Hugging Face course's reconstruction) merges the pair with the highest count(ab) / (count(a)·count(b)), so it rewards pairs that stick together rather than pairs that are merely common.
- **Unigram** scores a segmentation as the product of its piece probabilities, encodes with Viterbi, and trains top-down: seed big, run EM (expectation–maximisation), prune what costs least likelihood, never remove characters.
- **Subword regularisation** samples a segmentation from P(x | X) during training (flattened or sharpened by α); evaluation uses the deterministic Viterbi encoding.
- **SentencePiece** is a library that implements both BPE and Unigram. It writes spaces as `▁`, so decoding is a lossless join of the *normalised* text.
- **Byte fallback** keeps a character vocabulary and spells only unknown characters as `<0xNN>` byte tokens; byte-level BPE turns every character into bytes first.
- **A Hugging Face tokenizer** is normalizer → pre-tokenizer → model → post-processor, plus a decoder, all stored in one `tokenizer.json`; `offsets` map every token back to the original string.
- **Library speed** comes mostly from parallel batches across cores and from skipping offsets (`encode_batch_fast`), not from a single Rust thread.

How each scheme marks word boundaries:

| Scheme | Marker | Example |
|---|---|---|
| BPE as in Sennrich et al. (Lesson 23.1) | `</w>` ends a word | `low` `est</w>` |
| WordPiece (BERT) | `##` continues a word | `un` `##aff` `##able` |
| SentencePiece | `▁` stands for the space before a word | `▁cook` |
| GPT-2 byte-level BPE | `Ġ` is the printable stand-in for the space byte | `Ġthe` |

### Before moving on

- □ I can run two or three BPE merges by hand on a small weighted corpus, recounting pairs after each merge.
- □ I can compute how many merges a vocabulary of a given size needs, with special tokens accounted for.
- □ I can encode a new word by applying merges in rank order, and explain why an unseen character breaks a character-level BPE.
- □ I can trace greedy longest-match WordPiece on a word and predict when it returns a single `[UNK]`.
- □ I can compute a WordPiece pair score and say why it can disagree with BPE's choice.
- □ I can write Viterbi for a Unigram model and find the most probable segmentation of a short word.
- □ I can explain why sampling segmentations belongs in training and not in evaluation.
- □ I can check whether a SentencePiece model is BPE or Unigram, and recognise an unknown character from its id rather than its piece string.
- □ I can count the tokens byte fallback produces for a string from its UTF-8 byte lengths.
- □ I can build a `tokenizers` pipeline, save and reload it as `tokenizer.json`, and use `offsets` to map tokens back to the original text.
- □ I can diagnose silent character loss: a missing `initial_alphabet`, missing byte tokens, or `decode` skipping `[UNK]`.
