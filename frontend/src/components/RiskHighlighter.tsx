import React, { useMemo } from "react";
import type { AnalysisResponse } from "../types";

// ─── Keyword dictionaries ─────────────────────────────────────────────────────
const HIGH_RISK_KEYWORDS = [
  "liable", "liability", "penalty", "penalties", "forfeit", "forfeiture",
  "void", "illegal", "breach", "terminate", "termination", "damages",
  "criminal", "arrest", "seizure", "injunction", "contempt", "default",
  "indictment", "prosecution", "conviction", "imprisonment",
];

const MEDIUM_RISK_KEYWORDS = [
  "dispute", "obligation", "indemnify", "indemnification", "warrant",
  "warranty", "restrict", "restriction", "limitation", "exclusive",
  "irrevocable", "non-refundable", "binding", "encumbrance", "lien",
  "waiver", "forgo", "subordinate", "penalty clause",
];

const LOW_RISK_KEYWORDS = [
  "agree", "agreement", "consent", "mutual", "reasonable", "refund",
  "terminate at will", "revocable", "optional", "discretion", "amend",
  "negotiate", "cooperate", "good faith",
];

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = "high" | "medium" | "low";

interface RiskMatch {
  keyword: string;
  level: RiskLevel;
  section: string;
}

interface RiskSummary {
  high: number;
  medium: number;
  low: number;
  score: number;
  matches: RiskMatch[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findKeywords(text: string, keywords: string[], level: RiskLevel, section: string): RiskMatch[] {
  const lower = text.toLowerCase();
  const found: RiskMatch[] = [];
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      found.push({ keyword: kw, level, section });
    }
  }
  return found;
}

function analyzeRisk(data: AnalysisResponse): RiskSummary {
  const matches: RiskMatch[] = [];

  // Scan what_happened + judgment as the main text sources
  const textSources = [
    { text: data.case_details.what_happened,    section: "What Happened" },
    { text: data.case_details.judgment,         section: "Judgment" },
    { text: data.case_details.penalty_or_relief, section: "Penalty / Relief" },
    { text: data.case_details.crime_or_issue,   section: "Crime / Issue" },
  ];

  for (const { text, section } of textSources) {
    if (!text) continue;
    matches.push(...findKeywords(text, HIGH_RISK_KEYWORDS,   "high",   section));
    matches.push(...findKeywords(text, MEDIUM_RISK_KEYWORDS, "medium", section));
    matches.push(...findKeywords(text, LOW_RISK_KEYWORDS,    "low",    section));
  }

  // Deduplicate by keyword+section
  const seen = new Set<string>();
  const deduped = matches.filter((m) => {
    const key = `${m.keyword}::${m.section}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const high   = deduped.filter((m) => m.level === "high").length;
  const medium = deduped.filter((m) => m.level === "medium").length;
  const low    = deduped.filter((m) => m.level === "low").length;
  const total  = high + medium + low;

  const score = total === 0 ? 0
    : Math.min(100, Math.round(((high * 3 + medium * 1) / (total * 3)) * 100));

  return { high, medium, low, score, matches: deduped };
}

/** Wrap risk keywords in <mark> spans inside a text string */
function highlightText(text: string): React.ReactNode[] {
  // Build a combined regex from all keywords, longest first to avoid partial matches
  const allKws = [
    ...HIGH_RISK_KEYWORDS.map((k) => ({ k, level: "high" as RiskLevel })),
    ...MEDIUM_RISK_KEYWORDS.map((k) => ({ k, level: "medium" as RiskLevel })),
    ...LOW_RISK_KEYWORDS.map((k) => ({ k, level: "low" as RiskLevel })),
  ].sort((a, b) => b.k.length - a.k.length);

  const pattern = allKws.map((x) => x.k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex   = new RegExp(`(${pattern})`, "gi");

  const parts = text.split(regex);
  return parts.map((part, i) => {
    const lower = part.toLowerCase();
    const match = allKws.find((x) => x.k.toLowerCase() === lower);
    if (!match) return part;

    const bg: Record<RiskLevel, string> = {
      high:   "rgba(220,38,38,0.15)",
      medium: "rgba(217,119,6,0.15)",
      low:    "rgba(22,163,74,0.12)",
    };
    const color: Record<RiskLevel, string> = {
      high:   "#b91c1c",
      medium: "#92400e",
      low:    "#15803d",
    };

    return (
      <mark
        key={i}
        style={{
          background: bg[match.level],
          color: color[match.level],
          borderRadius: 3,
          padding: "0 2px",
          fontWeight: 600,
        }}
        title={`${match.level.toUpperCase()} RISK`}
      >
        {part}
      </mark>
    );
  });
}

// ─── Risk score meter ─────────────────────────────────────────────────────────
const RiskMeter: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 67 ? "#dc2626" : score >= 34 ? "#d97706" : "#16a34a";
  const label = score >= 67 ? "High Risk" : score >= 34 ? "Medium Risk" : "Low Risk";

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Risk Score
        </span>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color }}>
          {score} / 100 — {label}
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "var(--gray-border)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${score}%`,
          background: color,
          borderRadius: 999,
          transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4 }}>
        <span>0 — Low</span>
        <span>33</span>
        <span>66</span>
        <span>100 — High</span>
      </div>
    </div>
  );
};

