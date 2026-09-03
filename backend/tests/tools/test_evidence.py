from datetime import UTC, datetime

from app.domain.models import MessageRequest
from app.tools.evidence import check_evidence, extract_claims


def test_extracts_message_claims_with_provenance() -> None:
    request = MessageRequest(
        sender="Bank",
        content="URGENT: verify at https://fake-bank.com now",
        received_at=datetime.now(UTC),
    )
    claims = extract_claims(request)
    assert {claim.kind for claim in claims} >= {"sender", "urgency", "credential", "url"}
    assert all(claim.provenance for claim in claims)


def test_offline_checks_flag_unofficial_domain_and_pressure() -> None:
    request = MessageRequest(
        sender="Bank",
        content="URGENT: verify at https://fake-bank.com now",
        received_at=datetime.now(UTC),
    )
    checks = check_evidence(request, extract_claims(request))
    risky = {check.id for check in checks if check.result == "risky"}
    assert risky >= {"check-domain-1", "check-pressure"}
