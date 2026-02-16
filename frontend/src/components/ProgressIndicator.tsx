import React from "react";

interface ProgressIndicatorProps {
  stage: "idle" | "uploading" | "analyzing";
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ stage }) => {
  if (stage === "idle") return null;

  const label =
    stage === "uploading"
      ? "Uploading document..."
      : "Running analysis pipeline (OCR, classification, NER, summarization)...";

  return (
    <div className="card subtle-card">
      <div className="stage-row">
        <div className="spinner" />
        <div>
          <div className="stage-label">{label}</div>
          <div className="stage-subtitle">
            This may take a few moments depending on document length and OCR complexity.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;


