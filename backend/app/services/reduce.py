import json
import asyncio
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception
import google.generativeai as genai
import google.generativeai.client as genai_client
from google.api_core.exceptions import GoogleAPICallError, InvalidArgument, PermissionDenied, NotFound

from app.config import get_settings
from app.models import RepositoryFile
from app.pipeline_logs import add_pipeline_log
from app.services.limiter import space_request, generate_content_with_fallback

settings = get_settings()

# ---------------------------------------------------------
# SETUP REDUCE LLM CLIENT
# ---------------------------------------------------------

# We specifically use Key 2 for the massive context Reduce Phase
genai.configure(api_key=settings.GEMINI_API_KEY_REDUCE)

async def generate_global_report(repo_url: str, db: Session, user_id: str = "mock_local_developer_uid"):
    """
    Phase 3: The Reduce Phase
    Gathers all summaries and vulnerabilities for a repo and creates a global report.
    Since we are using a "Single Table Approach", we will save the final report
    as a special row where file_path = "__GLOBAL_REPORT__".
    """
    
    # 1. Fetch all completed files for this repo
    # We only care about files that successfully got a JSON summary from the Map phase.
    files = db.query(RepositoryFile).filter(
        RepositoryFile.repo_url == repo_url,
        RepositoryFile.user_id == user_id,
        RepositoryFile.status == "completed"
    ).all()

    if not files:
        raise ValueError("No completed files were successfully processed by the AI Map phase. Cannot synthesize global report.")

    add_pipeline_log(repo_url, f"Reduce: synthesizing {len(files)} file summaries into global report...")

    # 2. Compile the massive context string
    compiled_summaries = []
    compiled_vulnerabilities = []

    for f in files:
        # Extract summary
        if f.explanation_summary and "summary" in f.explanation_summary:
            compiled_summaries.append(f"File: {f.file_path}\nSummary: {f.explanation_summary['summary']}\n")
        
        # Extract vulnerabilities
        if f.vulnerabilities_found:
            for vuln in f.vulnerabilities_found:
                # Add the file path so the Master Security Agent knows where the bug is
                vuln["file_path"] = f.file_path 
                compiled_vulnerabilities.append(vuln)

    all_summaries_text = "\n".join(compiled_summaries)
    all_vulns_text = json.dumps(compiled_vulnerabilities, indent=2)

    def is_transient_error(exception):
        # Do not retry if it's InvalidArgument (400), PermissionDenied (403), or NotFound (404)
        if isinstance(exception, (InvalidArgument, PermissionDenied, NotFound)):
            return False
        # Only retry on 429, 500, 503, 504 or network/timeout issues
        if isinstance(exception, GoogleAPICallError):
            return exception.code in (429, 500, 503, 504)
        if isinstance(exception, (asyncio.TimeoutError, ConnectionError, IOError)):
            return True
        
        # Check string representation for rate limits in wrapped exceptions
        err_str = str(exception).upper()
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "QUOTA" in err_str or "500" in err_str or "503" in err_str:
            return True
            
        return False

    # 3. Fire off the Master Explainer and Master Security Agent in parallel
    # We use the configured settings.GEMINI_MODEL_REDUCE model (e.g. Gemini 3.5 Flash)
    # perfect for reading thousands of summaries at once!
    # Force the local client configuration to use the correct API key atomically
    genai.configure(api_key=settings.GEMINI_API_KEY_REDUCE)
    model_name = settings.GEMINI_MODEL_REDUCE

    @retry(
        retry=retry_if_exception(is_transient_error),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def run_master_explainer():
        prompt = f"""
        You are the Master Architect. Below are the summaries of every file in a repository.
        Synthesize this information and write a comprehensive "Global Project Overview".
        Explain the overall architecture, what the project does, and how the main components interact.
        
        YOU MUST COMPULSORILY include a clean, vertical systems architecture flowchart diagram inside a code block (```text ... ```) at the end of your overview.
        
        This diagram must strictly follow these formatting and structure guidelines to ensure readability:
        1. VERTICAL FLOW: The overall flow of the diagram must go from TOP to BOTTOM (e.g. CLIENT/FRONTEND LAYER at the top -> BACKEND LAYER in the middle -> DATA/PERSISTENCE LAYER at the bottom).
        2. HIGH-LEVEL COMPONENTS ONLY: Focus strictly on key high-level subsystems, main logic layers, and primary directories/modules.
        3. OMIT ALL BOILERPLATE/CONFIGS: Absolutely DO NOT include configuration, compiler, build, dependency management, metadata, or environment files in the diagram. For example, OMIT files like index.html, tsconfig.json, package.json, vite.config.ts, webpack.config.js, eslint.config.mjs, next.config.ts, vercel.json, netlify.toml, .gitignore, .env, and other static configurations.
        4. CLEAN ASCII LAYOUT: Use simple box layouts with clean ASCII borders (using |, -, +, etc.) and downwards pointing flow arrows (e.g., |, v, V, --->, ===>). Keep spacing balanced.
        5. WIDTH CONSTRAINTS: The diagram must NOT exceed 90 characters in width. This ensures it aligns perfectly when rendered in a monospaced font and does not wrap or overflow on standard screens or PDF reports.
        6. NO MERMAID: Do not write Mermaid.js syntax. Generate plain, raw, monospace-aligned ASCII text.
        
        FILE SUMMARIES:
        {all_summaries_text}
        """
        await space_request()
        return await generate_content_with_fallback(model_name, prompt)

    @retry(
        retry=retry_if_exception(is_transient_error),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def run_master_security():
        if not compiled_vulnerabilities:
            return "## Executive Summary\n\nNo security vulnerabilities were detected by the automated analysis agents. The codebase appears to follow secure coding practices within the scope of this scan.\n\n## Recommendations\n\n- Continue following secure coding best practices\n- Implement regular dependency audits\n- Consider adding automated security scanning to your CI/CD pipeline"
            
        prompt = f"""
        You are the Master Security Auditor. Below is a raw list of potential issues and vulnerabilities found across a repository.
        Review them, filter out obvious false positives, and write a professional "Final Security Audit Report".
        
        YOU MUST follow this EXACT markdown format structure. Do not deviate from it:

        ## Executive Summary

        [Write exactly 2-3 sentences summarizing the overall security posture of the repository. Include the total count of issues found and the highest severity level.]

        ## Critical & High Severity Issues

        [For EACH critical or high severity issue, use this exact format:]

        ### [Issue Title]
        - **Severity**: [Critical or High]
        - **File**: `[exact file path]`
        - **Description**: [Clear explanation of the vulnerability]
        - **Recommendation**: [Specific fix or mitigation]

        [If no critical/high issues exist, write: "No critical or high severity issues were identified."]

        ## Medium Severity Issues

        [Same format as above for each medium issue. If none, write: "No medium severity issues were identified."]

        ## Low Severity & Informational

        [Same format as above for each low/informational issue. If none, write: "No low severity issues were identified."]

        ## Recommendations

        [Write a numbered list of 3-5 prioritized security improvement recommendations based on the findings above.]

        RAW VULNERABILITIES:
        {all_vulns_text}
        """
        await space_request()
        return await generate_content_with_fallback(model_name, prompt)

    # Run both massive prompts concurrently
    print("[INFO] Master LLMs are now reading the entire project context...")
    add_pipeline_log(repo_url, "Master Architect + Security Auditor agents started...")
    global_overview, security_audit = await asyncio.gather(
        run_master_explainer(), 
        run_master_security()
    )
    add_pipeline_log(repo_url, "Global report generated — saving to database...")

    # 4. Save the final report back into our Single Table schema
    # We use a special reserved file_path name to identify it later.
    report_record = RepositoryFile(
        repo_url=repo_url,
        file_path="__GLOBAL_REPORT__",
        content="This is a generated global report, not a real file.",
        explanation_summary={"global_overview": global_overview},
        vulnerabilities_found={"security_audit": security_audit},
        status="completed",
        user_id=user_id
    )
    
    db.add(report_record)
    db.commit()
    print(f"[OK] Reduce Phase complete! Global report saved for {repo_url}")
