import sqlite3
import threading
from pathlib import Path

from app.domain.models import ScamCase


class SQLiteStore:
    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._connection = sqlite3.connect(self.path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        with self._lock, self._connection:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    id TEXT PRIMARY KEY,
                    document TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS reports (
                    case_id TEXT PRIMARY KEY,
                    document TEXT NOT NULL
                );
                """
            )

    def save_case(self, case: ScamCase) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO cases(id, document) VALUES (?, ?) "
                "ON CONFLICT(id) DO UPDATE SET document = excluded.document",
                (case.id, case.model_dump_json()),
            )

    def get_case(self, case_id: str) -> ScamCase | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT document FROM cases WHERE id = ?", (case_id,)
            ).fetchone()
        return ScamCase.model_validate_json(row["document"]) if row else None

    def save_report(self, case_id: str, report: str) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO reports(case_id, document) VALUES (?, ?) "
                "ON CONFLICT(case_id) DO UPDATE SET document = excluded.document",
                (case_id, report),
            )

    def report_count(self, case_id: str) -> int:
        with self._lock:
            row = self._connection.execute(
                "SELECT COUNT(*) AS count FROM reports WHERE case_id = ?", (case_id,)
            ).fetchone()
        return int(row["count"])
