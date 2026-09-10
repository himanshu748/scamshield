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
            self._connection.execute("PRAGMA secure_delete = ON")
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

    def list_cases(self) -> list[ScamCase]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT document FROM cases ORDER BY rowid DESC LIMIT 50"
            ).fetchall()
        return [ScamCase.model_validate_json(row["document"]) for row in rows]

    def delete_case(self, case_id: str) -> bool:
        with self._lock, self._connection:
            self._connection.execute("DELETE FROM reports WHERE case_id = ?", (case_id,))
            result = self._connection.execute("DELETE FROM cases WHERE id = ?", (case_id,))
        return result.rowcount > 0

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

    def finalize_case(self, revised: ScamCase) -> None:
        """Commit the approval decision and optional report as one conditional transaction."""
        with self._lock, self._connection:
            # Conditional UPDATE also protects against another process/store connection.
            result = self._connection.execute(
                "UPDATE cases SET document = ? WHERE id = ? "
                "AND json_extract(document, '$.status') = 'waiting_for_approval'",
                (revised.model_dump_json(), revised.id),
            )
            if result.rowcount != 1:
                raise ValueError("case is not waiting for approval")
            if revised.report is not None:
                self._connection.execute(
                    "INSERT INTO reports(case_id, document) VALUES (?, ?)",
                    (revised.id, revised.report),
                )

    def report_count(self, case_id: str) -> int:
        with self._lock:
            row = self._connection.execute(
                "SELECT COUNT(*) AS count FROM reports WHERE case_id = ?", (case_id,)
            ).fetchone()
        return int(row["count"])
