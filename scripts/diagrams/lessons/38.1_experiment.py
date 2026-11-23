#!/usr/bin/env python3
"""Lesson 38.1 experiment. Every number in the lesson comes from one run of this file.

Builds PDFs with reportlab, extracts them with pdfminer.six, and scores reading order,
table column recovery, and the text-layer check for a scanned page.
Usage: python experiment.py <workdir>
"""
import json
import random
import re
import sys
from bisect import bisect_right
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pdfminer.converter import PDFPageAggregator
from pdfminer.high_level import extract_pages, extract_text
from pdfminer.pdfinterp import PDFPageInterpreter, PDFResourceManager
from pdfminer.pdfpage import PDFPage
from pdfminer.layout import (LAParams, LTChar, LTCurve, LTFigure, LTLine, LTPage,
                             LTRect, LTTextContainer, LTTextLine)
from reportlab import Version as RL_VERSION
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

import pdfminer
WORK = Path(sys.argv[1])
WORK.mkdir(parents=True, exist_ok=True)
RESULTS = {"versions": {"pdfminer.six": pdfminer.__version__, "reportlab": RL_VERSION}}


# ---------- generic pdfminer walkers ----------
def raw_page(path):
    """One page with glyphs in content-stream order: layout analysis disabled (laparams=None)."""
    rsrc = PDFResourceManager()
    dev = PDFPageAggregator(rsrc, laparams=None)
    interp = PDFPageInterpreter(rsrc, dev)
    with open(path, "rb") as f:
        for page in PDFPage.get_pages(f):
            interp.process_page(page)
            return dev.get_result()


def iter_all(o):
    yield o
    if isinstance(o, (LTPage, LTTextContainer, LTFigure)):
        for child in o:
            yield from iter_all(child)


def iter_chars(o):
    return (x for x in iter_all(o) if isinstance(x, LTChar))


def walk_lines(o, out):
    if isinstance(o, LTTextLine):
        out.append(o)
    elif isinstance(o, (LTPage, LTTextContainer, LTFigure)):
        for child in o:
            walk_lines(child, out)
    return out


# ---------- Experiment A: reading order of a two-column page ----------
FILL = "lorem ipsum dolor sit amet elit"
TRUTH = ["TITLE"] + [f"L{i:02d}" for i in range(1, 13)] + [f"R{i:02d}" for i in range(1, 13)]
TIDX = {t: i for i, t in enumerate(TRUTH)}
POS = {"TITLE": (72, 742)}
for i in range(1, 13):
    y = 720 - 12 * (i - 1)
    POS[f"L{i:02d}"] = (72, y)
    POS[f"R{i:02d}"] = (320, y)


def text_of(lab):
    return "TITLE Two-column report" if lab == "TITLE" else f"{lab} {FILL}"


for lab in TRUTH:
    if lab != "TITLE":
        assert stringWidth(text_of(lab), "Helvetica", 10) < 240, lab


def draw_page(path, order):
    c = canvas.Canvas(str(path), pagesize=letter)
    for lab in order:
        x, y = POS[lab]
        c.setFont("Helvetica-Bold" if lab == "TITLE" else "Helvetica", 14 if lab == "TITLE" else 10)
        c.drawString(x, y, text_of(lab))
    c.save()


ORDERS = {
    "column-major": list(TRUTH),  # left column, then right column, as typeset
    "row-major": ["TITLE"] + [x for i in range(1, 13) for x in (f"L{i:02d}", f"R{i:02d}")],
    "shuffled": random.Random(7).sample(TRUTH, len(TRUTH)),  # absolutely placed boxes, creation order
}


def label_of(text):
    m = re.match(r"(TITLE|[LR]\d\d)", text.replace(" ", ""))
    return m.group(1)


def stream_order(path):
    """Order in which glyphs appear in the content stream (no layout analysis)."""
    page = raw_page(path)
    lines, cur = [], None
    for ch in iter_chars(page):
        if cur is None or abs(ch.y0 - cur["y0"]) > 0.5 or ch.x0 < cur["x1"] - 0.5 or ch.x0 - cur["x1"] > 15:
            cur = {"y0": ch.y0, "x1": ch.x1, "text": ""}
            lines.append(cur)
        cur["text"] += ch.get_text()
        cur["x1"] = ch.x1
    return [label_of(l["text"]) for l in lines if l["text"].strip()]


def pdfminer_lines(path):
    page = next(extract_pages(str(path), laparams=LAParams()))
    return walk_lines(page, [])


def line_items(path):
    return [(ln.x0, ln.y0, ln.x1, ln.y1, label_of(ln.get_text())) for ln in pdfminer_lines(path)]


