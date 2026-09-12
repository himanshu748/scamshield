import uuid
from typing import Literal, Protocol

from strands import tool

from app.agent.fixture_model import fixture_advice
from app.assessment import assess
from app.domain.models import AgentAdvice, CaseEvent, EvidenceCheck, MessageRequest, ScamCase
from app.reporting import build_local_report
from app.storage.sqlite import SQLiteStore
from app.tools.evidence import check_evidence, extract_claims
from app.tools.redaction import redact_request, redact_text

REPORT_APPROVAL_ID = "generate-local-report"


def _prioritize_checks(
    checks: list[EvidenceCheck], advice: AgentAdvice
) -> tuple[list[EvidenceCheck], AgentAdvice]:
    """Advisory order never moves a no-signal check ahead of warnings or unknowns."""
    known_ids = {check.id for check in checks}
    valid_ids = list(
        dict.fromkeys(item for item in advice.prioritized_check_ids if item in known_ids)
    )
    priority = {check_id: index for index, check_id in enumerate(valid_ids)}
    severity = {"risky": 0, "unknown": 1, "safe": 2}
    ordered = sorted(
        checks,
        key=lambda check: (severity[check.result], priority.get(check.id, len(priority))),
    )
    return ordered, advice.model_copy(update={"prioritized_check_ids": valid_ids})


class Advisor(Protocol):
    def advise(self, request: MessageRequest) -> AgentAdvice: ...


class FixtureAdvisor:
    def advise(self, request: MessageRequest) -> AgentAdvice:
        return fixture_advice(request.model_dump(mode="json"), fixture_check, AgentAdvice)


@tool
def fixture_check(payload: dict) -> dict:
    """Read redacted message evidence and prioritize the deterministic fixture checks."""
    return _fixture_check(MessageRequest.model_validate(payload)).model_dump(mode="json")


def _fixture_check(request: MessageRequest) -> AgentAdvice:
    claims = extract_claims(request)
    checks = check_evidence(request, claims)
    risky = [check.id for check in checks if check.result == "risky"]
    return AgentAdvice(
        summary="Evidence is prioritized by direct user impact; uncertainty remains visible.",
        prioritized_check_ids=risky or [check.id for check in checks],
    )


class ScamWorkflow:
    def __init__(self, *, store: SQLiteStore, advisor: Advisor | None = None) -> None:
        self.store = store
        self.advisor = advisor or FixtureAdvisor()

    def analyze(self, request: MessageRequest) -> ScamCase:
        raw_claims = extract_claims(request)
        checks = check_evidence(request, raw_claims)
        assessment = assess(checks)
        redacted_request = redact_request(request)
        claims = [
            claim.model_copy(update={"text": redact_text(claim.text)}) for claim in raw_claims
        ]
        advice = self.advisor.advise(redacted_request)
        checks, advice = _prioritize_checks(checks, advice)
        case = ScamCase(
            id=f"case-{uuid.uuid4().hex[:12]}",
            status="waiting_for_approval",
            approval_id=REPORT_APPROVAL_ID,
            request=redacted_request,
            redacted_sender=redacted_request.sender,
            redacted_content=redacted_request.content,
            claims=claims,
            checks=checks,
            assessment=assessment,
            advice=advice,
            events=[
                CaseEvent(
                    kind="message_redacted", summary="Detected sensitive fields masked locally"
                ),
                CaseEvent(kind="claims_extracted", summary=f"Extracted {len(claims)} claims"),
                CaseEvent(
                    kind="checks_completed", summary=f"Completed {len(checks)} offline checks"
                ),
                CaseEvent(
                    kind="risk_assessed", summary=f"Assessed {assessment.level.replace('_', ' ')}"
                ),
                CaseEvent(kind="approval_required", summary="Local report requires approval"),
            ],
        )
        self.store.save_case(case)
        return case

    def decide(
        self, case_id: str, *, approval_id: str, choice: Literal["approved", "rejected"]
    ) -> ScamCase:
        case = self.store.get_case(case_id)
        if case is None:
            raise KeyError(case_id)
        if case.status != "waiting_for_approval":
            raise ValueError("case is not waiting for approval")
        if approval_id != REPORT_APPROVAL_ID:
            raise ValueError("approval id does not match the report gate")
        if choice == "rejected":
            revised = case.model_copy(
                update={
                    "status": "report_rejected",
                    "events": [
                        *case.events,
                        CaseEvent(kind="report_rejected", summary="No report generated"),
                    ],
                }
            )
        else:
            report = self._build_report(case)
            revised = case.model_copy(
                update={
                    "status": "report_generated",
                    "report": report,
                    "events": [
                        *case.events,
                        CaseEvent(kind="report_generated", summary="Local report generated"),
                    ],
                }
            )
        self.store.finalize_case(revised)
        return revised

    @staticmethod
    def _build_report(case: ScamCase) -> str:
        return build_local_report(case)
