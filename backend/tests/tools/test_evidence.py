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
    assert "check-pressure" in risky
    assert next(check for check in checks if check.id == "check-domain-1").result == "unknown"


def test_display_name_and_unlisted_domain_do_not_prove_trust_or_fraud():
    request = MessageRequest(
        sender="Campus Library",
        content="Shipping update at https://legitimate.example",
        received_at=datetime.now(UTC),
    )
    checks = check_evidence(request, extract_claims(request))
    assert next(c for c in checks if c.id == "check-sender").result == "unknown"
    assert next(c for c in checks if c.id == "check-domain-1").result == "unknown"
    assert next(c for c in checks if c.id == "check-credential").result == "safe"
