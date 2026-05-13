"""
auth_routes.py — Authentication and email endpoints.

Auth routes  (prefix="/api/auth"):
  POST /register        — email/password registration
  POST /login           — email/password login
  GET  /google          — redirect to Google OAuth consent screen
  GET  /google/callback — Google OAuth callback
  GET  /me              — return current user (JWT required)
  PUT  /profile         — update full name
  PUT  /password        — change password
  DELETE /account       — delete account

Email routes (prefix="/api/email"):
  POST /send-report     — send analysis report by email
"""

from __future__ import annotations

import os
import time as _time

import httpx
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from app.auth import (
    create_access_token,
    create_user,
    get_user_by_email,
    get_user_by_google_id,
    get_user_by_id,
    update_user,
    verify_access_token,
    verify_password,
)

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ---------------------------------------------------------------------------
# OAuth client (Authlib)
# ---------------------------------------------------------------------------
oauth = OAuth()
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ---------------------------------------------------------------------------
# Router & security scheme
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Dependency — extract and validate JWT from Authorization header
# ---------------------------------------------------------------------------
def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = verify_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UpdateProfileRequest(BaseModel):
    full_name: str


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    """Register a new user with email and password."""
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )
    try:
        user = create_user(
            email=body.email,
            full_name=body.full_name,
            password=body.password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """Authenticate with email and password."""
    user = get_user_by_email(body.email)
    if user is None or user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)


@router.get("/google")
async def google_login(request: Request):
    """Redirect the browser to Google's OAuth consent screen."""
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request):
    """
    Handle the redirect back from Google.
    Creates the user if first login, then redirects to the frontend
    with the JWT as a query parameter.
    """
    try:
        token_data = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth error: {exc}",
        ) from exc

    # Fetch user info from Google
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        resp.raise_for_status()
        google_user = resp.json()

    google_id: str = google_user["sub"]
    email: str = google_user.get("email", "")
    full_name: str = google_user.get("name", email)

    # Find existing user by google_id, then by email, or create new
    user = get_user_by_google_id(google_id)
    if user is None:
        user = get_user_by_email(email)
        if user is not None:
            # Link Google ID to existing email account
            user.google_id = google_id
            update_user(user)
        else:
            user = create_user(
                email=email,
                full_name=full_name,
                google_id=google_id,
            )

    jwt_token = create_access_token(subject=user.id)
    # Redirect to the frontend login page — LoginPage reads ?token= and completes sign-in
    redirect_url = f"{FRONTEND_URL}/login?token={jwt_token}"
    return RedirectResponse(url=redirect_url)


@router.get("/me")
async def me(user_id: str = Depends(get_current_user_id)):
    """Return the currently authenticated user's public profile."""
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
    return user.public_dict()


@router.put("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Update the authenticated user's full name."""
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    full_name = body.full_name.strip()
    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Full name cannot be empty.",
        )

    user.full_name = full_name
    update_user(user)
    return user.public_dict()


@router.put("/password")
async def update_password(
    body: UpdatePasswordRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Change the authenticated user's password."""
    from app.auth import hash_password  # absolute import for production

    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Google-only accounts have no password
    if user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google sign-in and has no password.",
        )

    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 8 characters.",
        )

    user.hashed_password = hash_password(body.new_password)
    update_user(user)
    return {"message": "Password updated successfully."}


@router.delete("/account")
async def delete_account(user_id: str = Depends(get_current_user_id)):
    """Permanently delete the authenticated user's account."""
    from app.auth import delete_user  # absolute import for production

    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    delete_user(user_id)
    return {"message": "Account deleted."}


# ---------------------------------------------------------------------------
# Email report router  (prefix="/api/email")
# ---------------------------------------------------------------------------

email_router = APIRouter(prefix="/api/email", tags=["email"])

# Simple in-memory per-user rate limiter: {user_id: [timestamps]}
_email_log: dict[str, list[float]] = {}
_EMAIL_LIMIT  = 5        # max emails per window
_EMAIL_WINDOW = 3600.0   # window in seconds (1 hour)


class SendReportRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: str
    case_data: dict


@email_router.post("/send-report")
async def send_report(
    body: SendReportRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Send an analysis report email. Rate-limited to 5 emails per hour per user."""
    from app.email_service import send_analysis_email

    # Check Gmail configuration first
    if not os.getenv("GMAIL_USER") or not os.getenv("GMAIL_APP_PASSWORD"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Email service not configured. "
                "Please set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env. "
                "See https://myaccount.google.com/apppasswords to create an App Password."
            ),
        )

    # Per-user rate limiting
    now = _time.time()
    timestamps = [t for t in _email_log.get(user_id, []) if now - t < _EMAIL_WINDOW]
    if len(timestamps) >= _EMAIL_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Email limit reached. You can send at most {_EMAIL_LIMIT} emails per hour.",
        )
    timestamps.append(now)
    _email_log[user_id] = timestamps

    try:
        send_analysis_email(
            recipient_email=body.recipient_email,
            recipient_name=body.recipient_name,
            case_data=body.case_data,
        )
        return {"message": f"Report sent successfully to {body.recipient_email}"}
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {exc}",
        ) from exc
