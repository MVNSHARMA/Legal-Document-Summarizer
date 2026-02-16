import io
import uuid
from typing import Dict, List, Tuple

import pdfplumber

from .schemas import (
    AnalysisMeta,
    AnalysisResponse,
    Citation,
    Entity,
    SectionSummary,
    SimilarCase,
)
from .pipeline_modules.ocr import extract_text_with_ocr
from .pipeline_modules.preprocessing import clean_extracted_text
from .pipeline_modules.document_classifier import classify_document_type
from .pipeline_modules.section_detector import detect_sections
from .pipeline_modules.summarizer import summarize_section, summarize_document
from .pipeline_modules.ner import extract_entities
from .pipeline_modules.citation_extractor import extract_citations
from .pipeline_modules.similarity_engine import find_similar_cases


def _extract_text_and_meta(file_bytes: bytes) -> Tuple[str, bool, int, List[str]]:
    """
    Try text extraction with pdfplumber first.
    If very little text is found, fall back to OCR.
    """
    errors: List[str] = []
    used_ocr = False
    page_count = 0

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            texts = []
            for page in pdf.pages:
                txt = page.extract_text() or ""
                texts.append(txt)
            combined = "\n\n".join(texts).strip()
    except Exception as exc:  # noqa: BLE001
        combined = ""
        errors.append(f"pdfplumber extraction failed: {exc}")

    # Heuristic: if extracted text is too short, do OCR
    if len(combined) < 500:
        try:
            ocr_text = extract_text_with_ocr(file_bytes)
            if ocr_text:
                combined = ocr_text
                used_ocr = True
        except Exception as exc:  # noqa: BLE001
            errors.append(f"OCR failed: {exc}")

    return combined, used_ocr, page_count, errors


def analyze_document(file_bytes: bytes, filename: str) -> Dict:
    """
    Orchestrate the full analysis pipeline and return a dict that matches
    the AnalysisResponse schema (FastAPI will handle validation).
    """
    raw_text, used_ocr, page_count, errors = _extract_text_and_meta(file_bytes)
    cleaned_text = clean_extracted_text(raw_text)

    document_type = classify_document_type(cleaned_text)
    sections = detect_sections(cleaned_text, document_type=document_type)

    section_summaries: List[SectionSummary] = []
    for section in sections:
        short, detailed, confidence = summarize_section(
            section_name=section["name"],
            section_text=section["text"],
            used_ocr=used_ocr,
        )
        section_summaries.append(
            SectionSummary(
                name=section["name"],
                raw_text=section["text"],
                summary_short=short,
                summary_detailed=detailed,
                confidence=confidence,
            )
        )

    overall_summary = summarize_document(cleaned_text, used_ocr=used_ocr)

    citations: List[Citation] = extract_citations(cleaned_text)
    entities: List[Entity] = extract_entities(cleaned_text, document_type=document_type)
    similar_cases: List[SimilarCase] = find_similar_cases(cleaned_text, document_type)

    meta = AnalysisMeta(
        filename=filename,
        used_ocr=used_ocr,
        page_count=page_count,
        errors=errors,
    )

    response = AnalysisResponse(
        document_id=str(uuid.uuid4()),
        document_type=document_type,
        overall_summary=overall_summary,
        sections=section_summaries,
        citations=citations,
        entities=entities,
        similar_cases=similar_cases,
        meta=meta,
    )

    # Return as plain dict so JSONResponse can serialize without leaking Pydantic internals
    return response.model_dump()


