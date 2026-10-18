import json
import math
import re
import time
from typing import List, Dict, Any, Optional
import numpy as np
from app.core.config import settings
from app.core.security import check_document_permission
from app.db.database import db
from app.services.ai_provider import tokenize_terms, compute_semantic_feature_vector

def compute_bm25_scores(query_terms: List[str], docs_tokens: List[List[str]], k1: float = 1.5, b: float = 0.75) -> List[float]:
    N = len(docs_tokens)
    if N == 0 or not query_terms:
        return [0.0] * N

    avgdl = sum(len(toks) for toks in docs_tokens) / max(1, N)
    df: Dict[str, int] = {}
    for q in set(query_terms):
        df[q] = sum(1 for toks in docs_tokens if q in toks)

    scores: List[float] = []
    for toks in docs_tokens:
        dl = len(toks)
        if dl == 0:
            scores.append(0.0)
            continue
        tf_map: Dict[str, int] = {}
        for t in toks:
            tf_map[t] = tf_map.get(t, 0) + 1
        doc_score = 0.0
        for q in query_terms:
            n_q = df.get(q, 0)
            if n_q == 0:
                continue
            idf = math.log(1.0 + (N - n_q + 0.5) / (n_q + 0.5))
            tf = tf_map.get(q, 0)
            if tf > 0:
                denom = tf + k1 * (1.0 - b + b * (dl / max(1.0, avgdl)))
                doc_score += idf * ((tf * (k1 + 1.0)) / denom)
        scores.append(doc_score)

    q_unique = set(query_terms)
    norm_scores: List[float] = []
    for s, toks in zip(scores, docs_tokens):
        if s <= 0.0:
            norm_scores.append(0.0)
            continue
        coverage = len(q_unique.intersection(set(toks))) / max(1, len(q_unique))
        saturated = s / (s + 3.5)
        norm_scores.append(saturated * (0.4 + 0.6 * coverage))
    return norm_scores


def select_highlighted_passage(content: str, query_terms: List[str]) -> str:
    """
    Finds the highest-density sentence or two-sentence span inside the chunk that directly supports
    the query so the UI can highlight the exact supporting passage inside the source document.
    """
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", content.strip()) if s.strip()]
    if not sentences:
        return content.strip()[:280]

    q_set = set(query_terms)
    best_idx = 0
    best_score = -1.0
    for idx, sent in enumerate(sentences):
        s_terms = set(tokenize_terms(sent))
        overlap = len(q_set.intersection(s_terms))
        bonus = 0.5 if any(ch.isdigit() for ch in sent) else 0.0
        score = overlap * 2.0 + bonus
        if score > best_score:
            best_score = score
            best_idx = idx

    if best_idx + 1 < len(sentences) and len(sentences[best_idx]) < 140:
        return f"{sentences[best_idx]} {sentences[best_idx + 1]}"
    return sentences[best_idx]


