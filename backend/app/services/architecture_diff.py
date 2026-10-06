import ast
import asyncio
import os
import re
import tempfile
from collections import defaultdict
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlparse

import git
from git import GitCommandError

from app.config import get_settings
from app.services.limiter import generate_content_with_fallback, space_request
from app.services.sanitizer import FileSanitizer, IGNORE_DIRECTORIES


HISTORY_DEPTH = 100
MAX_LISTED_COMMITS = 200
MAX_SOURCE_FILES = 1000
MAX_FILE_BYTES = 300 * 1024
MAX_TOTAL_SOURCE_BYTES = 30 * 1024 * 1024
MAX_GRAPH_NODES = 5000
MAX_GRAPH_EDGES = 6000

SOURCE_EXTENSIONS = {
    ".c", ".cc", ".cpp", ".cs", ".go", ".h", ".hpp", ".java", ".js",
    ".jsx", ".kt", ".mjs", ".php", ".py", ".rb", ".rs", ".ts", ".tsx",
}

JS_IMPORT_PATTERN = re.compile(
    r"\b(?:from\s*|import\s*\(|require\s*\()\s*['\"](\.{1,2}/[^'\"]+)['\"]"
)
JS_CLASS_PATTERN = re.compile(
    r"^\s*(?:(?:export|default|abstract)\s+)*(class|interface)\s+([A-Za-z_$][\w$]*)"
    r"(?:\s+extends\s+([A-Za-z_$][\w$.]*))?"
)
JAVA_IMPORT_PATTERN = re.compile(r"^\s*import\s+(?:static\s+)?([\w.]+)\s*;")


class ArchitectureDiffError(Exception):
    """An expected failure while fetching or analyzing repository history."""

    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


def validate_github_url(repo_url: str) -> None:
    parsed = urlparse(repo_url)
    if parsed.scheme in {"https", "http"} and parsed.hostname in {"github.com", "www.github.com"}:
        return
    if parsed.scheme == "ssh" and parsed.hostname == "github.com":
        return
    if re.fullmatch(r"git@github\.com:[\w.-]+/[\w.-]+(?:\.git)?", repo_url):
        return
    raise ArchitectureDiffError("Architecture Diff currently supports GitHub repository URLs only.", 422)


@contextmanager
def cloned_repository(repo_url: str):
    validate_github_url(repo_url)
    with tempfile.TemporaryDirectory(prefix="repoxray-architecture-") as temp_dir:
        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"
        env["GIT_SSH_COMMAND"] = "ssh -o BatchMode=yes"
        try:
            repository = git.Repo.clone_from(
                repo_url,
                temp_dir,
                depth=HISTORY_DEPTH,
                multi_options=["--no-single-branch"],
                env=env,
            )
        except (GitCommandError, git.InvalidGitRepositoryError) as error:
            raise ArchitectureDiffError(f"Could not fetch repository history: {error}", 502) from error
        try:
            yield repository
        finally:
            repository.close()


def _reference_labels(repository) -> dict[str, list[dict[str, str]]]:
    labels: dict[str, list[dict[str, str]]] = defaultdict(list)
    branch_refs = list(repository.branches)
    for remote in repository.remotes:
        branch_refs.extend(ref for ref in remote.refs if ref.name.rsplit("/", 1)[-1] != "HEAD")
    seen_refs = set()
    for branch in branch_refs:
        try:
            branch_name = branch.name
            if "/" in branch_name:
                branch_name = branch_name.split("/", 1)[1]
            key = (branch.commit.hexsha, branch_name)
            if key not in seen_refs:
                labels[branch.commit.hexsha].append({"name": branch_name, "type": "branch"})
                seen_refs.add(key)
        except (ValueError, GitCommandError):
            continue
    for tag in repository.tags:
        try:
            labels[tag.commit.hexsha].append({"name": tag.name, "type": "tag"})
        except (ValueError, GitCommandError):
            continue
    return labels


