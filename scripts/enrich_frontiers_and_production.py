import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# LESSON 60.3: CROSS-MODAL FUSION & VIDEO/AUDIO MULTIMODAL LLMS
# ==============================================================================

write_file(r"content/part-10-evaluation-frontiers/chapter-60-multimodal-frontier/60.3-cross-modal-fusion.md", r"""---
id: "60.3"
part: 10
chapter: 60
title: "Cross-Modal Fusion: Video, Audio & Any-to-Any Multimodal Architecture"
slug: "cross-modal-fusion"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["60.1", "25.1"]
tags: ["multimodal", "video-llava", "whisper", "cross-attention", "audio-tokens"]
contentShape: "visual-spatial"
openingType: "visual"
status: "published"
---

# The Unified Any-to-Any Multimodal Architecture

Beyond static images, next-generation Multimodal Foundation Models (GPT-4o, Gemini 1.5 Pro, Qwen2-Audio) unify **Text, Audio, Video, and Spatial 3D Tensors** into a single shared autoregressive latent stream:

```mermaid
flowchart TD
    subgraph MultiModalInputs ["Diverse Input Modalities"]
        Audio["Raw Audio Waveform (16kHz PCM)"] --> AudioEncoder["Whisper / BEATs Audio Encoder<br>(Log-Mel Spectrogram -> 50 Hz Audio Tokens)"]
        Video["Temporal Video Frames (30 FPS)"] --> SpatioTemporalViT["3D Video ViT / TimeSformer<br>(Spatial + Temporal Attention Pooling)"]
        Text["Natural Language Prompt"] --> TextEmbed["Text Embedding Layer"]
    end

    subgraph ModalityAdapters ["Learned Cross-Modal Adapters"]
        AudioEncoder --> AudioProj["Audio MLP Projector / Q-Former"]
        SpatioTemporalViT --> VideoPooler["Temporal Average Pooling / Frame Subsampling"]
    end

    subgraph AutoregressiveBackbone ["Unified Decoder Backbone (LLaMA-3 / Gemma)"]
        AudioProj --> UnifiedStream["Interleaved Multi-Modal Sequence:<br>[Audio Tokens ... Video Tokens ... Text Tokens]"]
        VideoPooler --> UnifiedStream
        TextEmbed --> UnifiedStream
        UnifiedStream --> LLM["Autoregressive Transformer with RoPE & FlashAttention"]
    end

    LLM --> Output["Multimodal Grounded Response / Continuous Speech Waveform Output"]
```

---

# Temporal Video Representation: Spatial vs Temporal Self-Attention

Feeding 60 seconds of video at 30 FPS equals **1,800 frames** ($1,800 \times 576 = 1,036,800$ tokens), which exceeds typical GPU attention limits.

Modern Video LLMs solve this with **Divided Space-Time Attention**:

```mermaid
flowchart LR
    VideoTensor["Video Tensor: [Batch, Time (T), Height (H), Width (W), Dim]"] --> SpatialAttn["1. Spatial Self-Attention:<br>Attend across patches within each frame independently (H x W)"]
    SpatialAttn --> TemporalAttn["2. Temporal Self-Attention:<br>Attend across time for the same spatial coordinate (T)"]
    TemporalAttn --> TokenCompression["3. Dynamic Token Compression:<br>Merge redundant consecutive frames via 1D temporal convolution (4x reduction!)"]
```

---

# Python Video-to-Token Preprocessor Implementation

```python
import torch
import torch.nn as nn

class TemporalFrameCompressor(nn.Module):
    def __init__(self, embed_dim: int = 1024, compression_factor: int = 4):
        super().__init__()
        # 1D Temporal Convolution to downsample consecutive frame tokens
        self.conv1d = nn.Conv1d(
            in_channels=embed_dim,
            out_channels=embed_dim,
            kernel_size=compression_factor,
            stride=compression_factor
        )
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, video_tokens: torch.Tensor) -> torch.Tensor:
        # video_tokens: [Batch, Frames (T), PatchesPerFrame (P), Dim (D)]
        B, T, P, D = video_tokens.shape
        # Reshape to treat each spatial patch location across time: [B * P, D, T]
        x = video_tokens.permute(0, 2, 3, 1).reshape(B * P, D, T)
        # Downsample along temporal axis T
        x_compressed = self.conv1d(x) # [B * P, D, T // compression_factor]
        T_new = x_compressed.shape[-1]
        
        # Reshape back to [B, T_new, P, D]
        out = x_compressed.reshape(B, P, D, T_new).permute(0, 3, 1, 2)
        return self.norm(out)

# Verify 16-frame video compression
B, T, P, D = 2, 16, 64, 1024
video_embeds = torch.randn(B, T, P, D)
compressor = TemporalFrameCompressor(embed_dim=D, compression_factor=4)
compressed_out = compressor(video_embeds)

print(f"Original Video Tokens:   {B} batches x {T} frames x {P} patches = {B*T*P} tokens")
print(f"Compressed Video Tokens: {B} batches x {compressed_out.shape[1]} frames x {P} patches = {B*compressed_out.shape[1]*P} tokens (4x savings!)")
```

---

# Cross-Modal Fusion Paradigms Compared

| Architectural Paradigm | Mechanism | Token Overhead | Real-Time Latency | Best Used For |
|---|---|---|---|---|
| **Prefix Concatenation (LLaVA Style)** | Modality tokens prepended to text prompt | High ($N_{\text{visual}} + N_{\text{text}}$) | Standard autoregressive | High-accuracy static visual reasoning |
| **Cross-Attention Injection (Flamingo Style)** | Gated cross-attention layers inserted between transformer blocks | Low (Visual tokens stay in memory buffer) | Very Low (Decoupled text decoding) | Video streaming & interleaved document search |
| **Continuous Token Quantization (Chameleon / GPT-4o)** | Discrete VQ-VAE codebook tokens for both generation and ingestion | Unified | **Native real-time voice-to-voice** | Low-latency omni-modal assistants |

---

# Exercises & Challenges

**🟢 Challenge 1**: Calculate the total FLOPS and context length required to process a 10-minute video subsampled at 1 frame per second ($600\text{ frames}$) using $14 \times 14$ patch tiling ($576\text{ tokens/frame}$) with and without $4\times$ temporal convolution.

**🟡 Challenge 2**: Explain why discrete acoustic neural audio codecs (SoundStream, EnCodec) use Residual Vector Quantization (RVQ) across 8 to 32 hierarchical codebooks.

**🔴 Challenge 3**: Implement a pure PyTorch cross-attention fusion layer that injects frozen video memory embeddings $K_{\text{video}}, V_{\text{video}}$ into an active text query stream with zero-initialized $\tanh$ gating.
""")

