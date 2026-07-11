import warnings
import asyncio
from datetime import datetime, timedelta, timezone
# Suppress deprecation and future warnings in production logs
warnings.filterwarnings("ignore", category=FutureWarning)

from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from google.api_core.exceptions import GoogleAPICallError, ResourceExhausted, PermissionDenied
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings, Settings
from app.database import get_db, engine, Base
from app.services.ingestion import ingest_repository
from app.services.worker import trigger_map_phase
from app.services.reduce import generate_global_report
from app.services.rag import ask_question

from fastapi.middleware.cors import CORSMiddleware
from app.models import RepositoryFile
from app.pipeline_logs import add_pipeline_log, get_pipeline_logs, clear_pipeline_logs
from app.auth import get_current_user

def initialize_database() -> None:
    """Best-effort database setup so the API can still boot when DB is unavailable."""
    try:
        Base.metadata.create_all(bind=engine)
        print("[INFO] Database tables checked/created successfully.")
    except SQLAlchemyError as e:
        print(f"[WARNING] Database initialization skipped: {e}")
        return

    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("ALTER TABLE repository_files ADD COLUMN IF NOT EXISTS user_id VARCHAR DEFAULT 'mock_local_developer_uid';"))
            conn.execute(text("ALTER TABLE repository_files ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            conn.commit()
            print("[INFO] Database migrations checked successfully.")
    except SQLAlchemyError as e:
        print(f"[WARNING] Database migrations skipped: {e}")
        return

    # Migrate local JSON user mappings to the database if the file exists
    try:
        import os
        import json
        from app.database import SessionLocal
        from app.models import UserMapping
        
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "user_mappings.json")
        if os.path.exists(json_path):
            with open(json_path, "r") as f:
                mappings = json.load(f)
            if mappings:
                db = SessionLocal()
                try:
                    for uid, email in mappings.items():
                        existing = db.query(UserMapping).filter(UserMapping.uid == uid).first()
                        if not existing:
                            db.add(UserMapping(uid=uid, email=email))
                    db.commit()
                    print(f"[INFO] Successfully migrated {len(mappings)} user mappings from JSON to database.")
                except Exception as ex:
                    print(f"[WARNING] Failed to migrate user mappings: {ex}")
                    db.rollback()
                finally:
                    db.close()
    except Exception as e:
        print(f"[WARNING] User mappings migration check failed: {e}")


app = FastAPI(
    title="Code Reviewer API",
    description="AI-Powered Repository Intelligence Tool",
    version="1.0.0"
)


@app.on_event("startup")
def startup_initialize_database():
    initialize_database()

# Enable CORS for Next.js frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# GEMINI API KEY VERIFICATION PRE-CHECKS
# ---------------------------------------------------------
async def verify_gemini_key(api_key: str) -> str | None:
    """
    Verify if a Gemini API key is valid and has remaining quota.
    Returns an error message string if invalid/exhausted, or None if valid.
    """
    if not api_key:
        return "API Key is missing."
    try:
        import google.generativeai as genai
        import google.generativeai.client as genai_client
        # Configure the key atomically
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-3.5-flash")
        model._client = genai_client.get_default_generative_client()
        # Make a tiny lightweight call
        await model.generate_content_async(
            "Ping",
            generation_config=genai.GenerationConfig(max_output_tokens=1)
        )
        return None
    except ResourceExhausted as e:
        return "API Key has exhausted its quota or prepayment balance (429 ResourceExhausted)."
    except PermissionDenied as e:
        return "API Key is invalid or lacks permissions (403 PermissionDenied)."
    except GoogleAPICallError as e:
        if e.code == 429:
            return "API Key has exhausted its quota or prepayment balance (429 ResourceExhausted)."
        if e.code == 403:
            return "API Key is invalid or lacks permissions (403 PermissionDenied)."
        return f"API Call failed: {e.message}"
    except Exception as e:
        # Ignore transient network validation errors to avoid blocking startup if offline
        return f"Validation error: {str(e)}"

# ---------------------------------------------------------
# Pydantic Schemas for Request Validation
# ---------------------------------------------------------
class RepoRequest(BaseModel):
    repo_url: str

class ChatRequest(BaseModel):
    repo_url: str
    question: str

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the Code Reviewer API!",
        "status": "Server is up and running."
    }

