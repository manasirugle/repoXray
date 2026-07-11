import time
from collections import defaultdict

# In-memory log store: maps repo_url -> list of {timestamp, message} entries
_pipeline_logs: dict[str, list[dict]] = defaultdict(list)

def add_pipeline_log(repo_url: str, message: str):
    """Append a timestamped log entry for a repository pipeline."""
    _pipeline_logs[repo_url].append({
        "time": time.strftime("%H:%M:%S"),
        "message": message
    })
    print(f"[LOG] {message}")

def get_pipeline_logs(repo_url: str) -> list[dict]:
    """Return all log entries for a repository."""
    return _pipeline_logs.get(repo_url, [])

def clear_pipeline_logs(repo_url: str):
    """Clear all log entries for a repository."""
    if repo_url in _pipeline_logs:
        del _pipeline_logs[repo_url]
