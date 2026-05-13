import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnalysisResponse } from "../types";
import { exportToPDF } from "../utils/exportPDF";
import { exportToWord } from "../utils/exportWord";
import PlainLanguageCard from "../components/PlainLanguageCard";
import LegalTooltip from "../components/LegalTooltip";
import LegalDictionary from "../components/LegalDictionary";
import DocumentChat from "../components/DocumentChat";
import LanguageSelector from "../components/LanguageSelector";
import EmailReportModal from "../components/EmailReportModal";
import { translateCaseDetails, type TranslatableDetails } from "../utils/translator";
import { INDIAN_LANGUAGES, type Language } from "../data/languages";
import { useToast } from "../hooks/useToast";

// ─── Icons ────────────────────────────────────────────────────────────────────
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getJudgmentStyle(outcome: string): React.CSSProperties {
  switch (outcome) {
    case "Acquitted":     return { background: "#15803d", color: "#fff" };
    case "Convicted":     return { background: "#dc2626", color: "#fff" };
    case "Bail Granted":  return { background: "#2563eb", color: "#fff" };
    case "Bail Rejected": return { background: "#7c3aed", color: "#fff" };
    case "Allowed":       return { background: "#0891b2", color: "#fff" };
    case "Dismissed":     return { background: "#d97706", color: "#fff" };
    case "Charge Framed": return { background: "#be185d", color: "#fff" };
    default:              return { background: "var(--navy)", color: "#fff" };
  }
}

const NOT_FOUND = (
  <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem" }}>
    Not found
  </span>
);