@app.post("/api/ingest")
async def ingest_repo(
    request: RepoRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to submit a GitHub URL for processing.
    Phase 1 runs synchronously. Phase 2 & 3 run in the background.
    Isolated by the authenticated user's ID.
    """
    repo_url = request.repo_url
    user_id = current_user["uid"]
    
    # 12-hour rate limiting check for all users except the admin
    user_email = current_user.get("email")
    if user_email != "aryankale1410@gmail.com":
        twelve_hours_ago = datetime.now(timezone.utc) - timedelta(hours=12)
        
        # Query distinct repository URLs scanned by this user in the last 12 hours
        recent_repos = db.query(RepositoryFile.repo_url).filter(
            RepositoryFile.user_id == user_id,
            RepositoryFile.created_at >= twelve_hours_ago
        ).distinct().all()
        
        recent_repos_list = [r[0] for r in recent_repos if r[0]]
        
        if len(recent_repos_list) >= 2 and repo_url not in recent_repos_list:
            raise HTTPException(
                status_code=400,
                detail="Rate limit exceeded. Free tier users are limited to scanning 2 repositories every 12 hours."
            )
    
    # Pre-verify all API keys (including role-specific fallbacks) to prevent starting a doomed ingestion.
    settings = get_settings()
    
    # We will build a pool of all valid keys so we can do a secondary fallback if both map/fallback fail.
    all_keys = [
        settings.GEMINI_API_KEY_MAP,
        settings.GEMINI_API_KEY_MAP_FALLBACK,
        settings.GEMINI_API_KEY_REDUCE,
        settings.GEMINI_API_KEY_REDUCE_FALLBACK,
        settings.GEMINI_API_KEY_RAG,
        settings.GEMINI_API_KEY_RAG_FALLBACK
    ]
    
    valid_key_pool = []
    verified_status = {}
    
    # Unique non-empty keys to verify
    for key in set(all_keys):
        if not key:
            continue
        err = await verify_gemini_key(key)
        verified_status[key] = {"valid": not err, "error": err}
        if not err:
            valid_key_pool.append(key)
                
    if not valid_key_pool:
        # Build comprehensive error logs
        err_msg = "All configured Gemini API keys (including fallbacks) are invalid or exhausted.\n"
        # We list status of main keys
        for name, key_val in [
            ("Map Key", settings.GEMINI_API_KEY_MAP),
            ("Map Fallback", settings.GEMINI_API_KEY_MAP_FALLBACK),
            ("Reduce Key", settings.GEMINI_API_KEY_REDUCE),
            ("Reduce Fallback", settings.GEMINI_API_KEY_REDUCE_FALLBACK),
            ("RAG Key", settings.GEMINI_API_KEY_RAG),
            ("RAG Fallback", settings.GEMINI_API_KEY_RAG_FALLBACK)
        ]:
            if key_val:
                status = verified_status.get(key_val, {}).get("error", "Unknown validation error")
                err_msg += f"- {name}: {status}\n"
            else:
                err_msg += f"- {name}: Missing/empty key\n"
        return {"status": "error", "message": err_msg}
        
    # Helper to check if a specific key is valid
    def is_valid(key: str) -> bool:
        return key in verified_status and verified_status[key]["valid"]
        
    # 2. Map Key Resolution
    if is_valid(settings.GEMINI_API_KEY_MAP):
        pass
    elif is_valid(settings.GEMINI_API_KEY_MAP_FALLBACK):
        print("[FALLBACK] Map Key failed. Using GEMINI_API_KEY_MAP_FALLBACK with gemini-3.1-flash-lite.")
        settings.GEMINI_API_KEY_MAP = settings.GEMINI_API_KEY_MAP_FALLBACK
        settings.GEMINI_MODEL_MAP = "gemini-3.1-flash-lite"
    else:
        print("[WARNING] Both Map Key and its Fallback failed! Using the first valid key in the pool.")
        settings.GEMINI_API_KEY_MAP = valid_key_pool[0]
        settings.GEMINI_MODEL_MAP = "gemini-3.1-flash-lite"
        
    # 3. Reduce Key Resolution
    if is_valid(settings.GEMINI_API_KEY_REDUCE):
        pass
    elif is_valid(settings.GEMINI_API_KEY_REDUCE_FALLBACK):
        print("[FALLBACK] Reduce Key failed. Using GEMINI_API_KEY_REDUCE_FALLBACK with gemini-3.5-flash.")
        settings.GEMINI_API_KEY_REDUCE = settings.GEMINI_API_KEY_REDUCE_FALLBACK
        settings.GEMINI_MODEL_REDUCE = "gemini-3.5-flash"
    else:
        print("[WARNING] Both Reduce Key and its Fallback failed! Using the first valid key in the pool.")
        settings.GEMINI_API_KEY_REDUCE = valid_key_pool[0]
        settings.GEMINI_MODEL_REDUCE = "gemini-3.5-flash"
        
    # 4. RAG Key Resolution
    if is_valid(settings.GEMINI_API_KEY_RAG):
        pass
    elif is_valid(settings.GEMINI_API_KEY_RAG_FALLBACK):
        print("[FALLBACK] RAG Key failed. Using GEMINI_API_KEY_RAG_FALLBACK with gemini-3.5-flash.")
        settings.GEMINI_API_KEY_RAG = settings.GEMINI_API_KEY_RAG_FALLBACK
        settings.GEMINI_MODEL_RAG = "gemini-3.5-flash"
    else:
        print("[WARNING] Both RAG Key and its Fallback failed! Using the first valid key in the pool.")
        settings.GEMINI_API_KEY_RAG = valid_key_pool[0]
        settings.GEMINI_MODEL_RAG = "gemini-3.5-flash"
    
    # 1. Phase 1: Ingestion & Static Analysis (Run in a thread pool to avoid blocking the event loop)
    # This clones the repo, filters files, and saves pending files to DB.
    clear_pipeline_logs(repo_url)
    add_pipeline_log(repo_url, "Phase 1: Ingestion started — cloning repository...")
    try:
        pending_file_ids = await asyncio.to_thread(ingest_repository, repo_url, db, user_id)
        add_pipeline_log(repo_url, f"Phase 1 complete — {len(pending_file_ids)} files ready for AI analysis")
    except Exception as e:
        add_pipeline_log(repo_url, f"Phase 1 failed: {str(e)}")
        return {"status": "error", "message": str(e)}

    # 2. Define the background wrapper to chain Map and Reduce phases
    async def process_map_reduce():
        # Phase 2: Map (Chunking, Summarizing, Vectorizing)
        if pending_file_ids:
            add_pipeline_log(repo_url, "Phase 2: Map — starting AI analysis of individual files...")
            await trigger_map_phase(pending_file_ids, repo_url)
            add_pipeline_log(repo_url, "Phase 2: Map complete — all files analyzed")
            
        # Phase 3: Reduce (Global Report)
        # We need a fresh DB session for the background thread
        from app.database import SessionLocal
        bg_db = SessionLocal()
        try:
            add_pipeline_log(repo_url, "Phase 3: Reduce — synthesizing global architecture report...")
            await generate_global_report(repo_url, bg_db, user_id)
            add_pipeline_log(repo_url, "Phase 3: Reduce complete — global report generated!")
        except Exception as e:
            add_pipeline_log(repo_url, f"Phase 3: Reduce failed — {str(e)}")
        finally:
            bg_db.close()

    # 3. Hand off the heavy AI processing to FastAPI's background task runner.
    # The user gets a response immediately while the AI works in the background.
    background_tasks.add_task(process_map_reduce)

    return {
        "status": "accepted",
        "message": f"Successfully ingested {len(pending_file_ids)} files. Background AI processing started.",
        "repo_url": repo_url
    }

@app.post("/api/chat")
async def chat(
    request: ChatRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Phase 4: RAG Q/A Endpoint.
    Searches the pgvector database and answers the user's question, fully isolated by user.
    """
    answer = await ask_question(request.repo_url, request.question, db, current_user["uid"])
    return {"answer": answer}

class StopRequest(BaseModel):
    repo_url: str

@app.post("/api/repo/stop")
async def stop_repo(
    request: StopRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Stops the ingestion/processing of a repository by purging all its files from the DB.
    Resets the repository state completely for the active user only.
    """
    db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == request.repo_url,
        RepositoryFile.user_id == current_user["uid"]
    ).delete()
    db.commit()
    clear_pipeline_logs(request.repo_url)
    return {"status": "success", "message": "Successfully stopped and reset the repository processing."}

@app.get("/api/repo/logs")
def get_repo_logs(repo_url: str):
    """Get the live pipeline log entries for a repository."""
    return get_pipeline_logs(repo_url)

@app.get("/api/repos")
def list_repos(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """List all distinct repositories in the database with their current processing status, isolated by user."""
    user_id = current_user["uid"]
    # Find all distinct repo URLs belonging to the current user
    repos = db.query(RepositoryFile.repo_url).filter(
        RepositoryFile.user_id == user_id
    ).distinct().all()
    
    result = []
    for (repo_url,) in repos:
        # Check if a global report is complete
        has_report = db.query(RepositoryFile).filter(
            RepositoryFile.repo_url == repo_url,
            RepositoryFile.user_id == user_id,
            RepositoryFile.file_path == "__GLOBAL_REPORT__"
        ).first() is not None

        # Fetch status counts
        pending_count = db.query(RepositoryFile).filter(
            RepositoryFile.repo_url == repo_url,
            RepositoryFile.user_id == user_id,
            RepositoryFile.status == "pending",
            RepositoryFile.file_path != "__GLOBAL_REPORT__"
        ).count()

        processing_count = db.query(RepositoryFile).filter(
            RepositoryFile.repo_url == repo_url,
            RepositoryFile.user_id == user_id,
            RepositoryFile.status == "processing",
            RepositoryFile.file_path != "__GLOBAL_REPORT__"
        ).count()

        completed_count = db.query(RepositoryFile).filter(
            RepositoryFile.repo_url == repo_url,
            RepositoryFile.user_id == user_id,
            RepositoryFile.status == "completed",
            RepositoryFile.file_path != "__GLOBAL_REPORT__"
        ).count()

        error_count = db.query(RepositoryFile).filter(
            RepositoryFile.repo_url == repo_url,
            RepositoryFile.user_id == user_id,
            RepositoryFile.status == "error",
            RepositoryFile.file_path != "__GLOBAL_REPORT__"
        ).count()

        # Determine aggregate status
        if has_report:
            status = "completed"
        elif processing_count > 0:
            status = "processing"
        elif pending_count > 0:
            status = "pending"
        else:
            status = "completed" if completed_count > 0 else "unknown"

        result.append({
            "repo_url": repo_url,
            "total_files": pending_count + processing_count + completed_count + error_count,
            "completed_files": completed_count,
            "pending_files": pending_count,
            "processing_files": processing_count,
            "error_files": error_count,
            "status": status,
            "has_report": has_report
        })
    return result

@app.get("/api/repo/status")
def repo_status(repo_url: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get the live processing status and file counts for a specific repository, isolated by user."""
    user_id = current_user["uid"]
    has_report = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.file_path == "__GLOBAL_REPORT__"
    ).first() is not None

    pending_count = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.status == "pending",
        RepositoryFile.file_path != "__GLOBAL_REPORT__"
    ).count()

    processing_count = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.status == "processing",
        RepositoryFile.file_path != "__GLOBAL_REPORT__"
    ).count()

    completed_count = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.status == "completed",
        RepositoryFile.file_path != "__GLOBAL_REPORT__"
    ).count()

    error_count = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.status == "error",
        RepositoryFile.file_path != "__GLOBAL_REPORT__"
    ).count()

    # Check if any phase failed in the logs
    logs = get_pipeline_logs(repo_url)
    phase1_failed = any("Phase 1 failed" in log["message"] for log in logs)
    reduce_failed = any("Phase 3: Reduce failed" in log["message"] for log in logs)
    reduce_started = any("Phase 3: Reduce — synthesizing" in log["message"] for log in logs)
    reduce_finished = any("Phase 3: Reduce complete" in log["message"] or "Phase 3: Reduce failed" in log["message"] for log in logs)
    reduce_active = reduce_started and not reduce_finished

    if phase1_failed or reduce_failed:
        status = "error"
    elif has_report:
        status = "completed"
    elif reduce_active:
        status = "processing"
    elif processing_count > 0:
        status = "processing"
    elif pending_count > 0:
        status = "pending"
    else:
        # All files are completed/error, and there's no report yet.
        # If we have files in the database, we are transitioning from Map to Reduce.
        # But if total_files is 0, it means we haven't even finished Phase 1 ingestion yet.
        total_files = pending_count + processing_count + completed_count + error_count
        if total_files > 0:
            status = "processing"
        else:
            status = "pending"

    # Fetch the list of files to show status/errors in the frontend
    db_files = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.file_path != "__GLOBAL_REPORT__"
    ).order_by(RepositoryFile.file_path).all()

    files_status = []
    for f in db_files:
        err_msg = None
        if f.status == "error" and isinstance(f.explanation_summary, dict):
            err_msg = f.explanation_summary.get("error")
        files_status.append({
            "file_path": f.file_path,
            "status": f.status,
            "error": err_msg
        })

    return {
        "repo_url": repo_url,
        "status": status,
        "has_report": has_report,
        "total_files": pending_count + processing_count + completed_count + error_count,
        "completed_files": completed_count,
        "pending_files": pending_count,
        "processing_files": processing_count,
        "error_files": error_count,
        "files": files_status
    }

