import os
import re

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
content_dir = os.path.join(base_dir, "content")

REPLACEMENTS = [
    "# Execution Trace & Runtime Mechanics",
    "# Algorithmic Dispatch & State Transitions",
    "# Lifecycle Stages & Operational Flow",
    "# Step-by-Step Mechanical Trace",
    "# Pipeline Execution & State Mutations"
]

count = 0
for root, _, files in os.walk(content_dir):
    for file in files:
        if file.endswith(".md") and file != "AUTHORING.md":
            fp = os.path.join(root, file)
            with open(fp, "r", encoding="utf-8") as f:
                text = f.read()
            if "# Step-by-Step Execution Walkthrough" in text:
                rep = REPLACEMENTS[count % len(REPLACEMENTS)]
                new_text = text.replace("# Step-by-Step Execution Walkthrough", rep)
                with open(fp, "w", encoding="utf-8") as f:
                    f.write(new_text)
                count += 1

print(f"Replaced {count} repetitive Step-by-Step headings with diverse, dynamic section titles!")
