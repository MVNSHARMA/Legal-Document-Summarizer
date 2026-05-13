import React, { useCallback, useEffect, useRef, useState } from "react";
import { LEGAL_TERMS, getLegalTerm, type LegalTerm } from "../data/legalTerms";

// ─── Category badge colours ───────────────────────────────────────────────────
const CATEGORY_STYLE: Record<LegalTerm["category"], React.CSSProperties> = {
  procedure: { background: "rgba(37,99,235,0.1)",   color: "#1d4ed8", border: "1px solid rgba(37,99,235,0.3)" },
  person:    { background: "rgba(22,163,74,0.1)",   color: "#15803d", border: "1px solid rgba(22,163,74,0.3)" },
  latin:     { background: "rgba(124,58,237,0.1)",  color: "#6d28d9", border: "1px solid rgba(124,58,237,0.3)" },
  section:   { background: "rgba(220,38,38,0.08)",  color: "#b91c1c", border: "1px solid rgba(220,38,38,0.3)" },
  document:  { background: "rgba(217,119,6,0.1)",   color: "#92400e", border: "1px solid rgba(217,119,6,0.3)" },
  general:   { background: "rgba(100,116,139,0.1)", color: "#475569", border: "1px solid rgba(100,116,139,0.3)" },
};

const CATEGORY_LABEL: Record<LegalTerm["category"], string> = {
  procedure: "Procedure",
  person:    "Person",
  latin:     "Latin",
  section:   "Section / Article",
  document:  "Document",
  general:   "General",
};

// ─── Build a sorted list of terms (longest first to avoid partial matches) ───
const SORTED_TERMS = [...LEGAL_TERMS].sort(
  (a, b) => b.term.length - a.term.length,
);

// ─── Split text into segments: plain string | matched term ───────────────────
interface Segment {
  text: string;
  isMatch: boolean;
  termKey?: string;   // original term string for lookup
}

function segmentText(text: string): Segment[] {
  if (!text) return [];

  const segments: Segment[] = [];
  let remaining = text;
  let pos = 0;

  while (remaining.length > 0) {
    let earliestIdx = Infinity;
    let matchedTerm: LegalTerm | null = null;
    let matchedStr = "";

    for (const lt of SORTED_TERMS) {
      const escaped = lt.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex   = new RegExp(`\\b${escaped}\\b`, "i");
      const m       = regex.exec(remaining);
      if (m && m.index < earliestIdx) {
        earliestIdx = m.index;
        matchedTerm = lt;
        matchedStr  = m[0];
      }
    }

    if (!matchedTerm || earliestIdx === Infinity) {
      // No more matches — rest is plain text
      segments.push({ text: remaining, isMatch: false });
      break;
    }

    // Plain text before the match
    if (earliestIdx > 0) {
      segments.push({ text: remaining.slice(0, earliestIdx), isMatch: false });
    }

    // The matched term
    segments.push({ text: matchedStr, isMatch: true, termKey: matchedTerm.term });

    remaining = remaining.slice(earliestIdx + matchedStr.length);
    pos += earliestIdx + matchedStr.length;
  }

  return segments;
}

// ─── Tooltip popup ────────────────────────────────────────────────────────────
interface TooltipPopupProps {
  term: LegalTerm;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

const TooltipPopup: React.FC<TooltipPopupProps> = ({ term, anchorRef, onClose }) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  // Position: try above the anchor, fall back to below
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });

  useEffect(() => {
    if (!anchorRef.current || !popupRef.current) return;
    const anchor  = anchorRef.current.getBoundingClientRect();
    const popup   = popupRef.current.getBoundingClientRect();
    const vp      = window.innerHeight;
    const spaceAbove = anchor.top;
    const spaceBelow = vp - anchor.bottom;

    let top: number;
    if (spaceAbove >= popup.height + 8) {
      top = anchor.top + window.scrollY - popup.height - 8;
    } else {
      top = anchor.bottom + window.scrollY + 8;
    }

    // Horizontal: keep within viewport
    let left = anchor.left + window.scrollX;
    const maxLeft = window.innerWidth - popup.width - 8;
    if (left > maxLeft) left = maxLeft;
    if (left < 8) left = 8;

    setStyle({ position: "fixed", top: anchor.top - popup.height - 8, left, visibility: "visible" });
  }, [anchorRef]);

  const catStyle = CATEGORY_STYLE[term.category];

  return (
    <div
      ref={popupRef}
      role="tooltip"
      style={{
        ...style,
        position: "fixed",
        zIndex: 9999,
        maxWidth: 280,
        background: "#fff",
        borderRadius: 10,
        borderLeft: "4px solid var(--navy)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        padding: "12px 14px",
        fontSize: "0.82rem",
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.9rem" }}>
          {term.term}
        </span>
        <span style={{
          ...catStyle,
          padding: "1px 7px", borderRadius: 999,
          fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
        }}>
          {CATEGORY_LABEL[term.category]}
        </span>
      </div>

      {/* Definition */}
      <p style={{ margin: 0, color: "var(--text-mid)", fontSize: "0.8rem" }}>
        {term.definition}
      </p>

      {/* Example */}
      {term.example && (
        <p style={{ margin: "8px 0 0", color: "var(--gold)", fontStyle: "italic", fontSize: "0.75rem" }}>
          e.g. {term.example}
        </p>
      )}
    </div>
  );
};

// ─── Highlighted term span ────────────────────────────────────────────────────
const HighlightedTerm: React.FC<{ text: string; termKey: string }> = ({ text, termKey }) => {
  const [open, setOpen] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);
  const term    = getLegalTerm(termKey);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  if (!term) return <>{text}</>;

  return (
    <>
      <span
        ref={spanRef}
        onClick={toggle}
        style={{
          borderBottom: "1.5px dotted var(--gold)",
          cursor: "help",
          color: "inherit",
          position: "relative",
        }}
        aria-label={`Legal term: ${term.term}. Click for definition.`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
      >
        {text}
      </span>
      {open && (
        <TooltipPopup
          term={term}
          anchorRef={spanRef}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
interface LegalTooltipProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

const LegalTooltip: React.FC<LegalTooltipProps> = ({ text, style, className }) => {
  const segments = segmentText(text);

  return (
    <span style={style} className={className}>
      {segments.map((seg, i) =>
        seg.isMatch && seg.termKey ? (
          <HighlightedTerm key={i} text={seg.text} termKey={seg.termKey} />
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        ),
      )}
    </span>
  );
};

export default LegalTooltip;
