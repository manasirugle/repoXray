# 🌌 RepoXray — AI-Powered Codebase Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-code--recall1.netlify.app-violet?style=for-the-badge&logo=netlify)](https://code-recall1.netlify.app/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-emerald?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)

RepoXray analyzes GitHub repositories with a multi-phase **Map-Reduce AI pipeline**. Submit a repository URL and it shallow-clones the code, analyzes every file in parallel with Google Gemini, and produces a global architecture overview plus a full security audit — all viewable in a live dashboard with real-time pipeline logs.

---

## ✅ Implemented Features

### Analysis Pipeline
- **Phase 1 — Ingestion & Static Analysis:** Shallow-clones (`depth=1`) the submitted GitHub repository into a temp directory, filters out binaries/lockfiles/junk via a file sanitizer, detects each file's language by extension, and stores the raw code in PostgreSQL.
- **Phase 2 — Map:** Asynchronous worker agents process each file in parallel with Gemini (`gemini-3.1-flash-lite`): generating a structured explanation summary, detecting potential vulnerabilities, and computing vector embeddings (`gemini-embedding-2`, 3072 dimensions) stored via `pgvector`.
- **Phase 3 — Reduce:** A master agent (`gemini-3.5-flash`) synthesizes all per-file blueprints into a global architecture report and a master security audit.
- **Live Pipeline Terminal:** Real-time log streaming of every pipeline phase with an auto-scrolling terminal view, live status polling, and per-phase progress tracking.
- **Stop / Delete Repository:** Cancel an in-flight scan or permanently purge all stored metrics, summaries, embeddings, and reports for a repository (with a confirmation modal).

### Dashboard
- **🏗️ Architecture Overview Tab:** Renders the AI-generated master architecture report as formatted Markdown.
- **🛡️ Security Audit Tab:** Master security audit report plus a vulnerability checklist table with severity filters (`critical` / `high` / `medium` / `low`) mapped to individual files.
- **📂 Repository History:** Per-user list of previously scanned repositories with processing status, re-openable at any time.
- **📊 Platform Analytics:** Live counters for total repositories scanned, platform users, and files analyzed (public, no auth required).

### Authentication & Multi-Tenancy
- **Firebase Authentication:** Google OAuth popup sign-in on the frontend; falls back to a **Mock Local Developer Mode** when no Firebase credentials are configured.
- **Manual RS256 Token Verification:** The backend cryptographically verifies Firebase ID tokens using PyJWT + Google's public x509 certificates, so no Admin SDK service-account JSON is required (used as an automatic fallback, with public-key caching).
- **Per-User Data Isolation:** All repositories, reports, embeddings, and chat context are scoped to the authenticated user's UID.
- **Persistent UID → Email Mapping:** Stored in PostgreSQL so admin analytics survive redeployments.

### Admin Dashboard (`/admin`)
- Admin-only analytics endpoint (email-gated, returns 403 otherwise) showing total users, repositories, and files analyzed, plus a detailed per-user activity table with expandable repository lists.

### Rate Limiting & Resilience
- **Free-Tier Rate Limit:** Non-admin users are limited to scanning 2 distinct repositories every 12 hours.
- **Gemini Key Pre-Flight Verification:** All configured API keys (map / reduce / RAG + per-role fallbacks) are validated before ingestion starts, with automatic fallback-key and fallback-model resolution.
- **Request Spacing & Model Fallback:** Gemini calls are spaced (minimum 4s interval) and automatically fall back to lighter models on 429 quota errors.

### UI / UX
- **Dual Theme:** Light and dark modes with a toggle, persisted in `localStorage` across reloads.
- **Responsive Design:** Mobile-optimized layout with popup-based OAuth engineered around mobile third-party cookie restrictions.

---

## 🚧 In Progress (Phase 2)

These features are visible in the dashboard but currently open a *"planned for Phase 2"* preview modal — they are under development and not yet available:

