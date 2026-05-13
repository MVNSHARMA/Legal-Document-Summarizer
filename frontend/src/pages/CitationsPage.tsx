import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllCitations,
  getCitationStats,
  exportCitationsText,
  type CitationEntry,
} from "../utils/citations";
import { getHistory, HISTORY_UPDATED_EVENT } from "../utils/history";
import type { AnalysisResponse } from "../types";

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ─── Citation pill ────────────────────────────────────────────────────────────
const PILL_STYLES: Record<string, React.CSSProperties> = {
  section: {
    background: "rgba(220,38,38,0.06)", color: "#b91c1c",
    border: "1px solid rgba(220,38,38,0.3)",
  },
  article: {
    background: "rgba(37,99,235,0.08)", color: "#1d4ed8",
    border: "1px solid rgba(37,99,235,0.3)",
  },
  act: {
    background: "rgba(22,163,74,0.08)", color: "#15803d",
    border: "1px solid rgba(22,163,74,0.3)",
  },
};

const CitationPill: React.FC<{ entry: CitationEntry }> = ({ entry }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    padding: "3px 10px", borderRadius: 999,
    fontSize: "0.78rem", fontWeight: 600,
    whiteSpace: "nowrap",
    ...PILL_STYLES[entry.type],
  }}>
    {entry.text}
  </span>
);

// ─── Act display names ────────────────────────────────────────────────────────
const ACT_DISPLAY: Record<string, string> = {
  "Constitution":       "Constitution of India",
  "IPC":                "Indian Penal Code (IPC)",
  "CrPC":               "Code of Criminal Procedure (CrPC)",
  "RTE Act":            "Right to Education Act (RTE)",
  "RPWD Act":           "Rights of Persons with Disabilities Act (RPWD)",
  "NDPS Act":           "Narcotic Drugs & Psychotropic Substances Act (NDPS)",
  "POCSO Act":          "Protection of Children from Sexual Offences Act (POCSO)",
  "IT Act":             "Information Technology Act (IT Act)",
  "SC/ST Act":          "Scheduled Castes & Tribes (Prevention of Atrocities) Act",
  "Arms Act":           "Arms Act",
  "Motor Vehicles Act": "Motor Vehicles Act",
  "Other":              "Other / Unclassified",
};

const ACT_SORT_ORDER = [
  "Constitution", "IPC", "CrPC", "RTE Act", "RPWD Act",
  "NDPS Act", "POCSO Act", "IT Act", "SC/ST Act", "Arms Act",
  "Motor Vehicles Act", "Other",
];

// ─── Collapsible group ────────────────────────────────────────────────────────
interface CitationGroupProps {
  act: string;
  entries: CitationEntry[];
  onView: (documentId: string) => void;
}

