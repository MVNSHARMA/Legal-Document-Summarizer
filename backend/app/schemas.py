from typing import List

from pydantic import BaseModel


class CaseOverview(BaseModel):
    judges: List[str] = []
    lawyers: List[str] = []
    complainant: str = ""
    accused: str = ""
    court: str = ""
    case_number: str = ""


class CaseDetails(BaseModel):
    what_happened: str = ""
    crime_or_issue: str = ""
    sections_involved: List[str] = []
    judgment: str = ""
    judgment_date: str = ""
    penalty_or_relief: str = ""
    judgment_outcome: str = ""   # Convicted | Acquitted | Dismissed | Allowed |
                                  # Bail Granted | Bail Rejected | Pending | Unknown


class SimilarCase(BaseModel):
    title: str
    similarity_score: float
    issue: str = ""
    judgment_summary: str = ""


class AnalysisResponse(BaseModel):
    document_id: str
    filename: str
    document_subtype: str = ""   # e.g. "HC: Criminal Appeal", "SC: Writ Petition", "FIR"
    case_overview: CaseOverview
    case_details: CaseDetails
    similar_cases: List[SimilarCase] = []
    used_ocr: bool = False
    page_count: int = 0
    errors: List[str] = []
