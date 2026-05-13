import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHistory, HISTORY_UPDATED_EVENT } from "../utils/history";
import { getAllCitations } from "../utils/citations";

// ─── Icons ────────────────────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const ClockIcon = () => (
  <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const BookIcon = () => (
  <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const FileTextIcon = () => (
  <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const SettingsIcon = () => (
  <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Live history count — updates whenever lex_history_updated fires
  const [historyCount,  setHistoryCount]  = useState(() => getHistory().length);
  const [citationCount, setCitationCount] = useState(() => getAllCitations().length);

  useEffect(() => {
    const refresh = () => {
      setHistoryCount(getHistory().length);
      setCitationCount(getAllCitations().length);
    };
    window.addEventListener(HISTORY_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(HISTORY_UPDATED_EVENT, refresh);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = user ? getInitials(user.full_name || user.email) : "?";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          onClick={onClose}
          style={{
            display: "none",
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 99,
          }}
          className="sidebar-overlay"
          aria-hidden="true"
        />
      )}

      <nav className={`sidebar${isOpen ? " open" : ""}`} aria-label="Main navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-row">
            <span className="sidebar-logo-icon" aria-hidden="true">⚖️</span>
            <span className="sidebar-logo-name">LexAnalyze</span>
          </div>
          <div className="sidebar-logo-sub">Legal Document Intelligence</div>
        </div>

        {/* Nav links */}
        <div className="sidebar-nav" role="list">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`}
            role="listitem"
            onClick={onClose}
          >
            <UploadIcon />
            Upload &amp; Analyze
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`}
            role="listitem"
            onClick={onClose}
          >
            <ClockIcon />
            History
            {historyCount > 0 && (
              <span
                className="sidebar-nav-badge"
                style={{
                  marginLeft: "auto",
                  background: "rgba(201,168,76,0.18)",
                  color: "var(--gold)",
                  border: "1px solid rgba(201,168,76,0.35)",
                  borderRadius: 999,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "1px 7px",
                  minWidth: 20,
                  textAlign: "center",
                }}
                aria-label={`${historyCount} documents in history`}
              >
                {historyCount > 99 ? "99+" : historyCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/templates"
            className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`}
            role="listitem"
            onClick={onClose}
          >
            <FileTextIcon />
            Templates
          </NavLink>

          <NavLink
            to="/citations"
            className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`}
            role="listitem"
            onClick={onClose}
          >
            <BookIcon />
            Citations
            {citationCount > 0 && (
              <span
                className="sidebar-nav-badge"
                style={{
                  marginLeft: "auto",
                  background: "rgba(201,168,76,0.18)",
                  color: "var(--gold)",
                  border: "1px solid rgba(201,168,76,0.35)",
                  borderRadius: 999,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "1px 7px",
                  minWidth: 20,
                  textAlign: "center",
                }}
                aria-label={`${citationCount} citations`}
              >
                {citationCount > 99 ? "99+" : citationCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`}
            role="listitem"
            onClick={onClose}
          >
            <SettingsIcon />
            Settings
          </NavLink>
        </div>

        {/* Dictionary shortcut */}
        <div style={{ padding: "8px 20px 4px" }}>
          <button
            onClick={() => {
              // Dispatch a custom event that ResultsPage listens to
              window.dispatchEvent(new CustomEvent("lex_open_dictionary"));
              if (onClose) onClose();
            }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(201,168,76,0.65)", fontSize: "0.72rem",
              fontWeight: 600, padding: 0, letterSpacing: "0.03em",
              display: "flex", alignItems: "center", gap: 5,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(201,168,76,0.65)")}
            aria-label="Open Legal Dictionary"
          >
            📖 Dictionary
          </button>
        </div>

        {/* User footer */}
        <div className="sidebar-footer">          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.full_name || "User"}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} aria-label="Sign out">
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
