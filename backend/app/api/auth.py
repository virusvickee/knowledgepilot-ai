from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import verify_password, create_session_token, get_current_user
from app.db.database import db
from app.models.schemas import LoginRequest, AuthTokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=AuthTokenResponse)
def login(payload: LoginRequest):
    user = db.fetch_one("SELECT * FROM users WHERE email = ? AND is_active = 1", (payload.email.strip().lower(),))
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    ws = db.fetch_one("SELECT name FROM workspaces WHERE id = ?", (user["workspace_id"],))
    token = create_session_token(user)
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            workspace_id=user["workspace_id"],
            workspace_name=ws["name"] if ws else user["workspace_id"],
        ),
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    ws = db.fetch_one("SELECT name FROM workspaces WHERE id = ?", (current_user["workspace_id"],))
    return UserResponse(
        id=current_user["sub"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        workspace_id=current_user["workspace_id"],
        workspace_name=ws["name"] if ws else current_user["workspace_id"],
    )
