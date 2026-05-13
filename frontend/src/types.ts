export interface CaseOverview {
  judges: string[];
  lawyers: string[];
  complainant: string;
  accused: string;
  court: string;
  case_number: string;
}

export interface CaseDetails {
  what_happened: string;
  crime_or_issue: string;
  sections_involved: string[];
  judgment: string;
  judgment_date: string;
  penalty_or_relief: string;
  judgment_outcome: string;  // Convicted | Acquitted | Dismissed | Allowed |
                              // Bail Granted | Bail Rejected | Charge Framed | Unknown
}

export interface SimilarCase {
  title: string;
  similarity_score: number;
  issue: string;
  judgment_summary: string;
}

export interface AnalysisResponse {
  document_id: string;
  filename: string;
  document_subtype: string;  // e.g. "HC: Criminal Appeal", "SC: Writ Petition", "FIR"
  case_overview: CaseOverview;
  case_details: CaseDetails;
  similar_cases: SimilarCase[];
  used_ocr: boolean;
  page_count: number;
  errors: string[];
}