const CitationGroup: React.FC<CitationGroupProps> = ({ act, entries, onView }) => {
  const [open, setOpen] = useState(true);
  const displayName = ACT_DISPLAY[act] ?? act;

  return (
    <div style={{
      background: "var(--white)", borderRadius: 12,
      border: "0.5px solid rgba(0,0,0,0.1)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      marginBottom: 12, overflow: "hidden",
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
          borderBottom: open ? "0.5px solid var(--gray-border)" : "none",
        }}
        aria-expanded={open}
      >
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--navy)", flex: 1 }}>
          {displayName}
        </span>
        <span style={{
          padding: "2px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
          background: "var(--gold-light)", color: "var(--navy)",
          border: "1px solid rgba(201,168,76,0.3)",
        }}>
          {entries.length} citation{entries.length !== 1 ? "s" : ""}
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* Table */}
      {open && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "var(--gray-bg)" }}>
                {["Citation", "Document", "Case", "Issue", ""].map((h) => (
                  <th key={h} style={{
                    padding: "8px 16px", textAlign: "left",
                    fontSize: "0.7rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    color: "var(--text-muted)", whiteSpace: "nowrap",
                    borderBottom: "0.5px solid var(--gray-border)",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: i < entries.length - 1 ? "0.5px solid var(--gray-border)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gray-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                    <CitationPill entry={entry} />
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--text-muted)", maxWidth: 200 }}>
                    <span title={entry.documentName} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                      📄 {entry.documentName}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--text-dark)", maxWidth: 240 }}>
                    <span title={entry.caseTitle} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                      {entry.caseTitle}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    {entry.crimeOrIssue && (
                      <span style={{
                        padding: "2px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 600,
                        background: "rgba(217,119,6,0.1)", color: "#92400e",
                        border: "1px solid rgba(217,119,6,0.3)", whiteSpace: "nowrap",
                      }}>
                        {entry.crimeOrIssue.length > 28
                          ? entry.crimeOrIssue.slice(0, 28) + "…"
                          : entry.crimeOrIssue}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onView(entry.documentId)}
                      style={{ fontSize: "0.75rem" }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Select style ─────────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  padding: "8px 12px", border: "1.5px solid var(--gray-border)", borderRadius: 8,
  fontSize: "0.875rem", color: "var(--text-dark)", background: "var(--white)",
  outline: "none", cursor: "pointer",
};

// ─── Main page ────────────────────────────────────────────────────────────────
interface CitationsPageProps {
  onSelectResult: (result: AnalysisResponse) => void;
}

const CitationsPage: React.FC<CitationsPageProps> = ({ onSelectResult }) => {
  const navigate = useNavigate();

  const [citations, setCitations] = useState<CitationEntry[]>([]);
  const [search,    setSearch]    = useState("");
  const [actFilter, setActFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort,      setSort]      = useState<"az" | "za" | "doc" | "recent">("az");

  const reload = () => setCitations(getAllCitations());

  useEffect(() => {
    reload();
    window.addEventListener(HISTORY_UPDATED_EVENT, reload);
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, reload);
  }, []);

  const stats = useMemo(() => getCitationStats(citations), [citations]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...citations];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.text.toLowerCase().includes(q) || c.documentName.toLowerCase().includes(q),
      );
    }
    if (actFilter)  list = list.filter((c) => c.act === actFilter);
    if (typeFilter) list = list.filter((c) => c.type === typeFilter);

    switch (sort) {
      case "za":     list.sort((a, b) => b.text.localeCompare(a.text)); break;
      case "doc":    list.sort((a, b) => a.documentName.localeCompare(b.documentName)); break;
      case "recent": list.sort((a, b) => b.documentId.localeCompare(a.documentId)); break;
      default:       list.sort((a, b) => a.text.localeCompare(b.text));
    }

    return list;
  }, [citations, search, actFilter, typeFilter, sort]);

  // Group filtered list by act
  const grouped = useMemo(() => {
    const map: Record<string, CitationEntry[]> = {};
    filtered.forEach((c) => {
      (map[c.act] = map[c.act] ?? []).push(c);
    });
    return map;
  }, [filtered]);

  const sortedActs = useMemo(() => {
    const keys = Object.keys(grouped);
    return [
      ...ACT_SORT_ORDER.filter((a) => keys.includes(a)),
      ...keys.filter((a) => !ACT_SORT_ORDER.includes(a)).sort(),
    ];
  }, [grouped]);

  // Navigate to results for a given document
  const handleView = (documentId: string) => {
    const entry = getHistory().find((h) => h.id === documentId);
    if (entry?.full_result) {
      onSelectResult(entry.full_result);
      navigate("/results");
    }
  };

  // Export
  const handleExport = () => {
    const text = exportCitationsText(filtered);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `LexAnalyze_Citations_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Empty state ──
  if (citations.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: "4rem", opacity: 0.25, marginBottom: 16 }}>📚</div>
        <p style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--navy)", marginBottom: 6 }}>
          No citations found
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 24 }}>
          Analyze your first legal document to see citations here.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
          Go to Upload
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Stat cards ── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Citations</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Across all documents</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unique Sections</div>
          <div className="stat-value">{stats.uniqueSections}</div>
          <div className="stat-sub">Deduplicated</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Most Cited Act</div>
          <div className="stat-value" style={{ fontSize: "1.1rem" }}>{stats.mostCited}</div>
          <div className="stat-sub">{stats.byAct[stats.mostCited] ?? 0} citations</div>
        </div>
      </div>

      {/* ── Search & filter bar ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Search citations or documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 34px", border: "1.5px solid var(--gray-border)", borderRadius: 8, fontSize: "0.875rem", color: "var(--text-dark)", background: "var(--white)", outline: "none", boxSizing: "border-box" }}
            aria-label="Search citations"
          />
        </div>

        {/* Act filter */}
        <select value={actFilter} onChange={(e) => setActFilter(e.target.value)} style={selectStyle} aria-label="Filter by act">
          <option value="">All Acts</option>
          {ACT_SORT_ORDER.map((a) => stats.byAct[a] ? <option key={a} value={a}>{a}</option> : null)}
        </select>

        {/* Type filter */}
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle} aria-label="Filter by type">
          <option value="">All Types</option>
          <option value="section">Section</option>
          <option value="article">Article</option>
          <option value="act">Act</option>
        </select>

        {/* Sort */}
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={selectStyle} aria-label="Sort citations">
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="doc">By Document</option>
          <option value="recent">Most Recent</option>
        </select>

        {/* Export button */}
        <button
          className="btn btn-outline btn-sm"
          onClick={handleExport}
          style={{ marginLeft: "auto", gap: 6 }}
          aria-label="Export citations as text file"
        >
          <DownloadIcon />
          Export Citations
        </button>
      </div>

      {/* ── Result count ── */}
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 16 }}>
        {filtered.length === citations.length
          ? `${citations.length} citation${citations.length !== 1 ? "s" : ""} in ${sortedActs.length} act${sortedActs.length !== 1 ? "s" : ""}`
          : `${filtered.length} of ${citations.length} citations`}
      </p>

      {/* ── No results after filter ── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
          No citations match your search or filter.
        </div>
      ) : (
        sortedActs.map((act) => (
          <CitationGroup
            key={act}
            act={act}
            entries={grouped[act]}
            onView={handleView}
          />
        ))
      )}
    </div>
  );
};

export default CitationsPage;
