import React from "react";

interface State {
  hasError: boolean;
  message: string;
}

interface Props {
  children: React.ReactNode;
}

/**
 * Catches any unhandled JS error in the subtree and shows a friendly
 * recovery screen instead of a blank page.
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // In production you'd send this to an error-tracking service
    void error;
    void info;
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDashboard = () => {
    this.setState({ hasError: false, message: "" });
    window.location.href = "/dashboard";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6f9",
          padding: "24px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: "48px 40px",
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            border: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          {/* Icon */}
          <div style={{ marginBottom: 20 }}>
            <svg
              width="52"
              height="52"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ display: "inline-block" }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#0f2744",
              marginBottom: 8,
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: "0.9rem",
              color: "#4a5568",
              marginBottom: 8,
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Your history is safe.
          </p>

          {this.state.message && (
            <p
              style={{
                fontSize: "0.78rem",
                color: "#8a9ab0",
                background: "#f4f6f9",
                border: "0.5px solid #e2e8f0",
                borderRadius: 6,
                padding: "8px 12px",
                marginBottom: 24,
                fontFamily: "monospace",
                wordBreak: "break-word",
              }}
            >
              {this.state.message}
            </p>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: "10px 24px",
                background: "#0f2744",
                color: "#c9a84c",
                border: "1.5px solid #0f2744",
                borderRadius: 8,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleDashboard}
              style={{
                padding: "10px 24px",
                background: "transparent",
                color: "#0f2744",
                border: "1.5px solid #c9a84c",
                borderRadius: 8,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
