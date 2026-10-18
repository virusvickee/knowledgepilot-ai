from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from app.core.security import get_current_user, check_document_permission
from app.db.database import db
from app.models.schemas import DocumentMetadataResponse
from app.services.ingestion import ingest_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

def _format_doc_row(row: dict) -> DocumentMetadataResponse:
    return DocumentMetadataResponse(
        id=row["id"],
        workspace_id=row["workspace_id"],
        owner_id=row["owner_id"],
        title=row["title"],
        filename=row["filename"],
        file_type=row["file_type"],
        file_size_bytes=row["file_size_bytes"],
        status=row["status"],
        visibility=row["visibility"],
        allowed_roles=[r.strip() for r in (row["allowed_roles"] or "").split(",") if r.strip()],
        page_count=row["page_count"],
        chunk_count=row["chunk_count"],
        security_flag=bool(row["security_flag"]),
        security_notes=row["security_notes"] or "",
        tags=[t.strip() for t in (row["tags"] or "").split(",") if t.strip()],
        created_at=row["created_at"],
    )

@router.get("", response_model=List[DocumentMetadataResponse])
def list_documents(current_user: dict = Depends(get_current_user)):
    user_obj = {
        "id": current_user["sub"],
        "role": current_user["role"],
        "workspace_id": current_user["workspace_id"],
    }
    rows = db.fetch_all(
        "SELECT * FROM documents WHERE workspace_id = ? ORDER BY created_at DESC",
        (current_user["workspace_id"],),
    )
    visible = [ _format_doc_row(r) for r in rows if check_document_permission(user_obj, r, "read") ]
    return visible

@router.get("/{document_id}")
def get_document_detail(document_id: str, current_user: dict = Depends(get_current_user)):
    user_obj = {
        "id": current_user["sub"],
        "role": current_user["role"],
        "workspace_id": current_user["workspace_id"],
    }
    row = db.fetch_one("SELECT * FROM documents WHERE id = ?", (document_id,))
    if not row or not check_document_permission(user_obj, row, "read"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Document not found or access denied")

    chunks = db.fetch_all(
        "SELECT id, chunk_index, page_number, section_title, sanitized_content, char_start, char_end, token_count, contains_injection_attempt FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC",
        (document_id,),
    )
    return {
        "document": _format_doc_row(row),
        "chunks": chunks,
    }

@router.post("/upload", response_model=DocumentMetadataResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    visibility: str = Form("workspace"),
    allowed_roles: str = Form("admin,researcher,viewer"),
    tags: str = Form(""),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "researcher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer role is not permitted to upload or ingest documents",
        )
    raw_bytes = await file.read()
    try:
        row = ingest_document(
            workspace_id=current_user["workspace_id"],
            owner_id=current_user["sub"],
            title=title or file.filename,
            filename=file.filename,
            raw_bytes=raw_bytes,
            visibility=visibility,
            allowed_roles=allowed_roles,
            tags=tags,
        )
        return _format_doc_row(row)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
