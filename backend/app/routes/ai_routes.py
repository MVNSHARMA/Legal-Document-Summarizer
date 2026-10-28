"""
ai_routes.py — Secure proxy endpoints for Groq AI features.
Eliminates the need for frontend clients or Vercel to store the GROQ_API_KEY.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from groq import Groq

router = APIRouter(prefix="/api/ai", tags=["AI Services"])

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="GROQ_API_KEY is not configured on the backend server.",
            )
        _client = Groq(api_key=api_key)
    return _client


def _call_groq(messages: list[dict[str, str]], max_tokens: int = 1000) -> str:
    client = _get_client()
    candidate_models = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
    last_err: Exception | None = None

    for model_name in candidate_models:
        try:
            res = client.chat.completions.create(
                model=model_name,
                messages=messages,  # type: ignore
                max_tokens=max_tokens,
                temperature=0.2,
            )
            content = res.choices[0].message.content
            if content:
                return content.strip()
        except Exception as e:
            last_err = e
            continue

    raise HTTPException(
        status_code=502,
        detail=f"All Groq AI models failed. Last error: {last_err}",
    )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    max_tokens: int = Field(default=800, le=2000)


class ChatResponse(BaseModel):
    content: str


class ExplainRequest(BaseModel):
    document_type: str = ""
    summary: str = ""


class ExplainResponse(BaseModel):
    content: str


class TranslateRequest(BaseModel):
    text: str
    target_language: str = "en"
    target_language_name: str = "English"


class TranslateResponse(BaseModel):
    translated_text: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(req: ChatRequest):
    """Answers questions about legal documents securely via backend Groq client."""
    msgs = [{"role": m.role, "content": m.content} for m in req.messages]
    reply = _call_groq(msgs, max_tokens=req.max_tokens)
    return ChatResponse(content=reply)


@router.post("/explain", response_model=ExplainResponse)
async def explain_in_plain_english(req: ExplainRequest):
    """Simplifies legal document facts and issues into clear, plain English."""
    system_prompt = (
        "You are a legal document simplifier. Explain legal documents in simple plain English "
        "that a non-lawyer can understand. Use short sentences. Avoid legal jargon."
    )
    user_prompt = (
        "Explain this legal document summary in simple plain English. Structure your response EXACTLY like this:\n\n"
        "WHAT IS THIS: (one sentence explaining what this document is)\n"
        "KEY POINTS:\n"
        "• (point 1)\n"
        "• (point 2)\n"
        "• (point 3)\n"
        "WHAT YOU SHOULD KNOW: (2-3 sentences of practical advice for a non-lawyer)\n\n"
        f"Document type: {req.document_type}\n"
        f"Summary: {req.summary}"
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    reply = _call_groq(messages, max_tokens=1000)
    return ExplainResponse(content=reply)


@router.post("/translate", response_model=TranslateResponse)
async def translate_legal_text(req: TranslateRequest):
    """Translates legal text while preserving names, court names, and section references."""
    if req.target_language == "en" or not req.text.strip():
        return TranslateResponse(translated_text=req.text)

    prompt = (
        f"Translate the following legal text to {req.target_language_name}. "
        "Keep legal terms accurate. Keep names of people, courts, and case numbers in their original form. "
        f"Return ONLY the translation, no explanation:\n\n{req.text}"
    )
    messages = [{"role": "user", "content": prompt}]
    reply = _call_groq(messages, max_tokens=1000)
    return TranslateResponse(translated_text=reply)
