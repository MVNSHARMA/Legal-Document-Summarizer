import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Toast, ToastType } from "../hooks/useToast";

// ─── Context ──────────────────────────────────────────────────────────────────
interface ToastContextValue {
  addToast: (message: string, type: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => {
      // Max 3 at once — drop oldest if needed
      const next = [...prev, { id, message, type }];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastList toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// ─── Individual toast ─────────────────────────────────────────────────────────
const BORDER_COLOR: Record<ToastType, string> = {
  success: "#16a34a",
  error:   "#dc2626",
  info:    "#c9a84c",
};

const ICON: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
};

const ICON_COLOR: Record<ToastType, string> = {
  success: "#16a34a",
  error:   "#dc2626",
  info:    "#c9a84c",
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const [visible, setVisible] = useState(false);

  // Fade in on mount, auto-dismiss after 3 s
  useEffect(() => {
    const showTimer    = requestAnimationFrame(() => setVisible(true));
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300); // wait for fade-out
    }, 3000);

    return () => {
      cancelAnimationFrame(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        background: "#ffffff",
        borderRadius: 10,
        borderLeft: `4px solid ${BORDER_COLOR[toast.type]}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        minWidth: 260,
        maxWidth: 360,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(24px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: "auto",
      }}
    >
      <span style={{
        fontWeight: 700,
        fontSize: "0.9rem",
        color: ICON_COLOR[toast.type],
        flexShrink: 0,
        lineHeight: 1.4,
      }}>
        {ICON[toast.type]}
      </span>
      <span style={{ fontSize: "0.875rem", color: "#1a2a3a", lineHeight: 1.5, flex: 1 }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#8a9ab0",
          fontSize: "1rem",
          lineHeight: 1,
          padding: "0 2px",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};

// ─── Toast list (fixed bottom-right) ─────────────────────────────────────────
const ToastList: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({
  toasts,
  onRemove,
}) => {
  if (!toasts.length) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: "fixed",
        bottom: 56,   // above the disclaimer banner
        right: 20,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default ToastProvider;
