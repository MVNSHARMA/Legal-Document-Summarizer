# LexAnalyze — Legal Document Intelligence

AI-powered legal document analysis for lawyers, students, and citizens. Upload a PDF and get instant summaries, risk analysis, entity extraction, and plain-English explanations.

> **Legal Disclaimer:** LexAnalyze is a decision-support tool only. It does **not** provide legal advice and does not predict legal outcomes. Always consult a qualified legal professional.

---

## What it does

- **Analyses legal PDFs** — extracts text (with OCR fallback for scanned documents) and uses Groq AI (Llama 3) to extract case overview, judgment, sections, and parties.
- **Chat with Document** — ask questions about the case in plain English and get AI-powered answers.
- **Multilingual** — translate results into 12 Indian languages.
- **Legal Dictionary** — hover over legal terms to see plain-English definitions.
- **Document Templates** — browse, fill, and download common Indian legal templates.
- **Email Reports** — send analysis reports via Gmail SMTP.

---

## Features

| Feature | Description |
|---|---|
| PDF Upload & OCR | Typed and scanned PDFs, up to 10 MB |
| AI Case Extraction | Groq Llama 3 extracts judges, lawyers, parties, judgment |
| Similar Case Finder | TF-IDF similarity against reference corpus |
| Plain English Explainer | Groq AI simplification |
| Chat with Document | Ask questions about the case |
| Multilingual Support | 12 Indian languages via Groq AI |
| Legal Dictionary | 60+ terms with plain-English definitions |
| Legal Templates | 6 ready-to-use Indian legal document templates |
| Export to PDF / Word | Branded reports with all analysis data |
| Email Report | Send reports via Gmail SMTP |
| Upload History | Persistent localStorage history |
| Citations Page | All extracted legal citations across documents |
| Email/Password Auth | JWT-based authentication |
| Google OAuth | One-click sign-in via Google |
| Rate Limiting | 10 requests/minute per IP |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI Extraction | Groq API (llama-3.1-8b-instant) |
| PDF Parsing | pdfplumber, Tesseract OCR |
| Similarity | scikit-learn TF-IDF |
| Frontend | React 18, TypeScript, Vite |
| PDF Export | jsPDF |
| Word Export | docx |
| Auth | python-jose (JWT), passlib (bcrypt), Authlib (OAuth) |
| Email | Gmail SMTP (smtplib) |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Tesseract OCR ([install guide](https://tesseract-ocr.github.io/tessdoc/Installation.html))

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your actual values

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your actual values

npm run dev
```

Frontend available at `http://localhost:5173`

---

## Environment Variables

### `backend/.env` (copy from `backend/.env.example`)

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing secret — use a long random string in production |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `MAX_FILE_SIZE_MB` | Maximum upload size in MB (default: 10) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `FRONTEND_URL` | Frontend base URL (for OAuth redirect) |
| `GROQ_API_KEY` | Groq API key for AI extraction |
| `GMAIL_USER` | Gmail address for sending email reports |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16 chars, not your regular password) |

### `frontend/.env` (copy from `frontend/.env.example`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (default: `http://localhost:8000`) |
| `VITE_GROQ_API_KEY` | Groq API key for Plain English, Chat, and Translation |

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth 2.0 Client ID** (Web application type).
3. Add `http://localhost:8000/api/auth/google/callback` as an **Authorised redirect URI**.
4. Copy the Client ID and Secret into `backend/.env`.

## Gmail Email Setup

1. Enable 2-Factor Authentication on your Gmail account.
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Create an App Password for "Mail".
4. Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` to `backend/.env`.

---

## Deployment on Render

### Backend

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set **Root Directory** to: `backend`
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables from `backend/.env.example` in the Render dashboard

### Frontend

1. Create a new **Static Site** on Render
2. Connect your GitHub repository
3. Set **Root Directory** to: `frontend`
4. **Build Command:** `npm install && npm run build`
5. **Publish Directory:** `dist`
6. Add environment variables:
   - `VITE_API_URL` = your backend URL from the step above (e.g. `https://lexanalyze-backend.onrender.com`)
   - `VITE_GROQ_API_KEY` = your Groq API key

> **Note:** After deploying the backend, update `ALLOWED_ORIGINS` in the backend environment variables to include your frontend URL (e.g. `https://lexanalyze-frontend.onrender.com`). Also update `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` to your production URLs.

---

## API Reference

### `POST /api/analyze`

Upload a legal PDF for analysis.

- **Auth:** `Authorization: Bearer <token>` required
- **Body:** `multipart/form-data` with `file` field (PDF only, max 10 MB)
- **Returns:** `AnalysisResponse` with case overview, details, and similar cases

### Auth Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with email + password |
| POST | `/api/auth/login` | Login with email + password |
| GET | `/api/auth/google` | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/profile` | Update full name |
| PUT | `/api/auth/password` | Change password |
| DELETE | `/api/auth/account` | Delete account |
| POST | `/api/email/send-report` | Send analysis report by email |

---

## Built with Groq AI

This app uses the [Groq API](https://groq.com/) with the `llama-3.1-8b-instant` model for:
- AI-powered case information extraction (backend)
- Plain English explanations (frontend)
- Document chat (frontend)
- Multilingual translation (frontend)
