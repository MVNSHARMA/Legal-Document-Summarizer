import React, { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface DocumentChatProps {
  isOpen: boolean;
  onClose: () => void;
  // Case overview
  complainant: string;
  accused: string;
  court: string;
  caseNumber: string;
  documentSubtype: string;
  judges: string[];
  lawyers: string[];
  // Case details
  whatHappened: string;
  crimeOrIssue: string;
  sections: string[];
  judgment: string;
  judgmentDate: string;
  judgmentOutcome: string;
  penaltyOrRelief: string;
}

// ─── Welcome message ──────────────────────────────────────────────────────────
const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "👋 I've read this document. You can ask me anything about it!\n\nTry asking:\n• What was the final judgment?\n• Can this decision be appealed?\n• What does the main section mean in this case?\n• What are my rights here?\n• Explain this in simpler terms",
  timestamp: new Date(),
};

// ─── Suggested questions ──────────────────────────────────────────────────────
function getSuggestedQuestions(
  judgmentOutcome: string,
  sections: string[],
  documentSubtype: string,
): string[] {
  const qs: string[] = ["What was the final judgment?", "Can this decision be appealed?"];

  if (judgmentOutcome === "Convicted")      qs.push("What is the punishment given?");
  if (judgmentOutcome === "Bail Granted")   qs.push("What are the bail conditions?");
  if (judgmentOutcome === "Allowed")        qs.push("What relief was granted?");
  if (judgmentOutcome === "Bail Rejected")  qs.push("Why was bail rejected?");
  if (judgmentOutcome === "Acquitted")      qs.push("Why was the accused acquitted?");

  const hasIPC = sections.some((s) => s.toUpperCase().includes("IPC"));
  if (hasIPC) qs.push("What do these IPC sections mean?");

  if (documentSubtype.toLowerCase().includes("pil")) {
    qs.push("How does this judgment affect common people?");
  }

  qs.push("Explain this case in simple terms");

  // Deduplicate and cap at 5
  return [...new Set(qs)].slice(0, 5);
}

// ─── Format timestamp ─────────────────────────────────────────────────────────
function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
const TypingIndicator: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--gold)",
            animation: `chatDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            display: "inline-block",
          }}
        />
      ))}
    </div>
    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
      Analyzing your question…
    </span>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const DocumentChat: React.FC<DocumentChatProps> = ({
  isOpen, onClose,
  complainant, accused, court, caseNumber, documentSubtype,
  judges, lawyers,
  whatHappened, crimeOrIssue, sections, judgment,
  judgmentDate, judgmentOutcome, penaltyOrRelief,
}) => {
  const [messages,  setMessages]  = useState<ChatMessage[]>([WELCOME]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [hasNew,    setHasNew]    = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  const suggestedQs = getSuggestedQuestions(judgmentOutcome, sections, documentSubtype);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasNew(false);
    }
  }, [isOpen]);

  // Clear history when closed
  const handleClose = () => {
    setMessages([WELCOME]);
    setInput("");
    setHasNew(false);
    onClose();
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id:        `u-${Date.now()}`,
      role:      "user",
      content:   trimmed,
      timestamp: new Date(),
    };

    // Keep max 20 messages (excluding welcome)
    setMessages((prev) => {
      const withoutWelcome = prev.filter((m) => m.id !== "welcome");
      const capped = withoutWelcome.slice(-18);
      return [...(prev[0]?.id === "welcome" ? [prev[0]] : []), ...capped, userMsg];
    });
    setInput("");
    setLoading(true);

    const apiKey = import.meta.env.VITE_GROQ_API_KEY ?? "";

    // Build chat history for context (last 6 non-welcome messages)
    const historyForApi = messages
      .filter((m) => m.id !== "welcome")
      .slice(-6)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const systemPrompt = `You are a helpful legal assistant. You have complete information about this specific legal case.
Answer questions ONLY based on the information below.
Be direct and confident — if the information is present below, state it clearly.

=== COMPLETE CASE INFORMATION ===

CASE TITLE: ${complainant} vs ${accused}
COURT: ${court}
CASE NUMBER: ${caseNumber}
DOCUMENT TYPE: ${documentSubtype}

JUDGES (who heard this case): ${judges && judges.length > 0 ? judges.join(", ") : "Not identified in document"}

LAWYERS/ADVOCATES (who appeared):
${lawyers && lawyers.length > 0 ? lawyers.join(", ") : "Not identified in document"}

WHAT HAPPENED (Facts):
${whatHappened}

CRIME / LEGAL ISSUE:
${crimeOrIssue}

SECTIONS INVOLVED:
${sections && sections.length > 0 ? sections.join(", ") : "None identified"}

