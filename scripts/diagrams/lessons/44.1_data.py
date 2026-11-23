# Experiment for Lesson 44.1 (LlamaIndex core: documents, nodes, indices, retrievers).
# Run: <venv with llama-index-core==0.14.26 and numpy> scripts/diagrams/lessons/44.1_data.py
# Writes scripts/diagrams/lessons/44.1_data.json, which 44.1.mjs reads for its numbers.
# The corpus is invented text (three fictional documents), so the numbers describe this toy setup only.
import hashlib
import json
import os
import re
from importlib.metadata import version

import numpy as np
from llama_index.core import Document, Settings, SummaryIndex, VectorStoreIndex
from llama_index.core.embeddings import BaseEmbedding
from llama_index.core.llms import MockLLM
from llama_index.core.node_parser import TokenTextSplitter
from llama_index.core.schema import NodeRelationship

Settings.llm = MockLLM()  # retrieval needs no LLM; this stops any default LLM lookup

DIM = 512
STOP = {"the", "a", "an", "of", "to", "and", "or", "in", "on", "is", "be", "by", "it", "as", "at",
        "for", "with", "from", "that", "this", "are", "was", "if", "than", "then", "can", "only",
        "how", "what", "when", "who", "does", "do", "into", "up", "may", "each", "its", "their"}


def stem(w):
    return w[:-1] if len(w) > 3 and w.endswith("s") else w


def hash_vec(text):
    """Deterministic bag-of-words vector: stopwords dropped, words hashed to DIM buckets, L2-normalised."""
    v = np.zeros(DIM)
    for w in re.findall(r"[a-z0-9]+", text.lower()):
        if w not in STOP:
            v[int(hashlib.md5(stem(w).encode()).hexdigest(), 16) % DIM] += 1.0
    n = np.linalg.norm(v)
    return (v / n if n else v).tolist()


class HashEmbedding(BaseEmbedding):
    """Stand-in embedding model so the lesson runs offline. Not a semantic model."""

    def _get_query_embedding(self, query):
        return hash_vec(query)

    def _get_text_embedding(self, text):
        return hash_vec(text)

    async def _aget_query_embedding(self, query):
        return hash_vec(query)

    async def _aget_text_embedding(self, text):
        return hash_vec(text)


CORPUS = {
    "kettle_manual": (
        "The Vemo K2 kettle holds up to 1.7 litres of water. Fill it only between the minimum and maximum "
        "marks on the inner wall, or the lid may not close. The heating element switches off automatically "
        "once the water reaches a boil. If the kettle is left on an empty base for more than 60 seconds, the "
        "thermal cut-out trips and must be reset by a service engineer. Descale the element every two months "
        "in hard-water areas, using a solution of one part white vinegar to two parts water. Never immerse "
        "the base in water. The power cord is 75 centimetres long and should not be wrapped around the body "
        "when stored."),
    "river_log": (
        "Expedition log, Orrin River, day 14. The team reached the first rapids at dawn and portaged the "
        "canoes along the northern bank. Dr Ilse Marr recorded water temperature at 9.2 degrees Celsius and a "
        "flow rate of 340 cubic metres per second. Supplies are low: two sacks of rice remain and the water "
        "filter needs a new cartridge. The guide, Tomas Abel, believes the second bend can be run only before "
        "the afternoon storms. Wildlife sightings included a family of otters and three herons near the reed "
        "beds. The camp was set on a sandbar above the flood line, which the team marked with a red flag."),
    "library_policy": (
        "Lumen Public Library lending policy. Members may borrow up to twelve items at a time for a period of "
        "three weeks. Reference books, maps and rare manuscripts cannot leave the reading room. Overdue items "
        "accrue a fine of 20 cents per day, and fines above 10 dollars block further borrowing until they are "
        "paid. Items can be renewed once online, provided no other member has reserved them. Laptops may be "
        "borrowed for seven days from the front desk with a valid photo identification card. Lost cards are "
        "replaced for a fee of two dollars."),
}

# (question, gold sentence that answers it, document it lives in)
QUESTIONS = [
    ("How much water does the Vemo K2 kettle hold?",
     "The Vemo K2 kettle holds up to 1.7 litres of water.", "kettle_manual"),
    ("What happens if the kettle runs on an empty base for over a minute?",
     "If the kettle is left on an empty base for more than 60 seconds, the thermal cut-out trips and must "
     "be reset by a service engineer.", "kettle_manual"),
    ("How often should the element be descaled in hard-water areas, and with what solution?",
     "Descale the element every two months in hard-water areas, using a solution of one part white vinegar "
     "to two parts water.", "kettle_manual"),
    ("What water temperature did Dr Ilse Marr record?",
     "Dr Ilse Marr recorded water temperature at 9.2 degrees Celsius", "river_log"),
    ("When can the second bend be run safely according to the guide?",
     "the second bend can be run only before the afternoon storms", "river_log"),
    ("What do the team's supplies need for the water filter?",
     "the water filter needs a new cartridge", "river_log"),
    ("How many items can a member borrow at once, and for how long?",
     "Members may borrow up to twelve items at a time for a period of three weeks.", "library_policy"),
    ("When do overdue fines stop a member from borrowing?",
     "fines above 10 dollars block further borrowing until they are paid", "library_policy"),
    ("How long can a laptop be borrowed for?",
     "Laptops may be borrowed for seven days from the front desk", "library_policy"),
]

