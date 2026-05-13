import React, { useMemo, useState } from "react";
import type { AnalysisResponse } from "../types";

// ─── Deadline keywords to scan in section text ────────────────────────────────
const DEADLINE_KEYWORDS = [
  "deadline", "due date", "expire", "expiry", "expiration",
  "valid until", "within", "days", "before", "by the",
  "not later than", "effective from", "effective date",
  "no later than", "on or before", "must be submitted",
  "must be filed", "must be paid",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface DateItem {
  date: string;
  source: string;       // section name or "Entities"
  snippet: string;      // up to 80 chars of context
  sortKey: number;      // timestamp or Infinity for unparseable
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tryParseDate(text: string): number {
  const d = new Date(text);
  return isNaN(d.getTime()) ? Infinity : d.getTime();
}

function extractSnippet(text: string, keyword: string, maxLen = 80): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 20);
  const end   = Math.min(text.length, idx + keyword.length + 40);
  const raw   = text.slice(start, end).trim();
  return (start > 0 ? "…" : "") + raw + (end < text.length ? "…" : "");
}

function collectDates(data: AnalysisResponse): DateItem[] {
  const items: DateItem[] = [];
  const seen = new Set<string>();

  const add = (date: string, source: string, snippet: string) => {
    const key = `${date}::${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ date, source, snippet: snippet.slice(0, 80), sortKey: tryParseDate(date) });
  };

  // 1. DATE entities from case_details sections_involved (no entities array in new schema)
  // Use sections_involved as date-adjacent context
  const dateEntities: string[] = data.case_details.sections_involved;
  for (const s of dateEntities) {
    add(s, "Sections", s);
  }

  // 2. Scan case_details fields for deadline keywords
  const fieldsToScan = [
    { text: data.case_details.what_happened, source: "What Happened" },
    { text: data.case_details.judgment,      source: "Judgment" },
    { text: data.case_details.penalty_or_relief, source: "Penalty / Relief" },
  ];
  for (const field of fieldsToScan) {
    if (!field.text) continue;
    for (const kw of DEADLINE_KEYWORDS) {
      if (field.text.toLowerCase().includes(kw.toLowerCase())) {
        const snippet = extractSnippet(field.text, kw);
        add(`[${kw}]`, field.source, snippet);
      }
    }
  }

  // Sort: parseable dates first (chronological), then unparseable
  return items.sort((a, b) => {
    if (a.sortKey === Infinity && b.sortKey === Infinity) return 0;
    if (a.sortKey === Infinity) return 1;
    if (b.sortKey === Infinity) return -1;
    return a.sortKey - b.sortKey;
  });
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
);

const CalendarOffIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" style={{ color: "var(--text-muted)", opacity: 0.3 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
    <line x1="1"  y1="1"  x2="23" y2="23"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

// ─── Timeline item ────────────────────────────────────────────────────────────
const TimelineItem: React.FC<{ item: DateItem; isLast: boolean }> = ({ item, isLast }) => (
  <div style={{ display: "flex", gap: 16, position: "relative" }}>
    {/* Line + dot */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        background: "var(--gold)", border: "2px solid var(--white)",
        boxShadow: "0 0 0 2px var(--gold)",
        flexShrink: 0, marginTop: 4,
      }} />
      {!isLast && (
        <div style={{ width: 2, flex: 1, background: "var(--navy)", opacity: 0.15, minHeight: 24, marginTop: 4 }} />
      )}
    </div>

    {/* Card */}
    <div style={{
      flex: 1, background: "var(--white)",
      border: "0.5px solid rgba(0,0,0,0.09)",
      borderRadius: 10, padding: "12px 16px",
      marginBottom: isLast ? 0 : 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ color: "var(--gold)" }}><CalendarIcon /></span>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--navy)" }}>{item.date}</span>
        <span style={{
          marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-muted)",
          background: "var(--gray-bg)", border: "0.5px solid var(--gray-border)",
          padding: "1px 7px", borderRadius: 999,
        }}>
          {item.source}
        </span>
      </div>
      {item.snippet && (
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          {item.snippet}
        </p>
      )}
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
interface DeadlinesCardProps {
  data: AnalysisResponse;
}

const DeadlinesCard: React.FC<DeadlinesCardProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const dates = useMemo(() => collectDates(data), [data]);

  const handleCopy = async () => {
    const lines = dates.map((d) => `• ${d.date}: ${d.snippet} (${d.source})`).join("\n");
    const text  = `Key Dates — ${data.filename}\n${lines}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Empty state ──
  if (dates.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px" }}>
        <div style={{ marginBottom: 16 }}><CalendarOffIcon /></div>
        <p style={{ fontWeight: 600, color: "var(--navy)", marginBottom: 6 }}>No key dates detected</p>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          No date entities or deadline keywords were found in this document.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
            Key Dates &amp; Deadlines
          </h3>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
            {dates.length} date{dates.length !== 1 ? "s" : ""} found · sorted chronologically
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleCopy}
          style={{ gap: 6, minWidth: 110 }}
          aria-label="Copy all dates to clipboard"
        >
          <CopyIcon />
          {copied ? "Copied!" : "Export Dates"}
        </button>
      </div>

      {/* Timeline */}
      <div style={{ paddingLeft: 4 }}>
        {dates.map((item, i) => (
          <TimelineItem key={`${item.date}-${i}`} item={item} isLast={i === dates.length - 1} />
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: 20, padding: "10px 14px",
        background: "rgba(201,168,76,0.06)",
        border: "1px solid rgba(201,168,76,0.2)",
        borderRadius: 8, fontSize: "0.75rem", color: "var(--text-muted)",
      }}>
        ℹ️ Dates are extracted automatically from entity recognition and keyword scanning.
        Verify all dates against the original document.
      </div>
    </div>
  );
};

export default DeadlinesCard;
