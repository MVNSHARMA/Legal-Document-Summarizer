import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getToken } from "../api/auth";

const API_BASE = import.meta.env.VITE_API_URL || "https://lexanalyze-backend.onrender.com";

// ─── Email validation ─────────────────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Case data
  complainant: string;
  accused: string;
  court: string;
  caseNumber: string;
  crimeOrIssue: string;
  whatHappened: string;
  sections: string[];
  judgment: string;
  judgmentDate: string;
  judgmentOutcome: string;
  penaltyOrRelief: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
const EmailReportModal: React.FC<EmailReportModalProps> = ({
  isOpen, onClose,
  complainant, accused, court, caseNumber,
  crimeOrIssue, whatHappened, sections,
  judgment, judgmentDate, judgmentOutcome, penaltyOrRelief,
}) => {
  const { user } = useAuth();

  const [recipientEmail, setRecipientEmail] = useState(user?.email ?? "");
  const [recipientName,  setRecipientName]  = useState(user?.full_name ?? "");
  const [emailError,     setEmailError]     = useState("");
  const [sending,        setSending]        = useState(false);
  const [sent,           setSent]           = useState(false);
  const [sentTo,         setSentTo]         = useState("");
  const [apiError,       setApiError]       = useState("");

  const caseTitle = complainant && accused ? `${complainant} vs ${accused}` : "Legal Analysis";

  const fillSelf = () => {
    setRecipientEmail(user?.email ?? "");
    setRecipientName(user?.full_name ?? "");
    setEmailError("");
  };

  const fillLawyer = () => {
    setRecipientEmail("");
    setRecipientName("");
    setEmailError("");
  };

  const handleSend = async () => {
    setEmailError("");
    setApiError("");

    if (!recipientEmail.trim()) {
      setEmailError("Email address is required.");
      return;
    }
    if (!isValidEmail(recipientEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setSending(true);

    const caseData = {
      complainant, accused, court,
      case_number:      caseNumber,
      crime_or_issue:   crimeOrIssue,
      what_happened:    whatHappened,
      sections_involved: sections,
      judgment,
      judgment_date:    judgmentDate,
      judgment_outcome: judgmentOutcome,
      penalty_or_relief: penaltyOrRelief,
    };

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/email/send-report`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_email: recipientEmail.trim(),
          recipient_name:  recipientName.trim() || recipientEmail.trim(),
          case_data:       caseData,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = (err as { detail?: string })?.detail ?? `Error ${res.status}`;

        // Special handling for unconfigured Gmail
        if (res.status === 503) {
          setApiError(
            "Email service is not configured yet. " +
            "Ask the admin to set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env. " +
            "See: https://myaccount.google.com/apppasswords",
          );
        } else {
          setApiError(detail);
        }
        return;
      }

      setSentTo(recipientEmail.trim());
      setSent(true);
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleSendAnother = () => {
    setSent(false);
    setSentTo("");
    setApiError("");
    setRecipientEmail(user?.email ?? "");
    setRecipientName(user?.full_name ?? "");
  };

  const handleClose = () => {
    setSent(false);
    setSentTo("");
    setApiError("");
    setEmailError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 14,
        width: "100%", maxWidth: 480,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "var(--navy)", padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.1rem" }}>📧</span>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>
              Send Report by Email
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "1.2rem", lineHeight: 1, padding: "2px 4px" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* ── Success state ── */}
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
              <p style={{ fontWeight: 700, color: "var(--navy)", fontSize: "1rem", marginBottom: 6 }}>
                Report sent!
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: 20 }}>
                Sent to <strong>{sentTo}</strong>
              </p>
              <button className="btn btn-ghost btn-sm" onClick={handleSendAnother}>
                Send to another address
              </button>
            </div>
          ) : (
            <>
              {/* Quick option buttons */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
                  Send to
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={fillSelf}
                    style={{ flex: 1, fontSize: "0.8rem" }}
                  >
                    📧 Send to Myself
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={fillLawyer}
                    style={{ flex: 1, fontSize: "0.8rem" }}
                  >
                    👨‍⚖️ Send to Lawyer
                  </button>
                </div>
              </div>

              {/* Email field */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dark)", display: "block", marginBottom: 5 }}>
                  Email Address <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => { setRecipientEmail(e.target.value); setEmailError(""); }}
                  placeholder="recipient@example.com"
                  style={{
                    width: "100%", padding: "9px 12px", fontSize: "0.875rem",
                    border: `1.5px solid ${emailError ? "#dc2626" : "var(--gray-border)"}`,
                    borderRadius: 8, outline: "none", boxSizing: "border-box",
                  }}
                />
                {emailError && (
                  <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: 4 }}>{emailError}</p>
                )}
              </div>

              {/* Name field */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dark)", display: "block", marginBottom: 5 }}>
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Full name (optional)"
                  style={{
                    width: "100%", padding: "9px 12px", fontSize: "0.875rem",
                    border: "1.5px solid var(--gray-border)",
                    borderRadius: 8, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Report preview */}
              <div style={{
                background: "var(--gray-bg)", borderRadius: 10,
                padding: "14px 16px", marginBottom: 20,
                border: "0.5px solid var(--gray-border)",
              }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>
                  Report Preview
                </p>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--navy)", marginBottom: 4 }}>
                  {caseTitle}
                </p>
                {judgmentOutcome && judgmentOutcome !== "Unknown" && (
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 999,
                    fontSize: "0.7rem", fontWeight: 700, marginBottom: 8,
                    background: "rgba(15,39,68,0.08)", color: "var(--navy)",
                    border: "1px solid rgba(15,39,68,0.2)",
                  }}>
                    {judgmentOutcome}
                  </span>
                )}
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                  Includes: Case Overview, Judgment, Sections Involved
                </p>
              </div>

              {/* API error */}
              {apiError && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                  background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
                  color: "#b91c1c", fontSize: "0.82rem", lineHeight: 1.5,
                }}>
                  ⚠ {apiError}
                </div>
              )}

              {/* Send button */}
              <button
                className="btn btn-primary btn-full"
                onClick={handleSend}
                disabled={sending}
                style={{ fontSize: "0.9rem", gap: 8 }}
              >
                {sending ? (
                  <>
                    <span style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid rgba(201,168,76,0.3)",
                      borderTopColor: "var(--gold)",
                      animation: "spin 0.8s linear infinite",
                      display: "inline-block",
                    }} />
                    Sending…
                  </>
                ) : "📧 Send Report"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailReportModal;
