import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import {
  clearToken,
  deleteAccount,
  getToken,
  updatePassword,
  updateProfile,
} from "../api/auth";
import { clearHistory } from "../utils/history";

// ─── Shared sub-components ────────────────────────────────────────────────────

const EyeIcon: React.FC<{ open: boolean }> = ({ open }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

// ─── Segmented control ────────────────────────────────────────────────────────
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div style={{
      display: "inline-flex", borderRadius: 8,
      border: "1.5px solid var(--gray-border)", overflow: "hidden",
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: "7px 18px", fontSize: "0.85rem", fontWeight: 600,
            border: "none", cursor: "pointer", transition: "all 0.15s",
            background: value === opt.value ? "var(--navy)" : "var(--white)",
            color: value === opt.value ? "var(--gold)" : "var(--text-mid)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Confirmation modal ───────────────────────────────────────────────────────
interface ConfirmModalProps {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDanger?: boolean;
  confirmDisabled?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title, children, onCancel, onConfirm, confirmLabel, confirmDanger, confirmDisabled,
}) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16,
  }}>
    <div style={{
      background: "var(--white)", borderRadius: 14, padding: "28px 32px",
      maxWidth: 420, width: "100%",
      boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: "1.05rem", fontWeight: 700, color: "var(--navy)" }}>
        {title}
      </h3>
      <div style={{ marginBottom: 24 }}>{children}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button
          className={`btn btn-sm ${confirmDanger ? "btn-danger" : "btn-primary"}`}
          style={confirmDanger ? { background: "#dc2626", color: "#fff", border: "none" } : undefined}
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── Card wrapper ─────────────────────────────────────────────────────────────
const SettingsCard: React.FC<{
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ title, danger, children }) => (
  <div style={{
    background: "var(--white)", borderRadius: 12,
    border: danger ? "1px solid #dc2626" : "0.5px solid rgba(0,0,0,0.1)",
    padding: "24px 28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: 20,
  }}>
    <h2 style={{
      fontSize: "1rem", fontWeight: 700,
      color: danger ? "#dc2626" : "var(--navy)",
      marginBottom: 20, marginTop: 0,
    }}>
      {title}
    </h2>
    {children}
  </div>
);

// ─── Input helpers ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: "0.9rem",
  border: "1.5px solid var(--gray-border)", borderRadius: 8,
  outline: "none", color: "var(--text-dark)", background: "var(--white)",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dark)",
  display: "block", marginBottom: 5,
};

const fieldStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4, marginBottom: 16,
};

// ─── CARD 1: Profile ──────────────────────────────────────────────────────────
const ProfileCard: React.FC = () => {
  const { user, token, setUser } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateProfile(token, fullName);
      setUser(updated);
      showToast("Profile updated", "success");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Failed to update profile.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title="Profile Information">
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={inputStyle}
          placeholder="Your full name"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={user?.email ?? ""}
          disabled
          style={{ ...inputStyle, background: "var(--gray-bg)", color: "var(--text-muted)", cursor: "not-allowed" }}
        />
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
          <LockIcon /> Email cannot be changed
        </span>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving || !fullName.trim()}
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </SettingsCard>
  );
};

// ─── CARD 2: Change Password ──────────────────────────────────────────────────
const PasswordCard: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showC, setShowC]       = useState(false);
  const [showN, setShowN]       = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const handleUpdate = async () => {
    setError(null);
    if (next.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setError("New passwords do not match."); return; }
    if (!token) return;
    setSaving(true);
    try {
      await updatePassword(token, current, next);
      showToast("Password updated successfully", "success");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Failed to update password.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const pwField = (
    id: string, label: string, value: string, onChange: (v: string) => void,
    show: boolean, setShow: (v: boolean) => void,
  ) => (
    <div style={fieldStyle}>
      <label style={labelStyle} htmlFor={id}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={id} type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, paddingRight: "2.5rem" }}
          placeholder="••••••••"
        />
        <button
          type="button" onClick={() => setShow(!show)}
          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
          aria-label={show ? "Hide" : "Show"}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );

  return (
    <SettingsCard title="Change Password">
      {pwField("curPw",  "Current Password",     current, setCurrent, showC,  setShowC)}
      {pwField("newPw",  "New Password",          next,    setNext,    showN,  setShowN)}
      {pwField("confPw", "Confirm New Password",  confirm, setConfirm, showCf, setShowCf)}

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)", color: "#b91c1c", fontSize: "0.82rem", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleUpdate}
        disabled={saving || !current || !next || !confirm}
      >
        {saving ? "Updating…" : "Update Password"}
      </button>
    </SettingsCard>
  );
};

// ─── CARD 3: Appearance ───────────────────────────────────────────────────────
type ThemeOption    = "light" | "dark";
type FontSizeOption = "small" | "medium" | "large";

const FONT_SIZE_MAP: Record<FontSizeOption, string> = {
  small: "14px", medium: "16px", large: "18px",
};

function applyTheme(theme: ThemeOption) {
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
  localStorage.setItem("lex_theme", theme);
}

function applyFontSize(size: FontSizeOption) {
  document.documentElement.style.setProperty("--base-font-size", FONT_SIZE_MAP[size]);
  localStorage.setItem("lex_font_size", size);
}

