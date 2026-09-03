import uuid
from typing import Literal, Protocol

from app.assessment import assess
from app.domain.models import AgentAdvice, CaseEvent, MessageRequest, ScamCase
from app.storage.sqlite import SQLiteStore
from app.tools.evidence import check_evidence, extract_claims
from app.tools.redaction import redact_text

REPORT_APPROVAL_ID = "generate-local-report"


class Advisor(Protocol):
    def advise(self, request: MessageRequest) -> AgentAdvice: ...


class FixtureAdvisor:
    def advise(self, request: MessageRequest) -> AgentAdvice:
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
        redacted_request = request.model_copy(
            update={
                "sender": redact_text(request.sender),
                "content": redact_text(request.content),
            }
        )
        claims = [
            claim.model_copy(update={"text": redact_text(claim.text)}) for claim in raw_claims
        ]
        advice = self.advisor.advise(redacted_request)
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
                CaseEvent(kind="message_redacted", summary="Sensitive fields redacted locally"),
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
            self.store.save_report(case.id, report)
        self.store.save_case(revised)
        return revised

    @staticmethod
    def _build_report(case: ScamCase) -> str:
        reasons = "\n".join(f"- {reason}" for reason in case.assessment.reasons)
        steps = "\n".join(f"- {step}" for step in case.assessment.safety_steps)
        return (
            f"# ScamShield report: {case.id}\n\n"
            f"Assessment: {case.assessment.level.replace('_', ' ').title()} "
            f"({case.assessment.score}/100)\n\n"
            f"## Why\n{reasons}\n\n## Safer next steps\n{steps}\n\n"
            "Generated locally from redacted evidence. This is guidance, not a guarantee."
        )
