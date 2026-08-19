import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
curriculum_path = os.path.join(base_dir, "data/curriculum.json")

with open(curriculum_path, "r", encoding="utf-8") as f:
    curriculum = json.load(f)

# Content Shape Assignment Strategy
# Shape A: concept-intro (Variables, Basic types)
# Shape B: mental-model-first (Pointers, References, Closures)
# Shape C: problem-solution (RAG, Caching, Indexing, Normalization)
# Shape D: compare-choose (List vs Tuple, is vs ==, MHA vs GQA, GDA vs Logistic)
# Shape E: code-transformation (Decorators, Comprehensions, Async/Await)
# Shape F: debugging-failure (Memory Leaks, UnboundLocalError, OOMs)
# Shape G: under-the-hood (CPython Bytecode, PyListObject, Hash Tables, GIL)
# Shape H: experiment-playground (Floating point precision, Mutability traps)
# Shape I: reference-style (Python Built-ins, HuggingFace APIs)
# Shape J: real-world-application (Search Engines, Production vLLM, Guardrails)
# Shape K: mathematical-derivation (Loss functions, SVD, Poisson, Attention math, DPO)
# Shape L: visual-spatial (RoPE rotation, Vision Transformers, GraphRAG)
# Shape M: case-study (Double Descent, FlashAttention-3 Hopper TMA)
# Shape N: from-scratch (NanoGPT, Micrograd, Pure Python RAG, BM25)
# Shape O: interview-problem-solving (Algorithmic challenges, Complexity)

