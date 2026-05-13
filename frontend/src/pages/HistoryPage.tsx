import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnalysisResponse } from "../types";
import {
  clearHistory,
  deleteHistoryEntry,
  formatRelativeTime,
  getHistory,
  getHistoryStats,
  HISTORY_UPDATED_EVENT,
  type HistoryEntry,
} from "../utils/history";
import { exportToPDF } from "../utils/exportPDF";
import { exportToWord } from "../utils/exportWord";
import { useToast } from "../hooks/useToast";

// ─── Constants ────────────────────────────────────────────────────────────────
type SortKey = "newest" | "oldest" | "confidence_desc" | "pages_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",          label: "Newest First" },
  { value: "oldest",          label: "Oldest First" },
  { value: "confidence_desc", label: "Highest Confidence" },
  { value: "pages_desc",      label: "Most Pages" },
];

const TYPE_OPTIONS = [
  { value: "",        label: "All Types" },
  { value: "murder",  label: "Murder" },
  { value: "bail",    label: "Bail Application" },
  { value: "cheating", label: "Cheating / Fraud" },
  { value: "divorce", label: "Divorce / Maintenance" },
  { value: "theft",   label: "Theft / Robbery" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const PdfIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const WordIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="15" y2="17"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <div className="card card-sm" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
    <div className="skeleton" style={{ width: 32, height: 40, borderRadius: 6, flexShrink: 0 }} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="skeleton" style={{ height: 16, width: "60%", borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: "80%", borderRadius: 4 }} />
    </div>
    <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
  </div>
);

// ─── Confidence ring ──────────────────────────────────────────────────────────
const ConfidenceRing: React.FC<{ value: number }> = ({ value }) => {
  const r      = 18;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color  = value >= 75 ? "#16a34a" : value >= 50 ? "#c9a84c" : "#dc2626";

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-label={`Confidence: ${value.toFixed(0)}%`} className="confidence-ring">
      <circle cx="24" cy="24" r={r} fill="#0f2744" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 24 24)" style={{ transition: "stroke-dashoffset 0.4s ease" }}/>
      <text x="24" y="28" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">
        {value.toFixed(0)}%
      </text>
    </svg>
  );
};

// ─── History card ─────────────────────────────────────────────────────────────
interface HistoryCardProps {
  entry: HistoryEntry;
  onView:   (result: AnalysisResponse) => void;
  onDelete: (id: string) => void;
}

/** Map judgment_outcome to a badge style */
function getJudgmentBadge(outcome: string): { label: string; style: React.CSSProperties } {
  switch (outcome) {
    case "Acquitted":
      return { label: "Acquitted",     style: { background: "rgba(22,163,74,0.1)",   color: "#15803d", border: "1px solid rgba(22,163,74,0.3)" } };
    case "Convicted":
      return { label: "Convicted",     style: { background: "rgba(220,38,38,0.1)",   color: "#b91c1c", border: "1px solid rgba(220,38,38,0.3)" } };
    case "Dismissed":
      return { label: "Dismissed",     style: { background: "rgba(217,119,6,0.1)",   color: "#92400e", border: "1px solid rgba(217,119,6,0.3)" } };
    case "Allowed":
      return { label: "Allowed",       style: { background: "rgba(8,145,178,0.1)",   color: "#0e7490", border: "1px solid rgba(8,145,178,0.3)" } };
    case "Bail Granted":
      return { label: "Bail Granted",  style: { background: "rgba(37,99,235,0.1)",   color: "#1d4ed8", border: "1px solid rgba(37,99,235,0.3)" } };
    case "Bail Rejected":
      return { label: "Bail Rejected", style: { background: "rgba(124,58,237,0.1)",  color: "#6d28d9", border: "1px solid rgba(124,58,237,0.3)" } };
    case "Charge Framed":
      return { label: "Charge Framed", style: { background: "rgba(190,24,93,0.1)",   color: "#9d174d", border: "1px solid rgba(190,24,93,0.3)" } };
    default:
      return { label: "Pending / Unknown", style: { background: "rgba(100,116,139,0.1)", color: "#475569", border: "1px solid rgba(100,116,139,0.3)" } };
  }
}

