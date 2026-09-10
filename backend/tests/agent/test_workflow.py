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


def test_decision_and_report_are_atomic_across_connections(tmp_path) -> None:
    from concurrent.futures import ThreadPoolExecutor

    path = tmp_path / "race.sqlite3"
    store = SQLiteStore(path)
    workflow = ScamWorkflow(store=store)
    case = workflow.analyze(suspicious_message())
    other = ScamWorkflow(store=SQLiteStore(path))

    def decide(worker, choice):
        try:
            return worker.decide(case.id, approval_id=REPORT_APPROVAL_ID, choice=choice)
        except ValueError:
            return None

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(decide, workflow, "approved"),
            pool.submit(decide, other, "rejected"),
        ]
        results = [future.result() for future in futures]
    assert sum(result is not None for result in results) == 1
    saved = store.get_case(case.id)
    assert saved is not None
    assert store.report_count(case.id) == (1 if saved.status == "report_generated" else 0)


def test_explicit_secrets_and_url_tokens_never_reach_storage_or_advisor(tmp_path) -> None:
    class RecordingAdvisor:
        def advise(self, request):
            assert "secret-value" not in request.model_dump_json()
            assert "123456" not in request.model_dump_json()
            return FixtureAdvisor().advise(request)

    from app.agent.orchestrator import FixtureAdvisor

    store = SQLiteStore(tmp_path / "secrets.sqlite3")
    case = ScamWorkflow(store=store, advisor=RecordingAdvisor()).analyze(
        MessageRequest(
            sender="Sender",
            content=(
                "OTP 123456; password: secret-value; "
                "https://example.com/secret-value?token=secret-value"
            ),
            received_at=datetime.now(UTC),
        )
    )
    assert "secret-value" not in case.model_dump_json()
    assert "123456" not in case.model_dump_json()
    saved = store.get_case(case.id)
    assert saved is not None and "secret-value" not in saved.model_dump_json()


@pytest.mark.parametrize(
    "message",
    [
        "Verification code:123456",
        "Verification code=123456",
        "Passcode 654321",
    ],
)
def test_named_codes_do_not_reach_advisor_or_saved_case(tmp_path, message) -> None:
    from app.agent.orchestrator import FixtureAdvisor

    class RecordingAdvisor:
        def advise(self, request):
            assert "123456" not in request.model_dump_json()
            assert "654321" not in request.model_dump_json()
            return FixtureAdvisor().advise(request)

    store = SQLiteStore(tmp_path / "codes.sqlite3")
    case = ScamWorkflow(store=store, advisor=RecordingAdvisor()).analyze(
        MessageRequest(sender="Sender", content=message, received_at=datetime.now(UTC))
    )
    saved = store.get_case(case.id)
    assert saved is not None
    serialized = saved.model_dump_json()
    assert "123456" not in serialized and "654321" not in serialized
