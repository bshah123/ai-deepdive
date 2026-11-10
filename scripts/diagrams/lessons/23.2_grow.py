"""Lesson 23.2: vocabulary growth of BPE and WordPiece (12 merges) on the toy corpus of 23.2_unigram_train.py.
Feeds the staircases in 23.2-grow-vs-prune.svg. Run: python scripts/diagrams/lessons/23.2_grow.py"""
import random
from collections import Counter
random.seed(0)
suffixes = ["", "s", "ed", "ing"]
common = ["walk", "talk", "jump", "play", "look", "cook", "help", "kick"]
rare = ["jog", "nod", "hop", "zip", "mix", "fix", "pack", "lock", "rock", "wish", "rush", "bark"]
corpus = {stem + suf: random.randint(3, 9) for stem in common for suf in suffixes}
for stem in rare:
    corpus[stem + random.choice(suffixes)] = 1
chars = sorted({c for w in corpus for c in w})
print("characters:", len(chars))
for mode in ["BPE", "WordPiece"]:
    if mode == "BPE":
        splits = {w: list(w) for w in corpus}
    else:
        splits = {w: [w[0]] + ["##"+c for c in w[1:]] for w in corpus}
    vocab = {u for s in splits.values() for u in s}
    sizes=[len(vocab)]; merges=[]
    for _ in range(12):
        unit, pair = Counter(), Counter()
        for w,f in corpus.items():
            s=splits[w]
            for u in s: unit[u]+=f
            for a,b in zip(s,s[1:]): pair[a,b]+=f
        if mode=="BPE": best=max(pair,key=pair.get)
        else: best=max(pair,key=lambda ab: pair[ab]/(unit[ab[0]]*unit[ab[1]]))
        a,b=best; new=a+b.removeprefix("##")
        for w,s in splits.items():
            out,i=[],0
            while i<len(s):
                if s[i:i+2]==[a,b]: out.append(new); i+=2
                else: out.append(s[i]); i+=1
            splits[w]=out
        vocab.add(new); merges.append(new); sizes.append(len(vocab))
    print(mode, "sizes", sizes); print("  merges", merges)