for q, gold, doc in QUESTIONS:
    assert gold in CORPUS[doc], f"gold sentence not verbatim in {doc}: {gold[:40]}"


def make_docs():
    return [Document(text=t, doc_id=k, metadata={"file_name": k + ".txt"}) for k, t in CORPUS.items()]


def split(size, overlap=None):
    overlap = size // 4 if overlap is None else overlap
    splitter = TokenTextSplitter(
        chunk_size=size, chunk_overlap=overlap, tokenizer=lambda s: s.split(),
        id_func=lambda i, doc: f"{doc.doc_id}-{i}")  # deterministic ids; default ids are random uuids
    return splitter.get_nodes_from_documents(make_docs())


def main():
    out = {"versions": {"llama_index_core": version("llama-index-core"), "numpy": np.__version__}}
    embed = HashEmbedding()

    # 1. Documents -> nodes at a fixed chunk size, with the chunks listed
    nodes40 = split(40, 10)
    out["nodes_per_doc_size40"] = {k: sum(1 for n in nodes40 if n.ref_doc_id == k) for k in CORPUS}
    out["n_nodes_size40"] = len(nodes40)
    out["words_per_doc"] = {k: len(t.split()) for k, t in CORPUS.items()}
    out["node_word_counts_size40"] = [len(n.text.split()) for n in nodes40]

    # 2. Node anatomy (first chunk of the kettle manual)
    n0 = nodes40[0]
    out["anatomy"] = {
        "node_id": n0.node_id,
        "ref_doc_id": n0.ref_doc_id,
        "metadata": n0.metadata,
        "relationships": sorted(k.value for k in n0.relationships),
        "next_node_id": n0.relationships[NodeRelationship.NEXT].node_id,
        "text_preview": n0.get_content()[:60],
    }

    # 3. Index: embed nodes, store vectors, build a retriever
    index = VectorStoreIndex(nodes40, embed_model=embed)
    emb = index.vector_store.data.embedding_dict
    out["embedding_matrix_shape"] = [len(emb), len(next(iter(emb.values())))]
    out["docstore_count"] = len(index.docstore.docs)

    # 4. Retrieval for one question; cross-check the retriever's scores with plain NumPy
    q, gold, _ = QUESTIONS[0]
    retriever = index.as_retriever(similarity_top_k=3)
    hits = retriever.retrieve(q)
    ids = list(emb.keys())
    E = np.array([emb[i] for i in ids])
    scores_np = E @ np.array(hash_vec(q))
    order = np.argsort(-scores_np)[:3]
    out["example_query"] = q
    out["example_hits"] = [{"node_id": h.node.node_id, "score": round(float(h.score), 4),
                            "text": h.node.get_content()[:70]} for h in hits]
    out["numpy_top3_ids"] = [ids[i] for i in order]
    out["retriever_top3_ids"] = [h.node.node_id for h in hits]
    out["numpy_top3_scores"] = [round(float(scores_np[i]), 4) for i in order]
    out["numpy_matches_retriever"] = out["numpy_top3_ids"] == out["retriever_top3_ids"] and bool(
        np.allclose(out["numpy_top3_scores"], [h["score"] for h in out["example_hits"]], atol=1e-4))
    out["example_gold_hit_rank"] = next((r + 1 for r, h in enumerate(hits) if gold in h.node.text), None)

    # 5. Summary index: no embeddings, returns every node
    summary = SummaryIndex(nodes40)
    out["summary_index_retrieved_all"] = len(summary.as_retriever().retrieve(q)) == len(nodes40)

    # 6. Chunk-size sweep: does the whole answer sentence sit inside one node, and is it retrieved in top 2?
    sweep = {}
    for size in [20, 40, 80, 160]:
        nodes = split(size)
        idx = VectorStoreIndex(nodes, embed_model=embed)
        r = idx.as_retriever(similarity_top_k=2)
        contained = sum(any(g in n.text for n in nodes) for _, g, _ in QUESTIONS)
        recall2 = 0
        for qq, g, _ in QUESTIONS:
            got = r.retrieve(qq)
            recall2 += any(g in h.node.text for h in got)
        sweep[str(size)] = {"n_nodes": len(nodes), "answer_inside_some_node": contained,
                            "answer_in_top2": recall2, "n_questions": len(QUESTIONS),
                            "mean_words_per_node": round(float(np.mean([len(n.text.split()) for n in nodes])), 1)}
    out["sweep"] = sweep

    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "44.1_data.json"), "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
