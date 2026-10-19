# KnowledgePilot AI — Enterprise Document Research & Grounded RAG Platform

KnowledgePilot AI is a production-grade, full-stack enterprise document intelligence and grounded RAG platform. Built with **Next.js 14 (App Router, TypeScript, Tailwind CSS, Vercel Minimalist Design System)** on the frontend and **FastAPI (Python 3.11, Pydantic, Hybrid BM25 + Vector Similarity, SQLite/PostgreSQL with pgvector)** on the backend.

Designed for high-compliance research environments requiring strict multi-tenant isolation, role-based access control (RBAC), indirect prompt-injection sanitization, and verified source citations.

---

## Architecture & System Capabilities

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
                                            v
+---------------------------------------------------------------------------------------------------+
|                                FastAPI Backend Gateway (Python 3.11)                              |
|  - Multi-Tenant & RBAC Isolation Middleware (Admin, Researcher, Viewer)                           |
|  - Sliding-Window Rate Limiter (60 req/min)                                                       |
|  - Ingestion Pipeline: Magic-Byte Validation, Sanitizer, Sliding Character Offset Chunking       |
|  - Hybrid Retrieval: Dense Vector Cosine Similarity (128-dim) + Lexical BM25 Scoring + Reranker   |
|  - Replaceable AI Provider: Local Deterministic Semantic Vector Engine or Google Gemini API       |
+---------------------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------------------+
|                                  Persistence & Telemetry Layer                                    |
|  - SQLite (Local Dev) / PostgreSQL 16 + pgvector (Production)                                     |
|  - Full Telemetry Tracking: Prompt, Completion & Embedding Tokens, USD FinOps, Latency Audit      |
+---------------------------------------------------------------------------------------------------+
```

---

## Key Features

### 1. Grounded Research & Q&A
- **Verified Source Citations**: Every claim links to `[Document Title, Page X]` and highlights the exact supporting text passage in the document reader.
- **Side-by-Side Passage Inspector**: Inspects candidate passages, chunk offsets, and full score breakdowns (**Combined Score**, **Dense Vector**, **BM25 Lexical**, and **Heading/Phrase Rerank Boost**).
- **Retrieval Parameter Controls**: Real-time tuning for Top-$K$ ($1$–$12$), Hybrid Alpha ($0.0$ lexical $\leftrightarrow$ $1.0$ dense vector), and Reranker toggling.
- **Refusal & Defense Badges**: Automatically detects unsupported questions (`insufficient_evidence`) and neutralizes adversarial prompt injections (`security_blocked`).

### 2. Document Corpus & Secure Ingestion Hub
- **Multi-Format Support**: Ingests `.pdf`, `.docx`, `.txt`, and `.md` files.
- **Defense-in-Depth Validation**: Magic-byte inspection (`%PDF-`, `PK\x03\x04`), extension allowlisting, and strict file size enforcement (15MB cap).
- **Document Reader & Chunk Inspector**: Modal interface displaying sliding-window chunks with page numbers, section headers, character offsets `[start..end]`, and token counts.
- **Granular RBAC**: Assigns visibility (`workspace`, `restricted`, `private`) and role permissions (`admin`, `researcher`, `viewer`).

### 3. Multi-Document Comparative Synthesis Studio
- **Side-by-Side Analysis**: Compares 2 to 6 documents simultaneously across custom research topics or presets (Security Controls, Disaster Recovery SLAs, Financial Penalties, Architecture).
- **Structured Synthesis Matrix**: Auto-generates an Executive Summary, Dimension Matrix with Consensus/Conflict tags, Key Agreements, Strategic Contradictions/Gaps, and Actionable Recommendations.
- **Exporting**: 1-click **Copy Markdown Report** and **Print / PDF Preview**.

### 4. Admin FinOps, Diagnostics & Benchmark Suite
- **FinOps Telemetry**: Real-time tracking of estimated USD cost (6 decimal precision), token distribution (prompt, completion, embedding), and average latency.
- **Security Audit Feed**: Logs intercepted prompt-injection payloads neutralized during document ingestion.
- **Automated 10-Case RAG Benchmark Suite**: 1-click test runner evaluating:
  - **Retrieval Recall@5** & **Mean Reciprocal Rank (MRR)**
  - **Citation Page Accuracy**
  - **Answer Faithfulness**
  - **Adversarial Refusal & Cross-Tenant Defense Rate**

---

## Vercel-Style Minimalist UI

The frontend is modeled after modern enterprise design standards (Vercel & Linear):
- **Monochrome Dark Palette**: Pure black background (`#000000`), subtle dark zinc cards (`#09090b`), and razor-thin hairline borders (`#27272a`).
- **Data Precision**: `tabular-nums` formatting for latency measurements, token counts, and cost telemetry.
- **Workspace Switcher**: Minimalist team & persona selector pill with live status indicator.
- **Accessible & Responsive**: Keyboard navigable, visible focus states (`focus-visible`), and semantic HTML.

---

## Demo Accounts & RBAC Matrix

All accounts are pre-seeded in the database for instant testing:

| Role | Name | Email | Password | Workspace | Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | Dr. Elena Rostova | `elena.rostova@acme.ai` | `AdminPass123!` | Acme Global Research Lab | Full access to all documents, uploads, FinOps telemetry & evaluation benchmarks |
| **Researcher** | Marcus Chen | `marcus.chen@acme.ai` | `ResearchPass123!` | Acme Global Research Lab | Access to workspace & restricted docs, upload & comparative synthesis |
| **Viewer** | Priya Nair | `priya.nair@acme.ai` | `ViewerPass123!` | Acme Global Research Lab | Read-only access to public workspace docs; uploads & finance docs blocked |
| **External Tenant** | David Kim | `david.kim@bionova.io` | `ExternalPass123!` | BioNova External Tenant | Strictly isolated to BioNova corpus; zero cross-tenant leakage |

