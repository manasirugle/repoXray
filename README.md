# 🌌 RepoXray — AI-Powered Codebase Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-https%3A%2F%2Fcode--recall1.netlify.app%2F-violet?style=for-the-badge&logo=netlify)](https://code-recall1.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-emerald?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)

RepoXray is a premium, fully responsive codebase visualization, analysis, and reasoning platform. Utilizing an advanced, multi-agent **Map-Reduce processing workflow**, RepoXray shallow-clones repositories in parallel, indexes structural data, extracts vector embeddings, runs automated vulnerability audits, and hosts a context-aware semantic retrieval (RAG) assistant for direct natural language queries.

Developed with a professional **light-cream warm minimalist theme (Vibe-Kanban style)** and a persistent dark mode toggle, the platform handles multi-tenant indexing cleanly, features detailed admin activity telemetry, and streamlines Firebase security flows.

---

## ✨ Core Features

*   **⚡ Map-Reduce Processing Pipeline:**
    *   **Map Phase:** Spawns asynchronous worker agents to analyze, summarize, and vectorize individual files in parallel.
    *   **Reduce Phase:** Aggregates individual file blueprints into a master global architecture report and security catalog.
*   **🧠 Semantic RAG Q&A Assistant:** Direct codebase chat powered by Google Gemini API and high-performance similarity matching using PostgreSQL `pgvector`.
*   **🛡️ Multi-Agent Security Audit:** Automated static vulnerability indexing mapping high, medium, and low-priority vulnerabilities across files.
*   **📂 Interactive Code Explorer:** Browse the codebase hierarchy alongside side-by-side component summaries and code inspectors.
*   **🎨 Premium Dual-Theme System:** Warm minimal light cream styling and modern dark neon options, with theme settings synced across reloads.
*   **📱 Mobile-First Design & Popup Bypass:** Optimized touch gestures for dashboard tab navigation, stacked responsive charts, and popup-based Firebase OAuth selectors engineered to bypass mobile third-party cookie restrictions.
*   **🛡️ Robust Authentication & Verification:** Manual cryptographic verification (RS256 JWT decoding) of Firebase tokens as a fallback to bypass local Admin SDK service credential dependencies.
*   **📊 Admin Dashboard:** Admin-only view (`/admin`) displaying total user counts, active repositories, scanned files, and detailed per-user activity tables with expandable sub-rows.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([User]) -->|Submits Repository URL| Frontend[Next.js Frontend]
    Frontend -->|POST /api/ingest| Backend[FastAPI Backend]
    Backend -->|Clones Branch| Git[Git Clone Client]
    Git -->|Parses & Indexes File Trees| DB[(Supabase PostgreSQL + pgvector)]
    
    Backend -->|Map-Reduce Engine| MapPhase[Worker Agents: Map Phase]
    MapPhase -->|Generate File Vectors| GeminiEmbed[Gemini Embedding API]
    GeminiEmbed -->|Store Embeddings| DB
    MapPhase -->|Trigger Synthesis| ReducePhase[Master Agent: Reduce Phase]
    ReducePhase -->|Compile Architecture & Audit| DB
    
    User -->|Queries Codebase| Chat[RAG Chat Controller]
    Chat -->|Generate Query Vector| GeminiEmbed
    GeminiEmbed -->|Similarity Match| DB
    DB -->|Retrieve Source Context| Chat
    Chat -->|Compile Comprehensive Answer| User
```

---

## 🛠️ Technology Stack

*   **Frontend:** Next.js 16 (App Router, TypeScript, Vanilla CSS Layout Framework, Lucide Icons)
*   **Backend:** FastAPI (Python 3.10+, SQLAlchemy, Pydantic)
*   **Database:** PostgreSQL (Hosted on Supabase with the `pgvector` extension)
*   **Authentication:** Firebase Auth (Client OAuth flows)
*   **AI Engine:** Google Gemini API (`gemini-1.5-flash`, `gemini-1.5-pro`, and `text-embedding-004`)

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** 18+ and **npm** installed.
- **Python** 3.10+ installed.
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
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file inside the `backend/` directory:
   ```env
   DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   GEMINI_API_KEY_MAP=your_gemini_api_key
   GEMINI_API_KEY_REDUCE=your_gemini_api_key
   GEMINI_API_KEY_RAG=your_gemini_api_key
   FIREBASE_PROJECT_ID=your-firebase-project-id
   ```
5. Spin up the development server:
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
3. Create a `.env.local` configuration file inside the `frontend/` directory:
   ```env
   # Backend Endpoint Location
   NEXT_PUBLIC_BACKEND_URL=http://localhost:9999

   # Firebase Credentials (Leave empty to use Mock Local Developer Mode)
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
   NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:000000000000
   ```
4. Start the Turbopack dev server:
   ```bash
   npm run dev
   ```
5. Open your browser and view the app at [http://localhost:3000](http://localhost:3000).

---

## 🌐 Production Deployment Guide

### 1. Frontend (Netlify)
The frontend uses the pre-configured [netlify.toml](file:///netlify.toml) file to compile the static application output directory structure automatically:
1. Connect your repository to **Netlify**.
2. Netlify reads the base configuration:
   * **Base Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Publish Directory:** `frontend/out`
3. Configure the following environment variables in the Netlify site console:
   * `NEXT_PUBLIC_BACKEND_URL`: The URL of your deployed FastAPI backend (e.g. `https://your-backend.onrender.com`).
   * The client-side Firebase configurations (`NEXT_PUBLIC_FIREBASE_*`).

### 2. Backend (Render / Docker Host)
Because repository parsing and Map-Reduce AI operations are long-running background processes, serverless functions (like Netlify/Vercel functions) will timeout. Use standard Docker runtime container hosting:
1. A production-ready `Dockerfile` is provided in the repository root.
2. Link your repository to **Render** or another Docker host.
3. Configure your environment variables as hidden secrets.
4. Set the host to listen on port `8000`.

---

## 🔒 Security Configuration
Ensure Firebase OAuth redirects function correctly by whitelisting domains:
1. Go to **Firebase Console** > **Authentication** > **Settings** > **Authorized Domains**.
2. Add your Netlify URL (e.g., `code-recall1.netlify.app`).
3. Set your CORS headers on the FastAPI backend to block unauthorized client requests.
