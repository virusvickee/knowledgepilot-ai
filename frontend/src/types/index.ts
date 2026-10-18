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
