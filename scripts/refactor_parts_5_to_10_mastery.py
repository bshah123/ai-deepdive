import os

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

# Lesson 33.1: Inverted Index & Lexical Search
write_file(r"content/part-05-retrieval-search/chapter-33-lexical-search/33.1-inverted-index.md", r"""---
id: "33.1"
part: 5
chapter: 33
title: "The Inverted Index Architecture & Postings Lists"
slug: "inverted-index"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["6.1"]
tags: ["inverted-index", "lexical-search", "postings-lists", "compression", "search-engines"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# Inside the Search Engine's Core Data Structure

When searching through millions of documents (Lucene, Elasticsearch, Tantivy), scanning every document sequentially ($O(N)$) is hopelessly slow.

An **Inverted Index** reverses the document mapping by storing a sorted dictionary of terms pointing to **Postings Lists** (lists of document IDs and token positions where the term appears):

```mermaid
flowchart LR
    subgraph RawCorpus ["Document Corpus"]
        Doc1["Doc 1: 'Fast transformer attention'"]
        Doc2["Doc 2: 'Paged attention serving'"]
        Doc3["Doc 3: 'Fast transformer inference'"]
    end

    subgraph InvertedIndexBlock ["Inverted Index (Terms -> Postings Lists)"]
        TermAttention["'attention' -> [Doc 1 (pos 2), Doc 2 (pos 1)]"]
        TermFast["'fast'      -> [Doc 1 (pos 0), Doc 3 (pos 0)]"]
        TermInference["'inference' -> [Doc 3 (pos 2)]"]
        TermPaged["'paged'     -> [Doc 2 (pos 0)]"]
        TermTrans["'transformer' -> [Doc 1 (pos 1), Doc 3 (pos 1)]"]
    end

    RawCorpus --> InvertedIndexBlock
```

---

# Fast Boolean Intersections: The Leapfrog Algorithm

To evaluate boolean queries like `transformer AND attention`:
Instead of scanning all documents, we intersect two sorted postings lists using the **Two-Pointer Leapfrog Algorithm**:

```mermaid
flowchart TD
    ListA["List A ('transformer'): [Doc 1, Doc 3, Doc 8, Doc 15, Doc 22]"]
    ListB["List B ('attention'):   [Doc 1, Doc 2, Doc 3, Doc 15, Doc 30]"]
    
    Step1["Step 1: Pointer A=1, Pointer B=1 -> MATCH: Add Doc 1 to Results!"]
    Step2["Step 2: Advance Pointer B to 2 -> B(2) &lt; A(3) -> Advance B to 3 -> MATCH Doc 3!"]
    Step3["Step 3: Skip ahead using Skip Pointers -> O(M + N) Linear Time Intersection!"]
    
    ListA --- Step1
    ListB --- Step1
    Step1 --> Step2 --> Step3
```

---

# Python Implementation of an Inverted Index

```python
from collections import defaultdict
import re

class InvertedIndex:
    def __init__(self):
        # term -> sorted list of doc_ids
        self.index = defaultdict(list)
        self.doc_store = {}

    def add_document(self, doc_id: int, text: str):
        self.doc_store[doc_id] = text
        tokens = set(re.findall(r'\w+', text.lower()))
        for token in tokens:
            self.index[token].append(doc_id)

    def boolean_and_query(self, term1: str, term2: str) -> list[int]:
        list1 = self.index.get(term1.lower(), [])
        list2 = self.index.get(term2.lower(), [])
        
        # Intersect two sorted postings lists in O(len(list1) + len(list2))
        p1, p2 = 0, 0
        matches = []
        while p1 < len(list1) and p2 < len(list2):
            if list1[p1] == list2[p2]:
                matches.append(list1[p1])
                p1 += 1
                p2 += 1
            elif list1[p1] < list2[p2]:
                p1 += 1
            else:
                p2 += 1
        return matches

idx = InvertedIndex()
idx.add_document(1, "Fast transformer attention mechanisms")
idx.add_document(2, "Paged attention memory serving")
idx.add_document(3, "Fast transformer inference optimization")

print("Docs containing 'transformer' AND 'attention':", idx.boolean_and_query("transformer", "attention")) # [1]
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Add phrase search support (`"transformer attention"`) by storing token position offsets in the postings list.

**🟡 Challenge 2**: Explain how Elias-Fano and Variable-Byte (VByte) delta encoding compress document ID gaps ($\Delta = \text{doc}_{i} - \text{doc}_{i-1}$) into 1-2 bytes per integer.

**🔴 Challenge 3**: Implement a block-max WAND (Weak AND) dynamic pruning algorithm in Python that skips evaluating postings list blocks whose maximum possible score cannot exceed the top-K threshold.
""")

