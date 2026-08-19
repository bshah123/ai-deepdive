import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# 1. CHAPTER 28: DPO & POST-TRAINING ALIGNMENT
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-28-training-llms/28.3-sft-rlhf-dpo.md", r"""---
id: "28.3"
part: 4
chapter: 28
title: "Post-Training Alignment: SFT, RLHF (PPO) & Direct Preference Optimization (DPO)"
slug: "sft-rlhf-dpo"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["28.1", "19.2"]
tags: ["dpo", "rlhf", "sft", "alignment", "ppo", "preference-learning"]
status: "published"
---

# The 3 Stages of Modern LLM Training

A base foundation model (e.g. pre-trained on internet text) only learns to predict the next token. Transforming a raw base model into a safe, helpful, and instruction-following AI assistant requires a 3-stage post-training pipeline:

```mermaid
flowchart LR
    BaseModel["1. Pre-Trained Base Model<br>(Next-Token Predictor on 15T tokens)"] --> SFT["2. Supervised Fine-Tuning (SFT)<br>(50k-500k High-Quality Instruction-Response Pairs)"]
    SFT --> SFT_Model["SFT Model (Instruction Following)"]
    SFT_Model --> Alignment["3. Preference Alignment<br>(RLHF with PPO or Direct Preference Optimization - DPO)"]
    Alignment --> FinalAssistant["Aligned AI Assistant<br>(Helpful, Honest, Harmless)"]
```

---

# RLHF (Reinforcement Learning from Human Feedback) with PPO

The classical RLHF pipeline (Christiano et al., 2017; InstructGPT, 2022) trains a policy $\pi_\theta$ using **Proximal Policy Optimization (PPO)** against a learned **Reward Model $r_\psi(x, y)$**:

$$\max_{\theta} \mathbb{E}_{(x, y) \sim \mathcal{D}_{\pi_\theta}} \left[ r_\psi(x, y) \right] - \beta \, \mathbb{D}_{\text{KL}}\left( \pi_\theta(y \mid x) \,\|\, \pi_{\text{ref}}(y \mid x) \right)$$

```mermaid
flowchart TD
    subgraph ClassicalRLHF ["Classical 4-Model RLHF Setup (Extremely High VRAM Footprint)"]
        Actor["1. Actor Model (pi_theta - Active Policy)"]
        Critic["2. Critic / Value Model (V_phi - Estimates Value)"]
        Reward["3. Reward Model (r_psi - Evaluates Quality)"]
        RefModel["4. Reference Model (pi_ref - Computes KL Penalty)"]
    end
    Actor --> Environment["Generate response y for prompt x"]
    Environment --> Reward
    Reward --> PPO_Engine["PPO Generalized Advantage Estimation (GAE)"]
    Critic --> PPO_Engine
    RefModel --> PPO_Engine
    PPO_Engine --> Actor
```

### The Complexity Bottleneck of PPO:
Running PPO requires holding **4 full LLM instances in GPU memory simultaneously** (Actor, Critic, Reward, and Reference model), leading to extreme VRAM demands and notorious training instability (mode collapse, reward hacking).

---

# Direct Preference Optimization (DPO)

**Direct Preference Optimization (DPO)** (Rafailov et al., Stanford 2023) mathematically proves that the optimal policy under the Bradley-Terry preference model can be expressed analytically, **completely eliminating the need for a separate Reward Model and PPO reinforcement learning loop**!

### The Closed-Form Implicit Reward Derivation
Under the KL-regularized RL objective, the theoretical optimal policy $\pi^*$ satisfies:

$$\pi^*(y \mid x) = \frac{1}{Z(x)} \pi_{\text{ref}}(y \mid x) \exp\left(\frac{1}{\beta} r(x, y)\right)$$

Rearranging for the ground-truth reward $r(x, y)$:

$$r(x, y) = \beta \log \frac{\pi^*(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)$$

Substituting this implicit reward into the Bradley-Terry preference probability $P(y_w \succ y_l \mid x) = \sigma(r(x, y_w) - r(x, y_l))$ cancels the unknown partition function $Z(x)$, yielding the **DPO Loss Function**:

$$\mathcal{L}_{\text{DPO}}(\theta; \pi_{\text{ref}}) = -\mathbb{E}_{(x, y_w, y_l) \sim \mathcal{D}} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]$$