def xy_cut(items, min_gap):
    """Recursive XY-cut (Ha, Haralick & Phillips 1995): cut on horizontal gaps, then vertical gaps."""
    if len(items) <= 1:
        return [t[4] for t in items]
    its = sorted(items, key=lambda t: -t[3])  # top edge, highest first (PDF y grows upward)
    groups, cur, bottom = [], [its[0]], its[0][1]
    for t in its[1:]:
        if t[3] < bottom - min_gap:
            groups.append(cur)
            cur, bottom = [t], t[1]
        else:
            cur.append(t)
            bottom = min(bottom, t[1])
    groups.append(cur)
    if len(groups) > 1:
        return [lab for g in groups for lab in xy_cut(g, min_gap)]
    its = sorted(items, key=lambda t: t[0])
    groups, cur, right = [], [its[0]], its[0][2]
    for t in its[1:]:
        if t[0] > right + min_gap:
            groups.append(cur)
            cur, right = [t], t[2]
        else:
            cur.append(t)
            right = max(right, t[2])
    groups.append(cur)
    if len(groups) > 1:
        return [lab for g in groups for lab in xy_cut(g, min_gap)]
    return [t[4] for t in sorted(items, key=lambda t: (-t[3], t[0]))]


def adjacency(pred):
    """Fraction of consecutive predicted pairs that are consecutive in the truth."""
    assert len(set(pred)) == len(pred), "duplicate line"
    idx = [TIDX[p] for p in pred]
    ok = sum(b == a + 1 for a, b in zip(idx, idx[1:]))
    return round(ok / (len(idx) - 1), 3), len(idx)


exp_a = {}
for name, order in ORDERS.items():
    path = WORK / f"A_{name}.pdf"
    draw_page(path, order)
    items = line_items(path)
    methods = {
        "stream order": stream_order(path),
        "pdfminer default": [label_of(l.get_text()) for l in pdfminer_lines(path)],
        "top-to-bottom sort": [t[4] for t in sorted(items, key=lambda t: (-t[3], t[0]))],
        "XY-cut, min_gap 6 pt": xy_cut(items, 6.0),
    }
    exp_a[name] = {m: adjacency(p) for m, p in methods.items()}
    exp_a[name]["n_lines_found_pdfminer"] = len(items)
    sweep = {}
    for g in [0, 1, 2, 3, 6, 12, 20, 40, 60, 80, 100]:
        sweep[str(g)] = adjacency(xy_cut(items, float(g)))[0]
    exp_a[name]["xy_cut_sweep"] = sweep