- **📂 File Explorer:** Browse the indexed codebase hierarchy with per-file AI summaries and a side-by-side code inspector.
- **💬 AI Chat Console:** Semantic RAG Q&A over the codebase — pgvector similarity search over file embeddings feeding a Gemini-powered chat (`POST /api/chat` backend endpoint exists).
- **🔀 Architecture Diff:** Compare architecture reports across scans.
- **📄 PDF Report Export:** Download the full analysis as a PDF (implemented with jsPDF, currently disabled behind a feature flag).

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([User]) -->|Submits Repository URL| Frontend[Next.js Frontend]
    Frontend -->|POST /api/ingest| Backend[FastAPI Backend]
    Backend -->|Shallow Clone depth=1| Git[GitPython Clone]
    Git -->|Sanitize & Index Files| DB[(PostgreSQL + pgvector)]

    Backend -->|Background Task| MapPhase[Worker Agents: Map Phase]
    MapPhase -->|Summaries + Vulnerabilities + Embeddings| Gemini[Google Gemini API]
    Gemini -->|Store Results| DB
    MapPhase -->|Trigger Synthesis| ReducePhase[Master Agent: Reduce Phase]
    ReducePhase -->|Global Architecture Report + Security Audit| DB

    Frontend -->|Poll /api/repo/status + /api/repo/logs| Backend
    Frontend -->|GET /api/repo/report| Backend
```

---

## 🛠️ Technology Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Next.js 16 (App Router, static export), React 19, TypeScript, Lucide Icons, jsPDF |
| **Backend** | FastAPI, Python 3.10+, SQLAlchemy, Pydantic, GitPython |
| **Database** | PostgreSQL (e.g. Supabase) with the `pgvector` extension |
| **Auth** | Firebase Auth (client OAuth) + PyJWT manual RS256 verification (server) |
| **AI** | Google Gemini (`gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-embedding-2`) |

### API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/ingest` | Submit a repository URL for scanning |
| `GET` | `/api/repo/status` | Poll processing status of a repository |
| `GET` | `/api/repo/logs` | Live pipeline log entries |
| `GET` | `/api/repo/report` | Full report (overview, security audit, file list) |
| `GET` | `/api/repo/file` | Raw content of an indexed file |
| `POST` | `/api/repo/stop` | Stop processing and purge repository data |
| `GET` | `/api/repos` | List the current user's scanned repositories |
| `POST` | `/api/chat` | RAG Q&A over a repository *(backend ready; UI in Phase 2)* |
| `GET` | `/api/analytics` | Platform metrics (authenticated) |
| `GET` | `/api/analytics/public` | Platform metrics (public) |
| `GET` | `/api/analytics/admin` | Per-user analytics breakdown (admin only) |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+
- **Git** available on PATH (used for cloning target repositories)
- **PostgreSQL** database (e.g. Supabase) with `pgvector` enabled:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

### 2. Backend Setup
1. Navigate into the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file inside `backend/`:
   ```env
   DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   GEMINI_API_KEY_MAP=your_gemini_api_key
   GEMINI_API_KEY_REDUCE=your_gemini_api_key
   GEMINI_API_KEY_RAG=your_gemini_api_key
   # Optional fallback keys used automatically when a primary key is exhausted
   GEMINI_API_KEY_MAP_FALLBACK=
   GEMINI_API_KEY_REDUCE_FALLBACK=
   GEMINI_API_KEY_RAG_FALLBACK=
   FIREBASE_PROJECT_ID=your-firebase-project-id
   ```
5. Start the development server:
   ```bash
   uvicorn app.main:app --port 9999 --reload
   ```

### 3. Frontend Setup
1. Navigate into the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Create a `.env.local` file inside `frontend/`:
   ```env
   # Backend endpoint
   NEXT_PUBLIC_BACKEND_URL=http://localhost:9999

   # Firebase credentials (leave empty to use Mock Local Developer Mode)
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
   NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:000000000000
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

---

## 🌐 Production Deployment

### Frontend (Netlify)
The repository root contains a pre-configured [netlify.toml](netlify.toml):
1. Connect the repository to **Netlify**.
2. Netlify reads:
   - **Base Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Publish Directory:** `frontend/out`
3. Set the environment variables in the Netlify console: `NEXT_PUBLIC_BACKEND_URL` and the `NEXT_PUBLIC_FIREBASE_*` values.

### Backend (Render / Docker Host)
Repository parsing and Map-Reduce AI processing are long-running background tasks, so serverless functions will time out — use a container host instead:
1. A production `Dockerfile` is provided in the repository root (serves on port `8000`).
2. Link the repository to **Render** or another Docker host.
3. Configure the backend environment variables as secrets.

A GitHub Actions workflow ([keep_alive.yml](.github/workflows/keep_alive.yml)) periodically pings the backend to prevent free-tier hosts from spinning it down.

---

## 🔒 Security Configuration
1. In **Firebase Console** → **Authentication** → **Settings** → **Authorized Domains**, add your deployed frontend URL (e.g. `code-recall1.netlify.app`).
2. All API routes (except public analytics and pipeline logs) require a valid Firebase Bearer token, verified server-side.
