import os
from dataclasses import dataclass

@dataclass
class Settings:
    APP_NAME: str = "KnowledgePilot AI — Intelligent Document Research Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./knowledgepilot.db")
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "/tmp/knowledgepilot_ai.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "kp-dev-hmac-secret-change-in-prod-98a7bc6512ef34")
    SESSION_TTL_SECONDS: int = int(os.getenv("SESSION_TTL_SECONDS", "86400"))
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "local")  # 'gemini' or 'local'
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_GENERATION_MODEL: str = os.getenv("GEMINI_GENERATION_MODEL", "gemini-2.5-flash")
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
    EMBEDDING_DIM: int = 128
    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
    DEFAULT_TOP_K: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    HYBRID_ALPHA: float = float(os.getenv("HYBRID_ALPHA", "0.55"))  # 0.55 vector + 0.45 BM25
    MIN_EVIDENCE_SCORE: float = float(os.getenv("MIN_EVIDENCE_SCORE", "0.18"))
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

settings = Settings()
