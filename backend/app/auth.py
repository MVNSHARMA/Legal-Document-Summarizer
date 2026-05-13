"""
auth.py — Core authentication utilities.

Handles:
- User model and JSON-file persistence (backend/data/users.json)
- Password hashing / verification via passlib[bcrypt]
- JWT creation / verification via python-jose
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Path to the flat-file user store (created automatically if absent)
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
USERS_FILE = DATA_DIR / "users.json"

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# User model (plain dataclass — no ORM dependency)
# ---------------------------------------------------------------------------
class User:
    def __init__(
        self,
        id: str,
        email: str,
        hashed_password: Optional[str],
        full_name: str,
        created_at: str,
        google_id: Optional[str] = None,
    ) -> None:
        self.id = id
        self.email = email
        self.hashed_password = hashed_password
        self.full_name = full_name
        self.created_at = created_at
        self.google_id = google_id

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "hashed_password": self.hashed_password,
            "full_name": self.full_name,
            "created_at": self.created_at,
            "google_id": self.google_id,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(
            id=data["id"],
            email=data["email"],
            hashed_password=data.get("hashed_password"),
            full_name=data.get("full_name", ""),
            created_at=data["created_at"],
            google_id=data.get("google_id"),
        )

    def public_dict(self) -> dict:
        """Safe representation — never exposes hashed_password."""
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "created_at": self.created_at,
            "google_id": self.google_id,
        }


# ---------------------------------------------------------------------------
# JSON persistence helpers
# ---------------------------------------------------------------------------
def _load_users() -> list[dict]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        USERS_FILE.write_text("[]", encoding="utf-8")
    with USERS_FILE.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _save_users(users: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with USERS_FILE.open("w", encoding="utf-8") as fh:
        json.dump(users, fh, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def get_user_by_email(email: str) -> Optional[User]:
    for record in _load_users():
        if record["email"].lower() == email.lower():
            return User.from_dict(record)
    return None


def get_user_by_google_id(google_id: str) -> Optional[User]:
    for record in _load_users():
        if record.get("google_id") == google_id:
            return User.from_dict(record)
    return None


def get_user_by_id(user_id: str) -> Optional[User]:
    for record in _load_users():
        if record["id"] == user_id:
            return User.from_dict(record)
    return None


def create_user(
    email: str,
    full_name: str,
    password: Optional[str] = None,
    google_id: Optional[str] = None,
) -> User:
    """
    Persist a new user.  Either `password` or `google_id` must be supplied.
    Raises ValueError if the email is already registered.
    """
    if get_user_by_email(email):
        raise ValueError(f"Email already registered: {email}")

    hashed = pwd_context.hash(password) if password else None
    user = User(
        id=str(uuid.uuid4()),
        email=email.lower().strip(),
        hashed_password=hashed,
        full_name=full_name,
        created_at=datetime.now(timezone.utc).isoformat(),
        google_id=google_id,
    )
    records = _load_users()
    records.append(user.to_dict())
    _save_users(records)
    return user


def update_user(user: User) -> None:
    """Persist changes to an existing user record (matched by id)."""
    records = _load_users()
    for i, record in enumerate(records):
        if record["id"] == user.id:
            records[i] = user.to_dict()
            _save_users(records)
            return
    raise ValueError(f"User not found: {user.id}")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    """Hash a plain-text password."""
    return pwd_context.hash(plain)


def delete_user(user_id: str) -> None:
    """Remove a user record by id."""
    records = _load_users()
    updated = [r for r in records if r["id"] != user_id]
    _save_users(updated)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------
def create_access_token(subject: str) -> str:
    """
    Create a signed JWT.

    Args:
        subject: The user's id (stored in the `sub` claim).

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> Optional[str]:
    """
    Decode and validate a JWT.

    Returns:
        The user id (`sub` claim) on success, or None if the token is
        invalid / expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
