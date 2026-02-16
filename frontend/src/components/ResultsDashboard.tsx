import React, { useState } from "react";
import type { AnalysisResponse, SectionSummary, Citation, Entity, SimilarCase } from "../types";

interface ResultsDashboardProps {
  data: AnalysisResponse;
  onReset: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  court_judgment: "Court Judgment",
  contract: "Contract",
  fir_or_notice: "FIR / Legal Notice",
  other: "Other Legal Document"
};

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ data, onReset }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (name: string) => {
    setExpandedSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const renderConfidenceBar = (section: SectionSummary) => {
    const value = section.confidence;
    let colorClass = "conf-medium";
    if (value >= 80) colorClass = "conf-high";
    else if (value <= 50) colorClass = "conf-low";

    return (
      <div className="confidence-row">
        <div className="confidence-label">Confidence</div>
        <div className="confidence-bar">
          <div className={`confidence-bar-fill ${colorClass}`} style={{ width: `${value}%` }} />
        </div>
        <div className="confidence-value">{value.toFixed(1)}%</div>
      </div>
    );
  };

  const renderCitations = (citations: Citation[]) => {
    if (!citations.length) return <div className="empty-text">No legal citations detected.</div>;

    return (
      <ul className="pill-list">
        {citations.map((c, idx) => (
          <li key={`${c.text}-${idx}`} className="pill">
            <span className="pill-main">{c.text}</span>
            <span className="pill-tag">{c.citation_type}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderEntities = (entities: Entity[]) => {
    if (!entities.length) return <div className="empty-text">No named entities extracted.</div>;

    return (
      <div className="entity-grid">
        {entities.map((e, idx) => (
          <div key={`${e.text}-${idx}`} className="entity-card">
            <div className="entity-text">{e.text}</div>
            <div className="entity-meta">
              <span className="entity-label">{e.label}</span>
              {e.role && <span className="entity-role">{e.role}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSimilarCases = (cases: SimilarCase[]) => {
    if (!cases.length) return <div className="empty-text">No similar cases found.</div>;

    return (
      <ul className="similar-list">
        {cases.map((c) => (
          <li key={c.case_id} className="similar-item">
            <div className="similar-title">{c.title}</div>
            <div className="similar-meta">
              <span className="similar-type">{SECTION_LABELS[c.document_type] || c.document_type}</span>
              <span className="similar-score">{c.similarity.toFixed(1)}% similar</span>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const docTypeLabel = SECTION_LABELS[data.document_type] || data.document_type;

  return (
    <div className="results-layout">
      <div className="results-main">
        <div className="card">
          <div className="results-header-row">
            <div>
              <h2 className="card-title">Analysis Results</h2>
              <div className="card-subtitle">
                Document ID: <code>{data.document_id}</code>
              </div>
            </div>
            <button className="secondary-button" onClick={onReset}>
              Analyze another document
            </button>
          </div>

          <div className="meta-row">
            <div>
              <div className="meta-label">Detected Document Type</div>
              <div className="meta-value meta-pill">{docTypeLabel}</div>
            </div>
            <div>
              <div className="meta-label">Pages</div>
              <div className="meta-value">{data.meta.page_count || "N/A"}</div>
            </div>
            <div>
              <div className="meta-label">OCR Used</div>
              <div className="meta-value">{data.meta.used_ocr ? "Yes" : "No"}</div>
            </div>
          </div>

          {data.meta.errors.length > 0 && (
            <div className="warning-banner">
              Some non-fatal issues occurred during processing:
              <ul>
                {data.meta.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-subtitle">Overall Case Summary</h3>
          <p className="helper-text">
            High-level narrative of the entire document: what the case is about, what happened, and
            how the document is structured.
          </p>
          <p className="section-summary" style={{ whiteSpace: "pre-line" }}>
            {data.overall_summary}
          </p>
        </div>

        <div className="card">
          <h3 className="card-subtitle">Section-wise Summaries</h3>
          <p className="helper-text">
            Click on a section to expand/collapse. Short summaries are shown by default; expanded
            view reveals more detailed content.
          </p>

          <div className="section-list">
            {data.sections.map((section) => {
              const expanded = expandedSections[section.name] ?? false;
              return (
                <div key={section.name} className="section-card">
                  <div className="section-header" onClick={() => toggleSection(section.name)}>
                    <div className="section-title">{section.name}</div>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => toggleSection(section.name)}
                    >
                      {expanded ? "Collapse" : "Expand"}
                    </button>
                  </div>
                  <div className="section-body">
                    <p className="section-summary">
                      {expanded ? section.summary_detailed : section.summary_short}
                    </p>
                    {renderConfidenceBar(section)}
                  </div>
                </div>
              );
            })}

            {!data.sections.length && (
              <div className="empty-text">
                No sections were identified; this may happen for very short or unstructured
                documents.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="results-sidebar">
        <div className="card">
          <h3 className="card-subtitle">Legal Citations</h3>
          {renderCitations(data.citations)}
        </div>

        <div className="card">
          <h3 className="card-subtitle">Named Entities</h3>
          {renderEntities(data.entities)}
        </div>

        <div className="card">
          <h3 className="card-subtitle">Similar Cases</h3>
          {renderSimilarCases(data.similar_cases)}
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;


