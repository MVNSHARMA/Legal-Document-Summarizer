import React, { useEffect, useState } from "react";

const SESSION_KEY = "lex_disclaimer_dismissed";

const Disclaimer: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show unless dismissed this session
    const dismissed = sessionStorage.getItem(SESSION_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Legal disclaimer"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: 40,
        background: "var(--navy)",
        borderTop: "1px solid rgba(201,168,76,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 48px 0 16px",
        gap: 8,
      }}
    >
      <span style={{
        fontSize: "0.75rem",
        color: "var(--gold)",
        textAlign: "center",
        lineHeight: 1.3,
        letterSpacing: "0.01em",
      }}>
        ⚖ LexAnalyze is a decision-support tool only. It does not provide legal advice.
        Always consult a qualified legal professional.
      </span>

      <button
        onClick={dismiss}
        aria-label="Dismiss disclaimer"
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(201,168,76,0.6)",
          fontSize: "1rem",
          lineHeight: 1,
          padding: "2px 4px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(201,168,76,0.6)")}
      >
        ×
      </button>
    </div>
  );
};

export default Disclaimer;