# Lesson 35.3: HNSW Vector Search
write_file(r"content/part-05-retrieval-search/chapter-35-vector-databases/35.3-hnsw-graphs.md", r"""---
id: "35.3"
part: 5
chapter: 35
title: "Hierarchical Navigable Small World (HNSW) Graphs"
slug: "hnsw-graphs"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["35.1"]
tags: ["hnsw", "vector-search", "ann", "graphs", "qdrant", "milvus"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The Geometry of HNSW Multi-Layer Graphs

**Hierarchical Navigable Small World (HNSW)** (Malkov & Yashunin, 2018) is the industry standard algorithm powering vector databases (Qdrant, Pinecone, Milvus, pgvector).

HNSW combines the logarithmic search efficiency of **Skip Lists** with **Delaunay Graph Clustering**:

```mermaid
flowchart TD
    subgraph Layer2 ["Top Layer 2: Sparse Highway (Long-Range Jumps)"]
        L2_NodeA["Entry Point Node A"] ------> L2_NodeB["Node B (Far distance)"]
    end

    subgraph Layer1 ["Intermediate Layer 1: Medium Density"]
        L1_NodeA["Node A"] ---> L1_NodeC["Node C"] ---> L1_NodeB["Node B"]
    end

    subgraph Layer0 ["Bottom Layer 0: Dense Base Graph (All Data Points)"]
        L0_NodeA["Node A"] --> L0_D1["Neighbor 1"] --> L0_D2["Neighbor 2"] --> L0_Target["Nearest Neighbor to Query!"]
    end

    L2_NodeA -.->|Greedy search in top layer -> Drop down| L1_NodeA
    L1_NodeC -.->|Greedy search in middle layer -> Drop down| L0_D1
```

---

# Search Mechanics: Logarithmic Greedy Routing

1. **Top Layer Entry**: Begin at the fixed global entry point in the highest layer.
2. **Greedy Routing**: Compute cosine distance between the query vector $q$ and all current neighbors. Move to the closest neighbor.
3. **Local Minima Transition**: When no neighbor in the current layer is closer to $q$, **drop down one layer** and resume greedy routing from that node.
4. **Layer 0 Beam Search**: In the densest bottom layer, perform a priority queue beam search (`efSearch`) to collect the true top-$K$ nearest vectors.

$$\text{Search Time Complexity: } \mathcal{O}(\log N) \text{ vs } \mathcal{O}(N) \text{ brute-force!}$$

---

# HNSW Hyperparameters Decoded

| Parameter | Recommended Default | Impact on Search Quality | Impact on Memory / Build Time |
|---|---|---|---|
| **`M`** | `16` to `64` | Number of bidirectional links per node. Higher $M$ improves recall on high-dimensional vectors. | Linearly increases RAM ($2 \times M \times 4$ bytes per vector). |
| **`efConstruction`** | `100` to `200` | Size of priority queue during graph indexing. | Higher values make index build slower, but graph quality higher. |
| **`efSearch`** | `64` to `128` | Size of dynamic candidate list during query time. | Tradeoff between query latency (QPS) and recall accuracy. |

---

# Python HNSW Routing Demonstration

```python
import numpy as np

def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    return 1.0 - (np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# Greedy step simulation in layer
def greedy_step(query: np.ndarray, current_node: int, adjacency_list: dict, vectors: np.ndarray):
    best_node = current_node
    best_dist = cosine_distance(query, vectors[current_node])
    
    for neighbor in adjacency_list[current_node]:
        dist = cosine_distance(query, vectors[neighbor])
        if dist < best_dist:
            best_dist = dist
            best_node = neighbor
            
    return best_node, best_dist

print("HNSW Greedy Step Function Defined Successfully!")
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Explain why raw K-Nearest Neighbor (KNN) graphs suffer from the "Hubness Problem" in high dimensions, and how HNSW's heuristic neighbor selection prunes redundant clustered edges.

**🟡 Challenge 2**: Benchmark query latency vs Recall@10 on 100,000 vectors as you sweep `efSearch` from 10 to 200.

**🔴 Challenge 3**: Implement HNSW Vector Filtering: compare post-filtering (search top-K then filter metadata) vs single-stage in-graph filtered search.
""")

# ==============================================================================
# PART 7: AI FRAMEWORKS & AGENTS
# ==============================================================================