---

## Quickstart & Local Setup

### Prerequisites
- **Python**: 3.11+
- **Node.js**: 18+ / npm 9+

### 1. Backend Setup

```bash
cd backend

# Install dependencies (FastAPI, Uvicorn, ReportLab, PyPDF, Python-Docx, etc.)
pip install -r requirements.txt

# Run backend unit tests & 10-case evaluation suite
python -m unittest discover -s tests -p "test_*.py" -v

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Interactive OpenAPI Docs (Swagger): `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (Next.js 14, Lucide Icons, Tailwind CSS)
npm install

# Run frontend unit tests
npm test

# Start Next.js development server on port 3000
npm run dev
```
- Web Application: `http://localhost:3000`

---

## API Reference

### Authentication
- `POST /api/auth/login`: Authenticates email/password using PBKDF2-HMAC-SHA256, returns HMAC session token.
- `GET /api/auth/me`: Returns active session identity and workspace metadata.

### Documents
- `GET /api/documents`: Lists authorized documents filtered by workspace and active user role.
- `GET /api/documents/{document_id}`: Fetches document metadata and complete extracted chunk stream.
- `POST /api/documents/upload`: Ingests `.pdf`, `.docx`, `.txt`, `.md` files with magic-byte validation and sanitization.

### Research & Chat
- `POST /api/chat/query`: Executes hybrid dense vector + lexical retrieval, phrase reranker, and grounded answer synthesis.
- `GET /api/chat/conversations`: Lists user conversations in the workspace.
- `GET /api/chat/conversations/{id}/messages`: Fetches multi-turn messages with citation metadata.

### Comparison
- `POST /api/compare`: Synthesizes multi-document comparison matrix across 2 to 6 documents.

### Admin & Benchmarking
- `GET /api/admin/diagnostics`: Returns FinOps telemetry (tokens, costs, latencies) and security audit logs.
- `POST /api/admin/evaluate`: Runs the automated 10-case RAG benchmark suite.

---

## Project Structure

```
knowledgepilot-ai/
├── .gitignore                     # Comprehensive Git exclusion rules
├── README.md                      # Platform overview, quickstart & API docs
├── ARCHITECTURE.md                # System design & database schema specifications
├── docker-compose.yml             # Containerized full-stack deployment definition
├── backend/
│   ├── requirements.txt           # Python backend dependencies
│   ├── pytest.ini                 # Pytest configuration
│   ├── app/
│   │   ├── main.py                # FastAPI entrypoint, CORS & rate limit middleware
│   │   ├── api/                   # Route handlers (auth, documents, chat, compare, admin)
│   │   ├── core/                  # Security, PBKDF2 password hashing & settings
│   │   ├── db/                    # Database connection & seed script
│   │   ├── eval/                  # 10-case evaluation suite & ground-truth dataset
│   │   ├── models/                # Pydantic schemas for requests and responses
│   │   └── services/              # Ingestion, hybrid retrieval, QA, and comparison logic
│   └── tests/                     # Comprehensive unittest integration test suite
└── frontend/
    ├── package.json               # Next.js 14 dependencies and scripts
    ├── postcss.config.js          # PostCSS configuration for Tailwind CSS
    ├── tailwind.config.ts         # Tailwind design tokens
    ├── tsconfig.json              # TypeScript compiler configuration
    ├── src/
    │   ├── app/
    │   │   ├── globals.css        # Minimalist Vercel design system styles
    │   │   ├── layout.tsx         # Root layout with dark mode configuration
    │   │   └── page.tsx           # Main application dashboard
    │   ├── components/            # Modular UI components
    │   │   ├── Navbar.tsx         # Vercel-style navigation & workspace switcher
    │   │   ├── ResearchChat.tsx   # Grounded Q&A command center & source passage inspector
    │   │   ├── CorpusHub.tsx      # Document catalog & chunk inspector launcher
    │   │   ├── ComparisonStudio.tsx # Multi-document comparison matrix generator
    │   │   ├── AdminDiagnosticsBenchmark.tsx # FinOps & automated evaluation suite
    │   │   ├── DocumentReaderModal.tsx # Sliding-window chunk reader modal
    │   │   ├── DocumentUploadModal.tsx # Secure file ingestion modal
    │   │   └── LoginModal.tsx     # Clean authentication dialog with demo presets
    │   ├── lib/
    │   │   ├── api.ts             # Typed fetch client with Bearer session injection
    │   │   └── citations.ts       # Passage highlighting & permission utilities
    │   └── types/                 # Shared TypeScript interfaces
    └── tests/                     # Frontend unit tests for citations and RBAC
```

---

## Verification & Test Results

- **Backend Integration Tests**: 8/8 test suites passing (`test_knowledgepilot.py`)
- **Automated RAG Evaluation Suite**: 10/10 test cases passing (100% pass rate, 1.0 Recall@5, 1.0 MRR, 1.0 Citation Accuracy, 1.0 Faithfulness)
- **Frontend Unit Tests**: 4/4 passing (`frontend.test.mjs`)
- **TypeScript Typecheck**: 0 errors (`npx tsc --noEmit`)