JUDGMENT (Court's Decision):
${judgment}

JUDGMENT DATE: ${judgmentDate}
JUDGMENT OUTCOME: ${judgmentOutcome}

PENALTY / RELIEF GRANTED:
${penaltyOrRelief}

=== YOUR RULES ===
1. If someone asks about judges — look at JUDGES above and answer directly with the names
2. If someone asks about lawyers — look at LAWYERS above
3. If someone asks about the judgment — use JUDGMENT above
4. Never say "the document doesn't mention" if the information IS present in the case information above
5. Use simple plain English
6. Keep answers under 150 words
7. End with: "⚖ Note: For legal advice, consult a lawyer."
8. If truly not in the above info, say: "This specific detail was not extracted from the document."`;

    try {
      if (!apiKey) throw new Error("VITE_GROQ_API_KEY is not set in frontend/.env");

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:      "llama-3.1-8b-instant",
          max_tokens: 800,
          messages: [
            { role: "system", content: systemPrompt },
            ...historyForApi,
            { role: "user", content: trimmed },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: { message?: string } })?.error?.message ??
            `Groq API error ${res.status}`,
        );
      }

      const json = await res.json() as {
        choices: Array<{ message: { content: string } }>;
      };
      const reply = json.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

      const aiMsg: ChatMessage = {
        id:        `a-${Date.now()}`,
        role:      "assistant",
        content:   reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (!isOpen) setHasNew(true);

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to get response.";
      setMessages((prev) => [
        ...prev,
        {
          id:        `err-${Date.now()}`,
          role:      "assistant",
          content:   `⚠ ${errMsg}\n\n⚖ Note: This is for informational purposes only. Please consult a qualified lawyer for legal advice.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Keyframe for typing dots */}
      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Backdrop (mobile) */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 800,
          background: "rgba(0,0,0,0.3)",
          display: "none",
        }}
        className="chat-backdrop"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Chat with Document"
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: "min(380px, 100vw)",
          zIndex: 900,
          background: "var(--gray-bg)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: "var(--navy)", padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.1rem" }}>💬</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>
                Ask About This Case
              </p>
              <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(201,168,76,0.7)" }}>
                Powered by Groq AI (Llama 3)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "1.2rem", lineHeight: 1, padding: "2px 4px" }}
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "16px 14px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {/* AI label */}
              {msg.role === "assistant" && (
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--gold)", marginBottom: 3, paddingLeft: 2 }}>
                  LexAnalyze AI
                </span>
              )}

              {/* Bubble */}
              <div style={{
                maxWidth: "88%",
                padding: "10px 13px",
                borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: msg.role === "user" ? "var(--navy)" : "#fff",
                color: msg.role === "user" ? "#fff" : "var(--text-dark)",
                borderLeft: msg.role === "assistant" ? "3px solid var(--gold)" : "none",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}>
                {msg.content}
              </div>

              {/* Timestamp */}
              <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 3, paddingLeft: msg.role === "assistant" ? 2 : 0 }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ alignSelf: "flex-start" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--gold)", marginBottom: 3, display: "block", paddingLeft: 2 }}>
                LexAnalyze AI
              </span>
              <div style={{
                background: "#fff", borderLeft: "3px solid var(--gold)",
                borderRadius: "14px 14px 14px 4px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}>
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggested questions (shown only when just welcome message) ── */}
        {messages.length === 1 && messages[0].id === "welcome" && (
          <div style={{
            padding: "0 14px 10px",
            display: "flex", flexWrap: "wrap", gap: 6,
            flexShrink: 0,
          }}>
            {suggestedQs.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                style={{
                  padding: "4px 11px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600,
                  background: "transparent", color: "#92700a",
                  border: "1.5px solid rgba(201,168,76,0.5)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* ── Input bar ── */}
        <div style={{
          padding: "10px 14px",
          background: "#fff",
          borderTop: "0.5px solid var(--gray-border)",
          display: "flex", gap: 8, alignItems: "center",
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this case…"
            disabled={loading}
            style={{
              flex: 1, padding: "9px 12px",
              border: "1.5px solid var(--gray-border)", borderRadius: 8,
              fontSize: "0.875rem", outline: "none",
              background: loading ? "var(--gray-bg)" : "#fff",
              color: "var(--text-dark)",
            }}
            aria-label="Type your question"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              padding: "9px 14px", borderRadius: 8,
              background: loading || !input.trim() ? "var(--gray-border)" : "var(--navy)",
              color: loading || !input.trim() ? "var(--text-muted)" : "var(--gold)",
              border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "0.82rem", flexShrink: 0,
              transition: "all 0.15s",
            }}
            aria-label="Send message"
          >
            Send
          </button>
        </div>

        {/* Disclaimer */}
        <div style={{
          padding: "6px 14px 8px",
          fontSize: "0.62rem", color: "var(--text-muted)",
          textAlign: "center", background: "#fff",
          borderTop: "0.5px solid var(--gray-border)",
          flexShrink: 0,
        }}>
          For informational use only · Not legal advice
        </div>
      </div>

      {/* Mobile: full-screen override via inline style + CSS */}
      <style>{`
        @media (max-width: 768px) {
          .chat-backdrop { display: block !important; }
          [role="dialog"][aria-label="Chat with Document"] {
            top: 0 !important; left: 0 !important;
            right: 0 !important; bottom: 0 !important;
            width: 100vw !important;
          }
        }
      `}</style>
    </>
  );
};

export { DocumentChat };
export type { ChatMessage };
export default DocumentChat;