def _versions_from_repository(repository) -> dict:
    labels = _reference_labels(repository)
    versions = []
    seen = set()
    try:
        commits = repository.iter_commits("--all", max_count=MAX_LISTED_COMMITS)
        for commit in commits:
            if commit.hexsha in seen:
                continue
            seen.add(commit.hexsha)
            versions.append({
                "commit_id": commit.hexsha,
                "short_id": commit.hexsha[:10],
                "message": commit.message.strip().splitlines()[0][:160] if commit.message.strip() else "(no message)",
                "author": commit.author.name or "Unknown author",
                "committed_at": commit.committed_datetime.isoformat(),
                "refs": labels.get(commit.hexsha, []),
            })
    except (ValueError, GitCommandError):
        versions = []

    refs = []
    for sha, names in labels.items():
        for label in names:
            refs.append({**label, "commit_id": sha})
    refs.sort(key=lambda ref: (ref["type"], ref["name"].lower()))
    return {
        "commits": versions,
        "refs": refs,
        "history_available": bool(versions),
        "message": None if versions else "This repository has no commits available for comparison.",
        "history_limited": len(versions) >= MAX_LISTED_COMMITS,
    }


def list_repository_versions(repo_url: str) -> dict:
    with cloned_repository(repo_url) as repository:
        return _versions_from_repository(repository)


def _reachable_commit(repository, commit_id: str):
    if not re.fullmatch(r"[0-9a-fA-F]{7,40}", commit_id or ""):
        raise ArchitectureDiffError("Commit ID must be a hexadecimal Git commit hash.")
    try:
        commit = repository.commit(commit_id)
    except (ValueError, GitCommandError) as error:
        raise ArchitectureDiffError(f"Commit '{commit_id}' was not found in this repository history.") from error

    for reference in repository.references:
        try:
            repository.git.merge_base("--is-ancestor", commit.hexsha, reference.commit.hexsha)
            return commit
        except (GitCommandError, ValueError):
            continue
    raise ArchitectureDiffError(
        f"Commit '{commit_id}' is not reachable from a branch or tag in the fetched repository history."
    )


def _module_path_candidates(module_name: str) -> list[str]:
    if not module_name:
        return []
    base = module_name.replace(".", "/")
    return [f"{base}.py", f"{base}/__init__.py"]


def _python_imports(file_path: str, source: str) -> list[tuple[str, int, str]]:
    try:
        tree = ast.parse(source)
    except (SyntaxError, ValueError):
        return []

    imports = []
    package_parts = file_path.split("/")[:-1]
    if file_path.endswith("/__init__.py"):
        package_parts = file_path.split("/")[:-1]

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append((alias.name, node.lineno, f"import {alias.name}"))
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                parts = list(package_parts)
                parts = parts[: max(0, len(parts) - node.level + 1)]
            else:
                parts = []
            if node.module:
                parts.extend(node.module.split("."))
            module_name = ".".join(parts)
            description = f"from {'.' * node.level}{node.module or ''} import ..."
            imports.append((module_name, node.lineno, description))
            if node.module:
                for alias in node.names:
                    imports.append((f"{module_name}.{alias.name}", node.lineno, description))
    return imports


def _resolve_python_import(module_name: str, known_paths: set[str]) -> str | None:
    return next((candidate for candidate in _module_path_candidates(module_name) if candidate in known_paths), None)


