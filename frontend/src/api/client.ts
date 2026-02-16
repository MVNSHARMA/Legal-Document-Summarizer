import axios from "axios";
import type { AnalysisResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function analyzeDocument(
  file: File,
  onUploadProgress?: (percent: number) => void
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post<AnalysisResponse>(`${API_BASE_URL}/api/analyze`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    },
    onUploadProgress: (event) => {
      if (!onUploadProgress || !event.total) return;
      const percent = Math.round((event.loaded * 100) / event.total);
      onUploadProgress(percent);
    }
  });

  return response.data;
}


