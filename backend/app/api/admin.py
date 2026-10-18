from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.db.database import db
from app.eval.evaluator import run_evaluation_suite

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/diagnostics")
def get_admin_diagnostics(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required for diagnostics")

    ws_id = current_user["workspace_id"]
    docs = db.fetch_all("SELECT * FROM documents WHERE workspace_id = ? ORDER BY created_at DESC", (ws_id,))
    telemetry = db.fetch_all(
        "SELECT * FROM ai_telemetry_logs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50",
        (ws_id,),
    )
    totals = db.fetch_one(
        """
        SELECT
            COUNT(*) AS total_calls,
            COALESCE(SUM(prompt_tokens), 0) AS total_prompt_tokens,
            COALESCE(SUM(completion_tokens), 0) AS total_completion_tokens,
            COALESCE(SUM(embedding_tokens), 0) AS total_embedding_tokens,
            COALESCE(SUM(estimated_cost_usd), 0.0) AS total_cost_usd,
            COALESCE(AVG(latency_ms), 0.0) AS avg_latency_ms
        FROM ai_telemetry_logs
        WHERE workspace_id = ?
        """,
        (ws_id,),
    )
    flagged_chunks = db.fetch_all(
        """
        SELECT c.id, c.document_id, d.title AS document_title, c.page_number, c.section_title, c.sanitized_content
        FROM document_chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.workspace_id = ? AND c.contains_injection_attempt = 1
        """,
        (ws_id,),
    )
    return {
        "workspace_id": ws_id,
        "ingestion_summary": {
            "total_documents": len(docs),
            "completed_documents": sum(1 for d in docs if d["status"] == "completed"),
            "failed_documents": sum(1 for d in docs if d["status"] == "failed"),
            "security_flagged_documents": sum(1 for d in docs if d["security_flag"]),
            "total_chunks_indexed": sum(d["chunk_count"] for d in docs),
        },
        "token_and_cost_summary": {
            "total_api_operations": totals["total_calls"],
            "total_prompt_tokens": totals["total_prompt_tokens"],
            "total_completion_tokens": totals["total_completion_tokens"],
            "total_embedding_tokens": totals["total_embedding_tokens"],
            "total_tokens": (
                totals["total_prompt_tokens"]
                + totals["total_completion_tokens"]
                + totals["total_embedding_tokens"]
            ),
            "estimated_total_cost_usd": round(float(totals["total_cost_usd"]), 6),
            "avg_operation_latency_ms": round(float(totals["avg_latency_ms"]), 2),
        },
        "security_audit": {
            "sanitized_injection_chunks": flagged_chunks,
        },
        "recent_telemetry": telemetry,
    }

@router.post("/evaluate")
def trigger_evaluation(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required to run benchmark")
    return run_evaluation_suite()
