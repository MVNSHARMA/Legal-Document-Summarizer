## Legal Document Analyzer & Intelligent Case Summarizer

This is a reference implementation of a **production-style full-stack web app** that helps lawyers quickly understand long legal documents by analyzing uploaded PDFs and generating structured, section-wise summaries with legal intelligence features.

The system is a **decision-support and time-saving tool only**. It does **NOT** provide legal advice or predict judgments.

### High-Level Architecture

- **Backend**: Python + FastAPI
  - Modules: OCR, text extraction, preprocessing, document type classifier, section detector, summarization engine, NER, legal citation extractor, similarity engine.
  - Exposes REST APIs for upload, analysis, summaries, entities, citations, and similar cases.
- **Frontend**: React (Vite) SPA
  - Pages/components: Upload page, analysis progress, results dashboard.

### Backend: Setup & Run

```bash
cd "legel text analyser"/backend

# (Recommended) create & activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # On Windows: .venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt

# (Optional but recommended) download spaCy model
python -m spacy download en_core_web_sm

# Run the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`. Interactive API docs are at `http://localhost:8000/docs`.

### Frontend: Setup & Run

```bash
cd "legel text analyser"/frontend

npm install
npm run dev
```

Frontend dev server will typically run at `http://localhost:5173` (Vite default). It expects the backend at `http://localhost:8000` by default.

### How the Backend Works (Pipeline Overview)

1. **Upload**  
   - Frontend sends a `multipart/form-data` POST request with a PDF file to `/api/analyze`.
2. **Text Extraction & OCR**  
   - `pdfplumber` first tries to extract text directly from the PDF.  
   - If very little text is found (likely a scanned PDF), the system falls back to Tesseract OCR (`pdf2image` + `pytesseract`) to read text from page images.
3. **Preprocessing**  
   - The `clean_extracted_text` function removes page numbers, repeated headers/footers, and collapses excess blank lines.
4. **Document Type Detection**  
   - `classify_document_type` uses keyword and structural cues (e.g., “IN THE HIGH COURT OF…”, “THIS AGREEMENT…”) to label the document as Court Judgment, Contract, FIR/Notice, or Other.
5. **Section Identification**  
   - `detect_sections` scans for heading patterns (e.g., “Facts of the Case”, “Issues”, “Judgment”) and slices the text into logical sections.
6. **Summarization & Confidence Scoring**  
   - `summarize_section` produces a short (3–4 sentence) and a more detailed summary using lead-based heuristics, and assigns a confidence score based on OCR usage, section length, and other simple signals.
7. **NER & Legal Citations**  
   - `extract_entities` runs spaCy NER and then infers legal roles (judge, advocate, party, court) from context.  
   - `extract_citations` uses regex to find IPC/CrPC sections, constitutional articles, and Act names.
8. **Similar Case Finder**  
   - `find_similar_cases` converts the document into a TF‑IDF vector and compares it to a small internal corpus (`sample_cases.json`) to return the top similar cases with similarity percentages.

The final structured result is returned to the frontend as a single `AnalysisResponse` JSON object.


### Core API Contract (Summary)

- **POST** `/api/analyze`
  - **Content-Type**: `multipart/form-data`
  - **Body**:
    - `file`: PDF file (typed or scanned).
  - **Response (200)**:
    - `document_id`: string
    - `document_type`: `"court_judgment" | "contract" | "fir_or_notice" | "other"`
    - `sections`: list of:
      - `name`: string
      - `raw_text`: string
      - `summary_short`: string
      - `summary_detailed`: string
      - `confidence`: float (0–100)
    - `citations`: list of extracted legal references.
    - `entities`: list of named entities with labels and positions.
    - `similar_cases`: list of similar internal cases with similarity scores.
    - `meta`: miscellaneous metadata (e.g., used_ocr flag, page_count, errors).

### Notes & Disclaimers

- The NLP and heuristic rules in this project are **illustrative** and should be tuned for your jurisdiction and data.
- Always have a human lawyer review outputs. This tool does not provide legal advice or predict outcomes.


