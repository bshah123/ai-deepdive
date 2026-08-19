import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# PART 5: INFORMATION RETRIEVAL & VECTOR SEARCH
# ==============================================================================

write_file(r"content/part-05-information-retrieval/chapter-33-lexical-search/33.2-bm25-math.md", r"""---
id: "33.2"
part: 5
chapter: 33
title: "BM25 Scoring Function Mathematics & Term Saturation"
slug: "bm25-math"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["22.1"]
tags: ["bm25", "lexical-search", "information-retrieval", "ranking"]
status: "published"
---

# Concept

**BM25 (Best Matching 25)** is the gold-standard probabilistic lexical ranking function used in Elasticsearch, Lucene, and hybrid RAG search engines. 

Unlike raw TF-IDF (which scales linearly or logarithmically with term frequency), BM25 introduces **Term Frequency Saturation** (controlled by parameter $k_1$) and **Document Length Normalization** (controlled by parameter $b$).

```mermaid
flowchart TD
    Query["Query Q = {q1, q2, ... qn}"] --> IDF["Compute IDF for each term qi:<br>IDF(qi) = ln( (N - df + 0.5) / (df + 0.5) + 1 )"]
    Query --> TF["Compute Term Frequency Saturation:<br>TF_sat = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc_len / avg_len)))"]
    IDF --> Score["Sum: BM25(D, Q) = sum( IDF(qi) * TF_sat )"]
    TF --> Score
```

# The BM25 Mathematical Formula

$$\text{Score}(D, Q) = \sum_{i=1}^n \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

### Parameter Analysis:
- $k_1 \in [1.2, 2.0]$: Governs term frequency saturation. As $f(q_i, D) \to \infty$, the term frequency contribution saturates asymptotically at $k_1 + 1$, preventing keyword-stuffed spam documents from dominating scores.
- $b \in [0.5, 0.8]$: Governs document length penalization. $b=1$ fully penalizes long documents; $b=0$ ignores document length entirely. Standard default is $b=0.75$.

# Python Implementation from Scratch

```python
import math
from collections import Counter

class BM25Engine:
    def __init__(self, corpus, k1=1.5, b=0.75):
        self.corpus = [doc.lower().split() for doc in corpus]
        self.N = len(corpus)
        self.avgdl = sum(len(doc) for doc in self.corpus) / self.N
        self.k1 = k1
        self.b = b
        
        # Calculate Document Frequencies (DF)
        self.df = Counter()
        for doc in self.corpus:
            self.df.update(set(doc))
            
        # Precompute IDFs
        self.idf = {}
        for term, freq in self.df.items():
            # Robertson-Spärck Jones IDF formula
            self.idf[term] = math.log((self.N - freq + 0.5) / (freq + 0.5) + 1.0)

    def score(self, query_tokens, doc):
        score = 0.0
        doc_len = len(doc)
        doc_counts = Counter(doc)
        
        for q in query_tokens:
            if q not in self.idf:
                continue
            tf = doc_counts[q]
            idf = self.idf[q]
            
            # BM25 Saturation calculation
            numerator = tf * (self.k1 + 1)
            denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / self.avgdl))
            score += idf * (numerator / denominator)
            
        return score

    def search(self, query, top_k=2):
        q_tokens = query.lower().split()
        scores = [(i, self.score(q_tokens, doc)) for i, doc in enumerate(self.corpus)]
        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]

# Test BM25
docs = [
    "Transformer architectures rely on self-attention mechanisms",
    "Self-attention and multi-head attention in large language models",
    "Cooking recipes with garlic and olive oil"
]
engine = BM25Engine(docs)
print("Query Results:", engine.search("transformer attention"))
```

# Exercises

**🟢 Basic**: Modify the BM25 formula to handle query term weights if query terms appear multiple times.

**🟡 Intermediate**: Benchmark the retrieval recall of BM25 against raw TF-IDF on a synthetic technical documentation corpus.

**🔴 Advanced**: Implement inverted index postings lists with BM25 score upper-bounds for WAND (Weak AND) dynamic query pruning.
""")

