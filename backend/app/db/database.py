import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from app.core.config import settings

_db_lock = threading.RLock()

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class DatabaseManager:
    """
    Thread-safe relational + vector database manager.
    Uses SQLite + serialized NumPy float32 vectors in local/test mode, mirroring the
    PostgreSQL + pgvector production schema in migrations/001_init_pgvector.sql.
    """
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.SQLITE_PATH
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_schema(self):
        with _db_lock:
            conn = self.get_connection()
            try:
                conn.executescript("""
                CREATE TABLE IF NOT EXISTS workspaces (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    slug TEXT UNIQUE NOT NULL,
                    tier TEXT NOT NULL DEFAULT 'enterprise',
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL,
                    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    owner_id TEXT NOT NULL REFERENCES users(id),
                    title TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size_bytes INTEGER NOT NULL,
                    sha256_hash TEXT NOT NULL,
                    status TEXT NOT NULL,
                    visibility TEXT NOT NULL DEFAULT 'workspace',
                    allowed_roles TEXT NOT NULL DEFAULT 'admin,researcher,viewer',
                    page_count INTEGER NOT NULL DEFAULT 1,
                    chunk_count INTEGER NOT NULL DEFAULT 0,
                    security_flag INTEGER NOT NULL DEFAULT 0,
                    security_notes TEXT DEFAULT '',
                    error_message TEXT DEFAULT NULL,
                    tags TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    chunk_index INTEGER NOT NULL,
                    page_number INTEGER NOT NULL DEFAULT 1,
                    section_title TEXT DEFAULT 'Document Body',
                    content TEXT NOT NULL,
                    sanitized_content TEXT NOT NULL,
                    char_start INTEGER NOT NULL,
                    char_end INTEGER NOT NULL,
                    token_count INTEGER NOT NULL,
                    contains_injection_attempt INTEGER NOT NULL DEFAULT 0,
                    embedding_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_chunks_ws ON document_chunks(workspace_id);
                CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);

                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    scoped_document_ids TEXT DEFAULT '',
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    answer_status TEXT DEFAULT 'grounded',
                    citations_json TEXT DEFAULT '[]',
                    retrieval_diagnostics_json TEXT DEFAULT '{}',
                    prompt_tokens INTEGER DEFAULT 0,
                    completion_tokens INTEGER DEFAULT 0,
                    estimated_cost_usd REAL DEFAULT 0.0,
                    latency_ms REAL DEFAULT 0.0,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS ai_telemetry_logs (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    operation_type TEXT NOT NULL,
                    provider_name TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    prompt_tokens INTEGER NOT NULL DEFAULT 0,
                    completion_tokens INTEGER NOT NULL DEFAULT 0,
                    embedding_tokens INTEGER NOT NULL DEFAULT 0,
                    estimated_cost_usd REAL NOT NULL DEFAULT 0.0,
                    latency_ms REAL NOT NULL DEFAULT 0.0,
                    status TEXT NOT NULL DEFAULT 'success',
                    notes TEXT DEFAULT '',
                    created_at TEXT NOT NULL
                );
                """)
                conn.commit()
            finally:
                conn.close()

    def execute(self, query: str, params: tuple = ()) -> int:
        with _db_lock:
            conn = self.get_connection()
            try:
                cur = conn.execute(query, params)
                conn.commit()
                return cur.rowcount
            finally:
                conn.close()

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        with _db_lock:
            conn = self.get_connection()
            try:
                row = conn.execute(query, params).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()

    def fetch_all(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        with _db_lock:
            conn = self.get_connection()
            try:
                rows = conn.execute(query, params).fetchall()
                return [dict(r) for r in rows]
            finally:
                conn.close()

    def reset_database(self):
        with _db_lock:
            if Path(self.db_path).exists():
                Path(self.db_path).unlink()
            self._init_schema()

db = DatabaseManager()
