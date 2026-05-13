import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeDocument } from "../api/client";
import { clearToken } from "../api/auth";
import type { AnalysisResponse } from "../types";
import { getHistory, getHistoryStats, saveToHistory, formatRelativeTime } from "../utils/history";
import { useToast } from "../hooks/useToast";

// ─── Pipeline steps ───────────────────────────────────────────────────────────
// Step 3 (AI analysis) has a longer dwell time to reflect the real Groq API call
const STEPS = [
  "Extracting text from PDF",
  "Reading document structure",
  "AI analyzing case details",
  "Finding similar cases",
  "Preparing results",
];

// Timings in ms: step 3 (index 2) stays active for ~3-4 seconds
const STEP_TIMINGS = [1000, 2000, 5500, 7500, 9000];

// ─── Icons ────────────────────────────────────────────────────────────────────
const CloudUploadIcon = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    className="upload-zone-icon" aria-hidden="true">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── Error message mapper ─────────────────────────────────────────────────────
function mapApiError(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { detail?: string } };
    message?: string;
  };

  if (!navigator.onLine) {
    return "No internet connection. Please check your network and try again.";
  }

  const status = e?.response?.status;
  const detail = e?.response?.data?.detail;

  if (status === 401) return "__SESSION_EXPIRED__";
  if (status === 413) return "File too large. Maximum size is 10MB.";
  if (status === 429) return "Too many requests. Please wait a minute before trying again.";
  if (detail)         return detail;
  return "Analysis failed. Please ensure the backend is running and try again.";
}

