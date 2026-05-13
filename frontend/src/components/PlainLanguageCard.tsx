import React, { useState } from "react";
import type { AnalysisResponse } from "../types";

// ─── Icons ────────────────────────────────────────────────────────────────────
const LanguageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// ─── Response parser ──────────────────────────────────────────────────────────
interface ParsedExplanation {
  whatIsThis: string;
  keyPoints: string[];
  whatYouShouldKnow: string;
  raw: string;
}

function parseResponse(text: string): ParsedExplanation {
  const whatIsThisMatch = text.match(/WHAT IS THIS[:\s]+(.*?)(?=KEY POINTS|$)/si);
  const keyPointsMatch  = text.match(/KEY POINTS[:\s]+(.*?)(?=WHAT YOU SHOULD KNOW|$)/si);
  const shouldKnowMatch = text.match(/WHAT YOU SHOULD KNOW[:\s]+(.*?)$/si);

  const whatIsThis = whatIsThisMatch?.[1]?.trim() ?? "";

  const keyPointsRaw = keyPointsMatch?.[1]?.trim() ?? "";
  const keyPoints = keyPointsRaw
    .split(/\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  const whatYouShouldKnow = shouldKnowMatch?.[1]?.trim() ?? "";

  return { whatIsThis, keyPoints, whatYouShouldKnow, raw: text };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface PlainLanguageCardProps {
  data: AnalysisResponse;
}

const PlainLanguageCard: React.FC<PlainLanguageCardProps> = ({ data }) => {
  const [state,    setState]    = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result,   setResult]   = useState<ParsedExplanation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExplain = async () => {
    if (state === "done" && result) return; // use cached result

    // Guard: require Groq API key
    const apiKey = import.meta.env.VITE_GROQ_API_KEY ?? "";
    if (!apiKey) {
      setState("error");
      setErrorMsg(
        "Plain English feature requires a Groq API key. Add VITE_GROQ_API_KEY to your frontend .env file."
      );
      return;
    }

    setState("loading");
    setErrorMsg(null);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          max_tokens: 1000,
          messages: [
            {
              role: "system",
              content:
                "You are a legal document simplifier. Explain legal documents in simple plain English that a non-lawyer can understand. Use short sentences. Avoid legal jargon.",
            },
            {
              role: "user",
              content:
                `Explain this legal document summary in simple plain English. Structure your response EXACTLY like this:\n\nWHAT IS THIS: (one sentence explaining what this document is)\nKEY POINTS:\n• (point 1)\n• (point 2)\n• (point 3)\nWHAT YOU SHOULD KNOW: (2-3 sentences of practical advice for a non-lawyer)\n\nDocument type: ${data.case_details.crime_or_issue}\nSummary: ${data.case_details.what_happened}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { error?: { message?: string } })?.error?.message ??
            `Groq API error ${response.status}`
        );
      }

      const json = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };
      const text = json.choices[0]?.message?.content ?? "";
      setResult(parseResponse(text));
      setState("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to fetch explanation.");
      setState("error");
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      {/* Trigger button */}
      {state === "idle" && (
        <button className="btn btn-gold" onClick={handleExplain} style={{ gap: 8 }}>
          <LanguageIcon />
          Explain in Plain English
        </button>
      )}

      {/* Loading */}
      {state === "loading" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px",
          background: "rgba(201,168,76,0.06)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 10,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "2px solid rgba(201,168,76,0.3)",
            borderTopColor: "var(--gold)",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "0.875rem", color: "var(--text-mid)" }}>
            Generating plain English explanation…
          </span>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="banner-error">
            <span>⚠ {errorMsg}</span>
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => setState("idle")}>
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {state === "done" && result && (
        <div style={{
          background: "rgba(201,168,76,0.06)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderLeft: "4px solid var(--navy)",
          borderRadius: 10,
          padding: "20px 24px",
          position: "relative",
        }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)", marginBottom: 16 }}>
            Plain English Summary
          </h3>

          {/* What is this */}
          {result.whatIsThis && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 4 }}>
                What is this?
              </p>
              <p style={{ fontSize: "0.9rem", color: "var(--text-dark)", lineHeight: 1.6 }}>
                {result.whatIsThis}
              </p>
            </div>
          )}

          {/* Key points */}
          {result.keyPoints.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 8 }}>
                Key Points
              </p>
              <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {result.keyPoints.map((pt, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, fontSize: "0.875rem", color: "var(--text-mid)", lineHeight: 1.6 }}>
                    <span style={{ color: "var(--gold)", fontWeight: 700, flexShrink: 0 }}>•</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What you should know */}
          {result.whatYouShouldKnow && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 4 }}>
                What you should know
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-mid)", lineHeight: 1.7 }}>
                {result.whatYouShouldKnow}
              </p>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setResult(null); setState("idle"); }}
              style={{ fontSize: "0.75rem" }}
            >
              Regenerate
            </button>
            <span style={{
              fontSize: "0.68rem", color: "var(--text-muted)",
              background: "var(--gray-bg)", border: "0.5px solid var(--gray-border)",
              padding: "2px 8px", borderRadius: 999,
            }}>
              Powered by Groq AI (Llama 3)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlainLanguageCard;