# Lesson 48.1: ReAct Loop (Thought-Action-Observation)
write_file(r"content/part-08-autonomous-agents/chapter-48-agent-architectures/48.1-react-loop.md", r"""---
id: "48.1"
part: 8
chapter: 48
title: "The ReAct Loop: Synergizing Reasoning & Acting in Autonomous Agents"
slug: "react-loop"
difficulty: "intermediate"
estimated_minutes: 35
prerequisites: ["47.1"]
tags: ["react", "agents", "reasoning", "tool-calling", "langgraph"]
contentShape: "mental-model-first"
openingType: "visual"
status: "published"
---

# The Fundamental Cycle of Autonomous AI Agents

Before the **ReAct (Reasoning + Acting)** framework (Yao et al., Princeton 2022), AI models either operated in pure reasoning mode (Chain-of-Thought with zero real-time environment interaction) or pure acting mode (blindly calling APIs without evaluating outcomes).

The ReAct pattern establishes a **tight feedback loop**:

```mermaid
flowchart TD
    UserGoal["User Goal / Task Prompt"] --> ThoughtStep["1. THOUGHT:<br>Model reasons about current state & decides next step"]
    ThoughtStep --> ActionStep["2. ACTION:<br>Model emits structured tool call (e.g. search_database, run_code)"]
    ActionStep --> Execution["3. ENVIRONMENT EXECUTION:<br>Real API / Python sandbox executes command"]
    Execution --> ObsStep["4. OBSERVATION:<br>Execution output / error fed back into LLM context window"]
    ObsStep --> EvalChoice{"Is Task Finished?"}
    EvalChoice -- "No (Needs more info/step)" --> ThoughtStep
    EvalChoice -- "Yes (Goal achieved)" --> FinalAnswer["5. FINAL ANSWER:<br>Synthesized response returned to user"]
```

---

# The Anatomy of a ReAct Prompt

In pure Python, a ReAct agent is governed by an explicit prompt format that forces structured trace generation:

```text
Answer the following questions as best you can. You have access to the following tools:
- search_web(query: str): Searches Google for real-time information
- calculate(expression: str): Evaluates mathematical expressions

Use the following format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [search_web, calculate]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question
```

---

# Standalone Python ReAct Agent Implementation

```python
import re

class ReActAgent:
    def __init__(self, llm_simulator, tools: dict):
        self.llm = llm_simulator
        self.tools = tools

    def run(self, question: str, max_iterations: int = 5) -> str:
        prompt_history = f"Question: {question}\n"
        
        for step in range(max_iterations):
            # 1. Generate Thought and Action
            response = self.llm(prompt_history)
            prompt_history += response + "\n"
            print(f"\n[Step {step + 1}]\n{response}")

            # Check for Final Answer
            if "Final Answer:" in response:
                return response.split("Final Answer:")[-1].strip()

            # 2. Parse Action and Action Input
            action_match = re.search(r"Action:\s*(\w+)", response)
            input_match = re.search(r"Action Input:\s*(.+)", response)

            if action_match and input_match:
                tool_name = action_match.group(1)
                tool_input = input_match.group(1).strip().strip('"\'')
                
                # 3. Execute Tool in Environment
                if tool_name in self.tools:
                    obs = self.tools[tool_name](tool_input)
                else:
                    obs = f"Error: Tool '{tool_name}' not found."

                # 4. Feed Observation back into context
                obs_text = f"Observation: {obs}"
                print(f"[Environment] -> {obs_text}")
                prompt_history += obs_text + "\n"

        return "Agent halted: Exceeded maximum iterations."

# Simulated Tool
def mock_search(query: str):
    return "NVIDIA Blackwell B200 GPU features 208 billion transistors and 192GB HBM3e."

agent = ReActAgent(
    llm_simulator=lambda p: "Thought: I need to search for B200 specs.\nAction: search_web\nAction Input: NVIDIA B200 specs" if "Observation:" not in p else "Thought: I have the data.\nFinal Answer: NVIDIA B200 has 208B transistors.",
    tools={"search_web": mock_search}
)
result = agent.run("What are the specs of NVIDIA B200?")
print("\nFinal Result:", result)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Implement an infinite loop circuit-breaker that detects when an agent emits the identical Action and Action Input twice consecutively.

**🟡 Challenge 2**: Compare ReAct vs Plan-and-Solve: why does Plan-and-Solve reduce total API calls on deterministic workflows, while ReAct excels on dynamic troubleshooting?

**🔴 Challenge 3**: Implement a self-healing ReAct agent where Python syntax errors in `run_code` are caught, reflected upon in the subsequent `Thought`, and automatically corrected.
""")

