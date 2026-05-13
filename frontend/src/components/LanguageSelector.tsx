import React, { useRef } from "react";
import { INDIAN_LANGUAGES, type Language } from "../data/languages";

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (lang: Language) => void;
  isTranslating: boolean;
  translateProgress: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  isTranslating,
  translateProgress,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Label */}
      <p style={{
        fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.07em", color: "var(--text-muted)",
        marginBottom: 8, marginTop: 0,
      }}>
        🌐 Language
      </p>

      {/* Scrollable row + arrows */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          style={arrowBtn}
          aria-label="Scroll languages left"
        >
          ‹
        </button>

        {/* Language buttons */}
        <div
          ref={scrollRef}
          style={{
            display: "flex", gap: 6, overflowX: "auto",
            scrollbarWidth: "none", flex: 1,
            padding: "2px 0",
          }}
        >
          {INDIAN_LANGUAGES.map((lang) => {
            const active = selectedLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => !isTranslating && onLanguageChange(lang)}
                disabled={isTranslating && !active}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 999, flexShrink: 0,
                  fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                  cursor: isTranslating && !active ? "not-allowed" : "pointer",
                  border: active ? "1.5px solid var(--navy)" : "1.5px solid var(--gray-border)",
                  background: active ? "var(--navy)" : "#fff",
                  color: active ? "var(--gold)" : "var(--text-mid)",
                  opacity: isTranslating && !active ? 0.5 : 1,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
                aria-pressed={active}
                aria-label={`Translate to ${lang.name}`}
              >
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          style={arrowBtn}
          aria-label="Scroll languages right"
        >
          ›
        </button>
      </div>

      {/* Translation progress */}
      {isTranslating && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 10, padding: "8px 14px",
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.25)",
          borderRadius: 8,
        }}>
          {/* Gold spinner */}
          <div style={{
            width: 14, height: 14, borderRadius: "50%",
            border: "2px solid rgba(201,168,76,0.3)",
            borderTopColor: "var(--gold)",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "0.8rem", color: "var(--text-mid)" }}>
            {translateProgress
              ? `Translating: ${translateProgress}…`
              : "Preparing translation…"}
          </span>
        </div>
      )}
    </div>
  );
};

const arrowBtn: React.CSSProperties = {
  background: "#fff",
  border: "1.5px solid var(--gray-border)",
  borderRadius: 6,
  width: 28, height: 28,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
  fontSize: "1.1rem",
  color: "var(--text-mid)",
  flexShrink: 0,
  lineHeight: 1,
};

export default LanguageSelector;