SHAPE_RULES = {
    # Part 1: Python Language
    "1.1": ("concept-intro", "question"),
    "1.2": ("under-the-hood", "visual"),
    "1.3": ("compare-choose", "comparison"),
    "1.4": ("under-the-hood", "problem"),
    "1.5": ("under-the-hood", "code"),
    
    "2.1": ("mental-model-first", "surprising-fact"),
    "2.2": ("under-the-hood", "visual"),
    "2.3": ("concept-intro", "code"),
    "2.4": ("compare-choose", "code"),
    "2.5": ("mental-model-first", "question"),
    "2.6": ("experiment-playground", "code"),
    "2.7": ("under-the-hood", "visual"),
    "2.8": ("under-the-hood", "problem"),
    "2.9": ("debugging-failure", "failure"),
    "2.10": ("debugging-failure", "problem"),

    "3.1": ("under-the-hood", "surprising-fact"),
    "3.2": ("experiment-playground", "code"),
    "3.3": ("under-the-hood", "visual"),
    "3.4": ("concept-intro", "question"),
    "3.5": ("under-the-hood", "code"),

    "4.1": ("under-the-hood", "visual"),
    "4.2": ("code-transformation", "comparison"),
    "4.3": ("under-the-hood", "visual"),
    "4.4": ("compare-choose", "code"),
    "4.5": ("compare-choose", "problem"),

    "5.1": ("under-the-hood", "visual"),
    "5.2": ("code-transformation", "code"),
    "5.3": ("compare-choose", "comparison"),

    "6.1": ("under-the-hood", "question"),
    "6.2": ("under-the-hood", "visual"),
    "6.3": ("under-the-hood", "visual"),
    "6.4": ("compare-choose", "code"),

    "7.1": ("under-the-hood", "visual"),
    "7.2": ("debugging-failure", "code"),
    "7.3": ("concept-intro", "code"),
    "7.4": ("problem-solution", "problem"),

    "8.1": ("debugging-failure", "failure"),
    "8.2": ("mental-model-first", "code"),
    "8.3": ("code-transformation", "code"),
    "8.4": ("code-transformation", "code"),

    "9.1": ("mental-model-first", "question"),
    "9.2": ("under-the-hood", "visual"),
    "9.3": ("code-transformation", "code"),
    "9.4": ("reference-style", "code"),

    "10.1": ("under-the-hood", "comparison"),
    "10.2": ("under-the-hood", "visual"),
    "10.3": ("debugging-failure", "code"),
    "10.4": ("under-the-hood", "code"),

    # Scientific & ML
    "17.1": ("under-the-hood", "visual"),
    "17.2": ("under-the-hood", "visual"),
    "17.3": ("experiment-playground", "code"),

    "18.1": ("mental-model-first", "visual"),
    "18.2": ("from-scratch", "code"),
    "18.3": ("code-transformation", "code"),

    "19.1": ("mathematical-derivation", "mathematical-intuition"),
    "19.2": ("mathematical-derivation", "mathematical-intuition"),
    "19.3": ("case-study", "surprising-fact"),

    "20.1": ("visual-spatial", "visual"),
    "20.2": ("mathematical-derivation", "visual"),
    "20.3": ("mathematical-derivation", "mathematical-intuition"),

    "21.1": ("from-scratch", "code"),
    "21.2": ("compare-choose", "comparison"),
    "21.3": ("mathematical-derivation", "visual"),

    "22.1": ("mathematical-derivation", "mathematical-intuition"),
    "22.2": ("under-the-hood", "visual"),
    "22.3": ("compare-choose", "comparison"),

    # Transformers & LLMs
    "23.1": ("from-scratch", "visual"),
    "23.2": ("compare-choose", "problem"),
    "23.3": ("reference-style", "code"),

    "24.1": ("under-the-hood", "visual"),
    "24.2": ("visual-spatial", "visual"),
    "24.3": ("compare-choose", "comparison"),

    "25.1": ("mathematical-derivation", "mathematical-intuition"),
    "25.2": ("compare-choose", "visual"),
    "25.3": ("under-the-hood", "visual"),
    "25.4": ("case-study", "problem"),

    "26.1": ("visual-spatial", "visual"),
    "26.2": ("compare-choose", "comparison"),
    "26.3": ("code-transformation", "code"),

    "27.1": ("from-scratch", "code"),
    "27.2": ("under-the-hood", "visual"),
    "27.3": ("compare-choose", "code"),

    "28.1": ("case-study", "surprising-fact"),
    "28.2": ("under-the-hood", "visual"),
    "28.3": ("mathematical-derivation", "comparison"),

    "29.1": ("under-the-hood", "visual"),
    "29.2": ("under-the-hood", "visual"),
    "29.3": ("case-study", "problem"),

    "30.1": ("reference-style", "visual"),
    "30.2": ("code-transformation", "code"),
    "30.3": ("reference-style", "code"),

    "31.1": ("mathematical-derivation", "visual"),
    "31.2": ("case-study", "visual"),
    "31.3": ("real-world-application", "code"),

    "32.1": ("mathematical-derivation", "visual"),
    "32.2": ("compare-choose", "comparison"),
    "32.3": ("real-world-application", "code"),

    # RAG, Retrieval, Agents
    "33.1": ("under-the-hood", "visual"),
    "33.2": ("mathematical-derivation", "visual"),
    "33.3": ("compare-choose", "comparison"),

    "34.1": ("compare-choose", "visual"),
    "34.2": ("mathematical-derivation", "visual"),
    "34.3": ("case-study", "comparison"),

    "35.1": ("compare-choose", "problem"),
    "35.2": ("under-the-hood", "visual"),
    "35.3": ("under-the-hood", "visual"),

    "36.1": ("problem-solution", "problem"),
    "36.2": ("mathematical-derivation", "visual"),

    "37.1": ("problem-solution", "real-world-problem"),
    "37.2": ("case-study", "failure"),
    "37.3": ("from-scratch", "code"),

    "38.1": ("compare-choose", "visual"),
    "38.2": ("real-world-application", "problem"),

    "39.1": ("problem-solution", "visual"),
    "39.2": ("code-transformation", "code"),
    "39.3": ("visual-spatial", "visual"),

    "40.1": ("compare-choose", "comparison"),
    "40.2": ("real-world-application", "code"),

    "41.1": ("problem-solution", "problem"),
    "41.2": ("case-study", "visual"),

    "42.1": ("problem-solution", "real-world-problem"),
    "42.2": ("case-study", "visual"),

    "48.1": ("mental-model-first", "visual"),
    "48.2": ("code-transformation", "code"),

    "49.1": ("under-the-hood", "visual"),
    "49.2": ("real-world-application", "code"),

    "50.1": ("visual-spatial", "visual"),
    "50.2": ("case-study", "problem"),

    "51.1": ("code-transformation", "visual"),
    "51.2": ("real-world-application", "code"),

    "53.1": ("case-study", "visual"),
    "54.1": ("real-world-application", "visual"),
    "55.1": ("debugging-failure", "failure"),
    "56.1": ("real-world-application", "visual"),

    "57.1": ("mathematical-derivation", "visual"),
    "58.1": ("case-study", "visual"),
    "59.1": ("case-study", "visual"),
    "60.1": ("visual-spatial", "visual")
}

# Update all lessons with contentShape & openingType
for part in curriculum["parts"]:
    for chapter in part["chapters"]:
        for lesson in chapter["lessons"]:
            lid = lesson["id"]
            if lid in SHAPE_RULES:
                shape, opening = SHAPE_RULES[lid]
            else:
                # Default heuristic based on part
                pnum = part.get("number", 1)
                if pnum <= 2:
                    shape, opening = "under-the-hood", "code"
                elif pnum <= 4:
                    shape, opening = "mathematical-derivation", "visual"
                elif pnum <= 6:
                    shape, opening = "problem-solution", "real-world-problem"
                else:
                    shape, opening = "case-study", "visual"
            lesson["contentShape"] = shape
            lesson["openingType"] = opening

with open(curriculum_path, "w", encoding="utf-8") as f:
    json.dump(curriculum, f, indent=2)

print("Updated data/curriculum.json with Content Shapes and Opening Types for all 200 lessons!")
