"""SQLite-backed browser-session event storage for the local research prototype."""
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from .memory import FlatMemory, GraphMemory, LatestMemory, retractions, FUNCTIONAL


class MemoryStore:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            connection.execute("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, session TEXT NOT NULL, utterance TEXT NOT NULL, facts TEXT NOT NULL)")
            connection.execute("CREATE INDEX IF NOT EXISTS events_session ON events(session)")

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path, timeout=10)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def operate(self, session, action="read", utterance="", facts=None, forget=None):
        # Serialize replay and modification across threads/processes; no lost snapshots.
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            if action == "reset":
                connection.execute("DELETE FROM events WHERE session = ?", (session,))
            elif action == "add":
                connection.execute("INSERT INTO events(session, utterance, facts) VALUES (?, ?, ?)",
                                   (session, utterance, json.dumps(facts or [])))
            rows = connection.execute("SELECT id, utterance, facts FROM events WHERE session = ? ORDER BY id", (session,)).fetchall()
            if action == "forget":
                retained = []
                for row in rows:
                    row_facts = json.loads(row[2])
                    assertions = [tuple(fact) for fact in row_facts] + retractions(row[1])
                    if any(fact == tuple(forget) or (FUNCTIONAL(forget[1]) and fact[:2] == tuple(forget[:2])) for fact in assertions):
                        # Remove the whole source turn, including its raw lexical context.
                        connection.execute("DELETE FROM events WHERE id = ? AND session = ?", (row[0], session))
                    else:
                        retained.append(row)
                rows = retained
            memories = {"flat": FlatMemory(), "latest": LatestMemory(), "graph": GraphMemory()}
            for timestamp, (_, text, serialized) in enumerate(rows, 1):
                for memory in memories.values():
                    memory.add(json.loads(serialized), text, timestamp)
            return memories