// ─── Section 1: Case Overview ─────────────────────────────────────────────────
const CaseOverviewSection: React.FC<{ data: AnalysisResponse }> = ({ data }) => {
  const ov = data.case_overview;

  const rows: { label: string; content: React.ReactNode }[] = [
    {
      label: "Judges",
      content: ov.judges.length > 0
        ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ov.judges.map((j, i) => (
              <span key={i} style={goldPill}>{j}</span>
            ))}
          </div>
        : NOT_FOUND,
    },
    {
      label: "Lawyers",
      content: ov.lawyers.length > 0
        ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ov.lawyers.map((l, i) => (
              <span key={i} style={navyOutlinePill}>{l}</span>
            ))}
          </div>
        : NOT_FOUND,
    },
    {
      label: "Court",
      content: ov.court
        ? <span style={{ fontSize: "0.9rem", color: "var(--text-dark)" }}>{ov.court}</span>
        : NOT_FOUND,
    },
    {
      label: "Case Number",
      content: (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {ov.case_number
            ? <span style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "var(--navy)", fontWeight: 600 }}>{ov.case_number}</span>
            : NOT_FOUND}
          {data.document_subtype && (
            <span style={{
              padding: "2px 10px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
              background: "rgba(15,39,68,0.08)", color: "var(--navy)",
              border: "1px solid rgba(15,39,68,0.2)",
            }}>
              {data.document_subtype}
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Filed By",
      content: ov.complainant
        ? <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-dark)" }}>{ov.complainant}</span>
        : NOT_FOUND,
    },
    {
      label: "Against",
      content: ov.accused
        ? <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-dark)" }}>{ov.accused}</span>
        : NOT_FOUND,
    },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Navy header */}
      <div style={{
        background: "var(--navy)", borderRadius: "12px 12px 0 0",
        padding: "14px 24px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: "1.1rem" }}>⚖️</span>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
          Case Overview
        </h2>
        {(ov.complainant && ov.accused) && (
          <span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>
            {ov.complainant} vs {ov.accused}
          </span>
        )}
      </div>

      {/* Info grid */}
      <div style={{
        background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)",
        borderTop: "none", borderRadius: "0 0 12px 12px",
        overflow: "hidden", boxShadow: "var(--shadow)",
      }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display: "grid", gridTemplateColumns: "140px 1fr",
            padding: "12px 24px", gap: 16,
            borderBottom: i < rows.length - 1 ? "0.5px solid var(--gray-border)" : "none",
            background: i % 2 === 0 ? "#fff" : "var(--gray-bg)",
          }}>
            <span style={{
              fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "var(--text-muted)",
              paddingTop: 2, alignSelf: "flex-start",
            }}>
              {row.label}
            </span>
            <div>{row.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Section 2: Case Details ──────────────────────────────────────────────────
const CaseDetailsSection: React.FC<{
  data: AnalysisResponse;
  displayWhatHappened: string;
  displayCrimeOrIssue: string;
  displayJudgment: string;
  displayPenaltyOrRelief: string;
}> = ({ data, displayWhatHappened, displayCrimeOrIssue, displayJudgment, displayPenaltyOrRelief }) => {
  const cd = data.case_details;
  const judgmentStyle = getJudgmentStyle(cd.judgment_outcome);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)", marginBottom: 20 }}>
        📋 Case Details
      </h2>

      {/* What happened */}
      <div style={{ marginBottom: 20 }}>
        <p style={sectionLabel}>What Happened</p>
        {displayWhatHappened
          ? <p style={{ fontSize: "0.9rem", lineHeight: 1.8, color: "var(--text-mid)", margin: 0 }}>
              <LegalTooltip text={displayWhatHappened} />
            </p>
          : <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.875rem" }}>Not available</p>
        }
        {/* Plain English button */}
        <PlainLanguageCard data={data} />
      </div>

      {/* Crime / Legal Issue */}
      {displayCrimeOrIssue && (
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Crime / Legal Issue</p>
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "5px 14px", borderRadius: 999,
            background: "rgba(217,119,6,0.1)", color: "#92400e",
            border: "1px solid rgba(217,119,6,0.35)",
            fontSize: "0.85rem", fontWeight: 600,
          }}>
            {displayCrimeOrIssue}
          </span>
        </div>
      )}

      {/* Sections involved */}
      {cd.sections_involved.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Sections Involved</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cd.sections_involved.map((s, i) => (
              <span key={i} style={redOutlinePill}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Judgment */}
      {displayJudgment && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Judgment</p>
            {cd.judgment_outcome && cd.judgment_outcome !== "Unknown" && (
              <span style={{
                ...getJudgmentStyle(cd.judgment_outcome),
                padding: "2px 10px", borderRadius: 999,
                fontSize: "0.72rem", fontWeight: 700,
              }}>
                {cd.judgment_outcome}
              </span>
            )}
          </div>
          <div style={{
            ...judgmentStyle,
            borderRadius: 10, padding: "14px 18px",
            fontSize: "0.9rem", lineHeight: 1.7,
          }}>
            <LegalTooltip text={displayJudgment} />
          </div>
        </div>
      )}

      {/* Judgment date */}
      {cd.judgment_date && (
        <div style={{ marginBottom: 20 }}>
          <p style={sectionLabel}>Judgment Date</p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.9rem", color: "var(--text-dark)" }}>
            <CalendarIcon />
            {cd.judgment_date}
          </span>
        </div>
      )}

      {/* Penalty / Relief */}
      {displayPenaltyOrRelief && (
        <div>
          <p style={sectionLabel}>Penalty / Relief</p>
          <p style={{ fontSize: "0.9rem", fontStyle: "italic", color: "var(--text-mid)", margin: 0 }}>
            <LegalTooltip text={displayPenaltyOrRelief} />
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Section 3: Similar Cases ─────────────────────────────────────────────────
const SimilarCasesSection: React.FC<{ cases: AnalysisResponse["similar_cases"] }> = ({ cases }) => {
  if (!cases.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: "2.5rem", opacity: 0.25, marginBottom: 10 }}>📂</div>
        <p style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 4 }}>No similar cases found</p>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          No matching cases were found in the reference database.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 80 /* space for sticky bar */ }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
          🔍 Similar Cases
        </h2>
        <span style={{
          padding: "2px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
          background: "var(--gold-light)", color: "var(--navy)", border: "1px solid rgba(201,168,76,0.3)",
        }}>
          {cases.length}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {cases.map((c, i) => {
          const pct = Math.round(c.similarity_score * 100);
          const isHigh = pct >= 70;
          return (
            <div key={i} style={{
              border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 10,
              padding: "16px 18px", background: "var(--gray-bg)",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--navy)", margin: 0, lineHeight: 1.4 }}>
                  {c.title}
                </p>
                <span style={{
                  flexShrink: 0, padding: "3px 9px", borderRadius: 999,
                  fontSize: "0.72rem", fontWeight: 700,
                  background: isHigh ? "rgba(201,168,76,0.15)" : "rgba(100,116,139,0.1)",
                  color: isHigh ? "#92700a" : "#475569",
                  border: `1px solid ${isHigh ? "rgba(201,168,76,0.4)" : "rgba(100,116,139,0.3)"}`,
                }}>
                  {pct}% similar
                </span>
              </div>

              {c.issue && (
                <div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                    Issue
                  </span>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", margin: "2px 0 0" }}>
                    {c.issue}
                  </p>
                </div>
              )}

              {c.judgment_summary && (
                <div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                    Judgment
                  </span>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-mid)", margin: "2px 0 0" }}>
                    {c.judgment_summary}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Sticky bottom bar ────────────────────────────────────────────────────────
const StickyBar: React.FC<{
  data: AnalysisResponse;
  onReset: () => void;
  exporting: "pdf" | "word" | null;
  onExportPDF: () => void;
  onExportWord: () => void;
  onEmailReport: () => void;
}> = ({ data, onReset, exporting, onExportPDF, onExportWord, onEmailReport }) => (
  <div style={{
    position: "sticky", bottom: 40,
    background: "#fff", borderTop: "1px solid var(--gray-border)",
    padding: "10px 24px", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 16, flexWrap: "wrap",
    boxShadow: "0 -2px 12px rgba(0,0,0,0.06)", zIndex: 40,
    borderRadius: "12px 12px 0 0",
  }}>
    <div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem", color: "var(--navy)" }}>
        📄 {data.filename}
      </p>
      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
        {data.page_count} page{data.page_count !== 1 ? "s" : ""}
        {data.used_ocr ? " · OCR processed" : ""}
      </p>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="btn btn-ghost btn-sm" onClick={onReset}>
        ← Analyze another
      </button>
      <button className="btn btn-outline btn-sm" onClick={onExportPDF} disabled={exporting === "pdf"}>
        <DownloadIcon />
        {exporting === "pdf" ? "Exporting…" : "Export PDF"}
      </button>
      <button className="btn btn-outline btn-sm" onClick={onExportWord} disabled={exporting === "word"}>
        <DownloadIcon />
        {exporting === "word" ? "Exporting…" : "Export Word"}
      </button>
      <button
        className="btn btn-sm"
        onClick={onEmailReport}
        style={{
          background: "transparent", color: "var(--navy)",
          border: "1.5px solid var(--gold)", gap: 5,
        }}
        aria-label="Email report"
      >
        <MailIcon />
        Email Report
      </button>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
interface ResultsPageProps {
  data: AnalysisResponse;
  onReset: () => void;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ data, onReset }) => {
  const navigate      = useNavigate();
  const { showToast } = useToast();
  const [exporting,          setExporting]          = useState<"pdf" | "word" | null>(null);
  const [dictOpen,           setDictOpen]           = useState(false);
  const [chatOpen,           setChatOpen]           = useState(false);
  const [chatHasNew,         setChatHasNew]         = useState(false);
  const [emailOpen,          setEmailOpen]          = useState(false);
  // ── Translation state ──
  const [selectedLang,       setSelectedLang]       = useState("en");
  const [translating,        setTranslating]        = useState(false);
  const [translateProgress,  setTranslateProgress]  = useState("");
  const [translatedDetails,  setTranslatedDetails]  = useState<TranslatableDetails | null>(null);
  const [translationCache,   setTranslationCache]   = useState<Record<string, TranslatableDetails>>({});

  // Listen for sidebar "📖 Dictionary" button
  useEffect(() => {
    const handler = () => setDictOpen(true);
    window.addEventListener("lex_open_dictionary", handler);
    return () => window.removeEventListener("lex_open_dictionary", handler);
  }, []);

  // Guard: if data is missing required new-schema fields, show a safe fallback
  if (!data?.case_details || !data?.case_overview) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: "3rem", opacity: 0.3, marginBottom: 16 }}>📄</div>
        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--navy)", marginBottom: 8 }}>
          No results to display.
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 20 }}>
          This result may be from an older version of the app.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => { onReset(); navigate("/dashboard"); }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      exportToPDF(data, data.filename, selectedLang, selectedLangObj?.name ?? "English");
      showToast("Export downloaded", "success");
    } catch {
      showToast("PDF export failed. Please try again.", "error");
    } finally {
      setExporting(null);
    }
  };

  const handleExportWord = async () => {
    setExporting("word");
    try {
      await exportToWord(data, data.filename, selectedLang, selectedLangObj?.name ?? "English");
      showToast("Export downloaded", "success");
    } catch {
      showToast("Word export failed. Please try again.", "error");
    } finally {
      setExporting(null);
    }
  };

  const handleReset = () => {
    onReset();
    navigate("/dashboard");
  };

  // ── Translation helpers ──
  const selectedLangObj = INDIAN_LANGUAGES.find((l) => l.code === selectedLang);
  const englishLang     = INDIAN_LANGUAGES[0];

  const handleLanguageChange = async (lang: Language) => {
    if (lang.code === selectedLang) return;
    setSelectedLang(lang.code);

    if (lang.code === "en") {
      setTranslatedDetails(null);
      return;
    }

    // Use cache if available
    if (translationCache[lang.code]) {
      setTranslatedDetails(translationCache[lang.code]);
      return;
    }

    setTranslating(true);
    setTranslateProgress("");

    const cd = data.case_details;
    const result = await translateCaseDetails(
      {
        whatHappened:    cd.what_happened,
        crimeOrIssue:    cd.crime_or_issue,
        judgment:        cd.judgment,
        penaltyOrRelief: cd.penalty_or_relief,
      },
      lang.code,
      lang.name,
      (field) => setTranslateProgress(field),
    );

    setTranslationCache((prev) => ({ ...prev, [lang.code]: result }));
    setTranslatedDetails(result);
    setTranslating(false);
    setTranslateProgress("");
  };

  // Display values — use translated if available, fall back to original
  const cd = data.case_details;
  const displayWhatHappened    = translatedDetails?.whatHappened    ?? cd.what_happened;
  const displayCrimeOrIssue    = translatedDetails?.crimeOrIssue    ?? cd.crime_or_issue;
  const displayJudgment        = translatedDetails?.judgment        ?? cd.judgment;
  const displayPenaltyOrRelief = translatedDetails?.penaltyOrRelief ?? cd.penalty_or_relief;

  return (
    <div>
      {/* OCR warning */}
      {data.used_ocr && (
        <div className="banner-warning" style={{ marginBottom: 16 }}>
          ⚠ This document was processed using OCR. Results may be less accurate for handwritten or low-quality scans.
        </div>
      )}

      {/* Processing errors */}
      {data.errors.length > 0 && (
        <div className="banner-warning" style={{ marginBottom: 16 }}>
          <strong>Processing warnings:</strong>
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {data.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Language selector */}
      <LanguageSelector
        selectedLanguage={selectedLang}
        onLanguageChange={handleLanguageChange}
        isTranslating={translating}
        translateProgress={translateProgress}
      />

      {/* Translation active banner */}
      {selectedLang !== "en" && !translating && (
        <div style={{
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.4)",
          borderRadius: 8, padding: "8px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16, flexWrap: "wrap", gap: 8,
        }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-mid)" }}>
            🌐 Showing results in <strong>{selectedLangObj?.nativeName}</strong>
          </span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: "0.75rem" }}
            onClick={() => handleLanguageChange(englishLang)}
          >
            Switch to English
          </button>
        </div>
      )}

      <CaseOverviewSection data={data} />
      <CaseDetailsSection
        data={data}
        displayWhatHappened={displayWhatHappened}
        displayCrimeOrIssue={displayCrimeOrIssue}
        displayJudgment={displayJudgment}
        displayPenaltyOrRelief={displayPenaltyOrRelief}
      />
      <SimilarCasesSection cases={data.similar_cases} />

      <StickyBar
        data={data}
        onReset={handleReset}
        exporting={exporting}
        onExportPDF={handleExportPDF}
        onExportWord={handleExportWord}
        onEmailReport={() => setEmailOpen(true)}
      />

      {/* Floating Legal Dictionary button */}
      <button
        onClick={() => setDictOpen(true)}
        style={{
          position: "fixed",
          bottom: 80,
          left: 16,
          zIndex: 300,
          background: "var(--navy)",
          color: "var(--gold)",
          border: "1.5px solid rgba(201,168,76,0.4)",
          borderRadius: 999,
          padding: "7px 14px",
          fontSize: "0.78rem",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
        }}
        aria-label="Open Legal Dictionary"
      >
        📖 Legal Dictionary
      </button>

      {/* Floating Ask AI button */}
      <button
        onClick={() => { setChatOpen(true); setChatHasNew(false); }}
        style={{
          position: "fixed",
          bottom: 80,
          right: 16,
          zIndex: 300,
          background: "var(--gold)",
          color: "var(--navy)",
          border: "1.5px solid var(--navy)",
          borderRadius: 999,
          padding: "7px 14px",
          fontSize: "0.78rem",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
        }}
        aria-label="Ask AI about this document"
      >
        💬 Ask AI
        {chatHasNew && (
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#dc2626",
            display: "inline-block",
            marginLeft: 2,
          }} />
        )}
      </button>

      {/* Legal Dictionary slide-in panel */}
      <LegalDictionary isOpen={dictOpen} onClose={() => setDictOpen(false)} />

      {/* Document Chat panel */}
      <DocumentChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        complainant={data.case_overview.complainant}
        accused={data.case_overview.accused}
        court={data.case_overview.court}
        caseNumber={data.case_overview.case_number}
        documentSubtype={data.document_subtype}
        judges={data.case_overview.judges}
        lawyers={data.case_overview.lawyers}
        whatHappened={displayWhatHappened}
        crimeOrIssue={displayCrimeOrIssue}
        sections={data.case_details.sections_involved}
        judgment={displayJudgment}
        judgmentDate={data.case_details.judgment_date}
        judgmentOutcome={data.case_details.judgment_outcome}
        penaltyOrRelief={displayPenaltyOrRelief}
      />

      {/* Email Report modal */}
      <EmailReportModal
        isOpen={emailOpen}
        onClose={() => setEmailOpen(false)}
        complainant={data.case_overview.complainant}
        accused={data.case_overview.accused}
        court={data.case_overview.court}
        caseNumber={data.case_overview.case_number}
        crimeOrIssue={data.case_details.crime_or_issue}
        whatHappened={data.case_details.what_happened}
        sections={data.case_details.sections_involved}
        judgment={data.case_details.judgment}
        judgmentDate={data.case_details.judgment_date}
        judgmentOutcome={data.case_details.judgment_outcome}
        penaltyOrRelief={data.case_details.penalty_or_relief}
      />
    </div>
  );
};

// ─── Shared pill styles ───────────────────────────────────────────────────────
const goldPill: React.CSSProperties = {
  padding: "3px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600,
  background: "rgba(201,168,76,0.15)", color: "#92700a",
  border: "1px solid rgba(201,168,76,0.4)",
};

const navyOutlinePill: React.CSSProperties = {
  padding: "3px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 500,
  background: "transparent", color: "var(--navy)",
  border: "1.5px solid var(--navy)",
};

const redOutlinePill: React.CSSProperties = {
  padding: "3px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 500,
  background: "rgba(220,38,38,0.06)", color: "#b91c1c",
  border: "1px solid rgba(220,38,38,0.3)",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 8, marginTop: 0,
};

export default ResultsPage;
