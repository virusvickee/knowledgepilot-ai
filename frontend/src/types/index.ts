export type UserRole = "admin" | "researcher" | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  workspace_id: string;
  workspace_name: string;
}

export interface DocumentItem {
  id: string;
  workspace_id: string;
  owner_id: string;
  title: string;
  filename: string;
  file_type: "pdf" | "docx" | "txt" | "md";
  file_size_bytes: number;
  status: "pending" | "validating" | "extracting" | "chunking" | "embedding" | "completed" | "failed";
  visibility: "workspace" | "restricted" | "private";
  allowed_roles: UserRole[];
  page_count: number;
  chunk_count: number;
  security_flag: boolean;
  security_notes: string;
  tags: string[];
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  chunk_index: number;
  page_number: number;
  section_title: string;
  sanitized_content: string;
  char_start: number;
  char_end: number;
  token_count: number;
  contains_injection_attempt: boolean | number;
}

export interface CitationItem {
  citation_index: number;
  document_id: string;
  document_title: string;
  filename: string;
  chunk_id: string;
  page_number: number;
  section_title: string;
  highlighted_passage: string;
  char_start: number;
  char_end: number;
  combined_score: number;
  vector_score: number;
  bm25_score: number;
  rerank_score: number;
}

export interface RetrievalDiagnostics {
  strategy: string;
  top_k_requested: number;
  candidate_chunks_scanned: number;
  chunks_returned: number;
  hybrid_alpha: number;
  bm25_latency_ms: number;
  vector_latency_ms: number;
  rerank_latency_ms: number;
  total_retrieval_latency_ms: number;
  prompt_injection_detected: boolean;
  security_warnings: string[];
}

export interface ChatQueryResponse {
  conversation_id: string;
  message_id: string;
  query: string;
  answer: string;
  answer_status: "grounded" | "insufficient_evidence" | "security_blocked";
  citations: CitationItem[];
  retrieval_diagnostics: RetrievalDiagnostics;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  total_latency_ms: number;
}

export interface ComparisonCriterionRow {
  dimension: string;
  findings_by_document: Record<string, string>;
  consensus_or_conflict: string;
  citations: CitationItem[];
}

export interface CompareDocumentsResponse {
  report_title: string;
  focus_topic: string;
  executive_summary: string;
  documents_compared: DocumentItem[];
  comparison_matrix: ComparisonCriterionRow[];
  key_agreements: string[];
  key_contradictions_or_gaps: string[];
  recommended_actions: string[];
  all_citations: CitationItem[];
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
}

export interface BenchmarkCaseResult {
  id: string;
  category: string;
  query: string;
  answer_status: string;
  retrieval_hit: boolean;
  reciprocal_rank: number;
  citation_page_verified: boolean;
  faithfulness_score: number;
  latency_ms: number;
  passed: boolean;
}

export interface EvaluationBenchmarkSummary {
  total_cases: number;
  factual_cases: number;
  security_and_refusal_cases: number;
  retrieval_recall_at_5: number;
  mean_reciprocal_rank_mrr: number;
  citation_accuracy: number;
  answer_faithfulness: number;
  refusal_and_security_accuracy: number;
  overall_pass_rate: number;
  cases: BenchmarkCaseResult[];
}

export interface AdminDiagnostics {
  workspace_id: string;
  ingestion_summary: {
    total_documents: number;
    completed_documents: number;
    failed_documents: number;
    security_flagged_documents: number;
    total_chunks_indexed: number;
  };
  token_and_cost_summary: {
    total_api_operations: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_embedding_tokens: number;
    total_tokens: number;
    estimated_total_cost_usd: number;
    avg_operation_latency_ms: number;
  };
  security_audit: {
    sanitized_injection_chunks: Array<{
      id: string;
      document_id: string;
      document_title: string;
      page_number: number;
      section_title: string;
      sanitized_content: string;
    }>;
  };
  recent_telemetry: Array<{
    id: string;
    operation: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    estimated_cost_usd: number;
    latency_ms: number;
    created_at: string;
  }>;
}

export interface ConversationSummary {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface ChatMessageItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations: CitationItem[];
  retrieval_diagnostics?: RetrievalDiagnostics;
  created_at: string;
}
