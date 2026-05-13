import { getHistory } from "./history";

// ─── Types ────────────────────────────────────────────────────────────────────
export type CitationType = "section" | "article" | "act";

export interface CitationEntry {
  id: string;
  type: CitationType;
  text: string;           // e.g. "Section 302 IPC"
  act: string;            // e.g. "IPC", "RTE Act", "Constitution"
  documentName: string;   // filename of source document
  documentId: string;     // id of history entry
  caseTitle: string;      // complainant vs accused
  crimeOrIssue: string;
}

export interface CitationStats {
  total: number;
  mostCited: string;
  uniqueSections: number;
  byAct: Record<string, number>;
}

// ─── Act detection ────────────────────────────────────────────────────────────
function detectActAndType(section: string): { act: string; type: CitationType } {
  const lower = section.toLowerCase();

  if (lower.includes("article")) {
    return { type: "article", act: "Constitution" };
  }
  if (lower.includes("ipc") || lower.includes("indian penal code")) {
    return { type: "section", act: "IPC" };
  }
  if (lower.includes("crpc") || lower.includes("code of criminal procedure")) {
    return { type: "section", act: "CrPC" };
  }
  if (lower.includes("rte")) {
    return { type: "section", act: "RTE Act" };
  }
  if (lower.includes("rpwd")) {
    return { type: "section", act: "RPWD Act" };
  }
  if (lower.includes("ndps")) {
    return { type: "section", act: "NDPS Act" };
  }
  if (lower.includes("pocso")) {
    return { type: "section", act: "POCSO Act" };
  }
  if (lower.includes("it act")) {
    return { type: "act", act: "IT Act" };
  }
  if (lower.includes("sc/st")) {
    return { type: "section", act: "SC/ST Act" };
  }
  if (lower.includes("arms act")) {
    return { type: "section", act: "Arms Act" };
  }
  if (lower.includes("motor vehicles")) {
    return { type: "section", act: "Motor Vehicles Act" };
  }
  // Bare "Section N" with no act name
  return { type: "section", act: "Other" };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Extract all citations from every history entry. */
export function getAllCitations(): CitationEntry[] {
  const history = getHistory();
  const citations: CitationEntry[] = [];

  history.forEach((entry) => {
    const sections     = entry.full_result?.case_details?.sections_involved ?? [];
    const complainant  = entry.full_result?.case_overview?.complainant ?? "";
    const accused      = entry.full_result?.case_overview?.accused ?? "";
    const caseTitle    = complainant && accused
      ? `${complainant} vs ${accused}`
      : entry.filename;
    const crimeOrIssue = entry.full_result?.case_details?.crime_or_issue ?? "";

    sections.forEach((section, index) => {
      const { act, type } = detectActAndType(section);
      citations.push({
        id:           `${entry.id}-${index}`,
        type,
        text:         section,
        act,
        documentName: entry.filename,
        documentId:   entry.id,
        caseTitle,
        crimeOrIssue,
      });
    });
  });

  return citations;
}

/** Aggregate stats across all citations. */
export function getCitationStats(citations: CitationEntry[]): CitationStats {
  const total = citations.length;

  const byAct: Record<string, number> = {};
  citations.forEach((c) => {
    byAct[c.act] = (byAct[c.act] ?? 0) + 1;
  });

  const mostCited = Object.entries(byAct).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None";
  const uniqueSections = new Set(citations.map((c) => c.text)).size;

  return { total, mostCited, uniqueSections, byAct };
}

/** Export all citations as a formatted plain-text string. */
export function exportCitationsText(citations: CitationEntry[]): string {
  const lines: string[] = [
    "LexAnalyze — Citation Export",
    `Generated: ${new Date().toLocaleString()}`,
    "",
  ];

  // Group by act
  const groups: Record<string, CitationEntry[]> = {};
  citations.forEach((c) => {
    (groups[c.act] = groups[c.act] ?? []).push(c);
  });

  // Sort acts alphabetically, Constitution first
  const actOrder = ["Constitution", "IPC", "CrPC", "RTE Act", "RPWD Act", "NDPS Act", "POCSO Act", "IT Act", "SC/ST Act", "Arms Act", "Motor Vehicles Act", "Other"];
  const sortedActs = [
    ...actOrder.filter((a) => groups[a]),
    ...Object.keys(groups).filter((a) => !actOrder.includes(a)).sort(),
  ];

  sortedActs.forEach((act) => {
    const actLabel = act === "Constitution" ? "CONSTITUTION OF INDIA" : act.toUpperCase();
    lines.push(actLabel);
    groups[act].forEach((c) => {
      lines.push(`• ${c.text} — ${c.documentName} (${c.caseTitle})`);
    });
    lines.push("");
  });

  return lines.join("\n");
}