write_file(r"content/part-05-information-retrieval/chapter-35-vector-databases/35.3-hnsw-graphs.md", r"""---
id: "35.3"
part: 5
chapter: 35
title: "Hierarchical Navigable Small World (HNSW) Graphs Deep Dive"
slug: "hnsw-graphs"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["35.1", "34.1"]
tags: ["hnsw", "graph-search", "vector-database", "ann", "qdrant"]
status: "published"
---

# Concept

**Hierarchical Navigable Small World (HNSW)** (Malkov & Yashunin, 2018) is the state-of-the-art graph-based algorithm for Approximate Nearest Neighbor (ANN) search across million-to-billion scale high-dimensional embedding vectors.

HNSW constructs a multi-layer graph hierarchy modeled after **Skip-Lists**:
- **Top Layers**: Sparse graphs with long-distance links for rapid $O(\log N)$ logarithmic spatial navigation.
- **Bottom Layer (Layer 0)**: Dense graph containing all data points with short-distance links for precision neighborhood convergence.

```mermaid
flowchart TD
    subgraph Layer2 ["Layer 2: Ultra Sparse (Long Range Expressway)"]
        L2_A["Vector A"] <---> L2_B["Vector B"]
    end

    subgraph Layer1 ["Layer 1: Medium Density"]
        L1_A["Vector A"] <---> L1_C["Vector C"] <---> L1_B["Vector B"]
    end

    subgraph Layer0 ["Layer 0: Dense Bottom Graph (All Data Points)"]
        L0_A["Vector A"] <---> L0_D["Vector D"] <---> L0_C["Vector C"] <---> L0_E["Vector E"] <---> L0_B["Vector B"]
    end

    Query["Query Vector Q"] --> L2_A
    L2_A -. Drop to closest in Layer 1 .-> L1_C
    L1_C -. Drop to closest in Layer 0 .-> L0_D
    L0_D --> NearestNeighbors["Top-K Nearest Neighbors Output"]
```

# HNSW Hyperparameters & Production Tuning

| Hyperparameter | Meaning | Trade-off |
|---|---|---|
| **$M$** (e.g. 16–64) | Max bidirectional links per node | Higher $M$ increases recall & graph construction time; increases RAM. |
| **$efConstruction$** (e.g. 100–500) | Size of dynamic candidate priority queue during index building | Higher $efConstruction$ builds a higher-quality graph at the cost of build time. |
| **$efSearch$** (e.g. 32–128) | Size of dynamic candidate queue during query runtime | Higher $efSearch$ boosts query recall at the cost of latency (queries/sec). |

# Exercises

**🟢 Basic**: Use `faiss.IndexHNSWFlat(dim, M)` or Qdrant to build an HNSW index over 10,000 vectors and plot Recall vs Query Latency as $efSearch$ increases from 8 to 256.

**🟡 Intermediate**: Explain how the heuristic neighbor selection algorithm in HNSW prunes redundant triangular connections to ensure directional diversity.

**🔴 Advanced**: Calculate the exact memory overhead of HNSW graph pointers (each node storing up to $M$ 64-bit integer neighbor IDs per layer) for 100 million vectors.
""")

# ==============================================================================
# PART 6: RETRIEVAL-AUGMENTED GENERATION (RAG)
# ==============================================================================

