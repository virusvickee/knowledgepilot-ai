from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    workspace_id: str
    workspace_name: Optional[str] = None

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DocumentMetadataResponse(BaseModel):
    id: str
    workspace_id: str
    owner_id: str
    title: str
    filename: str
    file_type: str
    file_size_bytes: int
    status: str
    visibility: str
    allowed_roles: List[str]
    page_count: int
    chunk_count: int
    security_flag: bool
    security_notes: str
    tags: List[str]
    created_at: str

class CitationItem(BaseModel):
    citation_index: int
    document_id: str
    document_title: str
    filename: str
    chunk_id: str
    page_number: int
    section_title: str
    highlighted_passage: str
    char_start: int
    char_end: int
    combined_score: float
    vector_score: float
    bm25_score: float
    rerank_score: float

class RetrievalDiagnostics(BaseModel):
    strategy: str = "hybrid_bm25_vector_rerank"
    top_k_requested: int
    candidate_chunks_scanned: int
    chunks_returned: int
    hybrid_alpha: float
    bm25_latency_ms: float
    vector_latency_ms: float
    rerank_latency_ms: float
    total_retrieval_latency_ms: float
    prompt_injection_detected: bool = False
    security_warnings: List[str] = Field(default_factory=list)

class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    top_k: int = Field(default=5, ge=1, le=15)
    hybrid_alpha: float = Field(default=0.55, ge=0.0, le=1.0)
    enable_reranker: bool = True

class ChatQueryResponse(BaseModel):
    conversation_id: str
    message_id: str
    query: str
    answer: str
    answer_status: str  # 'grounded', 'insufficient_evidence', 'security_blocked'
    citations: List[CitationItem]
    retrieval_diagnostics: RetrievalDiagnostics
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float
    total_latency_ms: float

class CompareDocumentsRequest(BaseModel):
    document_ids: List[str] = Field(..., min_items=2, max_items=6)
    focus_topic: str = Field(default="Architecture, Security Controls, SLA Commitments, and Governance Metrics")
    top_k_per_doc: int = Field(default=3, ge=1, le=8)

class ComparisonCriterionRow(BaseModel):
    dimension: str
    findings_by_document: Dict[str, str]
    consensus_or_conflict: str
    citations: List[CitationItem]

class CompareDocumentsResponse(BaseModel):
    report_title: str
    focus_topic: str
    executive_summary: str
    documents_compared: List[DocumentMetadataResponse]
    comparison_matrix: List[ComparisonCriterionRow]
    key_agreements: List[str]
    key_contradictions_or_gaps: List[str]
    recommended_actions: List[str]
    all_citations: List[CitationItem]
    prompt_tokens: int
    completion_tokens: int
    estimated_cost_usd: float
    latency_ms: float
