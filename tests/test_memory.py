import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.memory import GraphMemory, LatestMemory, rule_extract, extract_with_report
from backend.evaluate import run_eval
from backend.store import MemoryStore
from backend.app import app, store


class MemoryTests(unittest.TestCase):
    def test_retraction_and_returning_value(self):
        for factory in (GraphMemory, LatestMemory):
            with self.subTest(memory=factory.__name__):
                memory = factory()
                for timestamp, text in enumerate(["I live in Pune.", "I live in Delhi.", "I live in Pune."], 1):
                    memory.add(rule_extract(text), text, timestamp)
                self.assertEqual(memory.retrieve("Where do I live?"), ["user lives in pune"])
                memory.add([], "I no longer live in Pune.", 4)
                self.assertEqual(memory.retrieve("Where do I live?"), [])

    def test_attribution_and_historical_statements(self):
        for text in ["My friend says I live in Mumbai.", 'She said "I live in Mumbai."',
                     "I used to live in Mumbai.", "If I live in Mumbai.", "I might live in Mumbai."]:
            self.assertEqual(rule_extract(text), [], text)

    def test_irrelevant_facts_do_not_become_relevant_with_age(self):
        memory = GraphMemory()
        memory.add([("user", "lives_in", "pune")], "I live in Pune.", 10000)
        self.assertEqual(memory.retrieve("What is my favorite food?"), [])

    def test_llm_failure_is_not_silently_scored_as_rules(self):
        with patch("backend.memory.llm.chat", side_effect=RuntimeError("provider unavailable")):
            with self.assertRaises(RuntimeError):
                extract_with_report("I live in Pune.", model="configured-model", mode="llm")
        with patch("backend.memory.llm.chat", return_value='[["friend", "lives_in", "pune"]]'):
            with self.assertRaises(ValueError):
                extract_with_report("text", model="configured-model", mode="llm")

    def test_benchmark_is_reproducible_and_extracts_once(self):
        from backend.memory import extract_with_report as real_extract
        with patch("backend.evaluate.extract_with_report", wraps=real_extract) as extractor:
            results = run_eval(3)
            self.assertEqual(extractor.call_count, results["config"]["extraction_counts"]["rules"] + results["challenge_suite"]["extraction_calls"])
        self.assertEqual(results, run_eval(3))
        self.assertEqual(results["latest"]["accuracy"], results["graph"]["accuracy"])
        self.assertLess(results["graph_no_supersession"]["accuracy"], results["graph"]["accuracy"])
        self.assertIsNone(results["config"]["model"])
        for args in [(0, 8, 3), (1, 0, 3), (1, 8, -1)]:
            with self.assertRaises(ValueError):
                run_eval(*args)

    def test_forget_does_not_resurrect_superseded_values(self):
        with tempfile.TemporaryDirectory() as directory:
            memory_store = MemoryStore(Path(directory) / "memory.sqlite3")
            for value in ("pune", "delhi"):
                memory_store.operate("alice", "add", f"I live in {value}.", [("user", "lives_in", value)])
            memories = memory_store.operate("alice", "forget", forget=("user", "lives_in", "delhi"))
            self.assertEqual(memories["graph"].retrieve("Where do I live?"), [])
            self.assertEqual(memories["flat"].items, [])

    def test_persistence_isolation_and_source_deletion(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "memory.sqlite3"
            first = MemoryStore(path)
            first.operate("alice", "add", "I live in Pune. I like tea.",
                          [("user", "lives_in", "pune"), ("user", "likes", "tea")])
            second = MemoryStore(path)
            self.assertEqual(second.operate("alice")["graph"].retrieve("Where do I live?"), ["user lives in pune"])
            self.assertEqual(second.operate("bob")["graph"].edges, [])
            forgotten = second.operate("alice", "forget", forget=("user", "lives_in", "pune"))
            self.assertEqual(forgotten["graph"].edges, [])
            self.assertEqual(forgotten["flat"].items, [])
            second.operate("bob", "add", "I live in Delhi.", [("user", "lives_in", "delhi")])
            second.operate("alice", "reset")
            self.assertEqual(len(second.operate("bob")["graph"].edges), 1)


class ApiTests(unittest.TestCase):
    def test_browser_isolation_and_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"MEMGRAPH_DB": str(Path(directory)/"test.sqlite3"), "MEMGRAPH_EXTRACTION": "rules"}):
                store.cache_clear()
                try:
                    with patch("backend.app.llm.chat", side_effect=ValueError("offline")):
                        with TestClient(app) as alice, TestClient(app) as bob:
                            response = alice.post("/api/chat", json={"message": "I live in Pune."})
                            self.assertEqual(response.status_code, 200)
                            self.assertEqual(response.json()["generation"], "offline")
                            self.assertEqual(response.json()["extraction"]["mode"], "rules")
                            self.assertTrue(alice.get("/api/graph").json()["edges"])
                            self.assertEqual(bob.get("/api/graph").json()["edges"], [])
                            self.assertEqual(alice.post("/api/chat", json={"message": "hello", "memory": "bad"}).status_code, 422)
                            self.assertEqual(alice.post("/api/eval", json={"users": 0}).status_code, 422)
                            self.assertEqual(alice.post("/api/eval", json={"sessions": 100000}).status_code, 422)
                            alice.post("/api/facts/forget", json={"relation": "lives_in", "value": "pune"})
                            self.assertEqual(alice.get("/api/graph").json()["edges"], [])
                finally:
                    store.cache_clear()


if __name__ == "__main__":
    unittest.main()
