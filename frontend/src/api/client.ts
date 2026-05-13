import axios from "axios";
import type { AnalysisResponse } from "../types";
import { getToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://lexanalyze-backend.onrender.com";
console.log("[Client] API_BASE_URL:", API_BASE_URL);

export async function analyzeDocument(
  file: File,
  onUploadProgress?: (percent: number) => void
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const token = getToken();

  const response = await axios.post<AnalysisResponse>(
    `${API_BASE_URL}/api/analyze`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        const percent = Math.round((event.loaded * 100) / event.total);
        onUploadProgress(percent);
      },
    }
  );

  return response.data;
}
