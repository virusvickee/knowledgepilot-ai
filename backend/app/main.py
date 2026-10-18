import time
from collections import defaultdict
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.seed import seed_initial_data
from app.api import auth, documents, chat, compare, admin

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise Grounded Document Intelligence & Hybrid RAG Platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory sliding window rate limiter per client/token
_request_timestamps = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_key = request.headers.get("Authorization") or (request.client.host if request.client else "anon")
    now = time.time()
    window = _request_timestamps[client_key]
    window[:] = [t for t in window if now - t < 60.0]
    if len(window) >= settings.RATE_LIMIT_PER_MINUTE:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please retry after a few seconds."},
        )
    window.append(now)
    return await call_next(request)

@app.on_event("startup")
def on_startup():
    seed_initial_data(force_reset=False)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ai_provider": settings.AI_PROVIDER,
    }

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(compare.router)
app.include_router(admin.router)
