from app.domain.models import EvidenceCheck, RiskAssessment


def assess(checks: list[EvidenceCheck]) -> RiskAssessment:
    risky = [check for check in checks if check.result == "risky"]
    safe = [check for check in checks if check.result == "safe"]
    sender_verified = any(check.id == "check-sender" and check.result == "safe" for check in checks)
    if len(risky) >= 2:
        return RiskAssessment(
            level="high_risk",
            score=min(96, 58 + len(risky) * 9),
            confidence="high",
            reasons=[check.finding for check in risky[:4]],
            safety_steps=[
                "Do not click the link or call numbers in the message.",
                "Do not share passwords, PINs, OTPs or financial details.",
                "Contact the organization using its official app, website or card.",
                "Report and block the sender if the organization confirms fraud.",
            ],
        )
    if not risky and len(safe) >= 3 and sender_verified:
        return RiskAssessment(
            level="low_risk",
            score=14,
            confidence="medium",
            reasons=["No strong scam patterns were found in the local checks."],
            safety_steps=["Verify unexpected requests through a known official channel."],
        )
    return RiskAssessment(
        level="needs_context",
        score=46,
        confidence="low",
        reasons=["The available evidence is incomplete or mixed."],
        safety_steps=[
            "Pause before replying or opening links.",
            "Verify the sender through a known official channel.",
        ],
    )
