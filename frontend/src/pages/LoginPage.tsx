import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { googleLogin, loginUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";

// ─── Google icon (inline SVG, no extra dep) ───────────────────────────────────
const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

// ─── Eye icons ────────────────────────────────────────────────────────────────
const EyeIcon: React.FC<{ open: boolean }> = ({ open }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

// ─── Component ────────────────────────────────────────────────────────────────
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Google OAuth callback: /login?token=...
  // Uses window.location.search directly so it works regardless of router state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      login(token).then(() => {
        navigate("/dashboard", { replace: true });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Already logged in (e.g. returning with a stored session)
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { access_token } = await loginUser(email, password);
      await login(access_token);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Sign in failed. Please check your credentials.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* ── Left sidebar ── */}
      <aside style={styles.sidebar} className="auth-sidebar">
        <div style={styles.sidebarInner}>
          <div style={styles.logoRow}>
            <span style={styles.logoIcon} aria-hidden="true">⚖️</span>
            <span style={styles.logoText}>LexAnalyze</span>
          </div>
          <p style={styles.tagline}>Legal Document Intelligence</p>
          <p style={styles.sidebarSub}>
            AI-powered analysis for legal professionals. Understand complex documents in minutes.
          </p>
        </div>
        <p style={styles.disclaimer}>
          For informational use only. Does not constitute legal advice.
        </p>
      </aside>

      {/* ── Right panel ── */}
      <main style={styles.panel}>
        <div style={styles.formBox}>
          <h1 style={styles.heading}>Welcome back</h1>
          <p style={styles.subtext}>Sign in to your account</p>

          <form onSubmit={handleSubmit} noValidate style={styles.form}>
            {/* Email */}
            <div style={styles.fieldGroup}>
              <label htmlFor="email" style={styles.label}>Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label htmlFor="password" style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...styles.input, paddingRight: "2.8rem" }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && <div style={styles.errorBanner} role="alert">{error}</div>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={isSubmitting ? { ...styles.submitBtn, opacity: 0.7 } : styles.submitBtn}
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div style={styles.dividerRow}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine} />
          </div>

          {/* Google */}
          <button type="button" onClick={googleLogin} style={styles.googleBtn}>
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Register link */}
          <p style={styles.switchText}>
            Don't have an account?{" "}
            <Link to="/register" style={styles.link}>Register</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const NAVY = "#0f2744";
const GOLD = "#c9a84c";
const WHITE = "#ffffff";
const LIGHT_GRAY = "#f4f6f9";
const BORDER = "#d1d9e6";
const TEXT_DARK = "#1a2a3a";
const TEXT_MID = "#4a5568";

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "Georgia, 'Times New Roman', serif",
    background: LIGHT_GRAY,
  },
  sidebar: {
    width: "38%",
    minWidth: 280,
    background: NAVY,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "3rem 2.5rem",
    color: WHITE,
  },
  sidebarInner: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  logoIcon: {
    fontSize: "2rem",
  },
  logoText: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: GOLD,
    letterSpacing: "0.04em",
  },
  tagline: {
    fontSize: "1.35rem",
    fontWeight: 600,
    color: GOLD,
    margin: 0,
    lineHeight: 1.3,
  },
  sidebarSub: {
    fontSize: "0.95rem",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.7,
    margin: 0,
  },
  disclaimer: {
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.4)",
    margin: 0,
    lineHeight: 1.5,
  },
  panel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1.5rem",
    background: WHITE,
  },
  formBox: {
    width: "100%",
    maxWidth: 420,
  },
  heading: {
    fontSize: "1.9rem",
    fontWeight: 700,
    color: TEXT_DARK,
    margin: "0 0 0.35rem",
  },
  subtext: {
    fontSize: "0.95rem",
    color: TEXT_MID,
    margin: "0 0 2rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: TEXT_DARK,
    fontFamily: "system-ui, sans-serif",
  },
  input: {
    width: "100%",
    padding: "0.7rem 0.9rem",
    fontSize: "0.95rem",
    border: `1.5px solid ${BORDER}`,
    borderRadius: "0.5rem",
    outline: "none",
    color: TEXT_DARK,
    background: WHITE,
    fontFamily: "system-ui, sans-serif",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  passwordWrapper: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: "0.75rem",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: TEXT_MID,
    display: "flex",
    alignItems: "center",
    padding: 0,
  },
  errorBanner: {
    padding: "0.65rem 0.85rem",
    borderRadius: "0.5rem",
    background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.35)",
    color: "#b91c1c",
    fontSize: "0.85rem",
    fontFamily: "system-ui, sans-serif",
  },
  submitBtn: {
    padding: "0.8rem",
    background: NAVY,
    color: GOLD,
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
    fontFamily: "Georgia, serif",
    transition: "opacity 0.15s",
    marginTop: "0.25rem",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    margin: "1.5rem 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: BORDER,
    display: "block",
  },
  dividerText: {
    fontSize: "0.8rem",
    color: TEXT_MID,
    fontFamily: "system-ui, sans-serif",
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.65rem",
    padding: "0.75rem",
    background: WHITE,
    border: `1.5px solid ${BORDER}`,
    borderRadius: "0.5rem",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: TEXT_DARK,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    transition: "background 0.15s",
  },
  switchText: {
    textAlign: "center",
    fontSize: "0.88rem",
    color: TEXT_MID,
    marginTop: "1.5rem",
    fontFamily: "system-ui, sans-serif",
  },
  link: {
    color: NAVY,
    fontWeight: 700,
    textDecoration: "none",
    borderBottom: `1px solid ${GOLD}`,
  },
};

export default LoginPage;