@app.get("/api/repo/report")
def get_repo_report(repo_url: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Fetch the generated global architecture report, security audit, and all individual file analysis reports, isolated by user."""
    user_id = current_user["uid"]
    global_report = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.file_path == "__GLOBAL_REPORT__"
    ).first()

    files = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.file_path != "__GLOBAL_REPORT__"
    ).all()

    vulnerabilities = []
    file_summaries = []

    for f in files:
        if f.explanation_summary:
            file_summaries.append({
                "file_path": f.file_path,
                "language": f.language,
                "summary": f.explanation_summary.get("summary", ""),
                "key_components": f.explanation_summary.get("key_components", [])
            })
        
        if f.vulnerabilities_found:
            if isinstance(f.vulnerabilities_found, list):
                for v in f.vulnerabilities_found:
                    if isinstance(v, dict):
                        v_copy = dict(v)
                        v_copy["file_path"] = f.file_path
                        vulnerabilities.append(v_copy)
            elif isinstance(f.vulnerabilities_found, dict):
                if "title" in f.vulnerabilities_found:
                    v_copy = dict(f.vulnerabilities_found)
                    v_copy["file_path"] = f.file_path
                    vulnerabilities.append(v_copy)
                else:
                    for title, val in f.vulnerabilities_found.items():
                        vulnerabilities.append({
                            "file_path": f.file_path,
                            "title": title,
                            "description": str(val),
                            "severity": "medium"
                        })

    return {
        "repo_url": repo_url,
        "global_overview": global_report.explanation_summary.get("global_overview", "") if (global_report and global_report.explanation_summary) else "Overview not generated yet.",
        "security_audit": global_report.vulnerabilities_found.get("security_audit", "") if (global_report and global_report.vulnerabilities_found) else "Security audit not generated yet.",
        "files": file_summaries,
        "vulnerabilities": vulnerabilities
    }

@app.get("/api/repo/file")
def get_file_content(repo_url: str, file_path: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Fetch the raw source code content for a specific file in a repository, isolated by user."""
    user_id = current_user["uid"]
    f = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.file_path == file_path
    ).first()
    if not f:
        return {"status": "error", "message": "File not found"}
    return {
        "repo_url": repo_url,
        "file_path": file_path,
        "language": f.language,
        "content": f.content,
        "summary": f.explanation_summary.get("summary", "") if f.explanation_summary else "",
        "key_components": f.explanation_summary.get("key_components", []) if f.explanation_summary else []
    }

