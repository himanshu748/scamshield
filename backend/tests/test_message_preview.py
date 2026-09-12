from unittest.mock import Mock

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def message():
    return {
        "channel": "email",
        "sender": "person@example.com",
        "sender_confirmed": False,
        "received_at": "2027-10-07T10:00:00Z",
        "content": "Urgent OTP: 839201. Open https://bank.example/verify?token=fictional-token",
    }


def test_preview_masks_the_same_fields_without_advice_or_saved_cases(tmp_path):
    app = create_app(Settings(database_path=tmp_path / "preview.db"))
    advisor = Mock()
    app.state.workflow.advisor = advisor
    client = TestClient(app)
    result = client.post("/api/messages/preview", json=message())
    assert result.status_code == 200
    preview = result.json()
    assert preview["sender"] == "p•••@example.com"
    assert "839201" not in preview["content"]
    assert "fictional-token" not in preview["content"]
    assert "https://bank.example/[URL-details-removed]" in preview["content"]
    assert preview["channel"] == "email" and preview["sender_confirmed"] is False
    advisor.advise.assert_not_called()
    assert client.get("/api/cases").json() == []


def test_preview_matches_the_message_data_received_by_an_advisor(tmp_path):
    from app.agent.orchestrator import FixtureAdvisor

    app = create_app(Settings(database_path=tmp_path / "parity.db"))
    advisor = Mock(wraps=FixtureAdvisor())
    app.state.workflow.advisor = advisor
    client = TestClient(app)
    preview = client.post("/api/messages/preview", json=message()).json()
    case = client.post("/api/cases", json=message())
    assert case.status_code == 201
    assert advisor.advise.call_args.args[0].model_dump(mode="json") == preview
    assert case.json()["request"] == preview


def test_invalid_preview_is_rejected_without_persistence(tmp_path):
    app = create_app(Settings(database_path=tmp_path / "invalid.db"))
    client = TestClient(app)
    for content in (" \n ", "x" * 10_001):
        assert (
            client.post("/api/messages/preview", json={**message(), "content": content}).status_code
            == 422
        )
    assert client.get("/api/cases").json() == []
