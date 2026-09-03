from datetime import UTC, datetime

import pytest

from app.agent.orchestrator import REPORT_APPROVAL_ID, ScamWorkflow
from app.domain.models import MessageRequest
from app.storage.sqlite import SQLiteStore


def suspicious_message() -> MessageRequest:
    return MessageRequest(
        sender="+1 833 555 0198",
        content=(
            "URGENT verify your identity now at https://secure-nw-bank.com or access is suspended"
        ),
        received_at=datetime.now(UTC),
    )


def test_report_requires_exact_approval_and_persists_once(tmp_path) -> None:
    store = SQLiteStore(tmp_path / "workflow.sqlite3")
    workflow = ScamWorkflow(store=store)
    case = workflow.analyze(suspicious_message())
    assert case.assessment.level == "high_risk"
    assert store.report_count(case.id) == 0

    with pytest.raises(ValueError, match="approval id"):
        workflow.decide(case.id, approval_id="wrong", choice="approved")

    approved = workflow.decide(case.id, approval_id=REPORT_APPROVAL_ID, choice="approved")
    assert approved.status == "report_generated"
    assert "Generated locally" in approved.report
    assert store.report_count(case.id) == 1


def test_rejection_generates_no_report(tmp_path) -> None:
    store = SQLiteStore(tmp_path / "rejection.sqlite3")
    workflow = ScamWorkflow(store=store)
    case = workflow.analyze(suspicious_message())
    rejected = workflow.decide(case.id, approval_id=REPORT_APPROVAL_ID, choice="rejected")
    assert rejected.status == "report_rejected"
    assert store.report_count(case.id) == 0


def test_only_redacted_content_reaches_advisor_and_storage(tmp_path) -> None:
    class RecordingAdvisor:
        seen: MessageRequest | None = None

        def advise(self, request: MessageRequest):
            from app.agent.orchestrator import FixtureAdvisor

            self.seen = request
            return FixtureAdvisor().advise(request)

    advisor = RecordingAdvisor()
    store = SQLiteStore(tmp_path / "redaction.sqlite3")
    workflow = ScamWorkflow(store=store, advisor=advisor)
    case = workflow.analyze(suspicious_message())

    assert "555 0198" not in case.request.sender
    assert "555 0198" not in case.model_dump_json()
    assert advisor.seen is not None
    assert "555 0198" not in advisor.seen.sender
