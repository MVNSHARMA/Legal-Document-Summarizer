"""
pipeline.py — AI-powered legal document analysis pipeline.

Uses Groq LLM for all case information extraction.
FIX 4: Regex fallback for critical fields when AI returns all defaults.
"""

from __future__ import annotations

import io
import re
import uuid
from typing import Dict, List, Tuple

import pdfplumber

from .schemas import AnalysisResponse, CaseDetails, CaseOverview, SimilarCase
from .pipeline_modules.ocr import extract_text_with_ocr
from .pipeline_modules.preprocessing import clean_extracted_text
from .pipeline_modules.ai_extractor import extract_with_ai
from .pipeline_modules.similarity_engine import find_similar_cases


# ═══════════════════════════════════════════════════════════════════════════════
# TEXT EXTRACTION  (pdfplumber + OCR fallback — unchanged)
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_text_and_meta(file_bytes: bytes) -> Tuple[str, bool, int, List[str]]:
    """Extract text from PDF using pdfplumber; fall back to OCR for scanned docs."""
    errors: List[str] = []
    used_ocr = False
    page_count = 0

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            texts = [page.extract_text() or "" for page in pdf.pages]
            combined = "\n\n".join(texts).strip()
    except Exception as exc:
        combined = ""
        errors.append(f"pdfplumber extraction failed: {exc}")

    if len(combined) < 500:
        try:
            ocr_text = extract_text_with_ocr(file_bytes)
            if ocr_text:
                combined = ocr_text
                used_ocr = True
        except Exception as exc:
            errors.append(f"OCR failed: {exc}")

    return combined, used_ocr, page_count, errors


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 4: Regex fallback for critical fields
# ═══════════════════════════════════════════════════════════════════════════════

def _regex_fallback(text: str) -> Dict[str, str]:
    """
    Fast regex extraction for the most critical fields.
    Called only when AI extraction returns all defaults.
    """
    fallback: Dict[str, str] = {}

    # Case number — SC / HC formats
    case_num = re.search(
        r"(?:Writ\s+Petition|W\.P\.|Civil\s+Appeal|Criminal\s+Appeal|SLP|FIR|"
        r"Crl\.?\s*A\.?|C\.A\.?)\s*[\(\[]?[A-Za-z]*[\)\]]?\s*No\.?\s*\d+\s*of\s*\d{4}",
        text, re.IGNORECASE,
    )
    if case_num:
        fallback["case_number"] = case_num.group(0).strip()

    # Court
    if re.search(r"Supreme\s+Court\s+of\s+India", text, re.IGNORECASE):
        fallback["court"] = "Supreme Court of India"
    else:
        hc = re.search(r"([A-Za-z]+\s+High\s+Court)", text, re.IGNORECASE)
        if hc:
            fallback["court"] = hc.group(1).strip()
        elif re.search(r"Sessions\s+Court", text, re.IGNORECASE):
            fallback["court"] = "Sessions Court"
        elif re.search(r"District\s+Court", text, re.IGNORECASE):
            fallback["court"] = "District Court"

    # Parties from "X vs Y" or "X … PETITIONER / Y … RESPONDENT"
    # Try PETITIONER/RESPONDENT label pattern first (SC format)
    pet = re.search(
        r"([A-Z][A-Za-z\s\.&,'-]{2,60}?)\s*[…\.]{1,3}\s*PETITIONER",
        text[:2000], re.IGNORECASE,
    )
    res = re.search(
        r"([A-Z][A-Za-z\s\.&,'-]{2,60}?)\s*[…\.]{1,3}\s*RESPONDENTS?",
        text[:2000], re.IGNORECASE,
    )
    if pet:
        fallback["complainant"] = re.sub(r"\s+", " ", pet.group(1)).strip()[:60]
    if res:
        fallback["accused"] = re.sub(r"\s+", " ", res.group(1)).strip()[:60]

    # Fall back to vs-pattern if labels not found
    if "complainant" not in fallback or "accused" not in fallback:
        vs = re.search(
            r"([A-Z][A-Za-z\s\.]+?)\s*(?:vs?\.?|versus)\s*([A-Z][A-Za-z\s\.&]+?)(?:\n|$)",
            text[:2000],
        )
        if vs:
            if "complainant" not in fallback:
                fallback["complainant"] = vs.group(1).strip()[:60]
            if "accused" not in fallback:
                fallback["accused"] = vs.group(2).strip()[:60]

    # Document subtype
    lower = text[:3000].lower()
    if "supreme court" in lower:
        prefix = "SC: "
    elif "high court" in lower:
        prefix = "HC: "
    else:
        prefix = ""

    if re.search(r"\bwrit\s+petition\b", lower):
        fallback["document_subtype"] = prefix + "Writ Petition"
    elif re.search(r"\bcriminal\s+appeal\b", lower):
        fallback["document_subtype"] = prefix + "Criminal Appeal"
    elif re.search(r"\bcivil\s+appeal\b", lower):
        fallback["document_subtype"] = prefix + "Civil Appeal"
    elif re.search(r"\bbail\s+application\b", lower):
        fallback["document_subtype"] = prefix + "Bail Application"
    elif re.search(r"\bfir\b|first\s+information\s+report", lower):
        fallback["document_subtype"] = "FIR"
    elif prefix:
        fallback["document_subtype"] = prefix + "Court Order"

    print(f"[Pipeline] Regex fallback extracted: {list(fallback.keys())}")
    return fallback


