Chapter 30 follows the Hugging Face transformers and datasets libraries from a saved checkpoint to a trained model. Lesson 30.1 traces `AutoModel.from_pretrained` from the `model_type` field in `config.json` through two lookups to a model class, and explains how weights are matched by name and reported as missing or unexpected. Lesson 30.2 builds the generation loop by hand, showing how temperature, top-k, top-p and the stopping rules change the next-token distribution and end the output. Lesson 30.3 covers streamed data, gradient accumulation, Accelerate sharding and the `Trainer` call. The NumPy mirrors were run in this environment; the PyTorch calls are shown but were not executed here.

## Key ideas

- `config.json` names the model family, and `AutoModel` looks up the config class and then the model class.
- The model class defines parameter names and shapes; the checkpoint supplies only numbers, matched by name.
- Missing keys keep random values and unexpected keys are ignored, so read both lists before trusting a result.
- `from_pretrained` returns the model in evaluation mode, so dropout is off until `model.train()`.
- Temperature divides the logits before the softmax: below 1 sharpens the distribution, above 1 flattens it.
- Top-k keeps a fixed number of tokens; top-p keeps the smallest set whose probability reaches p, so its size adapts.
- Greedy decoding can repeat itself; sampling needs seeds for reproducible outputs.
- `max_new_tokens` counts only new tokens, while `max_length` includes the prompt.
- A custom `StoppingCriteria` returns one boolean per row, as a tensor of shape (batch_size, 1).
- A streamed dataset is a chain of generators, and the shuffle buffer size bounds how far an example can move.
- Effective batch size is per-device batch x devices x accumulation steps, and accumulation matches one large batch only with equal micro-batches and a mean loss.
- `Accelerator.prepare` takes loaders, modules, optimizers and schedulers; a raw dataset passes through unchanged. An `IterableDataset` in `Trainer` needs `max_steps`.

## Before moving on

- □ I can trace `AutoModel.from_pretrained` from a `config.json` to a model class and say which weights load.
- □ I can read the missing and unexpected key lists and say what each one implies.
- □ I can compute softmax probabilities after temperature, top-k and top-p for a small logit vector.
- □ I can explain why greedy decoding loops and why sampling needs a fixed seed to compare runs.
- □ I can choose between `max_new_tokens` and `max_length` and say what each counts.
- □ I can compute the effective batch size and check when gradient accumulation equals one large batch.
- □ I can explain how the shuffle buffer size limits how far examples move.
- □ I know when `Accelerator.prepare` needs a DataLoader and when `Trainer` needs `max_steps`.