```mermaid
flowchart LR
    PairInput["Preference Pair: Prompt x, Winner y_w, Loser y_l"] --> ActivePolicy["Active Model pi_theta<br>(Compute log pi(y_w) and log pi(y_l))"]
    PairInput --> FrozenRef["Frozen Reference pi_ref<br>(Compute log pi_ref(y_w) and log pi_ref(y_l))"]
    ActivePolicy --> LogRatio["Compute Implicit Reward Difference:<br>h_hat = beta * [ log(pi/pi_ref)_w - log(pi/pi_ref)_l ]"]
    FrozenRef --> LogRatio
    LogRatio --> DPOLoss["Loss = -log sigma(h_hat)<br>(Direct Binary Cross-Entropy Backprop!)"]
```

---

# Standalone PyTorch DPO Loss Implementation

```python
import torch
import torch.nn.functional as F

def compute_dpo_loss(
    policy_chosen_logps: torch.Tensor,
    policy_rejected_logps: torch.Tensor,
    reference_chosen_logps: torch.Tensor,
    reference_rejected_logps: torch.Tensor,
    beta: float = 0.1
) -> torch.Tensor:
    # Computes Direct Preference Optimization (DPO) Loss
    # 1. Compute log ratios between policy and reference
    pi_logratios = policy_chosen_logps - policy_rejected_logps
    ref_logratios = reference_chosen_logps - reference_rejected_logps
    
    # 2. Scaled implicit reward margin
    logits = beta * (pi_logratios - ref_logratios)
    
    # 3. DPO Loss = -log(sigmoid(logits))
    losses = -F.logsigmoid(logits)
    
    # Track implicit rewards for monitoring
    chosen_rewards = beta * (policy_chosen_logps - reference_chosen_logps).detach()
    rejected_rewards = beta * (policy_rejected_logps - reference_rejected_logps).detach()
    
    return losses.mean(), chosen_rewards, rejected_rewards

# Simulated batch of 4 preference pairs
B = 4
pi_chosen = torch.tensor([-12.5, -8.2, -15.1, -10.0])
pi_rejected = torch.tensor([-18.0, -14.1, -16.0, -13.5])
ref_chosen = torch.tensor([-13.0, -9.0, -15.0, -11.0])
ref_rejected = torch.tensor([-16.5, -12.0, -15.5, -12.0])

loss, r_w, r_l = compute_dpo_loss(pi_chosen, pi_rejected, ref_chosen, ref_rejected, beta=0.1)
print(f"DPO Batch Loss: {loss.item():.4f}")
print(f"Mean Chosen Implicit Reward:   {r_w.mean().item():.4f}")
print(f"Mean Rejected Implicit Reward: {r_l.mean().item():.4f}")
```

---

# Comparison of Alignment Algorithms

| Algorithm | Requires Reward Model? | Requires Critic/Value Model? | GPU VRAM Overhead | Training Stability | Primary Use Cases |
|---|---|---|---|---|---|
| **RLHF (PPO)** | Yes (Trained first) | Yes | **4x Model Parameters** | Moderate (Hyperparameter sensitive) | OpenAI GPT-4, Anthropic Claude |
| **DPO** | **No** (Direct implicit reward) | **No** | **2x Model Parameters** (Policy + Ref) | **Extremely High** (Stable classification) | **LLaMA-3, Mistral, Zephyr** |
| **KTO** | No | No | 2x Model Parameters | High | Datasets with binary Thumbs-Up/Down labels |
| **ORPO** | No | **No** (Zero Ref Model needed!) | **1x Model Parameter** | High | Ultra-low VRAM fine-tuning |

---

# Exercises & Problem Set

**🟢 Problem 1**: Explain why the hyperparameter $\beta$ controls the conservatism of DPO: what happens as $\beta \to 0$ versus $\beta \to \infty$?

**🟡 Problem 2**: Derive why Odds Ratio Preference Optimization (ORPO) can train directly on a single model instance without storing a reference model $\pi_{\text{ref}}$.