@app.get("/api/analytics")
def get_platform_analytics(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Get platform-wide metrics (total unique repos scanned, total unique users)
    derived from our single 'repository_files' table.
    """
    # 1. Total unique scanned repository URLs across the whole platform
    total_repos = db.query(RepositoryFile.repo_url).distinct().count()
    
    # 2. Total unique platform users registered
    total_users = db.query(RepositoryFile.user_id).distinct().count()
    
    # 3. Active user's specific total repositories scanned
    user_repos = db.query(RepositoryFile.repo_url).filter(
        RepositoryFile.user_id == current_user["uid"]
    ).distinct().count()

    return {
        "total_repositories_scanned": total_repos,
        "total_platform_users": total_users,
        "user_repositories_scanned": user_repos
    }

@app.get("/api/analytics/public")
def get_public_analytics(db: Session = Depends(get_db)):
    """
    Public analytics endpoint — no authentication required.
    Returns platform-wide aggregate metrics.
    """
    total_repos = db.query(RepositoryFile.repo_url).distinct().count()
    total_users = db.query(RepositoryFile.user_id).distinct().count()
    total_files = db.query(RepositoryFile).filter(
        RepositoryFile.file_path != "__GLOBAL_REPORT__"
    ).count()

    return {
        "total_repositories_scanned": total_repos,
        "total_platform_users": total_users,
        "total_files_analyzed": total_files
    }


@app.get("/api/analytics/admin")
def get_admin_analytics(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """
    Admin-only analytics endpoint.
    Returns detailed platform metrics including per-user breakdowns.
    """
    if current_user["email"] != "aryankale1410@gmail.com":
        raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")

    total_repos = db.query(RepositoryFile.repo_url).distinct().count()
    total_users = db.query(RepositoryFile.user_id).distinct().count()
    total_files = db.query(RepositoryFile).filter(
        RepositoryFile.file_path != "__GLOBAL_REPORT__"
    ).count()

    # Build per-user breakdown
    distinct_user_ids = db.query(RepositoryFile.user_id).distinct().all()
    users = []
    
    from app.auth import get_email_from_uid

    for (user_id,) in distinct_user_ids:
        if not user_id:
            continue
            
        user_repos = db.query(RepositoryFile.repo_url).filter(
            RepositoryFile.user_id == user_id
        ).distinct().all()
        repo_list = [repo_url for (repo_url,) in user_repos if repo_url and repo_url != "__GLOBAL_REPORT__"]
        
        user_file_count = db.query(RepositoryFile).filter(
            RepositoryFile.user_id == user_id,
            RepositoryFile.file_path != "__GLOBAL_REPORT__"
        ).count()
        
        # Resolve UID to real email using persistent local JSON cache
        email = get_email_from_uid(user_id)

        users.append({
            "email": email,
            "repositories_scanned": len(repo_list),
            "repos": repo_list,
            "total_files": user_file_count
        })

    return {
        "total_repositories_scanned": total_repos,
        "total_platform_users": total_users,
        "total_files_analyzed": total_files,
        "users": users
    }

