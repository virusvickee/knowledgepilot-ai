# KnowledgePilot AI — System Architecture & Technical Specifications

KnowledgePilot AI is a production-grade enterprise document intelligence and grounded RAG platform designed with defense-in-depth security, strict multi-tenant isolation, hybrid retrieval, and real-time FinOps observability.

---

## 1. High-Level Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                        Next.js 14 App Router (Vercel Minimalist Design System)                    |
|  +--------------------+  +-------------------------+  +-------------------+  +-----------------+  |
|  | Corpus & Ingestion |  | Grounded Research Chat  |  | Multi-Document    |  | FinOps & RAG    |  |
|  | Hub & Chunk Reader |  | + Passage Highlighter   |  | Synthesis Matrix  |  | Benchmark Suite |  |
|  +--------------------+  +-------------------------+  +-------------------+  +-----------------+  |
+---------------------------------------------------------------------------------------------------+
                                            |
                                            | Bearer Session Token (HMAC-SHA256)
                                            | (Backend holds all internal secrets & API keys)
                                            v
+---------------------------------------------------------------------------------------------------+
|                                FastAPI Backend Gateway (Python 3.11)                              |
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
|                                  Persistence & Telemetry Layer                                    |
|  - SQLite (Local Dev) / PostgreSQL 16 + pgvector (Production)                                     |
|  - Full Telemetry Tracking: Prompt, Completion & Embedding Tokens, USD FinOps, Latency Audit      |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Ingestion & Sanitization Pipeline

Each uploaded document transitions through a multi-stage validation, extraction, and sanitization pipeline:

```
[Uploaded File]
       │
       ▼
1. Magic-Byte & Extension Validation
   - PDF: starts with `%PDF-`
   - DOCX: starts with `PK\x03\x04`
   - Size check: `<= 15 MB` (enforced before memory read)
       │
       ▼
2. Page-Aware Text Extraction
   - PDF: `pypdf.PdfReader` with page-by-page mapping
   - DOCX: `python-docx` with paragraph-to-page tracking
   - TXT / MD: UTF-8 decoded with logical paging
       │
       ▼
3. Adversarial Prompt Injection Sanitization
   - Scans for delimiter overrides (`Ignore previous instructions`, `SYSTEM OVERRIDE`, etc.)
   - Detects hidden zero-width Unicode characters (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`)
   - Neutralizes malicious spans with `[SECURITY_REDACTED_DIRECTIVE]`
   - Sets `security_flag = 1` and logs to Security Audit
       │
       ▼
4. Sliding-Window Paragraph Chunking
   - Target chunk size: ~500 characters with 100 character overlap
   - Preserves continuous section headers and character offsets `[char_start..char_end]`
       │
       ▼
5. Vector & Lexical Indexing
   - Computes 128-dimensional deterministic semantic feature vector
   - Computes BM25 term frequencies across corpus vocabulary
   - Persists chunks with status `completed`
