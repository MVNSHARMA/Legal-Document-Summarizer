/**
 * exportPDF.ts — LexAnalyze PDF export utility.
 *
 * DISCLAIMER: Generated reports are for informational purposes only.
 * They do NOT constitute legal advice. Always consult a qualified legal professional.
 */
import { jsPDF } from "jspdf";
import type { AnalysisResponse } from "../types";

const NAVY  = [15, 39, 68]    as const;
const GOLD  = [201, 168, 76]  as const;
const BLACK = [30, 30, 30]    as const;
const GRAY  = [120, 130, 145] as const;
const WHITE = [255, 255, 255] as const;

function addPageHeader(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.text("LexAnalyze", 14, 12);
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.text("Legal Document Intelligence", pageW - 14, 12, { align: "right" });
}

export function exportToPDF(
  result: AnalysisResponse,
  filename: string,
  language = "en",
  languageName = "English",
): void {
  const doc      = new jsPDF({ unit: "mm", format: "a4" });
  const pageW    = doc.internal.pageSize.getWidth();
  const pageH    = doc.internal.pageSize.getHeight();
  const marginL  = 14;
  const marginR  = 14;
  const contentW = pageW - marginL - marginR;
  // Reserve 18px for footer (no longer drawn during content — drawn in final pass)
  const maxY     = pageH - 18 - 8;
  const headerH  = 18;

  let y = headerH + 10;

  const newPage = () => {
    doc.addPage();
    addPageHeader(doc);
    y = headerH + 10;
  };

  const checkY = (needed: number) => { if (y + needed > maxY) newPage(); };

  const sectionHeading = (title: string) => {
    checkY(14);
    doc.setFillColor(...NAVY);
    doc.rect(marginL, y, contentW, 9, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(title, marginL + 3, y + 6);
    y += 13;
  };

  const bodyText = (text: string, size = 9.5) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      checkY(6);
      doc.text(line, marginL, y);
      y += 5.5;
    }
    y += 3;
  };

  const labelValue = (label: string, value: string) => {
    checkY(7);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(`${label}:`, marginL, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    const valLines = doc.splitTextToSize(value || "Not found", contentW - 40);
    doc.text(valLines, marginL + 38, y);
    y += Math.max(6, valLines.length * 5.5);
  };

  // ── Page 1: Header + Case Overview ──
  addPageHeader(doc);

  // File info box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(marginL, y, contentW, 28, 3, 3, "F");
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginL, y, contentW, 28, 3, 3, "S");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  const nameLines = doc.splitTextToSize(filename, contentW - 8);
  doc.text(nameLines, marginL + 4, y + 9);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(
    `Pages: ${result.page_count}  |  OCR: ${result.used_ocr ? "Yes" : "No"}  |  ID: ${result.document_id}  |  Exported: ${new Date().toLocaleString()}`,
    marginL + 4, y + 22,
  );
  y += 36;

  // Translation note
  if (language !== "en") {
    checkY(10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRAY);
    doc.text(
      `Note: This report has been translated to ${languageName} using AI. Original document was in English.`,
      marginL, y,
    );
    y += 8;
  }

  // Case Overview
  sectionHeading("CASE OVERVIEW");
  const ov = result.case_overview;
  labelValue("Filed By",    ov.complainant || "Not found");
  labelValue("Against",     ov.accused     || "Not found");
  labelValue("Court",       ov.court       || "Not found");
  labelValue("Case Number", ov.case_number || "Not found");
  labelValue("Judges",      ov.judges.join(", ") || "Not found");
  labelValue("Lawyers",     ov.lawyers.join(", ") || "Not found");
  y += 4;

  // ── Page 2: Case Details ──
  newPage();
  sectionHeading("CASE DETAILS");
  const cd = result.case_details;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("What Happened:", marginL, y);
  y += 6;
  bodyText(cd.what_happened || "Not available");

  checkY(7);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Crime / Legal Issue:", marginL, y);
  y += 6;
  bodyText(cd.crime_or_issue || "Not identified");

  if (cd.sections_involved.length > 0) {
    checkY(7);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Sections Involved:", marginL, y);
    y += 6;
    bodyText(cd.sections_involved.join("  |  "));
  }

  if (cd.judgment) {
    checkY(14);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Judgment:", marginL, y);
    y += 6;
    doc.setFillColor(245, 247, 250);
    const jLines = doc.splitTextToSize(cd.judgment, contentW - 4);
    const jH = jLines.length * 5.5 + 8;
    checkY(jH);
    doc.roundedRect(marginL, y - 2, contentW, jH, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    for (const line of jLines) {
      doc.text(line, marginL + 2, y + 4);
      y += 5.5;
    }
    y += 6;
  }

  labelValue("Judgment Date",    cd.judgment_date    || "Not found");
  labelValue("Penalty / Relief", cd.penalty_or_relief || "Not found");

  // ── Page 3: Similar Cases ──
  if (result.similar_cases.length > 0) {
    newPage();
    sectionHeading("SIMILAR CASES");
    for (const sc of result.similar_cases) {
      checkY(24);
      const pct = Math.round(sc.similarity_score * 100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVY);
      doc.text(`${sc.title}  (${pct}% similar)`, marginL, y);
      y += 6;
      if (sc.issue) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        doc.text(`Issue: ${sc.issue}`, marginL + 4, y);
        y += 5.5;
      }
      if (sc.judgment_summary) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BLACK);
        const jLines = doc.splitTextToSize(`Judgment: ${sc.judgment_summary}`, contentW - 4);
        for (const line of jLines) {
          checkY(6);
          doc.text(line, marginL + 4, y);
          y += 5.2;
        }
      }
      y += 6;
    }
  }

  // ── BUG 4 FIX: Add correct page footers using getNumberOfPages() ──
  // All content is now written; we know the real total page count.
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Navy footer bar
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 14, pageW, 14, "F");
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("Generated by LexAnalyze  |  Not legal advice", 14, pageH - 5);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 5, { align: "right" });
  }

  doc.save(`${filename.replace(/\.pdf$/i, "")}_LexAnalyze.pdf`);
}
