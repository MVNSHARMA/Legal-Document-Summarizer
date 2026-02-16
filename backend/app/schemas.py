from typing import List, Optional

from pydantic import BaseModel, Field


class SectionSummary(BaseModel):
    name: str
    raw_text: str
    summary_short: str
    summary_detailed: str
    confidence: float = Field(..., ge=0.0, le=100.0)


class Citation(BaseModel):
    text: str
    citation_type: str
    context_snippet: Optional[str] = None


class Entity(BaseModel):
    text: str
    label: str
    role: Optional[str] = None
    start_char: Optional[int] = None
    end_char: Optional[int] = None


class SimilarCase(BaseModel):
    case_id: str
    title: str
    document_type: str
    similarity: float = Field(..., ge=0.0, le=100.0)


class AnalysisMeta(BaseModel):
    filename: str
    used_ocr: bool
    page_count: int
    errors: List[str] = []


class AnalysisResponse(BaseModel):
    document_id: str
    document_type: str
    overall_summary: str
    sections: List[SectionSummary]
    citations: List[Citation]
    entities: List[Entity]
    similar_cases: List[SimilarCase]
    meta: AnalysisMeta


