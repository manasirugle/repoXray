import os

# ---------------------------------------------------------
# TIER 1: The Exclusion List (The Blacklist)
# ---------------------------------------------------------
# We ignore these entirely to save processing time and LLM tokens.
# These files rarely contain human-written, reviewable logic.

IGNORE_EXTENSIONS = {
    ".min.js", ".min.css", ".svg", ".png", ".jpg", ".jpeg", ".gif", 
    ".mp4", ".mp3", ".csv", ".pdf", ".lock", ".log", ".ico", ".ttf", 
    ".woff", ".woff2", ".eot", ".wasm"
}

IGNORE_NAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", 
    "requirements.txt", "poetry.lock", "Pipfile.lock"
}

IGNORE_DIRECTORIES = {
    "node_modules", ".git", "dist", "build", "__pycache__", 
    "venv", ".venv", ".next", "out", "coverage"
}

# ---------------------------------------------------------
# TIER 2: The Hard Size Limit
# ---------------------------------------------------------
# 500 KB limit. Files larger than this bypass the Worker Agent.
MAX_FILE_SIZE_BYTES = 500 * 1024


class FileSanitizer:
    @staticmethod
    def is_ignored_directory(file_path: str) -> bool:
        """
        Checks if the file path contains any of the ignored directories.
        """
        # Standardize path separators for cross-platform support
        parts = file_path.replace("\\", "/").split("/")
        for part in parts:
            if part in IGNORE_DIRECTORIES:
                return True
        return False

    @staticmethod
    def should_ignore_file(file_path: str) -> bool:
        """
        Tier 1 Defense: Returns True if the file should be completely ignored 
        based on extension, exact name, or parent directory.
        """
        # 1. Check if it's inside a blacklisted directory
        if FileSanitizer.is_ignored_directory(file_path):
            return True
            
        filename = os.path.basename(file_path)
        
        # 2. Check exact filename (e.g., package-lock.json)
        if filename in IGNORE_NAMES:
            return True
            
        # 3. Check extension
        lower_path = file_path.lower()
        for ext in IGNORE_EXTENSIONS:
            if lower_path.endswith(ext):
                return True
                
        return False

    @staticmethod
    def is_too_large(file_size_bytes: int, file_path: str = "") -> bool:
        """
        Tier 2 Defense: Returns True if the file exceeds the maximum size limit.
        We have a global 500KB limit, but for highly repetitive markup/styling files (HTML, CSS),
        we lower the limit to 30KB to save API tokens and avoid rate limits on massive boilerplate layouts.
        """
        if file_path:
            lower_path = file_path.lower()
            if lower_path.endswith(".html") or lower_path.endswith(".css"):
                return file_size_bytes > 30 * 1024 # 30 KB limit for markup/styling
        return file_size_bytes > MAX_FILE_SIZE_BYTES

    @staticmethod
    def get_large_file_mock_summary() -> dict:
        """
        If a file is legitimate code but just too massive (Tier 2), 
        we generate this mock DB entry to save on token costs.
        """
        return {
            "summary": "File too large for deep analysis (exceeds 500KB). Appears to be a massive generated data or configuration file.",
            "issues": []
        }
