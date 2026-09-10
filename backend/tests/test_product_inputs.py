from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_custom_message_history_report_and_delete(tmp_path):
    path = tmp_path / "cases.db"
    client = TestClient(create_app(Settings(database_path=path)))
    result = client.post(
        "/api/cases",
        json={
            "channel": "email",
            "sender": "person@example.com",
            "content": (
                "Urgent: verify your password now at https://account.example. "
                "Contact test@example.com"
            ),
            "received_at": "2027-10-07T10:00:00Z",
        },
    )
    assert result.status_code == 201
    case = result.json()
    assert "test@example.com" not in case["redacted_content"]
    assert client.get("/api/cases").json()[0]["id"] == case["id"]
    reopened = TestClient(create_app(Settings(database_path=path)))
    assert reopened.get("/api/cases/" + case["id"]).status_code == 200
    report = client.post(
        "/api/cases/" + case["id"] + "/decision",
        json={"approval_id": case["approval_id"], "choice": "approved"},
    )
    assert report.json()["report"]
    assert client.delete("/api/cases/" + case["id"]).status_code == 200
    assert client.get("/api/cases/" + case["id"]).status_code == 404
    assert client.get("/api/cases").json() == []
    assert client.get("/api/cases/" + case["id"] + "/report-count").json()["count"] == 0


def test_blank_message_is_rejected_before_case_storage(tmp_path):
    client = TestClient(create_app(Settings(database_path=tmp_path / "blank.db")))
    response = client.post(
        "/api/cases",
        json={
            "sender": "Sender",
            "content": "   \n\t",
            "received_at": "2026-09-08T10:00:00Z",
        },
    )
    assert response.status_code == 422
    assert client.get("/api/cases").json() == []
