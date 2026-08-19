import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(base_dir, "data/curriculum.json"), "r") as f:
    data = json.load(f)

for part in data["parts"]:
    part_dir = os.path.join(base_dir, "content", f"{part['id']}-{part['slug']}")
    os.makedirs(part_dir, exist_ok=True)
    
    for ch in part["chapters"]:
        ch_dir = os.path.join(part_dir, f"{ch['id']}-{ch['slug']}")
        os.makedirs(ch_dir, exist_ok=True)
        
        for lesson in ch["lessons"]:
            filepath = os.path.join(ch_dir, lesson["file"])
            if not os.path.exists(filepath):
                content = f"""---
id: "{lesson['id']}"
part: {part['number']}
chapter: {ch['number']}
title: "{lesson['title']}"
slug: "{lesson['slug']}"
difficulty: "{lesson['difficulty']}"
estimated_minutes: {lesson['estimatedMinutes']}
prerequisites: []
tags: {json.dumps(lesson['tags'])}
status: "{lesson['status']}"
---

# Concept

This lesson covers **{lesson['title']}** as part of Chapter {ch['number']}: {ch['title']}.

> [!NOTE]
> This lesson is currently **under construction** and will be published in an upcoming curriculum update.

# Curriculum Overview

- **Part {part['number']}**: {part['title']}
- **Chapter {ch['number']}**: {ch['title']}
- **Topic**: {lesson['title']}

# Key Concepts to be Covered

1. Mathematical foundations and mental models.
2. Low-level CPython / PyTorch / CUDA internals.
3. From-scratch Python implementation.
4. Production framework integration.
5. Common traps, debugging intuition, and interview preparation.
"""
                with open(filepath, "w") as lf:
                    lf.write(content)

        # Create summary & quiz placeholders if missing
        summary_path = os.path.join(ch_dir, "summary.md")
        if not os.path.exists(summary_path):
            with open(summary_path, "w") as sf:
                sf.write(f"# Chapter {ch['number']} Summary — {ch['title']}\n\nThis chapter is under construction.")

        quiz_path = os.path.join(ch_dir, "quiz.json")
        if not os.path.exists(quiz_path):
            with open(quiz_path, "w") as qf:
                quiz_data = {
                    "chapterId": ch["id"],
                    "title": f"Chapter {ch['number']} Quiz — {ch['title']}",
                    "questions": [
                        {
                            "id": f"q{ch['number']}.1",
                            "question": f"Key question regarding {ch['title']}?",
                            "options": [
                                { "id": "a", "text": "Correct conceptual model option" },
                                { "id": "b", "text": "Incorrect option" }
                            ],
                            "correctOptionId": "a",
                            "explanation": f"Explanation of {ch['title']} internal mechanisms."
                        }
                    ]
                }
                json.dump(quiz_data, qf, indent=2)

print("Skeleton generation complete!")