# ==============================================================================
# LESSON 58.2: SYNTHETIC DATA DISTILLATION & QUALITY FILTERING
# ==============================================================================

write_file(r"content/part-10-evaluation-frontiers/chapter-58-synthetic-data/58.2-data-filtering.md", r"""---
id: "58.2"
part: 10
chapter: 58
title: "Synthetic Data Curation: Evol-Instruct, DEITA & Reward Model Filtering"
slug: "data-filtering"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["58.1", "28.3"]
tags: ["synthetic-data", "evol-instruct", "deita", "data-curation", "distillation"]
contentShape: "problem-solution"
openingType: "visual"
status: "published"
---

# The Synthetic Data Paradox: Quantity vs Quality

Training modern foundation models on millions of unfiltered synthetic text samples causes **Model Collapse** (loss of diversity, circular hallucinations, degraded reasoning).

Research (LIMA: *Less Is More for Alignment*, Zhou et al. 2023) proved that **1,000 expertly curated, highly diverse instruction pairs outperform 50,000 low-quality synthetic samples**:

```mermaid
flowchart TD
    subgraph RawGeneration ["1. High-Volume Synthetic Generation"]
        SeedTasks["Seed Instruction Pool (1,000 human tasks)"] --> EvolEngine["Evol-Instruct Engine:<br>Deepen constraints, Concretize, Increase reasoning complexity"]
        EvolEngine --> RawCorpus["Raw Synthetic Pool (500,000 generated pairs)"]
    end

    subgraph MultiStageFiltering ["2. Multi-Stage Quality Curation Pipeline"]
        RawCorpus --> Decontamination["Stage A: Decontamination<br>(MinHash LSH & 13-gram exact match against benchmark test sets)"]
        Decontamination --> ComplexityScore["Stage B: Complexity Scoring (DEITA)<br>(Evaluate linguistic complexity & reasoning step count)"]
        ComplexityScore --> QualityScoring["Stage C: Reward Model Scoring (ArmoRM / PairRM)<br>(Filter top 5% highest scored responses)"]
        QualityScoring --> DiversitySelection["Stage D: Embedding Clustering / Vendi Score<br>(Ensure semantic subspace coverage)"]
    end

    DiversitySelection --> GoldDataset["Gold SFT Dataset (10,000 Elite Samples -> Superior Alignment!)"]
```

---

# The DEITA (Data-Efficient Instruction Tuning) Scoring Algorithm

DEITA evaluates synthetic candidates along three mathematical dimensions:

1. **Complexity ($S_{\text{comp}}$)**: Measured via LLM-assessed difficulty scoring (evaluating cognitive load, multi-step constraints, domain depth).
2. **Quality ($S_{\text{qual}}$)**: Assessed via Pairwise Reward Model win-rates ($\sigma(r(x, y_w) - r(x, y_l))$).
3. **Diversity Distance ($D_{\text{div}}$)**: Maximal Cosine Distance to the existing selected dataset centroid:
$$D_{\text{div}}(x, \mathcal{S}) = 1 - \max_{s \in \mathcal{S}} \frac{\langle e(x), e(s) \rangle}{\|e(x)\| \|e(s)\|}$$

```mermaid
flowchart LR
    Candidate["Candidate Pair (x, y)"] --> DEITA_Score["Score = S_comp(x) * S_qual(x, y) * D_div(x, S)"]
    DEITA_Score --> Selection{"Score > Threshold?"}
    Selection -- "Yes" --> Accept["Include in Training Corpus"]
    Selection -- "No" --> Discard["Prune & Discard"]
```

---

# Python Automated Synthetic Data Quality Pipeline

```python
import numpy as np

class SyntheticDataFilter:
    def __init__(self, reward_model_simulator, min_reward_threshold: float = 0.85):
        self.rm = reward_model_simulator
        self.threshold = min_reward_threshold
        self.accepted_dataset = []

    def filter_batch(self, candidate_pairs: list[dict]):
        print(f"--- Filtering {len(candidate_pairs)} Synthetic Candidates ---")
        accepted = []
        
        for item in candidate_pairs:
            prompt = item["prompt"]
            response = item["response"]
            
            # 1. Length & format sanity check
            if len(response.split()) < 15 or len(response.split()) > 2048:
                continue
                
            # 2. Reward model quality evaluation
            quality_score = self.rm(prompt, response)
            
            # 3. Decision threshold
            if quality_score >= self.threshold:
                accepted.append({"prompt": prompt, "response": response, "score": quality_score})
                
        print(f"Accepted: {len(accepted)} / {len(candidate_pairs)} ({len(accepted)/len(candidate_pairs)*100:.1f}%)")
        self.accepted_dataset.extend(accepted)
        return accepted

# Test filter
simulated_rm = lambda p, r: 0.92 if "step-by-step" in r.lower() else 0.65
filter_engine = SyntheticDataFilter(reward_model_simulator=simulated_rm, min_reward_threshold=0.80)

candidates = [
    {"prompt": "How to optimize KV cache?", "response": "Use PagedAttention. Here is the step-by-step memory layout..."},
    {"prompt": "What is Python?", "response": "Python is a language."},
]

clean_data = filter_engine.filter_batch(candidates)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Implement 13-gram exact match decontamination in Python to verify that zero synthetic training samples overlap with GSM8K or HumanEval evaluation test sets.

**🟡 Challenge 2**: Explain why training an LLM exclusively on model-generated outputs without human ground-truth distribution anchors leads to statistical variance explosion.

**🔴 Challenge 3**: Implement a MinHash LSH (Locality Sensitive Hashing) deduplication script with 128 permutation hashes that prunes 90% near-duplicate synthetic prompts from a 100,000 sample dataset in $< 10\text{ seconds}$.
""")