const HistoryCard: React.FC<HistoryCardProps> = ({ entry, onView, onDelete }) => {
  const { showToast }             = useToast();
  const [exporting, setExporting] = useState<"pdf" | "word" | null>(null);

  const handleExportPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting("pdf");
    try {
      exportToPDF(entry.full_result, entry.filename);
      showToast("Export downloaded", "success");
    } catch {
      showToast("Export failed. Please try again.", "error");
    } finally {
      setExporting(null);
    }
  };

  const handleExportWord = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting("word");
    try {
      await exportToWord(entry.full_result, entry.filename);
      showToast("Export downloaded", "success");
    } catch {
      showToast("Export failed. Please try again.", "error");
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete this entry from history?`)) {
      onDelete(entry.id);
      showToast("Entry deleted from history", "info");
    }
  };

  // Derive display values from new schema
  const ov = entry.full_result.case_overview;
  const cd = entry.full_result.case_details;
  const caseTitle = (ov.complainant && ov.accused)
    ? `${ov.complainant} vs ${ov.accused}`
    : entry.filename;
  const { label: judgmentLabel, style: judgmentStyle } = getJudgmentBadge(cd.judgment_outcome || "Unknown");

  return (
    <div
      className="card card-sm"
      style={{ display: "flex", alignItems: "flex-start", gap: 16, cursor: "pointer", transition: "box-shadow 0.15s" }}
      onClick={() => onView(entry.full_result)}
      role="button"
      tabIndex={0}
      aria-label={`View results for ${caseTitle}`}
      onKeyDown={(e) => e.key === "Enter" && onView(entry.full_result)}
    >
      {/* PDF icon */}
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>

      {/* Center info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Case title */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>
            {caseTitle}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {formatRelativeTime(entry.analyzed_at)}
          </span>
        </div>

        {/* Crime/issue + judgment badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          {cd.crime_or_issue && (
            <span style={{
              padding: "2px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600,
              background: "rgba(217,119,6,0.1)", color: "#92400e", border: "1px solid rgba(217,119,6,0.3)",
            }}>
              {cd.crime_or_issue}
            </span>
          )}
          <span style={{ ...judgmentStyle, padding: "2px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600 }}>
            {judgmentLabel}
          </span>
          {entry.used_ocr && <span className="badge badge-amber" style={{ fontSize: "0.65rem" }}>OCR</span>}
        </div>

        {/* Original filename */}
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
          📄 {entry.filename} · {entry.page_count} page{entry.page_count !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Right — ring + actions */}
      <div
        style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ConfidenceRing value={entry.avg_confidence} />
        <button
          className="btn btn-primary btn-sm"
          style={{ width: "100%", whiteSpace: "nowrap" }}
          onClick={(e) => { e.stopPropagation(); onView(entry.full_result); }}
        >
          View Results
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: "5px 8px" }}
            onClick={handleExportPDF} disabled={exporting === "pdf"} title="Export PDF" aria-label="Export as PDF">
            <PdfIcon />
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding: "5px 8px" }}
            onClick={handleExportWord} disabled={exporting === "word"} title="Export Word" aria-label="Export as Word">
            <WordIcon />
          </button>
          <button className="btn btn-danger btn-sm" style={{ padding: "5px 8px" }}
            onClick={handleDelete} title="Delete entry" aria-label="Delete this history entry">
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
interface HistoryPageProps {
  onSelectResult: (result: AnalysisResponse) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectResult }) => {
  const navigate      = useNavigate();
  const { showToast } = useToast();

  const [history,    setHistory]  = useState<HistoryEntry[]>([]);
  const [loading,    setLoading]  = useState(true);
  const [search,     setSearch]   = useState("");
  const [typeFilter, setType]     = useState("");
  const [sort,       setSort]     = useState<SortKey>("newest");
  const [stats,      setStats]    = useState({ total: 0, mostCommonType: "—", avgConfidence: 0 });

  const reload = () => {
    setHistory(getHistory());
    setStats(getHistoryStats());
  };

  useEffect(() => {
    reload();
    setLoading(false);
    window.addEventListener(HISTORY_UPDATED_EVENT, reload);
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, reload);
  }, []);

  const handleView = (result: AnalysisResponse) => {
    onSelectResult(result);
    navigate("/results");
  };

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    reload();
  };

  const handleClear = () => {
    if (window.confirm("Clear all history? This cannot be undone.")) {
      clearHistory();
      reload();
      showToast("History cleared", "info");
    }
  };

  const filtered = useMemo(() => {
    let list = [...history];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.filename.toLowerCase().includes(q));
    }
    if (typeFilter) list = list.filter((e) => (e.full_result.case_details?.crime_or_issue ?? "").toLowerCase().includes(typeFilter.toLowerCase()));
    switch (sort) {
      case "oldest":          list.sort((a, b) => a.analyzed_at.localeCompare(b.analyzed_at)); break;
      case "confidence_desc": list.sort((a, b) => b.avg_confidence - a.avg_confidence); break;
      case "pages_desc":      list.sort((a, b) => b.page_count - a.page_count); break;
      default:                list.sort((a, b) => b.analyzed_at.localeCompare(a.analyzed_at));
    }
    return list;
  }, [history, search, typeFilter, sort]);

  // Loading skeletons
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Empty state
  if (!history.length) {
    return (
      <div className="history-empty">
        <div style={{ fontSize: "5rem", opacity: 0.18, marginBottom: 16 }}>🗂️</div>
        <p style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--navy)", marginBottom: 6 }}>
          No documents analyzed yet
        </p>
        <p className="history-empty-text" style={{ marginBottom: 20 }}>
          Upload your first legal document to get started
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
          Go to Upload
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Documents</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Most Common Type</div>
          <div className="stat-value" style={{ fontSize: "1.1rem" }}>{stats.mostCommonType}</div>
          <div className="stat-sub">By frequency</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. Confidence</div>
          <div className="stat-value">{stats.total > 0 ? `${stats.avgConfidence.toFixed(0)}%` : "—"}</div>
          <div className="stat-sub">Across all analyses</div>
        </div>
      </div>

      {/* Search & filter */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Search by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 34px", border: "1.5px solid var(--gray-border)", borderRadius: 8, fontSize: "0.875rem", color: "var(--text-dark)", background: "var(--white)", outline: "none" }}
            aria-label="Search history by filename"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setType(e.target.value)} style={selectStyle} aria-label="Filter by document type">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={selectStyle} aria-label="Sort history">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className="btn btn-danger btn-sm" onClick={handleClear} style={{ marginLeft: "auto" }}>
          Clear History
        </button>
      </div>

      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12 }}>
        {filtered.length === history.length
          ? `${history.length} document${history.length !== 1 ? "s" : ""}`
          : `${filtered.length} of ${history.length} documents`}
      </p>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          No results match your search or filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered
            .filter((entry) => entry?.full_result?.case_details !== undefined)
            .map((entry) => (
              <HistoryCard key={entry.id} entry={entry} onView={handleView} onDelete={handleDelete} />
            ))}
        </div>
      )}
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", border: "1.5px solid var(--gray-border)", borderRadius: 8,
  fontSize: "0.875rem", color: "var(--text-dark)", background: "var(--white)",
  outline: "none", cursor: "pointer", minWidth: 140,
};

export default HistoryPage;