write_file(r"content/part-06-rag/chapter-37-rag-foundations/37.3-pure-python-rag.md", r"""---
id: "37.3"
part: 6
chapter: 37
title: "Building a Minimalist Zero-Framework RAG System in Pure Python"
slug: "pure-python-rag"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["37.1", "34.1"]
tags: ["rag", "zero-framework", "from-scratch", "pure-python"]
status: "published"
---

# Concept

To master Retrieval-Augmented Generation, we eliminate all high-level framework wrappers (LangChain, LlamaIndex) and construct a complete, functional RAG pipeline using only standard Python and direct model client calls.

```mermaid
flowchart LR
    DocStore["1. Document Chunks"] --> DenseEmbed["2. Embeddings Model<br>(Compute Vector Embeddings)"]
    DenseEmbed --> InMemIndex["3. In-Memory Vector Store<br>(Cosine Similarity Search)"]
    UserQuery["4. User Question"] --> DenseEmbed
    UserQuery --> InMemIndex
    InMemIndex --> Context["5. Retrieved Top-K Context"]
    Context --> AugmentedPrompt["6. Augmented System Prompt"]
    UserQuery --> AugmentedPrompt
    AugmentedPrompt --> LLM["7. LLM Generator<br>(Grounded Response)"]
```

# Complete Pure-Python RAG Pipeline

```python
import math

class MinimalRAG:
    def __init__(self):
        self.documents = []
        self.embeddings = []

    # Simple mock embedding function (Replace with OpenAI/SentenceTransformers)
    def embed(self, text: str) -> list[float]:
        # Hash-based deterministic pseudo-vector for pure python demo
        vec = [0.0] * 8
        for word in text.lower().split():
            idx = hash(word) % 8
            vec[idx] += 1.0
        norm = math.sqrt(sum(x*x for x in vec)) or 1.0
        return [x / norm for x in vec]

    def add_documents(self, docs: list[str]):
        for d in docs:
            self.documents.append(d)
            self.embeddings.append(self.embed(d))

    def retrieve(self, query: str, top_k: int = 2) -> list[str]:
        q_vec = self.embed(query)
        # Cosine similarity dot products
        scores = []
        for i, doc_vec in enumerate(self.embeddings):
            sim = sum(q * d for q, d in zip(q_vec, doc_vec))
            scores.append((sim, self.documents[i]))
        scores.sort(key=lambda x: -x[0])
        return [doc for score, doc in scores[:top_k]]

    def generate_prompt(self, query: str) -> str:
        retrieved_context = self.retrieve(query, top_k=2)
        context_block = "\\n---\\n".join(retrieved_context)
        return "You are a helpful AI assistant. Answer based on context:\\n\\n" + context_block + "\\n\\nQuestion: " + query + "\\nAnswer:"

rag = MinimalRAG()
rag.add_documents([
    "The primary optimizer for LLaMA-3 is AdamW with learning rate warmup.",
    "FlashAttention-2 accelerates attention by tiling blocks in GPU SRAM.",
    "KV-Cache stores past key and value activations to prevent redundant token recomputation."
])

prompt = rag.generate_prompt("How does FlashAttention work?")
print("Constructed Grounded Prompt:\n", prompt)
```

# Exercises

**🟢 Basic**: Connect the `MinimalRAG` class to the official OpenAI or Anthropic Python API client to produce live model completions.

**🟡 Intermediate**: Add sliding-window text chunking with character overlap to the document ingestion stage.

**🔴 Advanced**: Implement a citation attribution mechanism that requires the LLM to output bracketed references `[Doc 1]` matching retrieved source chunks.
""")

# ==============================================================================
# PART 8: AUTONOMOUS AGENTS
# ==============================================================================

write_file(r"content/part-08-autonomous-agents/chapter-48-agent-architectures/48.1-react-loop.md", r"""---
id: "48.1"
part: 8
chapter: 48
title: "Agent Cognitive Architectures: ReAct (Reason + Act) Loop"
slug: "react-loop"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["47.1", "47.2"]
tags: ["react", "agents", "thought-action-observation", "tool-use"]
status: "published"
---

# Concept

**ReAct (Reason + Act)** (Yao et al., 2022) is the foundational cognitive architecture for autonomous AI agents. It interleaves reasoning traces (**Thought**), tool execution requests (**Action**), and environment feedback (**Observation**).

```mermaid
flowchart TD
    UserGoal["User Goal: 'What is the stock price of Apple * 2.5?'"] --> Thought["1. Thought: 'I need to look up AAPL price using stock_search tool.'"]
    Thought --> Action["2. Action: stock_search(ticker='AAPL')"]
    Action --> ToolExec["Tool Execution Engine (External API)"]
    ToolExec --> Obs["3. Observation: 'AAPL: $220.00'"]
    Obs --> Thought2["4. Thought: 'Now calculate 220.00 * 2.5 using calculator tool.'"]
    Thought2 --> Action2["5. Action: calculate(expr='220.00 * 2.5')"]
    Action2 --> ToolExec2["Calculator Tool"]
    ToolExec2 --> Obs2["6. Observation: '550.00'"]
    Obs2 --> FinalThought["7. Thought: 'I have the final answer.'"]
    FinalThought --> FinalAnswer["Final Answer: '$550.00'"]
```

# Python ReAct Agent Implementation from Scratch

```python
import re

class ReActAgent:
    def __init__(self, tools):
        self.tools = tools
        self.system_prompt = (
            "You operate in a loop of Thought, Action, Observation.\\n"
            "Available Tools:\\n"
            "- calculator(expression): Computes mathematical expression\\n"
            "- search(query): Returns factual knowledge\\n\\n"
            "Use format:\\n"
            "Thought: <reasoning>\\n"
            "Action: <tool_name>: <argument>\\n"
            "Observation: <tool_result>\\n"
            "... (repeat until finished)\\n"
            "Thought: I have the final answer\\n"
            "Final Answer: <response>"
        )

    def run_tool(self, action_str):
        match = re.match(r"(\w+):\s*(.*)", action_str)
        if not match:
            return "Invalid action format"
        tool_name, arg = match.groups()
        if tool_name in self.tools:
            return self.tools[tool_name](arg)
        return f"Error: Tool '{tool_name}' not found"

# Define tools
tools = {
    "calculator": lambda expr: str(eval(expr)),  # Safe eval in production
    "search": lambda q: "Paris temperature is 22C" if "paris" in q.lower() else "Unknown"
}

agent = ReActAgent(tools)
print("Agent initialized with tools:", list(tools.keys()))
```

# Exercises

**🟢 Basic**: Trace the ReAct trajectory of an agent asked to calculate the flight duration between two timezones.

**🟡 Intermediate**: Add loop-termination safety guardrails preventing an agent from cycling more than $N=10$ tool calls.

**🔴 Advanced**: Implement the Reflexion architecture where an agent evaluates its own failed code executions, reflects in natural language, and retries with refined plans.
""")