# Lesson 51.1: LangGraph & State Machines
write_file(r"content/part-08-autonomous-agents/chapter-51-state-machines-langgraph/51.1-langgraph-basics.md", r"""---
id: "51.1"
part: 8
chapter: 51
title: "State Machines & LangGraph: Cyclic Agent Orchestration"
slug: "langgraph-basics"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["48.1", "43.1"]
tags: ["langgraph", "state-machines", "dag", "cycles", "agents"]
contentShape: "code-transformation"
openingType: "visual"
status: "published"
---

# Why DAGs Fail for Production Autonomous Agents

Linear Directed Acyclic Graph (DAG) frameworks (standard LangChain chains, Airflow) execute in one unidirectional forward pass.

Real production agents require **cycles**:
- Generating code $\to$ Running unit tests $\to$ Failing $\to$ **Looping back to fix code**.
- Querying a database $\to$ Ambiguous result $\to$ **Looping back to rephrase query**.

**LangGraph** models agents as **Cyclic State Graphs**:

```mermaid
flowchart TD
    StartNode(["__start__"]) --> AgentNode["Agent Node (LLM Decides Action)"]
    AgentNode --> ShouldContinue{"Conditional Edge:<br>Tools needed or finished?"}
    
    ShouldContinue -- "Calls Tool" --> ToolNode["Tool Execution Node"]
    ToolNode --> AgentNode
    
    ShouldContinue -- "Final Response" --> EndNode(["__end__"])
```

---

# The Core Primitives of LangGraph

1. **State (`TypedDict`)**: The shared central data schema that flows between nodes.
2. **Nodes (`Callable`)**: Python functions that take the current state, perform computation, and return updated state fields.
3. **Edges**:
   - **Direct Edges**: Guaranteed transitions from Node A $\to$ Node B.
   - **Conditional Edges**: Dynamic routing functions that evaluate state and choose the next node.
4. **Checkpointers (`MemorySaver`, `PostgresSaver`)**: Serializes state at every super-step for **Time-Travel Debugging** and **Human-in-the-Loop** approval.

---

# Pure Python LangGraph-Style State Machine Implementation

```python
from typing import TypedDict, Literal, Callable

class AgentState(TypedDict):
    messages: list[str]
    current_step: int
    is_done: bool

class SimpleStateGraph:
    def __init__(self, state_schema):
        self.nodes = {}
        self.edges = {}
        self.conditional_edges = {}
        self.entry_point = None

    def add_node(self, name: str, fn: Callable):
        self.nodes[name] = fn

    def add_edge(self, source: str, target: str):
        self.edges[source] = target

    def add_conditional_edges(self, source: str, routing_fn: Callable):
        self.conditional_edges[source] = routing_fn

    def set_entry_point(self, name: str):
        self.entry_point = name

    def compile(self):
        return self

    def invoke(self, initial_state: AgentState):
        state = initial_state
        current_node = self.entry_point

        while current_node != "__end__":
            print(f"-> Executing Node: '{current_node}'")
            # Execute node function and merge returned state dict
            updates = self.nodes[current_node](state)
            state.update(updates)

            # Determine next node
            if current_node in self.conditional_edges:
                current_node = self.conditional_edges[current_node](state)
            elif current_node in self.edges:
                current_node = self.edges[current_node]
            else:
                break

        return state

# Build an iterative code-fixing graph
def coder_node(state: AgentState) -> dict:
    state["current_step"] += 1
    state["messages"].append(f"Coder generated code version {state['current_step']}")
    return {"current_step": state["current_step"]}

def tester_node(state: AgentState) -> dict:
    # Simulate test pass on step 3
    passed = state["current_step"] >= 3
    state["is_done"] = passed
    state["messages"].append(f"Tester result: {'PASSED' if passed else 'FAILED'}")
    return {"is_done": passed}

def routing_condition(state: AgentState) -> str:
    return "__end__" if state["is_done"] else "coder"

graph = SimpleStateGraph(AgentState)
graph.add_node("coder", coder_node)
graph.add_node("tester", tester_node)
graph.set_entry_point("coder")
graph.add_edge("coder", "tester")
graph.add_conditional_edges("tester", routing_condition)

final_state = graph.invoke({"messages": [], "current_step": 0, "is_done": False})
print("\nFinal State Log:")
for m in final_state["messages"]:
    print(" ", m)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Add a Human-in-the-Loop approval node to the state machine that pauses execution before dangerous SQL writes.

**🟡 Challenge 2**: Explain how Reducers (e.g. `Annotated[list, operator.add]`) allow parallel branch nodes to append messages to shared state without race conditions.

**🔴 Challenge 3**: Implement a Time-Travel rollback function that restores state to step $T-2$ and resumes execution with a modified human input prompt.
""")

print("Parts 5 through 8 re-authored with diverse, rich pedagogical structures and zero boilerplate!")