def hybrid_retrieve(
    user: Dict[str, Any],
    query: str,
    top_k: int = 5,
    hybrid_alpha: float = 0.55,
    scoped_document_ids: Optional[List[str]] = None,
    enable_reranker: bool = True,
) -> Dict[str, Any]:
    """
    Executes tenant-isolated, permission-checked Hybrid Retrieval:
    1. Fetches all completed documents in user's workspace and filters by user RBAC/ACL permissions.
    2. Computes Dense Vector Cosine Similarity (weight = hybrid_alpha).
    3. Computes BM25 Lexical Relevance (weight = 1 - hybrid_alpha).
    4. Applies Cross-Feature Reranker (exact phrase bonus, section header alignment, query term coverage).
    """
    t0 = time.perf_counter()

    # Step 1: Retrieve candidate documents strictly within user's workspace
    docs = db.fetch_all(
        "SELECT * FROM documents WHERE workspace_id = ? AND status = 'completed'",
        (user["workspace_id"],),
    )
    authorized_docs: Dict[str, Dict[str, Any]] = {}
    for d in docs:
        if check_document_permission(user, d, required_action="read"):
            if not scoped_document_ids or d["id"] in scoped_document_ids:
                authorized_docs[d["id"]] = d

    if not authorized_docs:
        return {
            "results": [],
            "diagnostics": {
                "strategy": "hybrid_bm25_vector_rerank",
                "top_k_requested": top_k,
                "candidate_chunks_scanned": 0,
                "chunks_returned": 0,
                "hybrid_alpha": hybrid_alpha,
                "bm25_latency_ms": 0.0,
                "vector_latency_ms": 0.0,
                "rerank_latency_ms": 0.0,
                "total_retrieval_latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                "prompt_injection_detected": False,
                "security_warnings": [],
            },
        }

    placeholders = ",".join("?" for _ in authorized_docs)
    chunk_rows = db.fetch_all(
        f"SELECT * FROM document_chunks WHERE workspace_id = ? AND document_id IN ({placeholders}) ORDER BY document_id, chunk_index",
        (user["workspace_id"], *authorized_docs.keys()),
    )

    if not chunk_rows:
        return {
            "results": [],
            "diagnostics": {
                "strategy": "hybrid_bm25_vector_rerank",
                "top_k_requested": top_k,
                "candidate_chunks_scanned": 0,
                "chunks_returned": 0,
                "hybrid_alpha": hybrid_alpha,
                "bm25_latency_ms": 0.0,
                "vector_latency_ms": 0.0,
                "rerank_latency_ms": 0.0,
                "total_retrieval_latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                "prompt_injection_detected": False,
                "security_warnings": [],
            },
        }

    # Step 2: BM25 Lexical Scoring
    t_bm25_start = time.perf_counter()
    query_terms = tokenize_terms(query)
    docs_tokens = [
        tokenize_terms(f"{r['section_title']} {r['sanitized_content']}")
        for r in chunk_rows
    ]
    bm25_scores = compute_bm25_scores(query_terms, docs_tokens)
    bm25_ms = (time.perf_counter() - t_bm25_start) * 1000.0

    # Step 3: Dense Vector Cosine Similarity
    t_vec_start = time.perf_counter()
    q_vec = np.array(compute_semantic_feature_vector(query, settings.EMBEDDING_DIM), dtype=np.float32)
    doc_matrix = np.array([json.loads(r["embedding_json"]) for r in chunk_rows], dtype=np.float32)
    raw_cos = np.dot(doc_matrix, q_vec)
    vector_scores = [max(0.0, float(s)) for s in raw_cos]
    vec_ms = (time.perf_counter() - t_vec_start) * 1000.0

    # Step 4: Cross-Feature Reranking
    t_rerank_start = time.perf_counter()
    candidates: List[Dict[str, Any]] = []
    security_warnings: List[str] = []
    any_injection_flagged = False
    q_set = set(query_terms)

    for idx, row in enumerate(chunk_rows):
        doc_meta = authorized_docs[row["document_id"]]
        v_score = vector_scores[idx]
        b_score = bm25_scores[idx]
        hybrid_score = (hybrid_alpha * v_score) + ((1.0 - hybrid_alpha) * b_score)

        # Cross-encoder style feature reranking
        rerank_score = hybrid_score
        if enable_reranker and q_set:
            chunk_terms = set(docs_tokens[idx])
            coverage = len(q_set.intersection(chunk_terms)) / max(1, len(q_set))
            section_terms = set(tokenize_terms(row["section_title"]))
            section_match = len(q_set.intersection(section_terms)) / max(1, len(q_set))
            # Check bigram exact match
            exact_bigram_bonus = 0.0
            lower_content = row["sanitized_content"].lower()
            for i in range(len(query_terms) - 1):
                if f"{query_terms[i]} {query_terms[i+1]}" in lower_content:
                    exact_bigram_bonus += 0.08
            rerank_score = (0.55 * hybrid_score) + (0.30 * coverage) + (0.10 * section_match) + min(0.15, exact_bigram_bonus)

        if row["contains_injection_attempt"]:
            any_injection_flagged = True
            security_warnings.append(
                f"Sanitized embedded prompt-injection directive in '{doc_meta['title']}' (p.{row['page_number']})"
            )
            # Penalize chunks that only matched because of adversarial text
            rerank_score *= 0.75

        highlighted = select_highlighted_passage(row["sanitized_content"], query_terms)
        candidates.append({
            "chunk_id": row["id"],
            "document_id": row["document_id"],
            "document_title": doc_meta["title"],
            "filename": doc_meta["filename"],
            "page_number": row["page_number"],
            "section_title": row["section_title"],
            "content": row["content"],
            "sanitized_content": row["sanitized_content"],
            "highlighted_passage": highlighted,
            "char_start": row["char_start"],
            "char_end": row["char_end"],
            "token_count": row["token_count"],
            "vector_score": round(v_score, 4),
            "bm25_score": round(b_score, 4),
            "rerank_score": round(rerank_score, 4),
            "combined_score": round(rerank_score if enable_reranker else hybrid_score, 4),
        })

    candidates.sort(key=lambda c: c["combined_score"], reverse=True)
    rerank_ms = (time.perf_counter() - t_rerank_start) * 1000.0
    top_results = candidates[:top_k]

    return {
        "results": top_results,
        "diagnostics": {
            "strategy": "hybrid_bm25_vector_rerank" if enable_reranker else "hybrid_bm25_vector",
            "top_k_requested": top_k,
            "candidate_chunks_scanned": len(chunk_rows),
            "chunks_returned": len(top_results),
            "hybrid_alpha": hybrid_alpha,
            "bm25_latency_ms": round(bm25_ms, 2),
            "vector_latency_ms": round(vec_ms, 2),
            "rerank_latency_ms": round(rerank_ms, 2),
            "total_retrieval_latency_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            "prompt_injection_detected": any_injection_flagged,
            "security_warnings": list(dict.fromkeys(security_warnings)),
        },
    }
