import re
from dataclasses import dataclass
from typing import List, Tuple
from app.services.security_scanner import scan_and_sanitize_text

@dataclass
class PageText:
    page_number: int
    text: str

@dataclass
class ExtractedChunk:
    chunk_index: int
    page_number: int
    section_title: str
    content: str
    sanitized_content: str
    char_start: int
    char_end: int
    token_count: int
    contains_injection_attempt: bool
    security_findings: List[str]

def estimate_tokens(text: str) -> int:
    words = text.split()
    return max(1, int(len(words) * 1.3))

def detect_section_heading(paragraph: str, current_heading: str) -> str:
    lines = [line.strip() for line in paragraph.strip().splitlines() if line.strip()]
    if not lines:
        return current_heading
    first_line = lines[0]
    if first_line.startswith("#"):
        return first_line.lstrip("#").strip()[:120]
    if re.match(r"^(\d+\.|Section\s+\d+|Appendix\s+[A-Z])\s+[A-Z]", first_line) and len(first_line) < 95:
        return first_line
    if first_line.isupper() and 4 <= len(first_line) <= 75:
        return first_line.title()
    return current_heading

def chunk_document_pages(
    pages: List[PageText],
    target_chars: int = 580,
    overlap_chars: int = 90,
) -> Tuple[List[ExtractedChunk], bool, List[str]]:
    """
    Splits extracted pages into overlapping semantic chunks while preserving:
    - Exact page number
    - Detected section heading
    - Exact character start/end offsets within the full document
    - Prompt injection sanitization per chunk
    """
    chunks: List[ExtractedChunk] = []
    all_security_findings: List[str] = []
    doc_flagged = False
    global_char_cursor = 0
    chunk_idx = 0
    current_heading = "Overview"

    for page in pages:
        raw_page_text = page.text or ""
        if not raw_page_text.strip():
            global_char_cursor += len(raw_page_text) + 1
            continue

        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", raw_page_text) if p.strip()]
        buffer = ""
        buffer_start = global_char_cursor

        for para in paragraphs:
            current_heading = detect_section_heading(para, current_heading)
            if not buffer:
                buffer = para
                pos = raw_page_text.find(para)
                buffer_start = global_char_cursor + (pos if pos >= 0 else 0)
            elif len(buffer) + 2 + len(para) <= target_chars:
                buffer = f"{buffer}\n\n{para}"
            else:
                sanitized, flagged, findings = scan_and_sanitize_text(buffer)
                if flagged:
                    doc_flagged = True
                    all_security_findings.extend(findings)
                chunks.append(
                    ExtractedChunk(
                        chunk_index=chunk_idx,
                        page_number=page.page_number,
                        section_title=current_heading,
                        content=buffer,
                        sanitized_content=sanitized,
                        char_start=buffer_start,
                        char_end=buffer_start + len(buffer),
                        token_count=estimate_tokens(sanitized),
                        contains_injection_attempt=flagged,
                        security_findings=findings,
                    )
                )
                chunk_idx += 1
                # Overlap tail for context continuity
                tail = buffer[-overlap_chars:] if len(buffer) > overlap_chars else ""
                buffer = f"{tail}\n{para}".strip() if tail else para
                buffer_start = buffer_start + max(0, len(buffer) - len(para) - len(tail))

        if buffer.strip():
            sanitized, flagged, findings = scan_and_sanitize_text(buffer)
            if flagged:
                doc_flagged = True
                all_security_findings.extend(findings)
            chunks.append(
                ExtractedChunk(
                    chunk_index=chunk_idx,
                    page_number=page.page_number,
                    section_title=current_heading,
                    content=buffer,
                    sanitized_content=sanitized,
                    char_start=buffer_start,
                    char_end=buffer_start + len(buffer),
                    token_count=estimate_tokens(sanitized),
                    contains_injection_attempt=flagged,
                    security_findings=findings,
                )
            )
            chunk_idx += 1

        global_char_cursor += len(raw_page_text) + 2

    unique_findings = list(dict.fromkeys(all_security_findings))
    return chunks, doc_flagged, unique_findings
