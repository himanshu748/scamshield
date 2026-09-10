from fastapi.testclient import TestClient

from app.main import create_app
from app.storage.sqlite import SQLiteStore


def test_health_reports_fixture_mode(tmp_path) -> None:
    client = TestClient(create_app(store=SQLiteStore(tmp_path / "health.sqlite3")))
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "service": "scamshield",
        "status": "ok",
        "fixture_mode": True,
        "model_configured": False,
        "runtime_mode": "local",
        "model_access": "disabled",
        "storage_mode": "local_sqlite",
        "aws_calls_enabled": False,
        "max_request_bytes": 262144,
    }
