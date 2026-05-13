"""
ai_extractor.py — Groq LLM-powered extraction for Indian legal documents.

FIX 1: Detailed error logging so failures are visible in server output.
FIX 2: Uses llama-3.1-8b-instant (faster, more reliable) with max_tokens=1500.
FIX 3: Simplified prompt that is less likely to confuse the model.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict

from groq import Groq

# ---------------------------------------------------------------------------
# Client (lazy-initialised)
# ---------------------------------------------------------------------------
_client: Groq | None = None


def _get_client() -> Groq:
    global _client  # noqa: PLW0603
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to backend/.env"
            )
        _client = Groq(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# FIX 3: Simplified prompt
# ---------------------------------------------------------------------------
EXTRACTION_PROMPT = """You are a legal document analyzer. Read the Indian legal document below and extract information.
Return ONLY a JSON object, nothing else, no explanation.

Required JSON format:
{
  "judges": ["name1", "name2"],
  "lawyers": ["name1", "name2"],
  "complainant": "who filed the case",
  "accused": "who the case is against",
  "court": "court name",
  "case_number": "full case number",
  "document_subtype": "type of document",
  "what_happened": "3-4 sentences about the facts",
  "crime_or_issue": "main legal issue in 3-5 words",
  "sections_involved": ["Section X IPC", "Article Y"],
  "judgment": "what the court decided",
  "judgment_date": "date of judgment",
  "judgment_outcome": "one of: Convicted/Acquitted/Bail Granted/Bail Rejected/Allowed/Dismissed/Directions Issued/Unknown",
  "penalty_or_relief": "punishment or relief granted"
}

DOCUMENT:
"""

# ---------------------------------------------------------------------------
# Default result (used on any failure)
# ---------------------------------------------------------------------------
_DEFAULT: Dict[str, Any] = {
    "judges":            [],
    "lawyers":           [],
    "complainant":       "Not identified",
    "accused":           "Not identified",
    "court":             "Not identified",
    "case_number":       "Not identified",
    "document_subtype":  "Unknown",
    "what_happened":     "Not available",
    "crime_or_issue":    "Not identified",
    "sections_involved": [],
    "judgment":          "Not available",
    "judgment_date":     "Not identified",
    "judgment_outcome":  "Unknown",
    "penalty_or_relief": "Not available",
}


# ---------------------------------------------------------------------------
# FIX 1 + 2: extract_with_ai with detailed logging and reliable model
# ---------------------------------------------------------------------------
def extract_with_ai(text: str) -> Dict[str, Any]:
    """
    Use Groq LLM to extract case information from document text.

    FIX 1: Prints detailed logs at each stage so failures are visible.
    FIX 2: Uses llama-3.1-8b-instant (faster) with max_tokens=1500.
    FIX 3: Uses simplified prompt.

    Returns a dict matching the extraction schema.
    Falls back to _DEFAULT on any error.
    """
    raw = ""  # keep in scope for error logging

    try:
        # Build truncated text: header (6 000) + footer (2 000)
        if len(text) > 8000:
            truncated = (
                text[:6000]
                + "\n\n[...middle omitted...]\n\n"
                + text[-2000:]
            )
        else:
            truncated = text

        print(f"[AI Extractor] Sending {len(truncated)} chars to Groq")

        client = _get_client()
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",   # FIX 2: faster, more reliable model
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT + truncated,
                }
            ],
            temperature=0.1,
            max_tokens=1500,               # FIX 2: reduced to avoid timeouts
        )

        raw = response.choices[0].message.content.strip()
        print(f"[AI Extractor] Raw response (first 200 chars): {raw[:200]}")

        # FIX 1: More aggressive JSON cleaning
        # 1. Strip ```json ... ``` or ``` ... ``` fences
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        # 2. Find the outermost JSON object even if there's text before/after
        start = raw.find("{")
        end   = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            raw = raw[start : end + 1]

        print(f"[AI Extractor] Cleaned JSON (first 200 chars): {raw[:200]}")

        extracted: Dict[str, Any] = json.loads(raw)
        print(f"[AI Extractor] Successfully extracted keys: {list(extracted.keys())}")

        # Merge with defaults for any missing / null / empty keys
        for key, default_val in _DEFAULT.items():
            val = extracted.get(key)
            if val is None:
                extracted[key] = default_val
            elif isinstance(default_val, str) and isinstance(val, str) and not val.strip():
                extracted[key] = default_val
            elif isinstance(default_val, list) and not isinstance(val, list):
                extracted[key] = default_val

        # Cap sections at 10
        if len(extracted.get("sections_involved", [])) > 10:
            extracted["sections_involved"] = extracted["sections_involved"][:10]

        return extracted

    except json.JSONDecodeError as exc:
        print(f"[AI Extractor] JSON parse error: {exc}")
        print(f"[AI Extractor] Raw that failed to parse (first 500 chars): {raw[:500]}")
        return dict(_DEFAULT)

    except Exception as exc:
        print(f"[AI Extractor] Error: {type(exc).__name__}: {exc}")
        return dict(_DEFAULT)
