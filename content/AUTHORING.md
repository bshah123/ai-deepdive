# Content Authoring Guide — AI-DeepDive

This guide explains how to add new parts, chapters, lessons, quizzes, and diagrams to **AI-DeepDive** without modifying React source code.

---

## 1. Directory Structure

```text
content/
└── part-[NN]-[slug]/
    └── chapter-[NN]-[slug]/
        ├── index.md
        ├── [N.N]-[lesson-slug].md
        ├── summary.md
        ├── quiz.json
        └── project.md
```

## 2. Lesson Frontmatter Convention

Every lesson markdown file must begin with YAML frontmatter:

```yaml
---
id: "2.4"
part: 1
chapter: 2
title: "Identity vs Equality (is vs ==)"
slug: "is-vs-equals"
difficulty: "beginner" # beginner | intermediate | advanced | research
estimated_minutes: 20
prerequisites:
  - "2.3"
tags:
  - is
  - equality
  - identity
status: "published" # published | under-construction | draft
---
```

## 3. Standard Lesson Section Template

Follow this pedagogical structure:

```markdown
# Concept
What is this concept?

# Why does it exist?
What architectural problem does it solve?

# Mental model
ASCII diagram or visual explanation.

# Under the hood
CPython C-struct, PyTorch tensor layout, or CUDA kernel details.

# Example
Executable minimal Python code block with syntax highlighting.

# Step-by-step
Line-by-line execution walkthrough.

# Common traps
Show incorrect assumptions using > [!TRAP] callouts.

# Performance Analysis
Time & space complexity (O(N)), memory overhead, CPU/GPU footprint.

# Debugging
How to inspect this using dis, tracemalloc, or PyTorch profiler.

# AI connection
Why this concept matters in LLMs, RAG, or AI production pipelines.

# Exercise
Concrete task for the learner.
```

## 4. Special Callouts & Syntax

- **Note**: `> [!NOTE]`
- **Tip**: `> [!TIP]`
- **Warning**: `> [!WARNING]`
- **Trap / Common Mistake**: `> [!TRAP]`
- **AI Connection**: `> [!AI]`

## 5. Adding Quizzes

Edit `quiz.json` inside the chapter directory:

```json
{
  "chapterId": "chapter-02",
  "title": "Chapter 2 Quiz — Variables & Memory",
  "questions": [
    {
      "id": "q2.1",
      "question": "What does 'a is b' test?",
      "options": [
        { "id": "a", "text": "Pointer identity in memory" },
        { "id": "b", "text": "Value equality" }
      ],
      "correctOptionId": "a",
      "explanation": "Compares 64-bit heap addresses."
    }
  ]
}
```

## 6. Updating Curriculum Metadata

When adding a new chapter, register it inside `data/curriculum.json`. The sidebar, search index, breadcrumbs, and progress tracker update automatically!