```

---

## 3. Hybrid Retrieval & Reranker Formulation

To overcome the vocabulary mismatch problem of pure vector search and the semantic blindness of pure keyword search, KnowledgePilot AI utilizes a two-stage hybrid retrieval engine:

### Stage 1: Hybrid Score Combination
For each authorized chunk $c$ in the current user's workspace:

$$S_{\text{hybrid}}(q, c) = \alpha \cdot S_{\text{vector}}(q, c) + (1 - \alpha) \cdot S_{\text{bm25}}(q, c)$$

Where:
- $S_{\text{vector}}(q, c) = \frac{\mathbf{v}_q \cdot \mathbf{v}_c}{\|\mathbf{v}_q\| \|\mathbf{v}_c\|}$ (Normalized Cosine Similarity)
- $S_{\text{bm25}}(q, c) = \sum_{t \in q} \text{IDF}(t) \cdot \frac{f(t, c) \cdot (k_1 + 1)}{f(t, c) + k_1 \cdot \left(1 - b + b \cdot \frac{|c|}{\text{avgdl}}\right)}$
- $\alpha \in [0.0, 1.0]$ is the configurable hybrid balance weight (default $\alpha = 0.55$).

### Stage 2: Cross-Feature Reranking
When `enable_reranker = true`, top candidates are reranked using contextual features:

$$S_{\text{final}}(q, c) = S_{\text{hybrid}}(q, c) + S_{\text{phrase\_boost}} + S_{\text{heading\_boost}}$$

- **Phrase Match Boost ($+0.12$)**: Awarded when contiguous multi-word phrases from the query appear in $c$.
- **Section Heading Alignment ($+0.08$)**: Awarded when query terms match the chunk's `section_title`.

---

## 4. Database Schema Specifications

### `workspaces`
Multi-tenant isolation boundary.
- `id` (VARCHAR, PK): Unique workspace identifier (e.g., `ws_acme_research`).
- `name` (VARCHAR): Organization display name.
- `slug` (VARCHAR, UNIQUE): URL-safe identifier.
- `tier` (VARCHAR): Subscription tier (`enterprise`, `pro`, `standard`).
- `created_at` (TIMESTAMP): Record creation timestamp.

### `users`
Authenticated tenant accounts.
- `id` (VARCHAR, PK): User identifier (e.g., `usr_admin`).
- `email` (VARCHAR, UNIQUE): Work email address.
- `full_name` (VARCHAR): User display name.
- `password_hash` (VARCHAR): PBKDF2-HMAC-SHA256 hash (100,000 iterations).
- `role` (VARCHAR): Role enum (`admin`, `researcher`, `viewer`).
- `workspace_id` (VARCHAR, FK): Associated tenant workspace.
- `is_active` (INTEGER): Active status flag.

### `documents`
Uploaded source files and ingestion status.
- `id` (VARCHAR, PK): Document UUID.
- `workspace_id` (VARCHAR, FK): Tenant ownership.
- `owner_id` (VARCHAR, FK): Uploader user ID.
- `title` (VARCHAR): Display title.
- `filename` (VARCHAR): Original uploaded file name.
- `file_type` (VARCHAR): File extension (`pdf`, `docx`, `txt`, `md`).
- `file_size_bytes` (INTEGER): Total size in bytes.
- `status` (VARCHAR): Lifecycle status (`completed`, `failed`, `pending`).
- `visibility` (VARCHAR): Visibility scope (`workspace`, `restricted`, `private`).
- `allowed_roles` (VARCHAR): Comma-separated permitted roles.
- `page_count` (INTEGER): Total extracted pages.
- `chunk_count` (INTEGER): Total indexed chunks.
- `security_flag` (INTEGER): 1 if injection sanitized, else 0.
- `security_notes` (TEXT): Audit details of sanitized directives.

### `document_chunks`
Indexed passage partitions.
- `id` (VARCHAR, PK): Chunk UUID.
- `document_id` (VARCHAR, FK): Parent document.
- `workspace_id` (VARCHAR, FK): Tenant ownership.
- `chunk_index` (INTEGER): 0-indexed position in document.
- `page_number` (INTEGER): 1-indexed source page.
- `section_title` (VARCHAR): Preceding section header.
- `content` (TEXT): Raw extracted text.
- `sanitized_content` (TEXT): Text with prompt injections neutralized.
- `char_start` (INTEGER): Start character offset in document.
- `char_end` (INTEGER): End character offset in document.
- `token_count` (INTEGER): Estimated token count.
- `contains_injection_attempt` (INTEGER): 1 if sanitized.
- `embedding_json` (TEXT): Serialized 128-dimensional embedding vector.

### `ai_telemetry_logs`
FinOps and observability audit trail.
- `id` (VARCHAR, PK): Telemetry event UUID.
- `workspace_id` (VARCHAR, FK): Tenant identifier.
- `operation_type` (VARCHAR): `chat_query`, `comparison`, `embedding`.
- `provider_name` (VARCHAR): `local` or `gemini`.
- `model_name` (VARCHAR): Model identifier.
- `prompt_tokens` (INTEGER): Prompt token usage.
- `completion_tokens` (INTEGER): Completion token usage.
- `embedding_tokens` (INTEGER): Embedding token usage.
- `estimated_cost_usd` (FLOAT): Estimated cost in USD.
- `latency_ms` (FLOAT): Total operation duration in milliseconds.

---

## 5. Defense-in-Depth Security Controls

1. **Pre-Retrieval ACL Filtering**: Every database query (`SELECT ... FROM document_chunks`) enforces `workspace_id == current_user.workspace_id`. Cross-tenant retrieval is structurally impossible at the query layer.
2. **Document-Level RBAC Enforcement**: Role checks against `allowed_roles` are executed prior to vector distance calculations. Viewer accounts cannot access restricted documents (e.g., Financial Audit DOCX) even if their query is semantically identical.
3. **Indirect Prompt Injection Neutralization**: Ingested files containing jailbreak phrases or zero-width evasion bytes are defanged before chunk embedding, preventing stored injection attacks.
4. **Direct Query Defense**: Adversarial inputs attempting to bypass prompt constraints or exfiltrate cross-tenant data are classified and returned with `answer_status = "security_blocked"`.
5. **Session Token Hardening**: Sessions use signed HMAC-SHA256 tokens with a 24-hour TTL; passwords use PBKDF2 with unique cryptographic salts.

---

## 6. Automated Evaluation Benchmark Methodology

The integrated evaluation suite (`POST /api/admin/evaluate`) tests 10 standardized enterprise cases across five benchmark dimensions:

| Metric | Target | Formula / Verification Method |
| :--- | :--- | :--- |
| **Retrieval Recall@5** | $\ge 0.90$ | Top-5 retrieved chunks contain the ground-truth document ID |
| **Mean Reciprocal Rank (MRR)** | $\ge 0.85$ | $\frac{1}{N} \sum_{i=1}^N \frac{1}{\text{rank}_i}$ of first relevant chunk |
| **Citation Page Accuracy** | $\ge 0.90$ | Top citation links to the exact ground-truth page number |
| **Answer Faithfulness** | $\ge 0.80$ | Grounded response contains all required factual keywords without hallucination |
| **Refusal & Defense Rate** | $1.00$ | Unsupported questions and prompt injections return `insufficient_evidence` or `security_blocked` with zero sensitive data leakage |