**🔴 Problem 3**: Implement reference-free DPO / SimPO (Simple Preference Optimization) which replaces log-ratio reference normalization with length-normalized average token log-probabilities: $p_{\text{norm}}(y \mid x) = \frac{1}{|y|} \log \pi_\theta(y \mid x)$.
""")

# ==============================================================================
# 2. CHAPTER 39: QUERY TRANSFORMATION & HYDE
# ==============================================================================

write_file(r"content/part-06-rag/chapter-39-advanced-retrieval/39.1-query-rewriting-hyde.md", r"""---
id: "39.1"
part: 6
chapter: 39
title: "Query Transformations: HyDE, Step-Back Prompting & Multi-Query Expansion"
slug: "query-rewriting-hyde"
difficulty: "intermediate"
estimated_minutes: 35
prerequisites: ["37.1", "34.1"]
tags: ["hyde", "query-rewriting", "rag", "step-back", "retrieval"]
status: "published"
---

# Why Raw User Queries Fail in Vector Retrieval

Raw user questions are often poorly aligned with documents in vector space:
1. **Asymmetric Query-Document Modality**: Questions look like `"How does RoPE work?"`, while documents look like declarative statements `"Rotary Positional Embedding rotates 2D coordinate pairs..."`.
2. **Ambiguity & Missing Context**: `"What was the revenue in Q3?"` lacks the company name or year.
3. **Multi-Faceted Questions**: A single query contains multiple distinct retrieval constraints.

```mermaid
flowchart TD
    RawQuery["Raw User Query:<br>'How to fix CUDA OOM with KV-cache?'"] --> TransformRouter{"Query Transformation Strategy"}
    TransformRouter -->|Strategy 1: HyDE| HyDE_Flow["Generate Hypothetical Document -> Embed Document Vector"]
    TransformRouter -->|Strategy 2: Multi-Query| Multi_Flow["Generate 3 Query Variations -> Union Retrieval"]
    TransformRouter -->|Strategy 3: Step-Back| Step_Flow["Abstract to High-Level Concept Query"]
```

---

# 1. Hypothetical Document Embeddings (HyDE)

**HyDE** (Gao et al., 2022) uses an LLM to generate a **hypothetical answer document** (which may contain hallucinations, but captures the exact domain vocabulary, syntax, and embedding structure of target documents). The hypothetical document is then embedded to retrieve real documents:

```mermaid
flowchart LR
    Query["User Query"] --> LLM_Gen["LLM: Generate Hypothetical Document D_hypo"]
    LLM_Gen --> Embed["Embedding Model: e = Embed(D_hypo)"]
    Embed --> VectorDB["Vector DB: ANN Search in Document-to-Document Space!"]
    VectorDB --> RealDocs["Real Grounded Documents Retrieved"]
```

# 2. Multi-Query Expansion with Reciprocal Rank Fusion

Multi-Query expansion generates $N$ alternative phrasings of the user query from different semantic angles, retrieves candidates for each, and fuses the result rankings via **Reciprocal Rank Fusion (RRF)**:

```python
import re

def generate_multi_queries(original_query: str) -> list[str]:
    # In production, call an LLM with temperature=0.7
    return [
        original_query,
        f"technical explanation of {original_query}",
        f"architectural implementation details for {original_query}",
        f"troubleshooting and best practices regarding {original_query}"
    ]

print("Generated Query Variations:", generate_multi_queries("FlashAttention SRAM tiling"))
```

---

# Python Implementation of a Complete Query Transformation Pipeline

```python
class AdvancedQueryTransformer:
    def __init__(self, llm_client, embedding_client, vector_db):
        self.llm = llm_client
        self.embed = embedding_client
        self.db = vector_db

    def hyde_retrieve(self, query: str, top_k: int = 5):
        # 1. Generate hypothetical passage
        hyde_prompt = f"Write a comprehensive, technical scientific paragraph answering the question: '{query}'"
        hypothetical_doc = self.llm.generate(hyde_prompt)
        
        # 2. Embed the hypothetical passage (Document-to-Document space)
        hypo_vector = self.embed(hypothetical_doc)
        
        # 3. Retrieve real passages
        return self.db.search(hypo_vector, top_k=top_k)

    def step_back_retrieve(self, query: str):
        # Generate abstract high-level concept query
        step_back_prompt = f"Given the specific question '{query}', what is the broader fundamental underlying concept or principle?"
        high_level_query = self.llm.generate(step_back_prompt)
        
        # Retrieve both specific context and high-level conceptual context
        specific_docs = self.db.search(self.embed(query), top_k=3)
        concept_docs = self.db.search(self.embed(high_level_query), top_k=3)
        return specific_docs + concept_docs
```

