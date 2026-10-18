import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.db.database import db
from app.models.schemas import ChatQueryRequest, ChatQueryResponse
from app.services.qa_service import answer_question

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("/query", response_model=ChatQueryResponse)
def query_documents(payload: ChatQueryRequest, current_user: dict = Depends(get_current_user)):
    user_obj = {
        "id": current_user["sub"],
        "role": current_user["role"],
        "workspace_id": current_user["workspace_id"],
    }
    return answer_question(
        user=user_obj,
        query=payload.query,
        conversation_id=payload.conversation_id,
        document_ids=payload.document_ids,
        top_k=payload.top_k,
        hybrid_alpha=payload.hybrid_alpha,
        enable_reranker=payload.enable_reranker,
    )

@router.get("/conversations")
def list_conversations(current_user: dict = Depends(get_current_user)):
    rows = db.fetch_all(
        "SELECT * FROM conversations WHERE workspace_id = ? AND user_id = ? ORDER BY created_at DESC",
        (current_user["workspace_id"], current_user["sub"]),
    )
    return rows

@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conv = db.fetch_one(
        "SELECT * FROM conversations WHERE id = ? AND workspace_id = ? AND user_id = ?",
        (conversation_id, current_user["workspace_id"], current_user["sub"]),
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = db.fetch_all(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        (conversation_id,),
    )
    for m in msgs:
        m["citations"] = json.loads(m.get("citations_json") or "[]")
        m["retrieval_diagnostics"] = json.loads(m.get("retrieval_diagnostics_json") or "{}")
    return {"conversation": conv, "messages": msgs}
