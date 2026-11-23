## Chapter 55 Summary — LLM Security

### What you learned

An LLM reads its instructions and the text it should work on as one token stream, so untrusted text can override the developer's instructions. This chapter showed that a keyword blocklist catches plain attacks but misses paraphrases and other-language attacks (Lesson 55.1). It also showed that a markdown image can carry a secret out of a chat window, and that an allowlist on fetched hosts stops it. Lesson 55.2 placed guards around the model: a regex rail and a stand-in classifier, measured on a small hand-written set. Their errors trade off against each other, and layering them helps less than independence predicts. Lesson 55.3 applied the same habit of measurement to PII redaction, moderation and JSON encoding. A checksum removed card false positives, while names and keyword evasions stayed unsolved. All numbers come from toy sets written for these lessons, not from benchmarks.

### Key ideas

- Prompt injection works because instructions and data share one token stream, and labels such as [DOCUMENT] are only text.
- Indirect injection arrives through content the app fetches, so the user need not be the attacker.
- A keyword blocklist caught 10 of 22 hand-written attacks and flagged 3 of 20 benign sentences. It missed all 4 paraphrases and all 3 other-language attacks.
- Normalising (decoding base64 runs, mapping look-alike characters) fixed the base64 style, from 0 to 4 of 4, and did nothing for paraphrases.
- A markdown image URL is a channel: the renderer fetches it, so a secret in the query string leaves the page without any tool call.
- An allowlist of fetched hosts is ordinary code outside the model, so it holds even when the model has been fully steered.
- A regex rail matches only the forms written into its pattern. It caught 16 of 42 attacks and blocked 6 of 24 benign prompts, with 2 of 12 leetspeak and 0 of 6 paraphrases caught.
- A threshold is a policy choice. The trigram classifier at θ = +4 blocks 12.5% of benign prompts and catches 73.8% of attacks, and at θ = −4 it catches 90.5% but blocks 41.7%.
- Two rails that fail on the same inputs do not multiply their miss rates. The observed joint miss (0.167) exceeded the independence prediction (0.118).
- Redaction has three stages: find candidates, validate them, and replace each span with a type tag.
- A Luhn check removed both card false positives in the test (card precision 0.50 to 1.00), but a checksum is not a security control.
- A regular expression cannot tell a person from a project. The naive name pattern had precision 0.20 on the corpus, so name redaction needs NER and measurement on your own data.
- Substring moderation flags "class", "compass" and "Bass". Whole-word matching fixes those but misses inflected forms, and no keyword list catches "k1ll".
- json.dumps builds valid structure from untrusted text, but it does not redact. Redact first, then encode.

### Before moving on

- □ I can explain why instructions and data in one prompt string cannot be separated by labels alone, and give a direct and an indirect injection example.
- □ I can test a blocklist on paraphrase, encoded and benign sets, and report caught and flagged counts with their denominators.
- □ I can explain how a markdown image URL carries data out, and place an allowlist check in code outside the model.
- □ I can trace a regex with \b boundaries by hand, and predict whether re.search or re.match finds a match in the middle of a prompt.
- □ I can sweep a classifier threshold, compute false-positive rate and recall at each point, and say which point a product cost favours.
- □ I can compare the joint miss rate of two rails with the independence prediction and say what a gap means.
- □ I can compute the Luhn total of a 16-digit number by hand and say why a valid checksum does not prove a card.
- □ I can measure a moderation method's false positives and misses on my own word list, and name the evasions it cannot catch.
- □ I can explain why json.dumps prevents structure injection but does not remove personal data, and state the correct order: redact, then serialise.