---

# Strategy Decision Matrix

| Query Transformation Pattern | Best Used When... | Latency Tradeoff | Risk |
|---|---|---|---|
| **HyDE** | Questions are short/abstract and target declarative factual text | $+1$ LLM forward pass ($\approx 300\text{ ms}$) | Hallucinated facts may bias search if prompt is too narrow |
| **Multi-Query Expansion** | Queries have ambiguous keywords or multiple sub-topics | $+1$ LLM pass $+ N$ vector searches | May retrieve duplicate or marginally relevant chunks |
| **Step-Back Prompting** | Questions require high-level domain background or first-principles logic | $+1$ LLM pass | Adds extra tokens to downstream generation context |

---

# Exercises & Problem Set

**🟢 Problem 1**: Compare retrieval recall on a benchmark technical dataset using raw query embedding vs HyDE hypothetical document embedding.

**🟡 Problem 2**: Implement Reciprocal Rank Fusion (RRF) with constant $k=60$ to merge candidate ranked lists from 3 expanded query streams.

**🔴 Problem 3**: Build a dynamic query classification router that uses a small fast model (e.g. Qwen-0.5B) to automatically decide whether a query requires Direct Search, HyDE, or Multi-Query expansion.
""")

# ==============================================================================
# 3. CHAPTER 41: AGENTIC & SELF-RAG (CRAG)
# ==============================================================================

write_file(r"content/part-06-rag/chapter-41-agentic-self-rag/41.2-corrective-rag-crag.md", r"""---
id: "41.2"
part: 41
chapter: 41
title: "Corrective RAG (CRAG) & Self-RAG Reflection State Machines"
slug: "corrective-rag-crag"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["37.1", "41.1"]
tags: ["crag", "self-rag", "corrective-rag", "agentic-rag", "web-search"]
status: "published"
---

# The Fragility of Static RAG

Static RAG blindly feeds retrieved document chunks to the generator regardless of whether the retrieved context is relevant, incomplete, or completely incorrect.

**Corrective RAG (CRAG)** (Yan et al., 2024) and **Self-RAG** (Asai et al., 2023) introduce **Self-Reflection and Dynamic Fallback Mechanisms**:

```mermaid
flowchart TD
    UserQuery["User Query"] --> Retrieve["1. Vector Retrieval: Fetch Top-K Chunks"]
    Retrieve --> EvalGrade{"2. Retrieval Evaluator / Grader<br>(Evaluate confidence score in [0, 1])"}
    
    EvalGrade -- "Confidence > 0.8 (CORRECT)" --> KnowledgeRefine["3a. Knowledge Refinement:<br>Strip irrelevant sentences & decompose into key facts"]
    EvalGrade -- "0.4 <= Confidence <= 0.8 (AMBIGUOUS)" --> BlendWeb["3b. Combined Synthesis:<br>Blend refined local chunks WITH external Web Search"]
    EvalGrade -- "Confidence < 0.4 (INCORRECT)" --> WebSearch["3c. Web Search Fallback:<br>Discard local chunks; query Tavily / Google Search"]

    KnowledgeRefine --> Generate["4. Final Grounded Generation"]
    BlendWeb --> Generate
    WebSearch --> Generate
```

---

# Self-RAG Special Reflection Tokens

Self-RAG trains the LLM to output explicit structured **Reflection Tokens** at both retrieval and generation stages:

| Reflection Token | Values | Meaning |
|---|---|---|
| `[Retrieve]` | `[Yes]`, `[No]`, `[Continue]` | Decides whether retrieving external knowledge is necessary for the current sentence. |
| `[IsRel]` | `[Relevant]`, `[Irrelevant]` | Evaluates whether retrieved passage $d$ contains useful context. |
| `[IsSup]` | `[Fully supported]`, `[Partially supported]`, `[No support]` | Verifies whether the generated sentence is strictly grounded in retrieved evidence. |
| `[IsUse]` | `[5]`, `[4]`, `[3]`, `[2]`, `[1]` | Rates the overall helpfulness and utility of the response. |

```mermaid
flowchart LR
    Input["Input: 'When was LLaMA-3 released?'"] --> EmitToken["Model emits [Retrieve: Yes]"]
    EmitToken --> FetchDoc["Retrieve context"]
    FetchDoc --> GradeDoc["Model evaluates passage: [IsRel: Relevant]"]
    GradeDoc --> GenSent["Generate response sentence"]
    GenSent --> VerifyGrounded["Model evaluates groundedness: [IsSup: Fully supported]"]
```

---

# Python State Machine Implementation of Corrective RAG (CRAG)

```python
from typing import TypedDict, Literal

class CRAGState(TypedDict):
    query: str
    documents: list[str]
    retrieval_grade: Literal["CORRECT", "AMBIGUOUS", "INCORRECT"]
    web_search_results: list[str]
    final_answer: str

def evaluate_retrieval(state: CRAGState) -> CRAGState:
    query = state["query"]
    docs = state["documents"]
    
    # In production, an LLM evaluates factual relevance
    # Mock confidence scoring:
    has_keywords = any("transformer" in doc.lower() for doc in docs)
    
    if has_keywords and len(docs) >= 2:
        state["retrieval_grade"] = "CORRECT"
    elif has_keywords:
        state["retrieval_grade"] = "AMBIGUOUS"
    else:
        state["retrieval_grade"] = "INCORRECT"
        
    print(f"[CRAG Grader] Decision: {state['retrieval_grade']}")
    return state

def execute_fallback(state: CRAGState) -> CRAGState:
    grade = state["retrieval_grade"]
    if grade == "INCORRECT":
        print("[CRAG Action] Discarding local context. Running web search fallback...")
        state["web_search_results"] = ["Web result: Latest transformer benchmark numbers..."]
    elif grade == "AMBIGUOUS":
        print("[CRAG Action] Blending local documents with complementary web search...")
        state["web_search_results"] = ["Web result: Complementary context..."]
    return state
```

---

# Exercises & Challenges

**🟢 Problem 1**: Trace the decision path of CRAG when querying internal private corporate documents versus querying current stock prices.

**🟡 Problem 2**: Implement a sentence-level Hallucination Grader that segments an LLM response into independent claims and verifies each claim against retrieved chunks.

**🔴 Problem 3**: Build a LangGraph cyclic state machine implementing the complete Corrective RAG pipeline with conditional routing nodes, document graders, and search fallbacks.
""")

# ==============================================================================
# 4. CHAPTER 42: GRAPHRAG & KNOWLEDGE GRAPHS
# ==============================================================================

write_file(r"content/part-06-rag/chapter-42-graphrag/42.2-graphrag-leiden.md", r"""---
id: "42.2"
part: 6
chapter: 42
title: "Microsoft GraphRAG: Leiden Hierarchical Community Summaries & Global Search"
slug: "graphrag-leiden"
difficulty: "advanced"
estimated_minutes: 45
prerequisites: ["37.1", "34.1"]
tags: ["graphrag", "knowledge-graphs", "leiden-clustering", "community-detection", "microsoft"]
status: "published"
---

# Why Vector RAG Fails on Global Sensemaking Queries

Vector RAG operates by finding small, semantically similar text chunks. When asked **Global Thematic Queries** across an entire dataset:
- *"What are the top 5 macroeconomic themes across all 2024 shareholder letters?"*
- *"Summarize all ethical vulnerabilities discovered across the research corpus."*

Vector RAG fails completely because **no single chunk contains the answer**—the answer is distributed across hundreds of disconnected documents!

**Microsoft GraphRAG** (Edge et al., 2024) solves this by constructing a **Hierarchical Knowledge Graph** and pre-generating **Community Summary Reports** across graph clusters.