# ==============================================================================
# LESSON 57.2: LLM-AS-A-JUDGE (G-EVAL)
# ==============================================================================

write_file(r"content/part-10-evaluation-frontiers/chapter-57-llm-benchmarks/57.2-llm-as-judge.md", r"""---
id: "57.2"
part: 10
chapter: 57
title: "LLM-as-a-Judge: G-Eval Framework, Calibration & Position Bias Mitigation"
slug: "llm-as-judge"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["57.1", "45.1"]
tags: ["llm-as-a-judge", "g-eval", "evaluation", "benchmarks", "bias-mitigation"]
contentShape: "case-study"
openingType: "visual"
status: "published"
---

# Why Traditional Metrics (BLEU & ROUGE) Fail for LLMs

Traditional NLP metrics (BLEU, ROUGE) rely on exact n-gram overlap. They severely fail when evaluating modern LLM outputs:
- A response with identical semantics but different vocabulary gets a **BLEU score of 0.0**.
- A response that copies the query verbatim gets a **high ROUGE score** despite being totally unhelpful.

**LLM-as-a-Judge** (Zheng et al., LMSYS MT-Bench 2023; G-Eval, Liu et al. 2023) uses a powerful foundation model (GPT-4) with structured rubrics to evaluate conversational quality, factual correctness, and safety:

```mermaid
flowchart TD
    subgraph InputData ["Evaluation Inputs"]
        Prompt["User Query / Prompt"]
        CandidateA["Model A Response"]
        CandidateB["Model B Response"]
        Rubric["Detailed Criteria Rubric (1 to 5 Scale with Grounding Guidelines)"]
    end

    subgraph JudgeEngine ["LLM-as-a-Judge Execution with Bias Mitigation"]
        Prompt --> Pass1["Pass 1: Evaluate (A, B) order"]
        CandidateA --> Pass1
        CandidateB --> Pass1
        Rubric --> Pass1

        Prompt --> Pass2["Pass 2: Swap Positions -> Evaluate (B, A) order (Eliminates Position Bias!)"]
        CandidateA --> Pass2
        CandidateB --> Pass2
        Rubric --> Pass2
    end

    Pass1 --> Aggregator["Consistency Verification & Probability Weighted Average"]
    Pass2 --> Aggregator
    Aggregator --> FinalScore["Calibrated Score / Win-Rate Decision"]
```

---

# The 4 Critical Biases in LLM Judges & How to Fix Them

| Cognitive Bias | Manifestation | Mitigation Strategy |
|---|---|---|
| **Position Bias** | Judge favors whichever response is presented first (`Model A`). | **Two-Pass Swap**: Evaluate both `(A, B)` and `(B, A)`; average scores or declare a tie if inconsistent. |
| **Verbosity Bias** | Judge favors longer, wordier responses even if content is redundant. | Explicitly instruct rubric: *"Penalize fluff and reward concise, information-dense answers."* |
| **Self-Enhancement Bias** | GPT-4 favors responses generated by GPT-4 over Claude or LLaMA. | Use multi-judge panels (ensemble of GPT-4, Claude-3.5-Sonnet, and Gemini-1.5-Pro). |
| **Egocentric Calibration Bias** | Judge gives 4/5 or 5/5 to almost everything (compressed score variance). | **G-Eval Token Probability Weighting**: Compute expected score $\mathbb{E}[S] = \sum_{k=1}^5 k \cdot P(\text{Token}=k)$. |

---

# G-Eval: Form-Filling with Token Probability Expectations

Instead of asking the judge to output a single integer score `5`, **G-Eval** extracts the raw output token probabilities over digits `'1'`, `'2'`, `'3'`, `'4'`, `'5'`:

$$\text{Calibrated Score} = \sum_{i=1}^5 i \cdot \frac{\exp(\text{logit}_i)}{\sum_{j=1}^5 \exp(\text{logit}_j)}$$

This transforms discrete integers into a **smooth, continuous score** (e.g. $4.38$) with high human correlation ($r > 0.84$).

---

# Python Pairwise Swapped Judge Implementation

```python
from typing import Literal

def mock_judge_llm(eval_prompt: str) -> str:
    # Simulated judge output
    return "[[A]]" if "Candidate 1: Fast" in eval_prompt else "[[B]]"

def evaluate_pairwise(prompt: str, response_a: str, response_b: str, rubric: str) -> Literal["A", "B", "TIE"]:
    def make_template(r1, r2):
        return (
            "You are an expert judge. Evaluate the two candidate responses below.\\n"
            f"Task: {prompt}\\n"
            f"Rubric: {rubric}\\n\\n"
            f"[Candidate 1]\\n{r1}\\n\\n"
            f"[Candidate 2]\\n{r2}\\n\\n"
            "Output [[A]] if Candidate 1 is better, [[B]] if Candidate 2 is better, or [[TIE]]."
        )

    # Pass 1: Order (A, B)
    out1 = mock_judge_llm(make_template(response_a, response_b))
    # Pass 2: Swapped Order (B, A)
    out2 = mock_judge_llm(make_template(response_b, response_a))
    
    win_1 = "A" if "[[A]]" in out1 else ("B" if "[[B]]" in out1 else "TIE")
    win_2 = "B" if "[[A]]" in out2 else ("A" if "[[B]]" in out2 else "TIE")
    
    if win_1 == win_2:
        print(f"[Judge Consensus] Winner: Model {win_1}")
        return win_1
    else:
        print(f"[Judge Inconsistency Detected] Order 1: {win_1} | Order 2: {win_2} -> Declaring TIE.")
        return "TIE"

# Evaluate sample
evaluate_pairwise(
    prompt="Explain RoPE embeddings",
    response_a="Candidate 1: Fast 2D coordinate rotation in complex space.",
    response_b="Candidate 2: A positional embedding technique.",
    rubric="Reward technical depth and accuracy."
)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Design a 5-point evaluation rubric for checking factual faithfulness in a financial RAG system.

**🟡 Challenge 2**: Calculate the Pearson and Spearman rank correlation between human expert scores and LLM-as-a-Judge scores on a 100-sample benchmark.

**🔴 Challenge 3**: Implement an Automated Reference-Guided G-Eval scoring module that extracts token logits from the Hugging Face `generate()` endpoint and computes continuous mathematical expectations.
""")

print("Frontier Multi-modal, Synthetic Data Curation, and LLM-as-a-Judge lessons enriched with supreme technical depth!")
