import React, { useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle,
} from "docx";
import {
  LEGAL_TEMPLATES,
  CATEGORY_CONFIG,
  DIFFICULTY_CONFIG,
  getTemplatesByCategory,
  type LegalTemplate,
  type TemplateField,
} from "../data/templates";

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear().toString();

const CATEGORY_TABS = [
  { id: "all",      label: "All" },
  { id: "criminal", label: "Criminal" },
  { id: "civil",    label: "Civil" },
  { id: "consumer", label: "Consumer" },
  { id: "rti",      label: "RTI" },
  { id: "family",   label: "Family" },
  { id: "property", label: "Property" },
];

// ─── Fill template with values ────────────────────────────────────────────────
function fillTemplate(template: string, values: Record<string, string>): string {
  let filled = template.replace(/\{\{year\}\}/g, CURRENT_YEAR);
  Object.entries(values).forEach(([key, val]) => {
    filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val || `[${key}]`);
  });
  return filled;
}

// ─── Highlight placeholders in preview ───────────────────────────────────────
function renderPreview(template: string, values: Record<string, string>): React.ReactNode[] {
  const filled = template.replace(/\{\{year\}\}/g, CURRENT_YEAR);
  const parts  = filled.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{([^}]+)\}\}$/);
    if (match) {
      const key = match[1];
      const val = values[key];
      return (
        <span key={i} style={{
          background: val ? "rgba(201,168,76,0.15)" : "rgba(220,38,38,0.1)",
          color: val ? "#92700a" : "#b91c1c",
          borderRadius: 3, padding: "0 2px",
          fontWeight: val ? 600 : 400,
        }}>
          {val || `[${key}]`}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ─── Template card ────────────────────────────────────────────────────────────
const TemplateCard: React.FC<{ tmpl: LegalTemplate; onUse: () => void }> = ({ tmpl, onUse }) => {
  const cat  = CATEGORY_CONFIG[tmpl.category];
  const diff = DIFFICULTY_CONFIG[tmpl.difficulty];

  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: "0.5px solid rgba(0,0,0,0.1)",
      padding: "20px", display: "flex", flexDirection: "column", gap: 10,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      transition: "box-shadow 0.15s",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)")}
    >
      {/* Category badge */}
      <span style={{
        display: "inline-flex", alignSelf: "flex-start",
        padding: "2px 10px", borderRadius: 999,
        fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
        background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
      }}>
        {cat.label}
      </span>

      {/* Title */}
      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--navy)" }}>
        {tmpl.title}
      </h3>

      {/* Description */}
      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-mid)", lineHeight: 1.5,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {tmpl.description}
      </p>

      {/* Use case */}
      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
        {tmpl.useCase}
      </p>

      {/* Footer row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 600,
            background: diff.bg, color: diff.color,
          }}>
            {diff.label}
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            ⏱ {tmpl.estimatedTime}
          </span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={onUse}
          style={{ fontSize: "0.78rem" }}
        >
          Use Template
        </button>
      </div>
    </div>
  );
};

// ─── Field input ──────────────────────────────────────────────────────────────
const FieldInput: React.FC<{
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}> = ({ field, value, onChange }) => {
  const base: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontSize: "0.85rem",
    border: "1.5px solid var(--gray-border)", borderRadius: 7,
    outline: "none", color: "var(--text-dark)", background: "#fff",
    boxSizing: "border-box",
  };

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        style={{ ...base, resize: "vertical", fontFamily: "inherit" }}
      />
    );
  }
  if (field.type === "select" && field.options) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...base, cursor: "pointer" }}>
        <option value="">Select…</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      style={base}
    />
  );
};

// ─── Template modal ───────────────────────────────────────────────────────────
const TemplateModal: React.FC<{ tmpl: LegalTemplate; onClose: () => void }> = ({ tmpl, onClose }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const set = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const filledText = fillTemplate(tmpl.template, values);

  // ── PDF export ──
  const downloadPDF = () => {
    const doc      = new jsPDF({ unit: "mm", format: "a4" });
    const pageW    = doc.internal.pageSize.getWidth();
    const pageH    = doc.internal.pageSize.getHeight();
    const marginL  = 14;
    const contentW = pageW - marginL * 2;
    const maxY     = pageH - 20;
    let y = 18;

    // Header
    doc.setFillColor(15, 39, 68);
    doc.rect(0, 0, pageW, 14, "F");
    doc.setFontSize(9);
    doc.setTextColor(201, 168, 76);
    doc.setFont("helvetica", "bold");
    doc.text("LexAnalyze Legal Templates", 14, 9);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.text("Template only — consult a lawyer before use", pageW - 14, 9, { align: "right" });

    y = 22;
    // Title
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 39, 68);
    doc.text(tmpl.title, marginL, y);
    y += 10;

    // Body
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const lines = filledText.split("\n");
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line || " ", contentW);
      for (const wl of wrapped) {
        if (y > maxY) { doc.addPage(); y = 18; }
        doc.text(wl, marginL, y);
        y += 5.5;
      }
    }

    // Footer on all pages
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFillColor(15, 39, 68);
      doc.rect(0, pageH - 12, pageW, 12, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("Generated by LexAnalyze  |  This is a template only. Consult a lawyer before use.", 14, pageH - 5);
      doc.text(`Page ${i} of ${total}`, pageW - 14, pageH - 5, { align: "right" });
    }

    doc.save(`${tmpl.id}_LexAnalyze.pdf`);
  };

  // ── Word export ──
  const downloadWord = async () => {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: tmpl.title, bold: true, color: "0F2744", size: 28 })],
        spacing: { after: 200 },
      }),
      ...filledText.split("\n").map((line) =>
        new Paragraph({
          children: [new TextRun({ text: line || " ", size: 20, color: "1E1E1E" })],
          spacing: { after: 60 },
        }),
      ),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Generated by LexAnalyze  |  This is a template only. Consult a lawyer before use.", size: 14, color: "8A9AB0", italics: true })],
        spacing: { before: 400 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "C9A84C", space: 8 } },
      }),
    ];

    const docx = new Document({ sections: [{ children: paragraphs }], creator: "LexAnalyze" });
    const blob = await Packer.toBlob(docx);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${tmpl.id}_LexAnalyze.docx`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Copy ──
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(filledText).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = filledText;
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cat = CATEGORY_CONFIG[tmpl.category];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "stretch",
    }}>
      <div style={{
        display: "flex", width: "100%", maxWidth: 1100,
        margin: "auto", background: "#fff", borderRadius: 14,
        overflow: "hidden", maxHeight: "92vh",
        boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
      }}>

        {/* ── Left: Preview ── */}
        <div style={{
          width: "40%", minWidth: 280, display: "flex", flexDirection: "column",
          background: "var(--gray-bg)", borderRight: "0.5px solid var(--gray-border)",
        }}>
          <div style={{ padding: "16px 18px", borderBottom: "0.5px solid var(--gray-border)", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              Live Preview
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              <span style={{ background: "rgba(201,168,76,0.15)", color: "#92700a", padding: "0 4px", borderRadius: 3 }}>gold</span> = filled &nbsp;
              <span style={{ background: "rgba(220,38,38,0.1)", color: "#b91c1c", padding: "0 4px", borderRadius: 3 }}>[field]</span> = empty
            </p>
          </div>
          <div ref={previewRef} style={{
            flex: 1, overflowY: "auto", padding: "16px 18px",
            fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.7,
            color: "var(--text-dark)", whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {renderPreview(tmpl.template, values)}
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px", borderBottom: "0.5px solid var(--gray-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--navy)" }}>{tmpl.title}</h2>
                <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700, background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
                  {cat.label}
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Fill in the fields below. Required fields marked <span style={{ color: "#dc2626" }}>*</span>
              </p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "var(--text-muted)", lineHeight: 1, padding: "2px 4px" }} aria-label="Close">×</button>
          </div>

          {/* Fields */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {tmpl.fields.map((field) => (
              <div key={field.key}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-dark)", display: "block", marginBottom: 5 }}>
                  {field.label}
                  {field.required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
                </label>
                <FieldInput
                  field={field}
                  value={values[field.key] ?? ""}
                  onChange={(v) => set(field.key, v)}
                />
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div style={{
            padding: "12px 20px", borderTop: "0.5px solid var(--gray-border)",
            display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0,
            background: "#fff",
          }}>
            <button className="btn btn-primary btn-sm" onClick={downloadPDF}>
              ↓ Download PDF
            </button>
            <button className="btn btn-outline btn-sm" onClick={downloadWord}>
              ↓ Download Word
            </button>
            <button className="btn btn-ghost btn-sm" onClick={copyToClipboard}>
              {copied ? "✓ Copied!" : "Copy Text"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginLeft: "auto" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const TemplatesPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTemplate, setActiveTemplate] = useState<LegalTemplate | null>(null);

  const templates = useMemo(
    () => getTemplatesByCategory(activeCategory),
    [activeCategory],
  );

  const countFor = (cat: string) =>
    cat === "all" ? LEGAL_TEMPLATES.length : LEGAL_TEMPLATES.filter((t) => t.category === cat).length;

  return (
    <div>
      {/* Hero card */}
      <div style={{
        background: "var(--navy)", borderRadius: 12, padding: "24px 28px",
        marginBottom: 24, color: "#fff",
      }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "1.2rem", fontWeight: 700 }}>
          📄 Legal Document Templates
        </h1>
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "rgba(255,255,255,0.75)" }}>
          Ready-to-use templates for common legal situations. Fill in your details and download.
        </p>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "7px 14px", borderRadius: 8,
          background: "rgba(217,119,6,0.2)", border: "1px solid rgba(217,119,6,0.4)",
          fontSize: "0.78rem", color: "#fbbf24",
        }}>
          ⚠ These are general templates. Always consult a lawyer before submitting legal documents.
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {CATEGORY_TABS.map((tab) => {
          const count  = countFor(tab.id);
          const active = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              style={{
                padding: "6px 14px", borderRadius: 999, fontSize: "0.82rem", fontWeight: 600,
                border: "none", cursor: "pointer",
                background: active ? "var(--navy)" : "#fff",
                color: active ? "var(--gold)" : "var(--text-mid)",
                boxShadow: active ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  padding: "0 6px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700,
                  background: active ? "rgba(201,168,76,0.25)" : "var(--gray-bg)",
                  color: active ? "var(--gold)" : "var(--text-muted)",
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      {templates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem", opacity: 0.2, marginBottom: 12 }}>📄</div>
          <p>No templates in this category yet.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {templates.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              tmpl={tmpl}
              onUse={() => setActiveTemplate(tmpl)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {activeTemplate && (
        <TemplateModal
          tmpl={activeTemplate}
          onClose={() => setActiveTemplate(null)}
        />
      )}
    </div>
  );
};

export default TemplatesPage;