const AppearanceCard: React.FC = () => {
  const [theme, setTheme]       = useState<ThemeOption>(() => (localStorage.getItem("lex_theme") as ThemeOption) || "light");
  const [fontSize, setFontSize] = useState<FontSizeOption>(() => (localStorage.getItem("lex_font_size") as FontSizeOption) || "medium");

  const handleTheme = (v: ThemeOption) => { setTheme(v); applyTheme(v); };
  const handleFont  = (v: FontSizeOption) => { setFontSize(v); applyFontSize(v); };

  return (
    <SettingsCard title="Appearance">
      <div style={{ marginBottom: 20 }}>
        <p style={{ ...labelStyle, marginBottom: 10 }}>Theme</p>
        <SegmentedControl
          options={[{ value: "light", label: "☀ Light Mode" }, { value: "dark", label: "🌙 Dark Mode" }]}
          value={theme}
          onChange={handleTheme}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <p style={{ ...labelStyle, marginBottom: 10 }}>Font Size</p>
        <SegmentedControl
          options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]}
          value={fontSize}
          onChange={handleFont}
        />
      </div>

      {/* Live preview */}
      <div style={{
        border: "1px solid var(--gray-border)", borderRadius: 10,
        padding: "16px 20px", background: "var(--gray-bg)",
      }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 10 }}>
          Preview
        </p>
        <div style={{ background: "var(--white)", borderRadius: 8, padding: "14px 16px", border: "0.5px solid rgba(0,0,0,0.08)" }}>
          <p style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 4, fontSize: FONT_SIZE_MAP[fontSize] }}>
            Legal Document Analysis
          </p>
          <p style={{ color: "var(--text-mid)", fontSize: `calc(${FONT_SIZE_MAP[fontSize]} - 2px)`, lineHeight: 1.6 }}>
            This is how your text will appear across the application with the current font size setting.
          </p>
          <span style={{ display: "inline-block", marginTop: 8, padding: "3px 10px", borderRadius: 999, background: "rgba(201,168,76,0.15)", color: "#92700a", border: "1px solid rgba(201,168,76,0.4)", fontSize: "0.72rem", fontWeight: 600 }}>
            Sample Badge
          </span>
        </div>
      </div>
    </SettingsCard>
  );
};

// ─── CARD 4: Danger Zone ──────────────────────────────────────────────────────
const DangerZoneCard: React.FC = () => {
  const { token, logout } = useAuth();
  const { showToast }     = useToast();
  const navigate          = useNavigate();

  const [showClearModal,  setShowClearModal]  = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm,   setDeleteConfirm]   = useState("");
  const [deleting,        setDeleting]        = useState(false);

  const handleClearHistory = () => {
    clearHistory();
    setShowClearModal(false);
    showToast("History cleared", "info");
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteAccount(token);
      clearToken();
      clearHistory();
      logout();
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Failed to delete account.";
      showToast(msg, "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <SettingsCard title="Danger Zone" danger>
        {/* Clear History */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingBottom: 20, borderBottom: "1px solid var(--gray-border)", marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-dark)", margin: "0 0 4px", fontSize: "0.9rem" }}>
              Clear Analysis History
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
              Permanently delete all your analyzed documents from history.
            </p>
          </div>
          <button
            className="btn btn-danger btn-sm"
            style={{ flexShrink: 0 }}
            onClick={() => setShowClearModal(true)}
          >
            Clear History
          </button>
        </div>

        {/* Delete Account */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontWeight: 600, color: "#dc2626", margin: "0 0 4px", fontSize: "0.9rem" }}>
              Delete Account
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
              Permanently delete your account and all data. This cannot be undone.
            </p>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: "#dc2626", color: "#fff", border: "none", flexShrink: 0 }}
            onClick={() => { setDeleteConfirm(""); setShowDeleteModal(true); }}
          >
            Delete Account
          </button>
        </div>
      </SettingsCard>

      {/* Clear History Modal */}
      {showClearModal && (
        <ConfirmModal
          title="Clear All History?"
          onCancel={() => setShowClearModal(false)}
          onConfirm={handleClearHistory}
          confirmLabel="Yes, Clear History"
          confirmDanger
        >
          <p style={{ color: "var(--text-mid)", fontSize: "0.875rem", margin: 0 }}>
            This will permanently delete all your analyzed documents from history. This cannot be undone.
          </p>
        </ConfirmModal>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Your Account?"
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          confirmLabel={deleting ? "Deleting…" : "Delete My Account"}
          confirmDanger
          confirmDisabled={deleteConfirm !== "DELETE" || deleting}
        >
          <p style={{ color: "var(--text-mid)", fontSize: "0.875rem", marginBottom: 14 }}>
            This will permanently delete your account and all associated data. Type <strong>DELETE</strong> to confirm.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE to confirm"
            style={{ ...inputStyle, borderColor: deleteConfirm === "DELETE" ? "#dc2626" : undefined }}
            autoFocus
          />
        </ConfirmModal>
      )}
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const SettingsPage: React.FC = () => (
  <div style={{ maxWidth: 640 }}>
    <ProfileCard />
    <PasswordCard />
    <AppearanceCard />
    <DangerZoneCard />
  </div>
);

export default SettingsPage;
