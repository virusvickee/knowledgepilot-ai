import base64
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from app.core.config import settings

def hash_password(password: str, salt: Optional[str] = None) -> str:
    if salt is None:
        salt = hashlib.sha256(os.urandom(16) if hasattr(os, "urandom") else b"kp-salt").hexdigest()[:16]
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"pbkdf2_sha256$100000${salt}${dk.hex()}"

import os

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        parts = stored_hash.split("$")
        if len(parts) != 4:
            return False
        _, iterations_str, salt, expected_hex = parts
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations_str),
        )
        return hmac.compare_digest(dk.hex(), expected_hex)
    except Exception:
        return False

def create_session_token(user_data: Dict[str, Any], ttl_seconds: Optional[int] = None) -> str:
    exp = int(time.time()) + (ttl_seconds or settings.SESSION_TTL_SECONDS)
    payload = {
        "sub": user_data["id"],
        "email": user_data["email"],
        "full_name": user_data["full_name"],
        "role": user_data["role"],
        "workspace_id": user_data["workspace_id"],
        "exp": exp,
    }
    raw_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw_json).decode("ascii").rstrip("=")
    sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), b64_payload.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{sig}"

def decode_session_token(token: str) -> Dict[str, Any]:
    if not token or "." not in token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token format")
    b64_payload, sig = token.rsplit(".", 1)
    expected_sig = hmac.new(
        settings.SECRET_KEY.encode("utf-8"), b64_payload.encode("ascii"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
    padding = "=" * (-len(b64_payload) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(b64_payload + padding).decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed session payload") from exc
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session token expired")
    return payload

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header must be Bearer <token>")
    return decode_session_token(token.strip())

def require_roles(*allowed_roles: str):
    def dependency(user: Dict[str, Any] = Header(None)):
        pass
    return allowed_roles

def check_document_permission(user: Dict[str, Any], doc_row: Dict[str, Any], required_action: str = "read") -> bool:
    """
    Enforces strict workspace tenant isolation + role-based and document-level access control.
    """
    # 1. Strict Tenant Isolation: Never allow cross-workspace access
    if user["workspace_id"] != doc_row["workspace_id"]:
        return False

    # 2. Workspace Admin has full access within their own workspace
    if user["role"] == "admin":
        return True

    # 3. Document Owner always has full access
    if doc_row.get("owner_id") == user["id"]:
        return True

    # 4. Write/Delete actions require admin or researcher role
    if required_action in ("write", "delete") and user["role"] == "viewer":
        return False

    # 5. Private documents are only visible to owner or workspace admin
    visibility = doc_row.get("visibility", "workspace")
    if visibility == "private":
        return False

    # 6. Check allowed_roles list on document
    allowed_roles = [r.strip() for r in (doc_row.get("allowed_roles") or "admin,researcher,viewer").split(",") if r.strip()]
    if user["role"] not in allowed_roles:
        return False

    return True
