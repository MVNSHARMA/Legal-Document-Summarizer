import React, { useState } from "react";
import Header from "./components/Header";
import UploadPage from "./components/UploadPage";
import ProgressIndicator from "./components/ProgressIndicator";
import ResultsDashboard from "./components/ResultsDashboard";
import { analyzeDocument } from "./api/client";
import type { AnalysisResponse } from "./types";

type Stage = "upload" | "uploading" | "analyzing" | "results";

const App: React.FC = () => {
  const [stage, setStage] = useState<Stage>("upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (file: File) => {
    setError(null);
    setStage("uploading");
    setUploadProgress(0);

    try {
      const data = await analyzeDocument(file, (percent) => {
        setUploadProgress(percent);
      });
      setStage("results");
      setAnalysisData(data);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to analyze document. Please ensure the backend is running and try again.");
      setStage("upload");
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setUploadProgress(0);
    setError(null);
    setStage("upload");
  };

  const pipelineStage: "idle" | "uploading" | "analyzing" =
    stage === "uploading" ? "uploading" : stage === "analyzing" ? "analyzing" : "idle";

  return (
    <div className="page">
      <Header />

      <main className="content">
        {stage === "results" && analysisData ? (
          <ResultsDashboard data={analysisData} onReset={handleReset} />
        ) : (
          <>
            <UploadPage
              onAnalyze={handleAnalyze}
              isUploading={stage === "uploading"}
              uploadProgress={uploadProgress}
              error={error}
            />
            <ProgressIndicator stage={pipelineStage} />
          </>
        )}
      </main>

      <footer className="footer">
        <span>
          This tool is for{" "}
          <strong>information and time-saving assistance only. It does not provide legal advice</strong>{" "}
          or predict outcomes.
        </span>
      </footer>
    </div>
  );
};

export default App;
