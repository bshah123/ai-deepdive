import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
curriculum_file = os.path.join(base_dir, "data/curriculum.json")

with open(curriculum_file, "r") as f:
    curriculum = json.load(f)

# Define expanded lessons for Chapters 15 to 24 (10 chapters)
CHAPTERS_15_TO_24 = {
    # Part 2: Scientific Python & Tensors
    "chapter-15": [
        {"id": "15.1", "title": "NumPy Memory Layout: C-Contiguous, Fortran & Strides", "slug": "numpy-strides", "file": "15.1-numpy-strides.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["numpy", "strides", "memory-layout"]},
        {"id": "15.2", "title": "Broadcasting Semantics & Shape Alignment Rules", "slug": "numpy-broadcasting", "file": "15.2-numpy-broadcasting.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["broadcasting", "shapes", "numpy"]},
        {"id": "15.3", "title": "Universal Functions (ufuncs) & Vectorized C Loops", "slug": "numpy-ufuncs", "file": "15.3-numpy-ufuncs.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["ufuncs", "vectorization", "simd"]},
        {"id": "15.4", "title": "Views vs Copies, Slicing & Advanced Indexing", "slug": "views-vs-copies", "file": "15.4-views-vs-copies.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["views", "copies", "indexing"]}
    ],
    "chapter-16": [
        {"id": "16.1", "title": "Pandas Memory Architecture & The BlockManager", "slug": "pandas-blockmanager", "file": "16.1-pandas-blockmanager.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["pandas", "blockmanager", "internals"]},
        {"id": "16.2", "title": "Apache Arrow Integration & Zero-Copy Columnar Formats", "slug": "pandas-arrow", "file": "16.2-pandas-arrow.md", "difficulty": "advanced", "estimatedMinutes": 25, "tags": ["arrow", "columnar", "parquet"]},
        {"id": "16.3", "title": "Memory Optimization: Categoricals, Downcasting & Chunking", "slug": "pandas-optimization", "file": "16.3-pandas-optimization.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["optimization", "categoricals", "chunking"]}
    ],
    "chapter-17": [
        {"id": "17.1", "title": "PyTorch Tensor Internals: THPVariable & Storage Buffers", "slug": "pytorch-tensors", "file": "17.1-pytorch-tensors.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["pytorch", "storage", "tensors"]},
        {"id": "17.2", "title": "CUDA Streams, Pinned Memory & Host-to-Device Transfers", "slug": "cuda-transfers", "file": "17.2-cuda-transfers.md", "difficulty": "advanced", "estimatedMinutes": 35, "tags": ["cuda", "gpu", "memory-transfers"]},
        {"id": "17.3", "title": "Tensor Operations: In-Place vs Out-of-Place & Memory Aliasing", "slug": "tensor-ops-aliasing", "file": "17.3-tensor-ops-aliasing.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["aliasing", "in-place", "tensors"]}
    ],
    "chapter-18": [
        {"id": "18.1", "title": "Reverse-Mode Automatic Differentiation & GradTape", "slug": "autograd-engine", "file": "18.1-autograd-engine.md", "difficulty": "advanced", "estimatedMinutes": 35, "tags": ["autograd", "backprop", "grad_fn"]},
        {"id": "18.2", "title": "Building a Scalar Autograd Engine (Micrograd) From Scratch", "slug": "micrograd-scratch", "file": "18.2-micrograd-scratch.md", "difficulty": "advanced", "estimatedMinutes": 40, "tags": ["micrograd", "computational-graph", "from-scratch"]},
        {"id": "18.3", "title": "Custom PyTorch autograd.Function & Gradient Hooks", "slug": "custom-autograd-function", "file": "18.3-custom-autograd-function.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["custom-autograd", "hooks", "derivatives"]}
    ],
    # Part 3: ML & NLP Foundations
    "chapter-19": [
        {"id": "19.1", "title": "Machine Learning Problem Formulation & Empirical Risk", "slug": "ml-problems", "file": "19.1-ml-problems.md", "difficulty": "beginner", "estimatedMinutes": 20, "tags": ["erm", "loss-functions", "ml"]},
        {"id": "19.2", "title": "Loss Functions: MSE, Cross-Entropy & KL Divergence", "slug": "loss-functions", "file": "19.2-loss-functions.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["cross-entropy", "kl-divergence", "mse"]},
        {"id": "19.3", "title": "Bias-Variance Tradeoff, Overfitting & Regularization (L1/L2)", "slug": "bias-variance-regularization", "file": "19.3-bias-variance-regularization.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["bias-variance", "regularization", "generalization"]}
    ],
    "chapter-20": [
        {"id": "20.1", "title": "Linear Algebra: Vector Spaces, Dot Products & Projections", "slug": "linear-algebra", "file": "20.1-linear-algebra.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["vectors", "dot-product", "projections"]},
        {"id": "20.2", "title": "Matrix Decompositions: Eigendecomposition & SVD", "slug": "matrix-decomposition", "file": "20.2-matrix-decomposition.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["svd", "eigenvalues", "pca"]},
        {"id": "20.3", "title": "Multivariable Calculus: Jacobians, Hessians & Taylor Series", "slug": "calculus-gradients", "file": "20.3-calculus-gradients.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["gradients", "jacobians", "hessian"]}
    ],
    "chapter-21": [
        {"id": "21.1", "title": "Perceptrons & Multi-Layer Perceptrons (MLP) From Scratch", "slug": "mlp", "file": "21.1-mlp.md", "difficulty": "intermediate", "estimatedMinutes": 35, "tags": ["mlp", "neural-networks", "forward-pass"]},
        {"id": "21.2", "title": "Activation Functions: ReLU, GeLU, SwiGLU & Vanishing Gradients", "slug": "activation-functions", "file": "21.2-activation-functions.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["gelu", "swiglu", "activations"]},
        {"id": "21.3", "title": "Optimizers: SGD, Momentum, RMSprop & AdamW Deep Dive", "slug": "optimizers-adamw", "file": "21.3-optimizers-adamw.md", "difficulty": "advanced", "estimatedMinutes": 35, "tags": ["adamw", "optimizers", "gradient-descent"]}
    ],
    "chapter-22": [
        {"id": "22.1", "title": "Statistical NLP: N-Grams, TF-IDF & Cosine Similarity", "slug": "statistical-nlp", "file": "22.1-statistical-nlp.md", "difficulty": "beginner", "estimatedMinutes": 25, "tags": ["tfidf", "ngrams", "nlp"]},
        {"id": "22.2", "title": "Word2Vec: Skip-Gram, CBOW & Negative Sampling Math", "slug": "word2vec", "file": "22.1-word2vec.md", "difficulty": "intermediate", "estimatedMinutes": 30, "tags": ["word2vec", "embeddings", "skipgram"]},
        {"id": "22.3", "title": "GloVe & FastText: Subword Information & Pretrained Vectors", "slug": "glove-fasttext", "file": "22.3-glove-fasttext.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["glove", "fasttext", "subwords"]}
    ],
    # Part 4: Transformers & LLMs (Chapters 23 & 24)
    "chapter-23": [
        {"id": "23.1", "title": "Byte-Pair Encoding (BPE) Tokenization From Scratch", "slug": "bpe-tokenizer", "file": "23.1-bpe-tokenizer.md", "difficulty": "intermediate", "estimatedMinutes": 35, "tags": ["bpe", "tokenization", "subwords"]},
        {"id": "23.2", "title": "WordPiece & SentencePiece (Unigram Language Model)", "slug": "wordpiece-sentencepiece", "file": "23.2-wordpiece-sentencepiece.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["sentencepiece", "unigram", "wordpiece"]},
        {"id": "23.3", "title": "Hugging Face tokenizers Library (Rust Core & Byte Fallback)", "slug": "hf-tokenizers", "file": "23.3-hf-tokenizers.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["rust", "huggingface", "tokenizers"]}
    ],
    "chapter-24": [
        {"id": "24.1", "title": "Token Embeddings & Weight Tying in Language Models", "slug": "token-embeddings", "file": "24.1-token-embeddings.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["embeddings", "weight-tying", "vram"]},
        {"id": "24.2", "title": "Sinusoidal Absolute Positional Encodings (Vaswani et al.)", "slug": "sinusoidal-encodings", "file": "24.2-sinusoidal-encodings.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["positional-encoding", "attention", "math"]},
        {"id": "24.3", "title": "Rotary Position Embeddings (RoPE) & Complex Rotation Math", "slug": "rope", "file": "24.1-rope.md", "difficulty": "advanced", "estimatedMinutes": 35, "tags": ["rope", "rotary-embeddings", "llama"]},
        {"id": "24.4", "title": "ALiBi & Relative Positional Biases for Length Extrapolation", "slug": "alibi-relative-pos", "file": "24.4-alibi-relative-pos.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["alibi", "extrapolation", "transformers"]}
    ]
}

# Update curriculum.json structure
for part in curriculum["parts"]:
    for ch in part["chapters"]:
        if ch["id"] in CHAPTERS_15_TO_24:
            lesson_metas = []
            for l in CHAPTERS_15_TO_24[ch["id"]]:
                lesson_metas.append({
                    "id": l["id"],
                    "partId": part["id"],
                    "chapterId": ch["id"],
                    "title": l["title"],
                    "slug": l["slug"],
                    "file": l["file"],
                    "difficulty": l["difficulty"],
                    "estimatedMinutes": l["estimatedMinutes"],
                    "tags": l["tags"],
                    "status": "published"
                })
            ch["lessons"] = lesson_metas

with open(curriculum_file, "w") as f:
    json.dump(curriculum, f, indent=2)

print("curriculum.json updated for chapters 15 through 24!")