// ─── Section risk row ─────────────────────────────────────────────────────────
const SectionRiskRow: React.FC<{ name: string; matches: RiskMatch[] }> = ({ name, matches }) => {
  const high   = matches.filter((m) => m.level === "high").length;
  const medium = matches.filter((m) => m.level === "medium").length;
  const low    = matches.filter((m) => m.level === "low").length;

  const dominant: RiskLevel | null =
    high > 0 ? "high" : medium > 0 ? "medium" : low > 0 ? "low" : null;

  const badgeStyle: Record<RiskLevel, React.CSSProperties> = {
    high:   { background: "rgba(220,38,38,0.1)",  color: "#b91c1c", border: "1px solid rgba(220,38,38,0.3)" },
    medium: { background: "rgba(217,119,6,0.1)",  color: "#92400e", border: "1px solid rgba(217,119,6,0.3)" },
    low:    { background: "rgba(22,163,74,0.1)",  color: "#15803d", border: "1px solid rgba(22,163,74,0.3)" },
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", background: "var(--gray-bg)",
      borderRadius: 8, border: "0.5px solid var(--gray-border)",
    }}>
      <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--navy)" }}>{name}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {high   > 0 && <span style={{ ...pillBase, background: "rgba(220,38,38,0.1)",  color: "#b91c1c" }}>{high} high</span>}
        {medium > 0 && <span style={{ ...pillBase, background: "rgba(217,119,6,0.1)",  color: "#92400e" }}>{medium} med</span>}
        {low    > 0 && <span style={{ ...pillBase, background: "rgba(22,163,74,0.1)",  color: "#15803d" }}>{low} low</span>}
        {dominant && (
          <span style={{ ...badgeStyle[dominant], padding: "2px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
            {dominant}
          </span>
        )}
        {!dominant && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>No flags</span>}
      </div>
    </div>
  );
};

const pillBase: React.CSSProperties = {
  padding: "2px 7px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 600,
};

// ─── Main component ───────────────────────────────────────────────────────────
interface RiskHighlighterProps {
  data: AnalysisResponse;
}

const RiskHighlighter: React.FC<RiskHighlighterProps> = ({ data }) => {
  const risk = useMemo(() => analyzeRisk(data), [data]);

  // Group matches by section for the section list
  const bySection = useMemo(() => {
    const map: Record<string, RiskMatch[]> = {};
    for (const m of risk.matches) {
      (map[m.section] = map[m.section] || []).push(m);
    }
    return map;
  }, [risk.matches]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Summary counts ── */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
            Risk Analysis
          </h3>
          <span style={{ ...countBadge, background: "rgba(220,38,38,0.1)", color: "#b91c1c", border: "1px solid rgba(220,38,38,0.3)" }}>
            🔴 {risk.high} High Risk
          </span>
          <span style={{ ...countBadge, background: "rgba(217,119,6,0.1)", color: "#92400e", border: "1px solid rgba(217,119,6,0.3)" }}>
            🟡 {risk.medium} Medium Risk
          </span>
          <span style={{ ...countBadge, background: "rgba(22,163,74,0.1)", color: "#15803d", border: "1px solid rgba(22,163,74,0.3)" }}>
            🟢 {risk.low} Low Risk
          </span>
        </div>

        <RiskMeter score={risk.score} />

        {/* Section breakdown */}
        {Object.keys(bySection).length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>
              By Section
            </p>
            {Object.entries(bySection).map(([section, matches]) => (
              <SectionRiskRow key={section} name={section} matches={matches} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            No risk keywords detected in this document.
          </p>
        )}
      </div>

      {/* ── Highlighted summary ── */}
      <div className="card summary-card">
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--navy)", marginBottom: 12 }}>
          Highlighted Summary
        </h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          {(["high", "medium", "low"] as RiskLevel[]).map((level) => {
            const cfg = {
              high:   { bg: "rgba(220,38,38,0.12)",  color: "#b91c1c", label: "High risk term" },
              medium: { bg: "rgba(217,119,6,0.12)",  color: "#92400e", label: "Medium risk term" },
              low:    { bg: "rgba(22,163,74,0.1)",   color: "#15803d", label: "Favorable term" },
            }[level];
            return (
              <span key={level} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <mark style={{ background: cfg.bg, color: cfg.color, borderRadius: 3, padding: "0 4px", fontWeight: 600 }}>
                  word
                </mark>
                {cfg.label}
              </span>
            );
          })}
        </div>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.8, color: "var(--text-mid)" }}>
          {highlightText(data.case_details.what_happened || data.case_details.judgment || "No text available for highlighting.")}
        </p>
      </div>

      {/* ── Disclaimer ── */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(201,168,76,0.06)",
        border: "1px solid rgba(201,168,76,0.25)",
        borderRadius: 8,
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        lineHeight: 1.6,
      }}>
        ⚠️ <strong>Disclaimer:</strong> This risk analysis is automated and for reference only.
        Keyword matching cannot replace professional legal review.
        Always consult a qualified lawyer for legal advice.
      </div>
    </div>
  );
};

const countBadge: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 999,
  fontSize: "0.78rem",
  fontWeight: 700,
};

export default RiskHighlighter;
