import re
import hashlib
import io
import json
import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
import pypdf
import docx
from app.core.config import settings
from app.db.database import db, utc_now_iso
from app.services.chunker import PageText, chunk_document_pages
from app.services.ai_provider import get_ai_provider

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md"}

def validate_uploaded_file(filename: str, raw_bytes: bytes) -> str:
    """
    Validates file extension, non-empty payload, maximum file size, and magic-byte integrity
    for PDF and DOCX files. Raises ValueError on validation failure.
    """
    if not filename or "." not in filename:
        raise ValueError("Filename must include a valid extension (.pdf, .docx, .txt, .md)")
    ext = filename.rsplit(".", 1)[-1].lower().strip()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file format '.{ext}'. Allowed formats: PDF, DOCX, TXT, MD")
    if len(raw_bytes) == 0:
        raise ValueError("Uploaded file is empty (0 bytes)")
    if len(raw_bytes) > settings.MAX_UPLOAD_BYTES:
        raise ValueError(f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB")

    if ext == "pdf" and not raw_bytes.startswith(b"%PDF-"):
        raise ValueError("Malformed PDF file: missing %PDF- magic header")
    if ext == "docx" and not raw_bytes.startswith(b"PK\x03\x04"):
        raise ValueError("Malformed DOCX file: missing ZIP/OpenXML PK header")

    return ext


def extract_pages_from_bytes(ext: str, raw_bytes: bytes) -> List[PageText]:
    """
    Extracts structured page text from PDF, DOCX, TXT, or Markdown files.
    """
    if ext == "pdf":
        try:
            reader = pypdf.PdfReader(io.BytesIO(raw_bytes))
            pages: List[PageText] = []
            for idx, page in enumerate(reader.pages, start=1):
                txt = page.extract_text() or ""
                # Normalize single line-wraps inside paragraphs while preserving paragraph breaks
                txt = re.sub(r"(?<!\n)\n(?!\n)", " ", txt)
                txt = re.sub(r"[ \t]+", " ", txt).strip()
                if txt:
                    pages.append(PageText(page_number=idx, text=txt))
            if not pages:
                raise ValueError("PDF contains no extractable text layer")
            return pages
        except Exception as exc:
            raise ValueError(f"Failed to parse PDF document: {exc}") from exc

    if ext == "docx":
        try:
            doc = docx.Document(io.BytesIO(raw_bytes))
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
            # Also extract table cells if present
            for table in doc.tables:
                for row in table.rows:
                    row_txt = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_txt:
                        paragraphs.append(row_txt)
            full_text = "\n\n".join(paragraphs)
            if not full_text.strip():
                raise ValueError("DOCX document contains no extractable text")
            # Group into logical pages (~1800 chars per page)
            pages = []
            step = 1800
            for i in range(0, len(full_text), step):
                pages.append(PageText(page_number=(i // step) + 1, text=full_text[i : i + step]))
            return pages
        except Exception as exc:
            raise ValueError(f"Failed to parse DOCX document: {exc}") from exc

    # TXT or Markdown
    try:
        decoded = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            decoded = raw_bytes.decode("latin-1")
        except Exception as exc:
            raise ValueError("Text file is not valid UTF-8 or Latin-1 text") from exc

    if not decoded.strip():
        raise ValueError("Text document contains only whitespace")

    # Split by explicit page breaks or ~2000 char logical pages
    if "\f" in decoded:
        raw_pages = decoded.split("\f")
        return [PageText(page_number=i + 1, text=p) for i, p in enumerate(raw_pages) if p.strip()]

    pages = []
    paragraphs = decoded.split("\n\n")
    curr = []
    curr_len = 0
    page_num = 1
    for p in paragraphs:
        if curr_len + len(p) > 1800 and curr:
            pages.append(PageText(page_number=page_num, text="\n\n".join(curr)))
            page_num += 1
            curr = [p]
            curr_len = len(p)
        else:
            curr.append(p)
            curr_len += len(p)
    if curr:
        pages.append(PageText(page_number=page_num, text="\n\n".join(curr)))
    return pages


def ingest_document(
    workspace_id: str,
    owner_id: str,
    title: str,
    filename: str,
    raw_bytes: bytes,
    visibility: str = "workspace",
    allowed_roles: str = "admin,researcher,viewer",
    tags: str = "",
    doc_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    End-to-end synchronous/background ingestion pipeline:
    1. File validation (extension, magic bytes, size limits)
    2. Text extraction by page
    3. Overlapping semantic chunking + prompt injection sanitization
    4. Embedding generation via AIProvider
    5. Persistence in SQLite/pgvector + AI telemetry logging
    """
    t0 = time.perf_counter()
    document_id = doc_id or f"doc_{uuid.uuid4().hex[:12]}"
    sha256_hash = hashlib.sha256(raw_bytes).hexdigest()
    now = utc_now_iso()

    # Validate format first
    ext = validate_uploaded_file(filename, raw_bytes)

    # Create initial tracking record in 'extracting' state
    db.execute(
        """
        INSERT INTO documents (
            id, workspace_id, owner_id, title, filename, file_type,
            file_size_bytes, sha256_hash, status, visibility, allowed_roles,
            page_count, chunk_count, security_flag, security_notes, error_message,
            tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, '', NULL, ?, ?, ?)
        """,
        (
            document_id, workspace_id, owner_id, title, filename, ext,
            len(raw_bytes), sha256_hash, "extracting", visibility, allowed_roles,
            tags, now, now,
        ),
    )

    try:
        pages = extract_pages_from_bytes(ext, raw_bytes)
        db.execute("UPDATE documents SET status = 'chunking', updated_at = ? WHERE id = ?", (utc_now_iso(), document_id))

        chunks, doc_flagged, security_findings = chunk_document_pages(pages)
        if not chunks:
            raise ValueError("No indexable text chunks could be extracted from document")

        db.execute("UPDATE documents SET status = 'embedding', updated_at = ? WHERE id = ?", (utc_now_iso(), document_id))
        provider = get_ai_provider()
        embeddings, total_embed_tokens = provider.embed_texts(
            [f"{c.section_title}: {c.sanitized_content}" for c in chunks]
        )

        for chunk, emb in zip(chunks, embeddings):
            chunk_id = f"chk_{document_id}_{chunk.chunk_index:03d}"
            db.execute(
                """
                INSERT INTO document_chunks (
                    id, document_id, workspace_id, chunk_index, page_number,
                    section_title, content, sanitized_content, char_start, char_end,
                    token_count, contains_injection_attempt, embedding_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    chunk_id, document_id, workspace_id, chunk.chunk_index, chunk.page_number,
                    chunk.section_title, chunk.content, chunk.sanitized_content,
                    chunk.char_start, chunk.char_end, chunk.token_count,
                    1 if chunk.contains_injection_attempt else 0,
                    json.dumps(emb), utc_now_iso(),
                ),
            )

        security_notes = "; ".join(security_findings) if security_findings else ""
        db.execute(
            """
            UPDATE documents
            SET status = 'completed',
                page_count = ?,
                chunk_count = ?,
                security_flag = ?,
                security_notes = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (len(pages), len(chunks), 1 if doc_flagged else 0, security_notes, utc_now_iso(), document_id),
        )

        latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        est_cost = round(total_embed_tokens * 0.0000001, 6)
        db.execute(
            """
            INSERT INTO ai_telemetry_logs (
                id, workspace_id, user_id, operation_type, provider_name, model_name,
                prompt_tokens, completion_tokens, embedding_tokens, estimated_cost_usd,
                latency_ms, status, notes, created_at
            ) VALUES (?, ?, ?, 'document_ingestion', ?, ?, 0, 0, ?, ?, ?, 'success', ?, ?)
            """,
            (
                f"tel_{uuid.uuid4().hex[:10]}", workspace_id, owner_id,
                provider.provider_name, provider.model_name,
                total_embed_tokens, est_cost, latency_ms,
                f"Ingested {filename} ({len(chunks)} chunks)", utc_now_iso(),
            ),
        )
        return db.fetch_one("SELECT * FROM documents WHERE id = ?", (document_id,))
    except Exception as exc:
        db.execute(
            "UPDATE documents SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?",
            (str(exc), utc_now_iso(), document_id),
        )
        raise
