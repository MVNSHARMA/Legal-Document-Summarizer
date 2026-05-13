/**
 * ResultsDashboard.tsx — Legacy component, superseded by ResultsPage.tsx.
 * Kept to avoid import errors. Not rendered anywhere.
 */
import React from "react";
import type { AnalysisResponse } from "../types";

interface ResultsDashboardProps {
  data: AnalysisResponse;
  onReset: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ data, onReset }) => {
  return (
    <div>
      <p>{data.filename}</p>
      <button onClick={onReset}>Reset</button>
    </div>
  );
};

export default ResultsDashboard;