```mermaid
flowchart TD
    subgraph OfflineIndexing ["1. Offline GraphRAG Indexing Pipeline"]
        RawCorpus["Raw Text Documents"] --> EntityExtract["LLM Extraction: Extract Entities (Nodes) & Relationships (Edges)"]
        EntityExtract --> KnowledgeGraph["Construct Graph Structure: G = (V, E)"]
        KnowledgeGraph --> LeidenClustering["Hierarchical Leiden Community Detection:<br>Partition graph into multi-level hierarchical clusters (Level 0, 1, 2)"]
        LeidenClustering --> CommunitySummaries["LLM: Generate Community Summary Reports for each cluster"]
    end

    subgraph OnlineGlobalSearch ["2. Online Global Query Execution"]
        GlobalQuery["Global Query: 'What are the main themes?'"] --> MapStep["Map: Score & summarize each Community Report in parallel"]
        CommunitySummaries --> MapStep
        MapStep --> ReduceStep["Reduce: Synthesize intermediate points into final executive answer!"]
        ReduceStep --> FinalGlobalAnswer["Comprehensive Global Synthesis"]
    end
```

---

# The Leiden Hierarchical Community Detection Algorithm

The **Leiden Algorithm** partitions the entity knowledge graph into densely connected clusters by optimizing **Modularity $Q$**:

$$Q = \frac{1}{2m} \sum_{i, j} \left[ A_{ij} - \frac{k_i k_j}{2m} \right] \delta(c_i, c_j)$$

Unlike Louvain clustering (which can generate disconnected communities), Leiden guarantees **well-connected communities** and recursively builds a multi-level hierarchy:

```mermaid
flowchart TD
    Level0["Level 0: Macro Communities (e.g. 'Healthcare', 'Energy', 'Financials')"]
    Level0 --> Level1A["Level 1A: 'Oncology Therapeutics'"]
    Level0 --> Level1B["Level 1B: 'Medical Device Hardware'"]
    Level1A --> Level2["Level 2: Micro Subgraphs (Individual drug compounds & clinical trial nodes)"]
```

---

# Global Search vs Local Search in GraphRAG

| Search Paradigm | Query Type Example | Retrieval Target | Algorithmic Mechanism |
|---|---|---|---|
| **Local Search** | *"What are the side effects of Drug X?"* | Specific entity nodes, neighbor edges, and raw text chunks | Subgraph expansion around entity vector matches |
| **Global Search** | *"What are the primary clinical risks across all tested drugs?"* | **Pre-generated Community Reports** | Map-Reduce aggregation across Level-1 & Level-0 community summaries |

---

# Python Graph Entity Extraction Prompt Pattern

```python
import json

def generate_entity_extraction_prompt(chunk_text: str) -> str:
    return (
        "Given the following text, extract all key entities and directed relationships.\\n"
        "Format your output as a strict JSON object with 'entities' and 'relationships'.\\n\\n"
        "Text:\\n"
        f"\\\"{chunk_text}\\\"\\n\\n"
        "JSON Schema:\\n"
        "{\\n"
        '  "entities": [{"name": "Entity Name", "type": "ORGANIZATION|TECHNOLOGY|CONCEPT", "description": "..."}],\\n'
        '  "relationships": [{"source": "Entity A", "target": "Entity B", "description": "...", "weight": 8}]\\n'
        "}"
    )

sample_text = "NVIDIA developed NVLink to connect H100 GPUs with 900 GB/s bidirectional bandwidth."
print("Extraction Prompt:\n", generate_entity_extraction_prompt(sample_text))
```

---

# Exercises & Challenges

**🟢 Problem 1**: Explain why GraphRAG indexing has a higher upfront compute cost (LLM extraction on every chunk) than standard vector embedding indexing, and how it amortizes query costs.

**🟡 Problem 2**: Use `networkx` in Python to build an entity-relationship graph from extracted JSON tuples and compute node degree centrality.

**🔴 Problem 3**: Implement the Map-Reduce Global Search orchestrator that scores community reports by relevance, filters the top 10 reports, and synthesizes a final structured summary.
""")

print("Frontier DPO, Query Transformations, CRAG, and GraphRAG deep lessons written with supreme depth!")