def _resolve_js_import(file_path: str, module_name: str, known_paths: set[str]) -> str | None:
    base = (Path(file_path).parent / module_name).as_posix()
    candidates = [base, *(f"{base}{extension}" for extension in (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"))]
    candidates.extend(f"{base}/index{extension}" for extension in (".ts", ".tsx", ".js", ".jsx"))
    return next((candidate for candidate in candidates if candidate in known_paths), None)


def _source_files(root: str) -> tuple[list[tuple[str, str]], dict]:
    candidates = []
    for current_root, directories, filenames in os.walk(root):
        directories[:] = sorted(directory for directory in directories if directory not in IGNORE_DIRECTORIES)
        for filename in filenames:
            relative_path = os.path.relpath(os.path.join(current_root, filename), root).replace(os.sep, "/")
            if Path(filename).suffix.lower() in SOURCE_EXTENSIONS and not FileSanitizer.should_ignore_file(relative_path):
                candidates.append(relative_path)
    candidates.sort()

    sources = []
    skipped_oversized = 0
    total_bytes = 0
    truncated = False
    for relative_path in candidates:
        if len(sources) >= MAX_SOURCE_FILES:
            truncated = True
            break
        absolute_path = os.path.join(root, *relative_path.split("/"))
        file_size = os.path.getsize(absolute_path)
        if file_size > MAX_FILE_BYTES or total_bytes + file_size > MAX_TOTAL_SOURCE_BYTES:
            skipped_oversized += 1
            continue
        try:
            with open(absolute_path, "r", encoding="utf-8", errors="replace") as source_file:
                source = source_file.read().replace("\x00", "")
        except OSError:
            continue
        total_bytes += file_size
        sources.append((relative_path, source))

    if len(sources) < min(len(candidates), MAX_SOURCE_FILES) and total_bytes >= MAX_TOTAL_SOURCE_BYTES:
        truncated = True
    warnings = []
    if skipped_oversized:
        warnings.append(f"Skipped {skipped_oversized} source file(s) above the configured size budget.")
    if truncated:
        warnings.append("Analysis reached a configured repository size limit; graph results may be partial.")
    return sources, {
        "files_analyzed": len(sources),
        "files_skipped_oversized": skipped_oversized,
        "truncated": truncated,
        "warnings": warnings,
    }


def extract_architecture(root: str) -> dict:
    sources, analysis = _source_files(root)
    known_paths = {path for path, _ in sources}
    nodes: dict[str, dict] = {}
    edges: dict[str, dict] = {}
    python_classes: dict[str, list[tuple[str, str, int, list[str]]]] = defaultdict(list)
    class_name_paths: dict[str, list[str]] = defaultdict(list)

    def add_node(node: dict) -> None:
        if node["id"] in nodes or len(nodes) >= MAX_GRAPH_NODES:
            return
        nodes[node["id"]] = node

    def add_edge(source_id: str, target_id: str, edge_type: str, file_path: str, line: int, excerpt: str) -> None:
        if len(edges) >= MAX_GRAPH_EDGES:
            analysis["truncated"] = True
            return
        edge_id = f"{edge_type}:{source_id}->{target_id}"
        edges.setdefault(edge_id, {
            "id": edge_id,
            "source": source_id,
            "target": target_id,
            "type": edge_type,
            "evidence": [{"file_path": file_path, "line": line, "excerpt": excerpt[:240]}],
        })

    for file_path, source in sources:
        file_id = f"file:{file_path}"
        add_node({
            "id": file_id,
            "label": file_path.rsplit("/", 1)[-1],
            "type": "file",
            "file_path": file_path,
            "evidence": [{"file_path": file_path, "line": 1, "excerpt": "Source file"}],
        })
        lines = source.splitlines()
        if file_path.endswith(".py"):
            try:
                tree = ast.parse(source)
            except (SyntaxError, ValueError):
                tree = None
            if tree:
                for item in ast.walk(tree):
                    if isinstance(item, ast.ClassDef):
                        bases = [ast.unparse(base).split(".")[-1] for base in item.bases]
                        python_classes[file_path].append((item.name, "class", item.lineno, bases))
                        class_name_paths[item.name].append(file_path)
        elif file_path.endswith((".js", ".jsx", ".mjs", ".ts", ".tsx")):
            for line_number, line in enumerate(lines, 1):
                match = JS_CLASS_PATTERN.match(line)
                if match:
                    kind, name, base = match.groups()
                    python_classes[file_path].append((name, kind.lower(), line_number, [base.split(".")[-1]] if base else []))
                    class_name_paths[name].append(file_path)

    for file_path, declarations in python_classes.items():
        file_id = f"file:{file_path}"
        for name, kind, line_number, bases in declarations:
            class_id = f"{kind}:{file_path}#{name}"
            add_node({
                "id": class_id,
                "label": name,
                "type": kind,
                "file_path": file_path,
                "evidence": [{"file_path": file_path, "line": line_number, "excerpt": f"{kind} {name}"}],
            })
            if class_id in nodes:
                add_edge(file_id, class_id, "contains", file_path, line_number, f"{kind} {name}")
            for base_name in bases:
                matches = class_name_paths.get(base_name, [])
                if len(matches) == 1:
                    target_id = next(
                        (f"{candidate_kind}:{matches[0]}#{base_name}"
                         for candidate_name, candidate_kind, _, _ in python_classes[matches[0]]
                         if candidate_name == base_name),
                        None,
                    )
                    if target_id:
                        add_edge(class_id, target_id, "inherits", file_path, line_number, f"{name} extends {base_name}")

    for file_path, source in sources:
        extension = Path(file_path).suffix.lower()
        if extension == ".py":
            imports = _python_imports(file_path, source)
            for module_name, line_number, excerpt in imports:
                target = _resolve_python_import(module_name, known_paths)
                if target:
                    add_edge(f"file:{file_path}", f"file:{target}", "imports", file_path, line_number, excerpt)
        elif extension in {".js", ".jsx", ".mjs", ".ts", ".tsx"}:
            for line_number, line in enumerate(source.splitlines(), 1):
                for match in JS_IMPORT_PATTERN.finditer(line):
                    target = _resolve_js_import(file_path, match.group(1), known_paths)
                    if target:
                        add_edge(f"file:{file_path}", f"file:{target}", "imports", file_path, line_number, line.strip())
        elif extension == ".java":
            for line_number, line in enumerate(source.splitlines(), 1):
                match = JAVA_IMPORT_PATTERN.match(line)
                if match:
                    target = match.group(1).replace(".", "/") + ".java"
                    if target in known_paths:
                        add_edge(f"file:{file_path}", f"file:{target}", "imports", file_path, line_number, line.strip())

    if len(nodes) >= MAX_GRAPH_NODES or len(edges) >= MAX_GRAPH_EDGES:
        analysis["truncated"] = True
        analysis["warnings"].append("The graph reached a configured node or relationship limit.")
    analysis["warnings"] = list(dict.fromkeys(analysis["warnings"]))
    return {"nodes": list(nodes.values()), "edges": list(edges.values()), "analysis": analysis}


def _mark_graph(graph: dict, node_status: dict[str, str], edge_status: dict[str, str]) -> dict:
    return {
        **graph,
        "nodes": [{**node, "status": node_status.get(node["id"], "unchanged")} for node in graph["nodes"]],
        "edges": [{**edge, "status": edge_status.get(edge["id"], "unchanged")} for edge in graph["edges"]],
    }


def compare_architectures(base_graph: dict, target_graph: dict) -> dict:
    base_nodes = {node["id"]: node for node in base_graph["nodes"]}
    target_nodes = {node["id"]: node for node in target_graph["nodes"]}
    base_edges = {edge["id"]: edge for edge in base_graph["edges"]}
    target_edges = {edge["id"]: edge for edge in target_graph["edges"]}

    added_nodes = [target_nodes[node_id] for node_id in sorted(target_nodes.keys() - base_nodes.keys())]
    removed_nodes = [base_nodes[node_id] for node_id in sorted(base_nodes.keys() - target_nodes.keys())]
    added_edges = [target_edges[edge_id] for edge_id in sorted(target_edges.keys() - base_edges.keys())]
    removed_edges = [base_edges[edge_id] for edge_id in sorted(base_edges.keys() - target_edges.keys())]

    modified_ids = set()
    for edge in added_edges + removed_edges:
        for node_id in (edge["source"], edge["target"]):
            if node_id in base_nodes and node_id in target_nodes:
                modified_ids.add(node_id)

    modified_nodes = []
    for node_id in sorted(modified_ids):
        node = target_nodes[node_id]
        related_changes = [
            {"change": "added", "relationship": edge}
            for edge in added_edges if node_id in {edge["source"], edge["target"]}
        ] + [
            {"change": "removed", "relationship": edge}
            for edge in removed_edges if node_id in {edge["source"], edge["target"]}
        ]
        modified_nodes.append({**node, "changes": related_changes})

    base_node_status = {node_id: "removed" for node_id in base_nodes.keys() - target_nodes.keys()}
    target_node_status = {node_id: "added" for node_id in target_nodes.keys() - base_nodes.keys()}
    for node_id in modified_ids:
        base_node_status[node_id] = "modified"
        target_node_status[node_id] = "modified"
    base_edge_status = {edge_id: "removed" for edge_id in base_edges.keys() - target_edges.keys()}
    target_edge_status = {edge_id: "added" for edge_id in target_edges.keys() - base_edges.keys()}

    graph_warnings = list(dict.fromkeys(
        base_graph.get("analysis", {}).get("warnings", []) + target_graph.get("analysis", {}).get("warnings", [])
    ))
    return {
        "base_graph": _mark_graph(base_graph, base_node_status, base_edge_status),
        "target_graph": _mark_graph(target_graph, target_node_status, target_edge_status),
        "added_components": added_nodes,
        "removed_components": removed_nodes,
        "modified_components": modified_nodes,
        "added_relationships": added_edges,
        "removed_relationships": removed_edges,
        "summary": {
            "added_components": len(added_nodes),
            "removed_components": len(removed_nodes),
            "modified_components": len(modified_nodes),
            "added_relationships": len(added_edges),
            "removed_relationships": len(removed_edges),
        },
        "warnings": graph_warnings,
    }


def _evidence_for_explanation(diff: dict) -> list[dict]:
    evidence = []
    groups = (
        diff["added_components"], diff["removed_components"], diff["modified_components"],
        diff["added_relationships"], diff["removed_relationships"],
    )
    seen = set()
    for group in groups:
        for item in group:
            for reference in item.get("evidence", []):
                key = (reference.get("file_path"), reference.get("line"), reference.get("excerpt"))
                if key not in seen:
                    seen.add(key)
                    evidence.append(reference)
                    if len(evidence) >= 40:
                        return evidence
    return evidence


async def explain_architecture_diff(diff: dict) -> dict:
    facts = {
        "summary": diff["summary"],
        "added_components": [
            {"id": item["id"], "type": item["type"], "file_path": item["file_path"]}
            for item in diff["added_components"]
        ],
        "removed_components": [
            {"id": item["id"], "type": item["type"], "file_path": item["file_path"]}
            for item in diff["removed_components"]
        ],
        "modified_components": [
            {"id": item["id"], "file_path": item["file_path"], "changes": item["changes"]}
            for item in diff["modified_components"]
        ],
        "added_relationships": diff["added_relationships"],
        "removed_relationships": diff["removed_relationships"],
        "evidence": _evidence_for_explanation(diff),
    }
    prompt = f"""
You are explaining a programmatically detected architecture diff. Treat the supplied graph changes as facts.
Use simple language and cite exact evidence file paths. Do not claim a service, API, or runtime behavior unless
the evidence demonstrates it. Clearly separate detected facts from possible implications. If evidence is
insufficient, say so. Return concise Markdown with sections: Architecture Evolution, Detected Facts,
Possible Implications, and Evidence.

STRUCTURED DIFF AND SOURCE EVIDENCE:
{facts}
"""
    try:
        settings = get_settings()
        await space_request()
        explanation = await generate_content_with_fallback(settings.GEMINI_MODEL_REDUCE, prompt)
        return {"status": "available", "text": explanation}
    except Exception as error:
        return {
            "status": "unavailable",
            "text": "The structural comparison completed, but Gemini could not generate an explanation.",
            "error": str(error)[:240],
        }


def compare_repository_commits(repo_url: str, base_commit_id: str, target_commit_id: str) -> dict:
    with cloned_repository(repo_url) as repository:
        base_commit = _reachable_commit(repository, base_commit_id)
        target_commit = _reachable_commit(repository, target_commit_id)
        if base_commit.hexsha == target_commit.hexsha:
            raise ArchitectureDiffError("Choose two different commits to compare.")

        try:
            repository.git.checkout("--detach", base_commit.hexsha)
            base_graph = extract_architecture(repository.working_tree_dir)
            repository.git.checkout("--detach", target_commit.hexsha)
            target_graph = extract_architecture(repository.working_tree_dir)
        except GitCommandError as error:
            raise ArchitectureDiffError(f"Could not check out a selected commit: {error}") from error

    return compare_architectures(base_graph, target_graph)


async def compare_and_explain(repo_url: str, base_commit_id: str, target_commit_id: str) -> dict:
    diff = await asyncio.to_thread(compare_repository_commits, repo_url, base_commit_id, target_commit_id)
    diff["explanation"] = await explain_architecture_diff(diff)
    return diff