# ==============================================================================
# PART 8: STATE MACHINES & LANGGRAPH
# ==============================================================================

write_file(r"content/part-08-autonomous-agents/chapter-51-state-machines/51.1-langgraph-core.md", r"""---
id: "51.1"
part: 8
chapter: 51
title: "LangGraph Core: StateGraph, Nodes, Edges & Reducers"
slug: "langgraph-core"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["48.1", "50.1"]
tags: ["langgraph", "stategraph", "nodes", "edges", "state-machine"]
status: "published"
---

# Concept

**LangGraph** is an orchestration framework that models agent workflows as **Cyclic State Machines**. 

Unlike simple linear Directed Acyclic Graphs (DAGs), LangGraph allows loops, conditional branching, human-in-the-loop approval, and persistent state checkpoints across agent interactions.

```mermaid
flowchart LR
    Start(["__start__"]) --> AgentNode["Agent Node (LLM Planner)"]
    AgentNode --> ShouldContinue{"Should Call Tool?<br>(Conditional Edge)"}
    ShouldContinue -- "Yes (Action detected)" --> ToolNode["Tool Execution Node"]
    ToolNode --> AgentNode
    ShouldContinue -- "No (Final Answer)" --> EndNode(["__end__"])
```

# LangGraph Architecture Components

1. **State Schema**: A `TypedDict` defining the shared memory of the graph.
2. **Reducers (`Annotated[list, operator.add]`)**: Functions that dictate how updates from individual nodes are merged into state.
3. **Nodes**: Python functions that receive current state, perform computations or LLM calls, and return state updates.
4. **Edges & Conditional Edges**: Routing logic directing control flow between nodes.

# Production Code Pattern

```python
from typing import TypedDict, Annotated
import operator

# 1. Define shared state schema with append reducer
class AgentState(TypedDict):
    messages: Annotated[list[str], operator.add]
    loop_count: int

# 2. Define Node functions
def planner_node(state: AgentState) -> dict:
    print(f"[Planner] Iteration {state['loop_count']}")
    return {
        "messages": [f"Plan created at step {state['loop_count']}"],
        "loop_count": state["loop_count"] + 1
    }

def tool_node(state: AgentState) -> dict:
    print("[Tool Execution] Running search action...")
    return {"messages": ["Tool search result: Success"]}

# 3. Conditional routing function
def router_edge(state: AgentState) -> str:
    if state["loop_count"] > 2:
        return "__end__"
    return "tools"
```

# Exercises

**🟢 Basic**: Build a 3-node LangGraph StateGraph that routes user messages between a triage classifier and specialized support nodes.

**🟡 Intermediate**: Implement a Human-in-the-Loop (HITL) breakpoint using LangGraph's `MemorySaver` checkpointer that halts execution before executing database write tools.

**🔴 Advanced**: Construct a multi-agent coding pipeline with coder, reviewer, and test execution nodes that cycles until all unit tests pass.
""")

print("Parts 5 through 8 authored with supreme depth!")
