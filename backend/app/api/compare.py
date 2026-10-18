from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.schemas import CompareDocumentsRequest, CompareDocumentsResponse
from app.services.comparison_service import compare_documents_service

router = APIRouter(prefix="/api/compare", tags=["compare"])

@router.post("", response_model=CompareDocumentsResponse)
def compare_documents(payload: CompareDocumentsRequest, current_user: dict = Depends(get_current_user)):
    user_obj = {
        "id": current_user["sub"],
        "role": current_user["role"],
        "workspace_id": current_user["workspace_id"],
    }
    return compare_documents_service(
        user=user_obj,
        document_ids=payload.document_ids,
        focus_topic=payload.focus_topic,
        top_k_per_doc=payload.top_k_per_doc,
    )