def _ai_returned_all_defaults(extracted: Dict) -> bool:
    """Return True if AI gave back all the critical default values."""
    return (
        extracted.get("complainant") == "Not identified"
        and extracted.get("court") == "Not identified"
        and extracted.get("case_number") == "Not identified"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_document(file_bytes: bytes, filename: str) -> Dict:
    """
    Orchestrate the full analysis pipeline:
      1. Extract text (pdfplumber → OCR fallback)
      2. Clean text
      3. AI extraction via Groq
      4. Regex fallback if AI returned all defaults (FIX 4)
      5. TF-IDF similar cases
      6. Build and return AnalysisResponse dict
    """
    errors: List[str] = []

    try:
        raw_text, used_ocr, page_count, extract_errors = _extract_text_and_meta(file_bytes)
        errors.extend(extract_errors)

        cleaned_text = clean_extracted_text(raw_text)

        if not cleaned_text or len(cleaned_text) < 100:
            raise ValueError("Could not extract readable text from this PDF.")

        # ── AI extraction ──
        extracted = extract_with_ai(cleaned_text)

        # ── FIX 4: Regex fallback when AI returns all defaults ──
        if _ai_returned_all_defaults(extracted):
            print("[Pipeline] AI returned all defaults — applying regex fallback")
            fallback = _regex_fallback(cleaned_text)
            for key, val in fallback.items():
                if val and val != "Not identified":
                    extracted[key] = val

        # ── Similar cases via TF-IDF ──
        similar_cases_raw: List[SimilarCase] = find_similar_cases(
            cleaned_text,
            extracted.get("crime_or_issue", ""),
        )

        # ── Build schema objects ──
        case_overview = CaseOverview(
            judges=extracted.get("judges", []),
            lawyers=extracted.get("lawyers", []),
            complainant=extracted.get("complainant", "Not identified"),
            accused=extracted.get("accused", "Not identified"),
            court=extracted.get("court", "Not identified"),
            case_number=extracted.get("case_number", "Not identified"),
        )

        case_details = CaseDetails(
            what_happened=extracted.get("what_happened", "Not available"),
            crime_or_issue=extracted.get("crime_or_issue", "Not identified"),
            sections_involved=extracted.get("sections_involved", []),
            judgment=extracted.get("judgment", "Not available"),
            judgment_date=extracted.get("judgment_date", "Not identified"),
            penalty_or_relief=extracted.get("penalty_or_relief", "Not available"),
            judgment_outcome=extracted.get("judgment_outcome", "Unknown"),
        )

        response = AnalysisResponse(
            document_id=str(uuid.uuid4()),
            filename=filename,
            document_subtype=extracted.get("document_subtype", "Unknown"),
            case_overview=case_overview,
            case_details=case_details,
            similar_cases=similar_cases_raw,
            used_ocr=used_ocr,
            page_count=page_count,
            errors=errors,
        )

        return response.model_dump()

    except Exception as exc:
        return AnalysisResponse(
            document_id=str(uuid.uuid4()),
            filename=filename,
            document_subtype="Unknown",
            case_overview=CaseOverview(),
            case_details=CaseDetails(),
            similar_cases=[],
            used_ocr=False,
            page_count=0,
            errors=errors + [f"Analysis failed: {exc}"],
        ).model_dump()
