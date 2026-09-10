from app.assessment import assess
from app.domain.models import EvidenceCheck


def check(identifier: str, result: str) -> EvidenceCheck:
    return EvidenceCheck(
        id=identifier, label=identifier, finding=identifier, source="fixture", result=result
    )


def test_assessment_exposes_three_risk_states() -> None:
    assert assess([check("a", "risky"), check("b", "risky")]).level == "high_risk"
    assert (
        assess([check("check-url", "safe"), check("check-pressure", "safe")]).level
        == "needs_context"
    )
    assert (
        assess(
            [
                check("check-url", "safe"),
                check("check-pressure", "safe"),
                check("check-credential", "safe"),
                check("check-sender", "safe"),
            ]
        ).level
        == "low_risk"
    )


def test_confirming_sender_does_not_clear_unknown_link() -> None:
    result = assess(
        [
            check("check-pressure", "safe"),
            check("check-credential", "safe"),
            check("check-sender", "safe"),
            check("check-domain-1", "unknown"),
        ]
    )
    assert result.level == "needs_context"
    assert result.reasons == ["check-domain-1"]
