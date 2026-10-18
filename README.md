# KnowledgePilot AI — Intelligent Document Research Platform

KnowledgePilot AI is a production-minded, full-stack enterprise document intelligence and grounded RAG platform built with **Next.js 14 (App Router, TypeScript, Tailwind CSS, shadcn/ui)** on the frontend and **FastAPI (Python 3.11, Pydantic, Hybrid BM25 + Vector Similarity, PostgreSQL/`pgvector` + SQLite local engine)** on the backend.

## Key Implemented Capabilities

1. **Multi-Tenant Authentication & Role-Based Access Control (RBAC)**:
   - HMAC-SHA256 signed session tokens and PBKDF2-SHA256 password hashing.
   - Three workspace roles (`admin`, `researcher`, `viewer`) + strict tenant isolation between `Acme Global Research Lab` and external tenants (`BioNova External Tenant`).
   - Document-level permissions (`workspace`, `restricted`, `private`) enforced at both API and retrieval layers.
2. **Multi-Format Document Ingestion Pipeline (`PDF`, `DOCX`, `TXT`, `Markdown`)**:
   - Strict magic-byte validation (`%PDF-`, `PK\x03\x04`), extension allowlisting, and file-size enforcement.
   - Page-aware text extraction (`pypdf`, `python-docx`), sliding-window paragraph chunking with character offsets, and automatic prompt-injection sanitization.
3. **Hybrid Retrieval + Cross-Feature Reranker**:
   - Combines **Dense Vector Cosine Similarity** and **BM25 Lexical Scoring** with configurable `top_k` and hybrid weight `alpha`, followed by phrase and section-heading reranking.
4. **Grounded Q&A with Clickable Citations & Source Passage Highlighting**:
   - Every factual claim links to `[Document Title, Page X]` and highlights the exact supporting passage inside the Document Reader.
   - Automatically detects unsupported questions or missing evidence (`insufficient_evidence`) and blocks adversarial prompt injections (`security_blocked`).
5. **Multi-Document Comparison & Structured Research Report Builder**:
   - Synthesizes side-by-side matrices across 2–6 documents covering Security/Encryption, SLA/Recovery Objectives, and Financial/Governance controls, plus Key Agreements, Contradictions, and Recommended Actions.
6. **Admin FinOps, Retrieval Diagnostics & Automated Evaluation Suite**:
   - Real-time telemetry tracking ingestion status, BM25/Vector/Rerank latency, token usage, estimated USD cost, sanitized injection alerts, and a 10-case automated RAG benchmark.

## Quickstart

### Option A: Docker Compose (PostgreSQL + `pgvector` + FastAPI + Next.js)

```bash
cp .env.example .env
docker compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend OpenAPI Docs: `http://localhost:8000/docs`

### Option B: Local Development & Automated Tests

```bash
# 1. Run Backend Unit & Integration Tests + 10-Case RAG Evaluation Suite
cd backend
python3 -m unittest discover -s tests -p "test_*.py" -v

# 2. Start FastAPI Backend Server
uvicorn app.main:app --reload --port 8000

# 3. Run Frontend Unit Tests
cd ../frontend
node --test tests/frontend.test.mjs
```

## Demo Accounts (Seeded Automatically)

| Role | Email | Password | Workspace | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `elena.rostova@acme.ai` | `AdminPass123!` | Acme Global Research Lab | Full access (all docs, upload, Admin FinOps & Eval) |
| **Researcher** | `marcus.chen@acme.ai` | `ResearchPass123!` | Acme Global Research Lab | Read all workspace & restricted docs, upload & compare |
| **Viewer** | `priya.nair@acme.ai` | `ViewerPass123!` | Acme Global Research Lab | Read public workspace docs only (blocked from restricted Finance DOCX & upload) |
| **External Tenant** | `david.kim@bionova.io` | `ExternalPass123!` | BioNova External Tenant | Isolated to BioNova workspace corpus |

## Known Limitations & Production Risks

1. **OCR for Scanned Image-Only PDFs**: `pypdf` extracts native PDF text layers; scanned image-only PDFs without an embedded text layer require enabling an OCR worker (`pytesseract` / Document AI) in an asynchronous Celery/Dramatiq queue.
2. **In-Memory Rate Limiter**: The sliding-window rate limiter in `app/main.py` stores timestamps in process memory; multi-replica Kubernetes deployments should back this with Redis.
3. **Local Embedding Dimensionality**: When running without an external `GEMINI_API_KEY`, the system uses a deterministic 128-dimensional semantic + domain-concept feature vector so offline environments and CI pipelines run deterministically with zero external network calls.
