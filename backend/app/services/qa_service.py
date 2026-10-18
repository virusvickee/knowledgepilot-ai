import json
import time
import uuid
from typing import Dict, Any, List, Optional
from app.db.database import db, utc_now_iso
from app.services.ai_provider import get_ai_provider
from app.services.retrieval import hybrid_retrieve
from app.services.security_scanner import is_malicious_user_query

def answer_question(
    user: Dict[str, Any],
    query: str,
    conversation_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None,
    top_k: int = 5,
    hybrid_alpha: float = 0.55,
    enable_reranker: bool = True,
) -> Dict[str, Any]:
    t0 = time.perf_counter()

    # Ensure conversation exists and belongs to the user's workspace
    if conversation_id:
        conv = db.fetch_one(
            "SELECT * FROM conversations WHERE id = ? AND workspace_id = ?",
            (conversation_id, user["workspace_id"]),
        )
        if not conv:
            conversation_id = None

    if not conversation_id:
        conversation_id = f"conv_{uuid.uuid4().hex[:10]}"
        db.execute(
            "INSERT INTO conversations (id, workspace_id, user_id, title, scoped_document_ids, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                conversation_id,
                user["workspace_id"],
                user["id"],
                query[:80],
                ",".join(document_ids or []),
                utc_now_iso(),
            ),
        )

    # Record user message
    user_msg_id = f"msg_{uuid.uuid4().hex[:10]}"
    db.execute(
        "INSERT INTO messages (id, conversation_id, role, content, answer_status, created_at) VALUES (?, ?, 'user', ?, 'query', ?)",
        (user_msg_id, conversation_id, query, utc_now_iso()),
    )

    # Check if user query itself is a prompt-injection or exfiltration attack
    malicious, findings = is_malicious_user_query(query)
    if malicious:
        total_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        refusal_msg = (
            "Security Policy Block: Your query contains adversarial instructions or attempts to override "
            f"system guardrails ({', '.join(findings)}). KnowledgePilot AI strictly enforces tenant isolation "
            "and system prompt integrity."
        )
        asst_msg_id = f"msg_{uuid.uuid4().hex[:10]}"
        diag = {
            "strategy": "security_gate_interceptor",
            "top_k_requested": top_k,
            "candidate_chunks_scanned": 0,
            "chunks_returned": 0,
            "hybrid_alpha": hybrid_alpha,
            "bm25_latency_ms": 0.0,
            "vector_latency_ms": 0.0,
            "rerank_latency_ms": 0.0,
            "total_retrieval_latency_ms": 0.0,
            "prompt_injection_detected": True,
            "security_warnings": findings,
        }
        db.execute(
            """
            INSERT INTO messages (
                id, conversation_id, role, content, answer_status, citations_json,
                retrieval_diagnostics_json, prompt_tokens, completion_tokens,
                estimated_cost_usd, latency_ms, created_at
            ) VALUES (?, ?, 'assistant', ?, 'security_blocked', '[]', ?, 18, 28, 0.0, ?, ?)
            """,
            (asst_msg_id, conversation_id, refusal_msg, json.dumps(diag), total_ms, utc_now_iso()),
        )
        return {
            "conversation_id": conversation_id,
            "message_id": asst_msg_id,
            "query": query,
            "answer": refusal_msg,
            "answer_status": "security_blocked",
            "citations": [],
            "retrieval_diagnostics": diag,
            "prompt_tokens": 18,
            "completion_tokens": 28,
            "estimated_cost_usd": 0.0,
            "total_latency_ms": total_ms,
        }

    # Execute Hybrid Retrieval with RBAC/Workspace filtering
    retrieval_out = hybrid_retrieve(
        user=user,
        query=query,
        top_k=top_k,
        hybrid_alpha=hybrid_alpha,
        scoped_document_ids=document_ids,
        enable_reranker=enable_reranker,
    )
    retrieved_chunks = retrieval_out["results"]
    diagnostics = retrieval_out["diagnostics"]

    # Fetch recent conversation history
    history_rows = db.fetch_all(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 6",
        (conversation_id,),
    )

    provider = get_ai_provider()
    gen_out = provider.generate_grounded_answer(
        query=query,
        retrieved_chunks=retrieved_chunks,
        conversation_history=list(reversed(history_rows)),
    )

    used_ids = set(gen_out.get("used_chunk_ids", []))
    citations = []
    if gen_out["answer_status"] == "grounded":
        for idx, c in enumerate(retrieved_chunks, start=1):
            if not used_ids or c["chunk_id"] in used_ids or idx == 1:
                citations.append({
                    "citation_index": idx,
                    "document_id": c["document_id"],
                    "document_title": c["document_title"],
                    "filename": c["filename"],
                    "chunk_id": c["chunk_id"],
                    "page_number": c["page_number"],
                    "section_title": c["section_title"],
                    "highlighted_passage": c["highlighted_passage"],
                    "char_start": c["char_start"],
                    "char_end": c["char_end"],
                    "combined_score": c["combined_score"],
                    "vector_score": c["vector_score"],
                    "bm25_score": c["bm25_score"],
                    "rerank_score": c["rerank_score"],
                })

    total_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    p_tok = int(gen_out["prompt_tokens"])
    c_tok = int(gen_out["completion_tokens"])
    est_cost = round((p_tok * 0.00000035) + (c_tok * 0.00000105), 6)

    asst_msg_id = f"msg_{uuid.uuid4().hex[:10]}"
    db.execute(
        """
        INSERT INTO messages (
            id, conversation_id, role, content, answer_status, citations_json,
            retrieval_diagnostics_json, prompt_tokens, completion_tokens,
            estimated_cost_usd, latency_ms, created_at
        ) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            asst_msg_id,
            conversation_id,
            gen_out["answer"],
            gen_out["answer_status"],
            json.dumps(citations),
            json.dumps(diagnostics),
            p_tok,
            c_tok,
            est_cost,
            total_ms,
            utc_now_iso(),
        ),
    )

    db.execute(
        """
        INSERT INTO ai_telemetry_logs (
            id, workspace_id, user_id, operation_type, provider_name, model_name,
            prompt_tokens, completion_tokens, embedding_tokens, estimated_cost_usd,
            latency_ms, status, notes, created_at
        ) VALUES (?, ?, ?, 'grounded_qa', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
        """,
        (
            f"tel_{uuid.uuid4().hex[:10]}",
            user["workspace_id"],
            user["id"],
            provider.provider_name,
            provider.model_name,
            p_tok,
            c_tok,
            est_cost,
            total_ms,
            gen_out["answer_status"],
            f"Query: {query[:60]}",
            utc_now_iso(),
        ),
    )

    return {
        "conversation_id": conversation_id,
        "message_id": asst_msg_id,
        "query": query,
        "answer": gen_out["answer"],
        "answer_status": gen_out["answer_status"],
        "citations": citations,
        "retrieval_diagnostics": diagnostics,
        "prompt_tokens": p_tok,
        "completion_tokens": c_tok,
        "estimated_cost_usd": est_cost,
        "total_latency_ms": total_ms,
    }
