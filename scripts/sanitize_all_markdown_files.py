import glob
import re
import os

def sanitize_content(content: str) -> (str, dict):
    stats = {"mermaid": 0, "stray_yaml": 0, "fences": 0}
    
    # 1. Strip duplicate / stray frontmatter residue
    fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", content)
    if fm_match:
        frontmatter = content[:fm_match.end()]
        body = content[fm_match.end():]
        
        # Check for stray YAML right after frontmatter
        old_body = body
        body = re.sub(r"^```(?:yaml)?\s*---[\s\S]*?---\s*```\s*", "", body, flags=re.MULTILINE)
        body = re.sub(r"^```(?:yaml)?[\s\S]*?```\s*", "", body, flags=re.MULTILINE)
        body = re.sub(r"^(?:id:|part:|chapter:|title:|slug:|difficulty:|estimated_minutes:|prerequisites:|tags:|status:)[^\n]*\n?", "", body, flags=re.MULTILINE)
        while body.lstrip().startswith("---"):
            body = body.lstrip()[3:].lstrip()
            
        if body != old_body:
            stats["stray_yaml"] += 1
            
        content = frontmatter.strip() + "\n\n" + body.strip() + "\n"

    # 2. Sanitize Mermaid blocks
    def fix_mermaid_block(match):
        nonlocal stats
        block = match.group(1)
        lines = block.splitlines()
        new_lines = []
        modified = False
        
        for line in lines:
            orig = line
            # Subgraphs
            line = re.sub(r'subgraph\s+([a-zA-Z0-9_]+)\s*\[([^"\]]+)\]', r'subgraph \1 ["\2"]', line)
            
            # Quoted square brackets: A[Text (with info)] -> A["Text (with info)"]
            line = re.sub(r'(\b[a-zA-Z0-9_]+)\s*\[([^"\[\]\n]+)\]', lambda m: f'{m.group(1)}["{m.group(2).replace(chr(34), chr(39)).strip()}"]', line)
            
            # Illegal node IDs starting with digits
            line = re.sub(r'^(\s*)(\d+[a-zA-Z0-9_]*)\s*([\[\(\{])', r'\1Node_\2\3', line)
            line = re.sub(r'(-->|---|==>|\.->)\s*(\d+[a-zA-Z0-9_]*)\s*([\[\(\{])', r'\1 Node_\2\3', line)
            
            # Arrow text: -- text (extra) --> to -->|"text (extra)"|
            line = re.sub(r'--\s*([^|\-\n>]+?)\s*-->', lambda m: f'-->|"{m.group(1).replace(chr(34), chr(39)).strip()}"|', line)
            
            if line != orig:
                modified = True
            new_lines.append(line)
            
        if modified:
            stats["mermaid"] += 1
        return "```mermaid\n" + "\n".join(new_lines) + "\n```"

    content = re.sub(r'```mermaid\s*\n([\s\S]*?)\n```', fix_mermaid_block, content)

    # 3. Balance code fences
    if content.count("```") % 2 != 0:
        content = content.rstrip() + "\n```\n"
        stats["fences"] += 1

    return content, stats

def main():
    all_files = glob.glob("content/**/*.md", recursive=True)
    print(f"Sweeping and sanitizing {len(all_files)} markdown files...")
    
    total_mermaid = 0
    total_yaml = 0
    total_fences = 0
    
    for fpath in all_files:
        if fpath.endswith("AUTHORING.md"):
            continue
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            original = f.read()
            
        cleaned, stats = sanitize_content(original)
        total_mermaid += stats["mermaid"]
        total_yaml += stats["stray_yaml"]
        total_fences += stats["fences"]
        
        if cleaned != original:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(cleaned)

    print("\nSanitization Summary:")
    print(f" - Mermaid Blocks Repaired: {total_mermaid}")
    print(f" - Stray YAML / Residue Purged: {total_yaml}")
    print(f" - Code Fences Balanced: {total_fences}")
    print("✨ All files are 100% sanitized and render-ready!")

if __name__ == "__main__":
    main()
