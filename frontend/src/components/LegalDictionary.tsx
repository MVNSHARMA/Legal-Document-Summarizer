import React, { useMemo, useState } from "react";
import { LEGAL_TERMS, type LegalTerm } from "../data/legalTerms";

// ─── Category config ──────────────────────────────────────────────────────────
type CategoryFilter = "all" | LegalTerm["category"];

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "person",    label: "Persons" },
  { id: "procedure", label: "Procedures" },
  { id: "section",   label: "Sections" },
  { id: "latin",     label: "Latin" },
  { id: "document",  label: "Documents" },
  { id: "general",   label: "General" },
];

const CATEGORY_STYLE: Record<LegalTerm["category"], React.CSSProperties> = {
  procedure: { background: "rgba(37,99,235,0.1)",   color: "#1d4ed8", border: "1px solid rgba(37,99,235,0.3)" },
  person:    { background: "rgba(22,163,74,0.1)",   color: "#15803d", border: "1px solid rgba(22,163,74,0.3)" },
  latin:     { background: "rgba(124,58,237,0.1)",  color: "#6d28d9", border: "1px solid rgba(124,58,237,0.3)" },
  section:   { background: "rgba(220,38,38,0.08)",  color: "#b91c1c", border: "1px solid rgba(220,38,38,0.3)" },
  document:  { background: "rgba(217,119,6,0.1)",   color: "#92400e", border: "1px solid rgba(217,119,6,0.3)" },
  general:   { background: "rgba(100,116,139,0.1)", color: "#475569", border: "1px solid rgba(100,116,139,0.3)" },
};

const CATEGORY_LABEL: Record<LegalTerm["category"], string> = {
  procedure: "Procedure", person: "Person", latin: "Latin",
  section: "Section / Article", document: "Document", general: "General",
};

// ─── Individual term card ─────────────────────────────────────────────────────
const TermCard: React.FC<{ term: LegalTerm }> = ({ term }) => {
  const [expanded, setExpanded] = useState(false);
  const catStyle = CATEGORY_STYLE[term.category];

  return (
    <div
      style={{
        background: "#fff", borderRadius: 10,
        border: "0.5px solid rgba(0,0,0,0.09)",
        marginBottom: 8, overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        cursor: "pointer",
      }}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px" }}>
        <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--navy)", flex: 1 }}>
          {term.term}
        </span>
        <span style={{
          ...catStyle,
          padding: "1px 7px", borderRadius: 999,
          fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
          flexShrink: 0,
        }}>
          {CATEGORY_LABEL[term.category]}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", flexShrink: 0 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 12px", borderTop: "0.5px solid var(--gray-border)" }}>
          <p style={{ margin: "10px 0 0", fontSize: "0.8rem", color: "var(--text-mid)", lineHeight: 1.6 }}>
            {term.definition}
          </p>
          {term.example && (
            <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "var(--gold)", fontStyle: "italic" }}>
              e.g. {term.example}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────
interface LegalDictionaryProps {
  isOpen: boolean;
  onClose: () => void;
}

const LegalDictionary: React.FC<LegalDictionaryProps> = ({ isOpen, onClose }) => {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(() => {
    let list = LEGAL_TERMS;
    if (category !== "all") list = list.filter((t) => t.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => a.term.localeCompare(b.term));
  }, [search, category]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 800,
          background: "rgba(0,0,0,0.3)",
        }}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-label="Legal Dictionary"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(380px, 100vw)",
          zIndex: 900,
          background: "#fff",
          display: "flex", flexDirection: "column",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div style={{
          background: "var(--navy)", padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
            ⚖ Legal Dictionary
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "1.2rem", lineHeight: 1, padding: "2px 4px" }}
            aria-label="Close dictionary"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--gray-border)", flexShrink: 0 }}>
          <input
            type="search"
            placeholder="Search terms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px",
              border: "1.5px solid var(--gray-border)", borderRadius: 8,
              fontSize: "0.875rem", outline: "none", boxSizing: "border-box",
            }}
            aria-label="Search legal terms"
          />
        </div>

        {/* Category tabs */}
        <div style={{
          display: "flex", gap: 4, padding: "8px 16px",
          overflowX: "auto", flexShrink: 0,
          borderBottom: "0.5px solid var(--gray-border)",
        }}>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              style={{
                padding: "4px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600,
                border: "none", cursor: "pointer", whiteSpace: "nowrap",
                background: category === tab.id ? "var(--navy)" : "var(--gray-bg)",
                color: category === tab.id ? "var(--gold)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Term count */}
        <div style={{ padding: "6px 16px", fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0 }}>
          {filtered.length} term{filtered.length !== 1 ? "s" : ""}
        </div>

        {/* Terms list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: "0.875rem" }}>
              No terms match your search.
            </p>
          ) : (
            filtered.map((term) => <TermCard key={term.term} term={term} />)
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "12px 16px", borderTop: "0.5px solid var(--gray-border)",
          fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5,
          flexShrink: 0,
        }}>
          💡 Can't find a term? The <strong>Plain English</strong> button above can explain any part of your document.
        </div>
      </div>
    </>
  );
};

export default LegalDictionary;
