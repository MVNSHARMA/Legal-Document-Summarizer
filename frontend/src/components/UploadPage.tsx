import React, { useState, ChangeEvent, FormEvent } from "react";

interface UploadPageProps {
  onAnalyze: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  error?: string | null;
}

const UploadPage: React.FC<UploadPageProps> = ({
  onAnalyze,
  isUploading,
  uploadProgress,
  error
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;
    await onAnalyze(selectedFile);
  };

  return (
    <div className="card">
      <h2 className="card-title">Upload Legal Document (PDF)</h2>
      <p className="card-subtitle">
        This tool helps you quickly understand long legal documents. It does <strong>not</strong>{" "}
        provide legal advice or predict judgments.
      </p>

      <form onSubmit={handleSubmit} className="upload-form">
        <label className="file-input-label">
          <span>Select PDF file</span>
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
        </label>

        {selectedFile && (
          <div className="file-info">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? "Uploading..." : "Analyze Document"}
        </button>

        {isUploading && (
          <div className="progress-container">
            <div className="progress-label">Upload progress</div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <div className="progress-percent">{uploadProgress}%</div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
      </form>
    </div>
  );
};

export default UploadPage;


