import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import git

from app.services import architecture_diff as architecture


class ArchitectureGraphTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def write(self, path: str, content: str):
        file_path = self.root / path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")

    def test_extracts_imports_and_classes_with_file_evidence(self):
        self.write("app/main.py", "from app.service import UserService\n\nclass Main:\n    pass\n")
        self.write("app/service.py", "class UserService:\n    pass\n")

        graph = architecture.extract_architecture(str(self.root))
        edge_types = {edge["type"] for edge in graph["edges"]}
        node_ids = {node["id"] for node in graph["nodes"]}

        self.assertIn("imports", edge_types)
        self.assertIn("contains", edge_types)
        self.assertIn("class:app/main.py#Main", node_ids)
        import_edge = next(edge for edge in graph["edges"] if edge["type"] == "imports")
        self.assertEqual(import_edge["evidence"][0]["line"], 1)

    def test_empty_repository_produces_empty_graph(self):
        graph = architecture.extract_architecture(str(self.root))
        self.assertEqual(graph["nodes"], [])
        self.assertEqual(graph["edges"], [])

    def test_graph_comparison_finds_added_removed_edges_and_modified_nodes(self):
        base = {
            "nodes": [{"id": "file:a.py", "label": "a.py", "type": "file", "file_path": "a.py", "evidence": []},
                      {"id": "file:b.py", "label": "b.py", "type": "file", "file_path": "b.py", "evidence": []}],
            "edges": [{"id": "imports:file:a.py->file:b.py", "source": "file:a.py", "target": "file:b.py", "type": "imports", "evidence": []}],
            "analysis": {"warnings": []},
        }
        target = {
            "nodes": [{"id": "file:a.py", "label": "a.py", "type": "file", "file_path": "a.py", "evidence": []},
                      {"id": "file:c.py", "label": "c.py", "type": "file", "file_path": "c.py", "evidence": []}],
            "edges": [{"id": "imports:file:a.py->file:c.py", "source": "file:a.py", "target": "file:c.py", "type": "imports", "evidence": []}],
            "analysis": {"warnings": []},
        }

        result = architecture.compare_architectures(base, target)
        self.assertEqual(result["summary"]["added_components"], 1)
        self.assertEqual(result["summary"]["removed_components"], 1)
        self.assertEqual(result["summary"]["modified_components"], 1)
        self.assertEqual(result["summary"]["added_relationships"], 1)
        self.assertEqual(result["summary"]["removed_relationships"], 1)
        self.assertEqual(result["modified_components"][0]["id"], "file:a.py")

    def test_content_only_evidence_changes_are_not_architecture_modifications(self):
        base = {
            "nodes": [{"id": "file:a.py", "label": "a.py", "type": "file", "file_path": "a.py",
                       "evidence": [{"file_path": "a.py", "line": 1, "excerpt": "old implementation"}]}],
            "edges": [],
            "analysis": {"warnings": []},
        }
        target = {
            "nodes": [{"id": "file:a.py", "label": "a.py", "type": "file", "file_path": "a.py",
                       "evidence": [{"file_path": "a.py", "line": 1, "excerpt": "new implementation"}]}],
            "edges": [],
            "analysis": {"warnings": []},
        }
        result = architecture.compare_architectures(base, target)
        self.assertEqual(result["summary"]["modified_components"], 0)

    def test_large_source_set_is_capped_and_reported(self):
        self.write("a.py", "pass\n")
        self.write("b.py", "pass\n")
        with patch.object(architecture, "MAX_SOURCE_FILES", 1):
            graph = architecture.extract_architecture(str(self.root))
        self.assertEqual(graph["analysis"]["files_analyzed"], 1)
        self.assertTrue(graph["analysis"]["truncated"])


class GitHistoryTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.source = self.root / "source"
        self.source.mkdir()
        self.repository = git.Repo.init(self.source)
        with self.repository.config_writer() as config:
            config.set_value("user", "name", "RepoXray Test")
            config.set_value("user", "email", "test@example.com")
        (self.source / "app.py").write_text("class Start:\n    pass\n", encoding="utf-8")
        self.repository.index.add(["app.py"])
        self.first_commit = self.repository.index.commit("Initial architecture")
        self.repository.create_tag("v1.0", ref=self.first_commit)
        (self.source / "app.py").write_text("class Start:\n    pass\n\nclass Next:\n    pass\n", encoding="utf-8")
        self.repository.index.add(["app.py"])
        self.second_commit = self.repository.index.commit("Add component")

    def tearDown(self):
        self.repository.close()
        self.temp_dir.cleanup()

    def test_commit_retrieval_and_comparison(self):
        with patch.object(architecture, "validate_github_url"):
            versions = architecture.list_repository_versions(str(self.source))
            result = architecture.compare_repository_commits(
                str(self.source), self.first_commit.hexsha, self.second_commit.hexsha
            )
        self.assertTrue(versions["history_available"])
        self.assertEqual(len(versions["commits"]), 2)
        self.assertIn("tag", {ref["type"] for ref in versions["refs"]})
        self.assertIn("branch", {ref["type"] for ref in versions["refs"]})
        self.assertEqual(result["summary"]["added_components"], 1)

    def test_invalid_commit_is_rejected(self):
        with patch.object(architecture, "validate_github_url"):
            with self.assertRaises(architecture.ArchitectureDiffError):
                architecture.compare_repository_commits(str(self.source), "0" * 40, self.second_commit.hexsha)

    def test_repository_without_history_is_reported_gracefully(self):
        empty_path = self.root / "empty"
        empty_path.mkdir()
        empty_repository = git.Repo.init(empty_path)
        try:
            result = architecture._versions_from_repository(empty_repository)
        finally:
            empty_repository.close()
        self.assertFalse(result["history_available"])
        self.assertEqual(result["commits"], [])
        self.assertIsNotNone(result["message"])

    def test_same_commit_is_rejected(self):
        with patch.object(architecture, "validate_github_url"):
            with self.assertRaises(architecture.ArchitectureDiffError):
                architecture.compare_repository_commits(str(self.source), self.first_commit.hexsha, self.first_commit.hexsha)


class GeminiFailureTests(unittest.IsolatedAsyncioTestCase):
    async def test_gemini_failure_does_not_hide_structural_result(self):
        empty_diff = {
            "summary": {"added_components": 0, "removed_components": 0, "modified_components": 0,
                        "added_relationships": 0, "removed_relationships": 0},
            "added_components": [], "removed_components": [], "modified_components": [],
            "added_relationships": [], "removed_relationships": [],
        }
        with patch.object(architecture, "generate_content_with_fallback", side_effect=RuntimeError("quota")):
            result = await architecture.explain_architecture_diff(empty_diff)
        self.assertEqual(result["status"], "unavailable")
        self.assertIn("structural comparison completed", result["text"])


if __name__ == "__main__":
    unittest.main()