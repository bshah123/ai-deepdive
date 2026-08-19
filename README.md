# AI-DeepDive — Master Modern AI Systems

`AI-DeepDive` is a local-first, self-hosted educational platform built in the style of LearnCpp. It provides a structured, textbook-like learning experience for **Python, Machine Learning, Transformers, LLMs, Information Retrieval, RAG, Autonomous Agents, and Production AI**.

> **Educational Philosophy**: Concept → Why it exists → Mental model → Under the hood → From-scratch implementation → Production implementation → Experiment → Common traps → Performance analysis → Debugging intuition → AI connection → Mini project.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- pnpm / npm

### Installation & Local Run

```bash
# 1. Install dependencies
pnpm install

# 2. Run content validation script
pnpm run validate-content

# 3. Start local development server
pnpm run dev
```

Open your browser at `http://localhost:3000`.

---

## 📚 Curriculum Roadmap (10 Parts, 60 Chapters)

- **Part I — Python, Properly** (Chapters 1–14): Execution pipeline, `PyObject` structure, object identity, memory layout, reference counting, garbage collection, generators, OOP, and MRO.
- **Part II — Scientific Python & Tensors** (Chapters 15–18): NumPy strides, memory views, PyTorch tensors, autograd engine from scratch.
- **Part III — ML & NLP** (Chapters 19–22): Linear algebra, calculus, MLP from scratch, Word2Vec embeddings.
- **Part IV — Transformers & LLMs** (Chapters 23–32): BPE tokenizers, RoPE positional encodings, Self-Attention matrix math, Transformer blocks, NanoGPT, KV Cache, LoRA, AWQ/GGUF Quantization.
- **Part V — Information Retrieval & Vector Search** (Chapters 33–36): Inverted indices, Okapi BM25, exact vector search, HNSW graph index, FAISS.
- **Part VI — Retrieval-Augmented Generation (RAG)** (Chapters 37–45): Ingestion pipelines, semantic chunking, hybrid search (RRF), Cross-Encoder reranking, HyDE, GraphRAG, Ragas evaluation harness.
- **Part VII — LLM Application Frameworks** (Chapters 46–48): LangChain LCEL runnables, LlamaIndex node storage pipelines.
- **Part VIII — Autonomous Agents** (Chapters 49–51): Tool calling JSON schemas, ReAct reasoning loop, multi-agent graph orchestration.
- **Part IX — Production AI & System Design** (Chapters 52–56): SSE token streaming, FastAPI gateways, vLLM continuous batching, Docker CUDA deployments, enterprise RAG system design.
- **Part X — Evaluation, Safety & Research** (Chapters 57–60): LLM-as-a-Judge, prompt injection defenses, MoE & Mamba SSM architectures.

---

## 🛠 Features

- **Offline-First**: Runs entirely on your local machine using client-side MiniSearch index and `localStorage`.
- **Command Palette (`Cmd + K`)**: Global fast search across all 60 chapters, headings, tags, and glossary definitions.
- **Interactive Sandbox Code Blocks**: Copy code, trigger simulated runtime executions, and view output panels.
- **Interactive Quizzes**: Chapter-end quizzes with instant correctness feedback and deep-dive explanations.
- **Reading Modes**: Toggle between **Standard**, **Focus (Learning Mode)**, and **Reference Mode**.
- **Personal Notes & Bookmarks**: Store notes and bookmark lessons locally.
- **Content Validator**: Validate frontmatter schemas, link integrity, and duplicate IDs using `pnpm run validate-content`.

---

## 📄 Authoring Guide

To add new lessons or chapters without modifying React source code, see [`content/AUTHORING.md`](./content/AUTHORING.md).

---

## ⚡ Production Build

```bash
# Build static site bundle
pnpm run build

# Preview build locally
pnpm run preview
```
