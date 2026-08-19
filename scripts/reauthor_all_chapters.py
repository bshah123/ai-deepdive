import os
import sys
import json
import time
import glob
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from concurrent.futures import ThreadPoolExecutor, as_completed
from scripts.reauthor_engine import (
    reauthor_single_lesson,
    load_progress,
    save_progress,
    PROGRESS_FILE
)

def get_all_lessons_plan(target_part=None, target_chapter=None):
    with open("data/curriculum.json", "r", encoding="utf-8") as f:
        curr = json.load(f)
        
    all_md = glob.glob("content/**/*.md", recursive=True)
    id_map = {}
    for fpath in all_md:
        if fpath.endswith("summary.md") or fpath.endswith("project.md") or fpath.endswith("AUTHORING.md") or fpath.endswith("index.md"):
            continue
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as mf:
                head = mf.read(600)
                for line in head.splitlines():
                    if line.strip().startswith("id:"):
                        val = line.split(":", 1)[1].strip().replace('"', '').replace("'", "")
                        id_map[val] = fpath
                        break
        except:
            pass
            
    plan = []
    
    for p in curr["parts"]:
        pnum = p["number"]
        if target_part is not None and str(pnum) != str(target_part) and p["id"] != str(target_part):
            continue
            
        p_prefix1 = f"part-{pnum:02d}"
        p_prefix2 = f"part-{pnum}-"
        pdirs = [d for d in os.listdir("content") if (d.startswith(p_prefix1) or d.startswith(p_prefix2)) and os.path.isdir(os.path.join("content", d))]
        pdir = os.path.join("content", pdirs[0]) if pdirs else None
        
        for c in p["chapters"]:
            cnum = int(c["number"])
            if target_chapter is not None and str(cnum) != str(target_chapter) and c["id"] != str(target_chapter):
                continue
                
            cdir = None
            if pdir and os.path.exists(pdir):
                c_prefix1 = f"chapter-{cnum:02d}"
                c_prefix2 = f"chapter-{cnum}-"
                cdirs = [d for d in os.listdir(pdir) if (d.startswith(c_prefix1) or d.startswith(c_prefix2)) and os.path.isdir(os.path.join(pdir, d))]
                cdir = os.path.join(pdir, cdirs[0]) if cdirs else None
                
            for l in c.get("lessons", []):
                lid = l["id"]
                lfile = l.get("file", f"{lid}-{l.get('slug', 'lesson')}.md")
                
                # Check if file resolved in id_map
                resolved_path = id_map.get(lid)
                if not resolved_path:
                    if cdir and os.path.exists(os.path.join(cdir, lfile)):
                        resolved_path = os.path.join(cdir, lfile)
                    elif cdir:
                        resolved_path = os.path.join(cdir, lfile)
                    else:
                        resolved_path = os.path.join("content", f"part-{pnum:02d}", f"chapter-{cnum:02d}", lfile)
                        
                plan.append({
                    "lesson": l,
                    "chapter": c,
                    "part": p,
                    "file_path": resolved_path,
                    "id": lid,
                    "title": l["title"]
                })
                
    return plan

def process_lesson_task(item, progress):
    lid = item["id"]
    try:
        reauthor_single_lesson(item["lesson"], item["chapter"], item["part"], item["file_path"])
        progress[lid] = {
            "status": "completed",
            "timestamp": time.time(),
            "file_path": item["file_path"],
            "title": item["title"]
        }
        save_progress(progress)
        return True, lid, item["title"]
    except Exception as e:
        print(f"❌ Error processing lesson {lid}: {e}")
        return False, lid, str(e)

def main():
    parser = argparse.ArgumentParser(description="Reauthor AI-DeepDive curriculum lessons using Mistral API")
    parser.add_argument("--part", type=str, default=None, help="Target specific part (e.g. 1, 2, 'part-01', or 'all')")
    parser.add_argument("--chapter", type=str, default=None, help="Target specific chapter number or id")
    parser.add_argument("--workers", type=int, default=2, help="Number of concurrent workers (default: 2 for rate limits)")
    parser.add_argument("--force", action="store_true", help="Force reauthor even if marked completed")
    args = parser.parse_args()
    
    target_part = None if args.part in [None, "all", "ALL"] else args.part
    
    plan = get_all_lessons_plan(target_part=target_part, target_chapter=args.chapter)
    progress = load_progress()
    
    if not args.force:
        pending = [item for item in plan if item["id"] not in progress or progress[item["id"]].get("status") != "completed"]
    else:
        pending = plan
        
    print(f"================================================================", flush=True)
    print(f"📚 AI-DeepDive Curriculum Reauthoring Pipeline (Powered by Mistral)", flush=True)
    print(f"   Total lessons in scope : {len(plan)}", flush=True)
    print(f"   Already completed      : {len(plan) - len(pending)}", flush=True)
    print(f"   Pending to reauthor    : {len(pending)}", flush=True)
    print(f"   Workers (Concurrency)  : {args.workers}", flush=True)
    print(f"================================================================\n", flush=True)
    
    if not pending:
        print("All target lessons are already completed! Use --force to re-run.", flush=True)
        return
        
    start_time = time.time()
    completed_count = 0
    failed_count = 0
    
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(process_lesson_task, item, progress): item for item in pending}
        for future in as_completed(futures):
            success, lid, msg = future.result()
            if success:
                completed_count += 1
                print(f"[{completed_count + (len(plan) - len(pending))}/{len(plan)}] Finished: {lid} - {msg}", flush=True)
            else:
                failed_count += 1
                print(f"[{completed_count + (len(plan) - len(pending))}/{len(plan)}] ⚠️ Failed: {lid} - {msg}", flush=True)
                
    elapsed = time.time() - start_time
    print(f"\n================================================================", flush=True)
    print(f"🏁 Reauthoring Batch Complete!", flush=True)
    print(f"   Successfully finished : {completed_count}", flush=True)
    print(f"   Failed                : {failed_count}", flush=True)
    print(f"   Time elapsed          : {elapsed:.2f} seconds ({elapsed/60:.1f} min)", flush=True)
    print(f"================================================================", flush=True)

if __name__ == "__main__":
    main()