RESULTS["A_reading_order"] = exp_a
items = line_items(WORK / "A_column-major.pdf")
left = [t for t in items if t[4].startswith("L")]
right = [t for t in items if t[4].startswith("R")]
lsorted = sorted(left, key=lambda t: -t[3])
line_gaps = sorted(a[1] - b[3] for a, b in zip(lsorted, lsorted[1:]))
title = [t for t in items if t[4] == "TITLE"][0]
RESULTS["A_geometry_pt"] = {
    "column_gap": round(min(t[0] for t in right) - max(t[2] for t in left), 1),
    "line_gap_median": round(line_gaps[len(line_gaps) // 2], 1),
    "line_gap_min": round(line_gaps[0], 1),
    "title_to_body_gap": round(title[1] - max(t[3] for t in left + right), 1),
    "title_right_edge": round(title[2], 1),
    "title_bridge_limit": round(min(t[0] for t in right) - title[2], 1),
    "left_max_x1": round(max(t[2] for t in left), 1),
}

# ---------- Experiment B: table column recovery ----------
DATA = [["Model", "Params (M)", "Accuracy (%)", "Latency (ms)"],
        ["Alpha", "7.5", "69.8", "4.2"],
        ["Bravo", "110.0", "76.1", "11.9"],
        ["Charlie-long-name", "1300", "81.8", "17.6"],
        ["Delta", "28.6", "82.1", "13.5"],
        ["Echo", "5.5", "75.2", "3.1"]]
COL_OF = {}
for r, row in enumerate(DATA):
    for c, v in enumerate(row):
        assert v not in COL_OF, v
        COL_OF[v] = c


def draw_table(path, ruled):
    doc = SimpleDocTemplate(str(path), pagesize=letter, leftMargin=72, rightMargin=72,
                            topMargin=72, bottomMargin=72)
    t = Table(DATA, colWidths=[140, 90, 90, 90], hAlign="LEFT")
    st = [("FONTNAME", (0, 0), (-1, -1), "Helvetica"), ("FONTSIZE", (0, 0), (-1, -1), 10),
          ("ALIGN", (0, 0), (0, -1), "LEFT"), ("ALIGN", (1, 0), (-1, -1), "RIGHT")]
    if ruled:
        st.append(("GRID", (0, 0), (-1, -1), 0.5, colors.black))
    t.setStyle(TableStyle(st))
    doc.build([t])


def fragments(path):
    """Runs of glyphs on one baseline with no gap wider than 6 pt: cell-sized pieces of text."""
    page = raw_page(path)
    frags, cur = [], None
    for ch in iter_chars(page):
        s = ch.get_text()
        if not s.strip():
            continue
        if cur is None or abs(ch.y0 - cur["y0"]) > 0.5 or ch.x0 - cur["x1"] > 6 or ch.x0 < cur["x1"] - 0.5:
            cur = {"y0": ch.y0, "x0": ch.x0, "x1": ch.x1, "text": ""}
            frags.append(cur)
        elif ch.x0 - cur["x1"] > 1.0:
            cur["text"] += " "
        cur["text"] += s
        cur["x1"] = ch.x1
    for f in frags:
        f["xc"] = (f["x0"] + f["x1"]) / 2
        f["col"] = COL_OF.get(f["text"], -1)
    return frags


def pairwise_f1(frags, lab):
    tp = fp = fn = 0
    for i in range(len(frags)):
        for j in range(i + 1, len(frags)):
            same_col = frags[i]["col"] == frags[j]["col"]
            same_cl = lab[i] == lab[j]
            tp += same_col and same_cl
            fn += same_col and not same_cl
            fp += (not same_col) and same_cl
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {"precision": round(prec, 3), "recall": round(rec, 3), "f1": round(f1, 3)}


def cluster_accuracy(frags, key, tol=3.0):
    """Group fragments by 1-D clustering of one anchor edge; score pairs of fragments.

    Pairwise precision/recall: a same-column pair should share a cluster (recall) and a
    different-column pair should not (precision). Majority-vote purity would reward
    over-segmentation, so it is not used.
    """
    order = sorted(range(len(frags)), key=lambda i: frags[i][key])
    lab, cid, prev = [0] * len(frags), 0, None
    for i in order:
        v = frags[i][key]
        if prev is not None and v - prev > tol:
            cid += 1
        lab[i], prev = cid, v
    tp = fp = fn = 0
    for i in range(len(frags)):
        for j in range(i + 1, len(frags)):
            same_col = frags[i]["col"] == frags[j]["col"]
            same_cl = lab[i] == lab[j]
            tp += same_col and same_cl
            fn += same_col and not same_cl
            fp += (not same_col) and same_cl
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {"clusters_found": cid + 1, "precision": round(prec, 3),
            "recall": round(rec, 3), "f1": round(f1, 3)}


exp_b = {}
for name, ruled in [("unruled", False), ("ruled", True)]:
    path = WORK / f"B_{name}.pdf"
    draw_table(path, ruled)
    frags = fragments(path)
    exp_b[name] = {"fragments": len(frags), "unmatched_fragments": sum(f["col"] < 0 for f in frags)}
    exp_b[name]["anchor_x0"] = cluster_accuracy(frags, "x0")
    exp_b[name]["anchor_x1"] = cluster_accuracy(frags, "x1")
    exp_b[name]["anchor_center"] = cluster_accuracy(frags, "xc")
    exp_b[name]["pairs"] = len(frags) * (len(frags) - 1) // 2
    if ruled:
        page = raw_page(path)
        edges = sorted({round(o.x0, 1) for o in iter_all(page)
                        if isinstance(o, (LTLine, LTRect, LTCurve)) and (o.x1 - o.x0) < 0.5})
        col_hat = [bisect_right(edges, f["xc"]) - 1 for f in frags]
        exp_b[name]["vertical_rule_edges"] = edges
        exp_b[name]["ruled_accuracy"] = round(sum(c == f["col"] for c, f in zip(col_hat, frags)) / len(frags), 3)
        exp_b[name]["ruled_pairwise"] = pairwise_f1(frags, col_hat)
RESULTS["B_table_columns"] = exp_b

# ---------- Experiment C: scanned page has no text layer ----------
img = Image.new("RGB", (1224, 1584), "white")
d = ImageDraw.Draw(img)
try:
    font = ImageFont.load_default(size=56)
except TypeError:
    font = ImageFont.load_default()
d.text((150, 150), "Scanned page: this text is pixels only.", fill="black", font=font)
png = WORK / "scan.png"
img.save(png)
scan_pdf = WORK / "C_scan.pdf"
c = canvas.Canvas(str(scan_pdf), pagesize=letter)
c.drawImage(str(png), 0, 0, width=612, height=792)
c.save()
RESULTS["C_scan_text_chars"] = len(extract_text(str(scan_pdf)).strip())

out = WORK / "results.json"
out.write_text(json.dumps(RESULTS, indent=1))
print(json.dumps(RESULTS, indent=1))
