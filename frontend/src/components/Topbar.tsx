import React from "react";
import { useAuth } from "../context/AuthContext";

const HamburgerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ title, onMenuClick }) => {
  const { user } = useAuth();
  const initials = user ? getInitials(user.full_name || user.email) : "?";

  return (
    <header className="topbar" role="banner">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="topbar-hamburger"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
        >
          <HamburgerIcon />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <span className="topbar-user-name">{user?.full_name || user?.email}</span>
        <div className="topbar-avatar" aria-hidden="true">{initials}</div>
      </div>
    </header>
  );
};

export default Topbar;
