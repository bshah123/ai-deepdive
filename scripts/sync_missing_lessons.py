import shutil
import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

files_to_sync = [
    (
        "content/part-04-transformers-llms/chapter-28-training-llms/28.4-grpo-deepseek-r1.md",
        "content/part-04-transformers-llms/chapter-28-llm-training/28.4-grpo-deepseek-r1.md"
    ),
    (
        "content/part-10-evaluation-frontiers/chapter-60-multimodal-frontier/60.4-diffusion-transformers-dit.md",
        "content/part-10-evaluation-research/chapter-60-research-llm-systems/60.4-diffusion-transformers-dit.md"
    )
]

for src, dst in files_to_sync:
    src_full = os.path.join(base_dir, src)
    dst_full = os.path.join(base_dir, dst)
    if os.path.exists(src_full):
        os.makedirs(os.path.dirname(dst_full), exist_ok=True)
        shutil.copy2(src_full, dst_full)
        print(f"Synced: {src} -> {dst}")

print("Sync completed!")
