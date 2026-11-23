## Chapter 60 Summary: Multimodal

### What you learned

A model that reads images, speech or video needs a front end that turns the signal into a short sequence of vectors the transformer can process. You computed CLIP's symmetric contrastive loss by hand and in NumPy, and used the same encoders for zero-shot classification. You counted the tokens a Vision Transformer (ViT) makes from an image, then compared three connectors (linear, two-layer MLP and Q-Former) that map vision features into a language model's input space, using their token counts, parameter counts and KV-cache memory. For audio you followed Whisper's log-Mel front end and its convolution stem from 30 seconds of 16 kHz samples to 1,500 positions, and you built a toy residual vector quantizer (RVQ) that turns vectors into discrete codes. For video you showed that a 3D convolution with stride equal to kernel is a linear projection of non-overlapping tubelets. Last, you wrote the forward noising step of a diffusion model, checked why the network predicts the noise, and implemented the adaLN-Zero block, which starts as the identity.

### Key ideas

- CLIP trains an image encoder and a text encoder so that matched pairs have high cosine similarity, using a symmetric softmax loss over the $N \times N$ batch, where the other pairs in the batch are the negatives.
- The logit scale $s = 1/\tau$ sets how hard a near-miss is punished: on the same batch, the mean loss rises from 0.94 at $s = 1$ to 13.33 at $s = 100$.
- Zero-shot classification encodes each class name as a text prompt and picks the prompt with the highest cosine, so new labels need no retraining.
- A ViT cuts a 224 px image with 16 px patches into 196 tokens of 768 values each, plus one [CLS] token. The number of tokens grows with the square of the resolution.
- A linear or MLP connector emits one visual token per patch (576 at 336 px). A Q-Former emits 32 tokens whatever the resolution.
- For a 7B-class model in fp16, each token costs about 0.5 MiB of KV cache, so the number of visual tokens sets much of the memory cost.
- Whisper's front end gives 100 log-Mel frames per second, and its stride-2 convolution halves this to 50 continuous positions per second.
- Residual VQ turns each frame into one id per codebook. EnCodec's bitrate is frame rate × codebooks × 10 bits, so 8 codebooks at 75 Hz give 6 kbps.
- A 3D convolution with stride equal to kernel is one matrix multiply over non-overlapping tubelets. A 16-frame clip with 2 × 16 × 16 tubelets gives 1,568 tokens.
- A diffusion transformer (DiT) denoises a latent, not pixels, and cuts it into patches. The token count is $n = (I/p)^2$, and the attention pairs grow as $n^2$.
- adaLN-Zero zero-initialises its gates, so every block starts as the identity. OpenAI's Sora report describes the ingredients but publishes no architecture details or numbers.

### Before moving on

- □ I can compute the CLIP symmetric loss for an $N \times N$ batch by hand and in NumPy, and say how the logit scale changes it.
- □ I can build zero-shot class prompts and predict the class from the cosine scores.
- □ I can count the ViT patch tokens and the patch-projection parameters for any image size and patch size.
- □ I can compare linear, MLP and Q-Former connectors by output tokens, parameters and KV-cache memory.
- □ I can trace Whisper's shapes from 30 seconds of audio to 1,500 encoder positions, including the centre padding and the dropped last frame.
- □ I can compute a residual codec's bitrate and code count from its frame rate, codebook count and bits per code.
- □ I can count tubelet tokens for a video clip, and I can say what happens when the stride is smaller than the kernel.
- □ I can write the forward noising step, explain why the network predicts the noise, and count DiT tokens and attention pairs.
