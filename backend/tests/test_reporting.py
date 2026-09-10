from datetime import datetime

import pytest

from app.agent.orchestrator import REPORT_APPROVAL_ID, ScamWorkflow
from app.domain.models import AgentAdvice, MessageRequest
from app.storage.sqlite import SQLiteStore


class LocalAdvisor:
    def advise(self, request: MessageRequest) -> AgentAdvice:
        return AgentAdvice(summary="Review the saved evidence.", prioritized_check_ids=[])


def saved_case(tmp_path, *, confirmed=False, content=None, sender="Private sender name"):
    store = SQLiteStore(tmp_path / "report.sqlite3")
    workflow = ScamWorkflow(store=store, advisor=LocalAdvisor())
    request = MessageRequest(
        channel="email",
        sender=sender,
        content=content
        or "Urgent: verify your identity at https://secure-bank.example or be suspended.",
        received_at=datetime.fromisoformat("2026-09-08T10:15:00+05:30"),
        sender_confirmed=confirmed,
    )
    return store, workflow, workflow.analyze(request)


def approve(workflow, case):
    return workflow.decide(case.id, approval_id=REPORT_APPROVAL_ID, choice="approved")


def test_high_risk_report_preserves_every_check_and_separates_unknowns(tmp_path):
    store, workflow, case = saved_case(tmp_path)
    assert case.assessment.level == "high_risk"
    assert case.report is None and store.report_count(case.id) == 0

    # Approval uses the persisted evidence even in a fresh workflow instance.
    reopened = ScamWorkflow(store=SQLiteStore(store.path), advisor=LocalAdvisor())
    report = approve(reopened, case).report
    assert report is not None
    assert "rule index 76/100; not a fraud probability" in report
    assert "not independently calibrated" in report
    assert "## Warning checks" in report and "## Unresolved evidence" in report
    unresolved = report.split("## Unresolved evidence\n")[1].split("## Checks with no signal")[0]
    assert "check-domain-1" in unresolved and "check-sender" in unresolved
    assert "check-pressure" not in unresolved
    for check in case.checks:
        assert report.count(check.id) == 1
        assert check.label in report
        assert check.source in report
        assert f"Result: {check.result}" in report
    for step in case.assessment.safety_steps:
        assert step in report
    assert "Channel: EMAIL (user-provided)" in report
    assert "Request timestamp: 2026-09-08T10:15:00+05:30" in report
    assert "The browser form uses submission time" in report
    assert "not independently verified as the message's receipt time" in report
    assert "Message received at:" not in report
    assert f"Analysis recorded at: {case.events[0].created_at.isoformat()}" in report
    assert "user has not reported independently confirming the sender" in report
    assert "Redaction can miss sensitive information: review this report before sharing" in report
    assert "domain ownership was not verified" in report


def test_low_risk_report_attributes_sender_confirmation_to_user(tmp_path):
    _, workflow, case = saved_case(
        tmp_path, confirmed=True, content="Your reserved book is ready for collection."
    )
    assert case.assessment.level == "low_risk"
    report = approve(workflow, case).report
    assert report is not None
    assert "The user reports independently confirming the sender" in report
    assert "user-provided context, not technical authentication" in report
    assert "No unknown results in the stored local checks" in report
    assert "Low risk does not establish authenticity or guarantee safety" in report
    assert "User-provided context" in report
    assert "Private sender name" not in report
    assert case.request.content not in report


def test_report_omits_original_message_sender_and_detected_secrets(tmp_path):
    _, workflow, case = saved_case(
        tmp_path,
        sender="private.person@example.test",
        content=(
            "Urgent: OTP 123456; password: secret-value; account number 87654321. "
            "Call +1 (833) 555-0198, email private.person@example.test or visit "
            "https://user:secret-value@secure-bank.example/private-record?token=secret-value"
        ),
    )
    report = approve(workflow, case).report
    assert report is not None
    for secret in (
        "private.person@example.test",
        "123456",
        "secret-value",
        "87654321",
        "555-0198",
        "private-record",
    ):
        assert secret not in report
    assert case.redacted_sender not in report
    assert case.redacted_content not in report
    assert "secure-bank.example" in report
    assert "The original message and sender field are omitted" in report


def test_report_keeps_markdown_and_urls_in_inert_code_spans(tmp_path):
    store, workflow, case = saved_case(tmp_path)
    case.checks[0].finding = "Example `note` with <https://review.example> and [label](relative)"
    store.save_case(case)
    report = approve(workflow, case).report
    assert report is not None
    assert (
        "Finding: `` Example `note` with <https://review.example> and [label](relative) ``"
        in report
    )


@pytest.mark.parametrize("choice", ["approved", "rejected"])
def test_decision_retry_preserves_saved_report_and_provenance(tmp_path, choice):
    store, workflow, case = saved_case(tmp_path, confirmed=True)
    with pytest.raises(ValueError, match="approval id"):
        workflow.decide(case.id, approval_id="different-approval", choice=choice)
    assert store.report_count(case.id) == 0
    finalized = workflow.decide(case.id, approval_id=REPORT_APPROVAL_ID, choice=choice)
    reopened = ScamWorkflow(store=SQLiteStore(store.path), advisor=LocalAdvisor())
    with pytest.raises(ValueError, match="not waiting"):
        reopened.decide(case.id, approval_id=REPORT_APPROVAL_ID, choice="approved")
    with pytest.raises(ValueError, match="not waiting"):
        reopened.decide(case.id, approval_id=REPORT_APPROVAL_ID, choice="rejected")
    saved = reopened.store.get_case(case.id)
    assert saved == finalized
    assert saved.request.sender_confirmed is True
    assert saved.request.received_at == case.request.received_at
    assert reopened.store.report_count(case.id) == (1 if choice == "approved" else 0)


def test_failed_report_transaction_can_retry_without_partial_report(tmp_path):
    import sqlite3

    store, workflow, case = saved_case(tmp_path)
    store._connection.execute(
        "CREATE TRIGGER reject_report BEFORE INSERT ON reports "
        "BEGIN SELECT RAISE(ABORT, 'test report write failure'); END"
    )
    with pytest.raises(sqlite3.IntegrityError, match="test report write failure"):
        approve(workflow, case)
    saved = store.get_case(case.id)
    assert saved is not None and saved.status == "waiting_for_approval" and saved.report is None
    assert store.report_count(case.id) == 0
    store._connection.execute("DROP TRIGGER reject_report")
    assert approve(workflow, case).report
    assert store.report_count(case.id) == 1
