from fastapi.testclient import TestClient

from app.main import create_app
from app.storage.sqlite import SQLiteStore


def test_api_keeps_report_boundary_explicit(tmp_path) -> None:
    client = TestClient(create_app(store=SQLiteStore(tmp_path / "api.sqlite3")))
    message = client.get("/api/demo-messages/high-risk").json()
    created = client.post("/api/cases", json=message)
    assert created.status_code == 201
    case = created.json()
    assert case["assessment"]["level"] == "high_risk"
    assert client.get(f"/api/cases/{case['id']}/report-count").json()["count"] == 0

    approved = client.post(
        f"/api/cases/{case['id']}/decision",
        json={"approval_id": case["approval_id"], "choice": "approved"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "report_generated"
    assert client.get(f"/api/cases/{case['id']}/report-count").json()["count"] == 1


def test_demo_scenarios_cover_all_risk_states(tmp_path) -> None:
    client = TestClient(create_app(store=SQLiteStore(tmp_path / "states.sqlite3")))
    levels = set()
    for scenario in ("high-risk", "needs-context", "low-risk"):
        message = client.get(f"/api/demo-messages/{scenario}").json()
        levels.add(client.post("/api/cases", json=message).json()["assessment"]["level"])
    assert levels == {"high_risk", "needs_context", "low_risk"}
