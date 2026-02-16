export interface SectionSummary {
  name: string;
  raw_text: string;
  summary_short: string;
  summary_detailed: string;
  confidence: number;
}

export interface Citation {
  text: string;
  citation_type: string;
  context_snippet?: string | null;
}

export interface Entity {
  text: string;
  label: string;
  role?: string | null;
  start_char?: number | null;
  end_char?: number | null;
}

export interface SimilarCase {
  case_id: string;
  title: string;
  document_type: string;
  similarity: number;
}

export interface AnalysisMeta {
  filename: string;
  used_ocr: boolean;
  page_count: number;
  errors: string[];
}

export interface AnalysisResponse {
  document_id: string;
  document_type: string;
  overall_summary: string;
  sections: SectionSummary[];
  citations: Citation[];
  entities: Entity[];
  similar_cases: SimilarCase[];
  meta: AnalysisMeta;
}