// ─── Component ────────────────────────────────────────────────────────────────
interface DashboardPageProps {
  onResult: (result: AnalysisResponse) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onResult }) => {
  const navigate       = useNavigate();
  const { showToast }  = useToast();
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver,   setIsDragOver]   = useState(false);
  const [stage,        setStage]        = useState<"idle" | "analyzing" | "error">("idle");
  const [activeStep,   setActiveStep]   = useState(0);
  const [error,        setError]        = useState<string | null>(null);

  const [stats, setStats]     = useState({ total: 0, session: 0, avgConf: 0 });
  const sessionCountRef       = useRef(0);

  const refreshStats = useCallback(() => {
    const { total, avgConfidence } = getHistoryStats();
    setStats((prev) => ({ total, session: prev.session, avgConf: avgConfidence }));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Simulate step progression while analyzing
  // Step 3 (AI analysis) has a longer dwell to reflect the real Groq API call
  useEffect(() => {
    if (stage !== "analyzing") return;
    setActiveStep(0);
    const timers = STEP_TIMINGS.map((t, i) =>
      window.setTimeout(() => setActiveStep(i + 1), t),
    );
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setError(null);
    setStage("analyzing");

    try {
      const result = await analyzeDocument(selectedFile);
      saveToHistory(result);
      sessionCountRef.current += 1;
      const { total, avgConfidence } = getHistoryStats();
      setStats((prev) => ({ total, session: prev.session + 1, avgConf: avgConfidence }));
      onResult(result);
      showToast("Analysis complete!", "success");
      navigate("/results");
    } catch (err: unknown) {
      const msg = mapApiError(err);

      if (msg === "__SESSION_EXPIRED__") {
        clearToken();
        showToast("Session expired. Please sign in again.", "error");
        navigate("/login", { replace: true });
        return;
      }

      setError(msg);
      setStage("error");
      showToast(msg, "error");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setStage("idle");
    setError(null);
    setActiveStep(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Analyzing state ──
  if (stage === "analyzing") {
    return (
      <div>
        <StatCards stats={stats} />
        <div className="card" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          <div className="gold-spinner" />
          <p style={{ fontWeight: 700, color: "var(--navy)", fontSize: "1.05rem", marginBottom: 4 }}>
            Analysing document…
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 24 }}>
            AI is reading your document — this takes 10–30 seconds
          </p>
          <div className="progress-steps">
            {STEPS.map((label, i) => {
              const done   = i < activeStep;
              const active = i === activeStep;
              return (
                <div key={label} className="progress-step">
                  <div className={`progress-step-icon ${done ? "step-done" : active ? "step-active" : "step-wait"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`progress-step-label${done ? " done" : active ? " active" : ""}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (stage === "error") {
    return (
      <div>
        <StatCards stats={stats} />
        <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="banner-error" style={{ marginBottom: 20 }}>
            <ErrorIcon />
            <span>{error}</span>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleReset}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Idle state ──
  return (
    <div>
      <StatCards stats={stats} />

      <div className="card">
        <h2 className="card-title" style={{ marginBottom: 4 }}>Upload Legal Document</h2>
        <p className="card-subtitle" style={{ marginBottom: 20 }}>
          AI-powered analysis for legal professionals. For informational use only — not legal advice.
        </p>

        {/* Drop zone */}
        <div
          className={`upload-zone${isDragOver ? " drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload PDF file — click or drag and drop"
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        >
          <CloudUploadIcon />
          <p className="upload-zone-title">Drop your legal PDF here</p>
          <p className="upload-zone-sub">Supports typed and scanned PDFs up to 10MB</p>

          {!selectedFile && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Browse File
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Selected file */}
        {selectedFile && (
          <div className="upload-file-selected">
            <div>
              <div className="upload-file-name">📄 {selectedFile.name}</div>
              <div className="upload-file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button className="upload-remove-btn" onClick={handleReset} aria-label="Remove selected file">
              ×
            </button>
          </div>
        )}

        {/* Inline error */}
        {error && stage === "idle" && (
          <div className="banner-error" style={{ marginTop: 12 }}>
            <ErrorIcon />
            <span>{error}</span>
          </div>
        )}

        {/* Analyze button */}
        {selectedFile && (
          <button
            className="btn btn-gold btn-full btn-lg"
            style={{ marginTop: 16 }}
            onClick={handleAnalyze}
          >
            Analyze Document
          </button>
        )}
      </div>

      <RecentHistory onSelectResult={onResult} />
    </div>
  );
};

// ─── Stat Cards ───────────────────────────────────────────────────────────────
interface StatsProps {
  stats: { total: number; session: number; avgConf: number };
}

const StatCards: React.FC<StatsProps> = ({ stats }) => (
  <div className="stat-grid">
    <div className="stat-card">
      <div className="stat-label">Documents Analyzed</div>
      <div className="stat-value">{stats.total}</div>
      <div className="stat-sub">All time</div>
    </div>
    <div className="stat-card">
      <div className="stat-label">This Session</div>
      <div className="stat-value">{stats.session}</div>
      <div className="stat-sub">Since login</div>
    </div>
    <div className="stat-card">
      <div className="stat-label">Avg. Confidence</div>
      <div className="stat-value">{stats.total > 0 ? `${stats.avgConf.toFixed(0)}%` : "—"}</div>
      <div className="stat-sub">Across all analyses</div>
    </div>
  </div>
);

// ─── Recent history preview ───────────────────────────────────────────────────
interface RecentHistoryProps {
  onSelectResult: (result: AnalysisResponse) => void;
}

const RecentHistory: React.FC<RecentHistoryProps> = ({ onSelectResult }) => {
  const navigate = useNavigate();
  const recent   = getHistory().slice(0, 3);

  if (!recent.length) return null;

  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 className="card-title" style={{ fontSize: "0.95rem", marginBottom: 0 }}>Recent Analyses</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/history")}>
          View all →
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recent.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, padding: "10px 14px",
              background: "var(--gray-bg)", borderRadius: 8,
              border: "0.5px solid rgba(0,0,0,0.07)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260,
                }}>
                  📄 {entry.filename}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 600, background: "rgba(217,119,6,0.1)", color: "#92400e", border: "1px solid rgba(217,119,6,0.3)" }}>
                  {entry.full_result.case_details.crime_or_issue || "Legal Matter"}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                {formatRelativeTime(entry.analyzed_at)}
              </div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { onSelectResult(entry.full_result); navigate("/results"); }}
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
