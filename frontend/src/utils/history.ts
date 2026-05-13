import type { AnalysisResponse } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────
export const HISTORY_KEY = "lex_history";
export const HISTORY_UPDATED_EVENT = "lex_history_updated";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HistoryEntry {
  id: string;
  filename: string;
  analyzed_at: string;   // ISO date string
  page_count: number;
  used_ocr: boolean;
  avg_confidence: number;
  full_result: AnalysisResponse;
}

export interface HistoryStats {
  total: number;
  mostCommonType: string;
  avgConfidence: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
function dispatch(): void {
  window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT));
}

function read(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as HistoryEntry[];
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  dispatch();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns true if an entry has the new schema structure. */
function isValidEntry(entry: unknown): entry is HistoryEntry {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  const fr = e.full_result as Record<string, unknown> | undefined;
  return (
    fr !== undefined &&
    fr.case_details !== undefined &&
    fr.case_overview !== undefined
  );
}

/**
 * Persist a new analysis result. Deduplicates by document_id, keeps newest 50.
 */
export function saveToHistory(result: AnalysisResponse): void {
  const entry: HistoryEntry = {
    id:             result.document_id,
    filename:       result.filename,
    analyzed_at:    new Date().toISOString(),
    page_count:     result.page_count,
    used_ocr:       result.used_ocr,
    avg_confidence: 0,
    full_result:    result,
  };

  const existing = read();
  const updated  = [entry, ...existing.filter((h) => h.id !== entry.id)].slice(0, 50);
  write(updated);
}

/**
 * Return all history entries that match the current schema.
 * Old-format entries (missing case_details / case_overview) are silently skipped.
 */
export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as unknown[];
    return all.filter(isValidEntry);
  } catch {
    return [];
  }
}

/**
 * Remove all entries that don't match the current schema from localStorage.
 * Call once on app startup to prevent crashes from stale data.
 */
export function clearOldHistory(): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as unknown[];
    const valid = all.filter(isValidEntry);
    // Only rewrite if something was actually removed
    if (valid.length !== all.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(valid));
      window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT));
    }
  } catch {
    localStorage.removeItem(HISTORY_KEY);
  }
}

/** Remove a single entry by id. */
export function deleteHistoryEntry(id: string): void {
  write(getHistory().filter((h) => h.id !== id));
}

/** Wipe all history. */
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
  dispatch();
}

/** Aggregate stats across all valid history entries. */
export function getHistoryStats(): HistoryStats {
  const entries = getHistory(); // uses validated list, never crashes

  if (entries.length === 0) {
    return { total: 0, mostCommonType: "—", avgConfidence: 0 };
  }

  const typeCounts: Record<string, number> = {};
  for (const e of entries) {
    const key = e.full_result.case_details?.crime_or_issue || "Unknown";
    typeCounts[key] = (typeCounts[key] ?? 0) + 1;
  }
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];

  return { total: entries.length, mostCommonType, avgConfidence: 0 };
}

/**
 * Returns a human-readable relative time string.
 */
export function formatRelativeTime(isoDate: string): string {
  const now    = Date.now();
  const then   = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return new Date(isoDate).toLocaleDateString();

  const diffSec  = Math.floor(diffMs / 1000);
  const diffMin  = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay  = Math.floor(diffHour / 24);

  if (diffSec < 60)  return "Just now";
  if (diffMin < 60)  return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7)   return `${diffDay} days ago`;

  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** No longer needed but kept for backward compat with any remaining callers */
export function getDocTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    court_judgment: "Court Judgment",
    contract:       "Contract",
    fir_or_notice:  "FIR / Legal Notice",
    other:          "Other Legal Document",
  };
  return labels[type] ?? type;
}
