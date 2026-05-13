import os
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

# ---------------------------------------------------------------------------
# Use ABSOLUTE imports so this works both locally and on Render/production.
# Render runs: uvicorn app.main:app  (from the backend/ directory)
# so "app" is the top-level package and absolute imports are required.
# ---------------------------------------------------------------------------
from app.schemas import AnalysisResponse
from app.pipeline import analyze_document
from app.auth import verify_access_token
from app.routes.auth_routes import router as auth_router, email_router

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
load_dotenv()

ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_MB", "10")) * 1024 * 1024
SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=[])

# ---------------------------------------------------------------------------
# Security scheme for protected endpoints
# ---------------------------------------------------------------------------
bearer_scheme = HTTPBearer(auto_error=False)


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Dependency — validates JWT and returns the user id."""
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
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Legal Document Analyzer & Intelligent Case Summarizer",
    description="Decision-support tool for understanding legal documents. Does NOT provide legal advice.",
    version="0.1.0",
)

# SessionMiddleware is required by Authlib for OAuth state/nonce storage
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Attach rate-limiter state and its exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
#
# auth_router  has prefix="/api/auth"  defined in auth_routes.py → routes at /api/auth/*
# email_router has prefix="/api/email" defined in auth_routes.py → routes at /api/email/*
# Do NOT add a prefix here — it would double the prefix.
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(email_router)


# ---------------------------------------------------------------------------
# Core routes
# ---------------------------------------------------------------------------
@app.post("/api/analyze", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Depends(require_auth),
):
    """
    Upload a legal PDF and run the full AI analysis pipeline.
    Requires JWT. Max 10 MB. Rate-limited to 10/minute per IP.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 10MB.",
        )

    try:
        result = analyze_document(file_bytes, filename=file.filename)
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}") from exc


@app.get("/health")
async def health_check():
    """Basic health check — returns 200 if the server is running."""
    return {"status": "ok"}


@app.get("/api/test")
async def test():
    """Quick smoke-test endpoint to confirm the backend is reachable."""
    return {
        "message": "Backend is working!",
        "routes_registered": True,
    }


@app.get("/api/routes")
async def list_routes():
    """Debug endpoint — lists all registered routes. Useful for verifying deployment."""
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append({
                "path":    route.path,
                "methods": sorted(route.methods) if route.methods else [],
            })
        elif hasattr(route, "path"):
            routes.append({"path": route.path, "methods": []})
    routes.sort(key=lambda r: r["path"])
    return {"total": len(routes), "routes": routes}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
