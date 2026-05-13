import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastContainer";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import CitationsPage from "./pages/CitationsPage";
import TemplatesPage from "./pages/TemplatesPage";
import AppLayout from "./components/AppLayout";
import type { AnalysisResponse } from "./types";
import { clearOldHistory } from "./utils/history";

// ─── Protected route ──────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--gray-bg)",
      }}>
        <div className="gold-spinner" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// ─── Inner app ────────────────────────────────────────────────────────────────
const InnerApp: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const handleReset = () => setAnalysisResult(null);

  // On first load: purge old-schema history, apply saved theme + font size
  useEffect(() => {
    clearOldHistory();

    // Apply saved theme
    const savedTheme = localStorage.getItem("lex_theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    // Apply saved font size
    const fontSizeMap: Record<string, string> = {
      small: "14px", medium: "16px", large: "18px",
    };
    const savedFont = localStorage.getItem("lex_font_size") || "medium";
    document.documentElement.style.setProperty(
      "--base-font-size",
      fontSizeMap[savedFont] ?? "16px",
    );
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected — Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout title="Upload & Analyze">
              <DashboardPage onResult={setAnalysisResult} />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Results */}
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            {analysisResult ? (
              <AppLayout title="Analysis Results">
                <ResultsPage data={analysisResult} onReset={handleReset} />
              </AppLayout>
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        }
      />

      {/* Protected — History */}
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppLayout title="History">
              <HistoryPage onSelectResult={setAnalysisResult} />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Settings */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout title="Settings">
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Citations */}
      <Route
        path="/citations"
        element={
          <ProtectedRoute>
            <AppLayout title="Citations">
              <CitationsPage onSelectResult={setAnalysisResult} />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Templates */}
      <Route
        path="/templates"
        element={
          <ProtectedRoute>
            <AppLayout title="Legal Templates">
              <TemplatesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Defaults */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <InnerApp />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
