# KnowledgePilot AI — System Architecture & Database Schema

## 1. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                           Next.js 14 App Router Frontend (TypeScript + Tailwind)                  |
|  +----------------------+  +-------------------------+  +------------------+  +----------------+  |
|  | Document Corpus &    |  | Grounded Research Chat  |  | Multi-Document   |  | Admin FinOps & |  |
|  | Upload Pipeline UI   |  | + Passage Highlighter   |  | Comparison Suite |  | Eval Dashboard |  |
+------------+------------+-------------+--------------+----------+----------+---------+---------+--+
             |                          |                         |                    |
             | HTTPS / Bearer HMAC Token (Never exposes GEMINI_API_KEY to client)      |
             v                          v                         v                    v
+---------------------------------------------------------------------------------------------------+
|                               FastAPI Backend Gateway (Python 3.11 + Pydantic)                    |
|  +---------------------------------------------------------------------------------------------+  |
|  | Security & Tenant Isolation Middleware: HMAC Session Auth | RBAC | Sliding-Window Rate Limit|  |
|  +---------------------------------------------------------------------------------------------+  |
|         |                                        |                                     |          |
|         v                                        v                                     v          |
|  +------------------------------+   +-----------------------------------+   +------------------+  |
|  | Ingestion & Sanitization     |   | Hybrid Retrieval & Rerank Engine  |   | Replaceable AI   |  |
|  | - Magic-byte & Size Validator|   | - Workspace & Role ACL Pre-Filter |   | Provider Layer   |  |
|  | - PDF/DOCX/TXT/MD Extractor  |   | - Dense Vector Cosine Similarity  |   | - GeminiProvider |  |
|  | - Prompt Injection Scrubber  |   | - BM25 Lexical Inverted Scoring   |   | - LocalGrounded  |  |
|  | - Sliding Offset Chunker     |   | - Cross-Feature Phrase Reranker   |   |   RAGProvider    |  |
|  +--------------+---------------+   +-----------------+-----------------+   +--------+---------+  |
+-----------------|-------------------------------------|------------------------------|------------+
                  |                                     |                              |
                  v                                     v                              v
+---------------------------------------------------------------------------------------------------+
|               Persistence Layer: PostgreSQL 16 + pgvector (HNSW) / SQLite + NumPy Vector DB       |
|  [workspaces] 1---* [users]     [documents] 1---* [document_chunks (vector(128/768))]             |
|  [conversations] 1---* [messages (citations_json)]    [ai_telemetry_logs (tokens, cost, latency)] |
+---------------------------------------------------------------------------------------------------+
```

## 2. Relational & Vector Database Schema

1. **`workspaces`**: Multi-tenant isolation boundary (`id`, `name`, `slug`, `tier`, `created_at`).
2. **`users`**: Authenticated accounts (`id`, `email`, `full_name`, `password_hash` via PBKDF2-HMAC-SHA256, `role` in `['admin', 'researcher', 'viewer']`, `workspace_id`).
3. **`documents`**: Uploaded source metadata & ingestion state (`id`, `workspace_id`, `owner_id`, `title`, `filename`, `file_type`, `file_size_bytes`, `sha256_hash`, `status`, `visibility`, `allowed_roles`, `page_count`, `chunk_count`, `security_flag`, `security_notes`).
4. **`document_chunks`**: Indexed text passages and vector embeddings (`id`, `document_id`, `workspace_id`, `chunk_index`, `page_number`, `section_title`, `content`, `sanitized_content`, `char_start`, `char_end`, `token_count`, `contains_injection_attempt`, `embedding` `vector(128)` / `embedding_json`).
5. **`conversations` & `messages`**: Multi-turn chat state, scoped document filters, serialized clickable citations (`citations_json`), and per-turn retrieval diagnostics (`retrieval_diagnostics_json`).
6. **`ai_telemetry_logs`**: FinOps and observability audit trail (`operation_type`, `provider_name`, `model_name`, `prompt_tokens`, `completion_tokens`, `embedding_tokens`, `estimated_cost_usd`, `latency_ms`, `status`).

## 3. Defense-in-Depth Security Controls

- **Tenant & RBAC Enforcement**: Every retrieval, document read, comparison, and chat query filters by `workspace_id == current_user.workspace_id` AND validates `allowed_roles` before vector or BM25 scoring occurs.
- **Indirect Prompt Injection Scrubbing**: Uploaded documents are scanned during chunking for override directives (`Ignore previous instructions`, `SYSTEM OVERRIDE`, secret exfiltration patterns, and hidden zero-width Unicode characters). Malicious spans are neutralized with `[SECURITY_REDACTED_DIRECTIVE]` and flagged in the Admin Security Audit view.
- **Direct Query Guardrails**: User queries attempting prompt injection or system secret exfiltration are intercepted prior to LLM invocation (`answer_status = "security_blocked"`).
