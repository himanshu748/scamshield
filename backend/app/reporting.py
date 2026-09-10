"""Build a shareable report from the saved assessment without copying message bodies."""

import re

from app.domain.models import EvidenceCheck, ScamCase
from app.tools.redaction import redact_text


def _literal(value: str) -> str:
    """Keep evidence inert in Markdown, including URLs and embedded Markdown syntax."""
    text = " ".join(redact_text(value).split())
    fence = "`" * (max((len(run) for run in re.findall(r"`+", text)), default=0) + 1)
    return f"{fence} {text} {fence}"


def _check_details(checks: list[EvidenceCheck], empty: str) -> str:
    if not checks:
        return empty
    return "\n\n".join(
        f"- {_literal(check.id)} — {_literal(check.label)}\n"
        f"  - Result: {check.result}\n"
        f"  - Finding: {_literal(check.finding)}\n"
        f"  - Source: {_literal(check.source)}"
        for check in checks
    )


def build_local_report(case: ScamCase) -> str:
    warnings = [check for check in case.checks if check.result == "risky"]
    unknowns = [check for check in case.checks if check.result == "unknown"]
    no_signals = [check for check in case.checks if check.result == "safe"]
    confirmation = (
        "The user reports independently confirming the sender. "
        "This is user-provided context, not technical authentication."
        if case.request.sender_confirmed
        else "The user has not reported independently confirming the sender. "
        "Sender identity remains unverified."
    )
    request_timestamp = case.request.received_at.isoformat()
    if case.request.received_at.tzinfo is None:
        request_timestamp += " (timezone not supplied)"
    recorded_at = case.events[0].created_at.isoformat() if case.events else "Not recorded"
    reasons = "\n".join(f"- {_literal(reason)}" for reason in case.assessment.reasons)
    steps = "\n".join(f"- {_literal(step)}" for step in case.assessment.safety_steps)
    return (
        f"# ScamShield report: {_literal(case.id)}\n\n"
        f"Assessment: {case.assessment.level.replace('_', ' ').title()} "
        f"(rule index {case.assessment.score}/100; not a fraud probability)\n\n"
        f"Rule confidence: {case.assessment.confidence}. "
        "The index and confidence are not independently calibrated against real-world "
        "fraud outcomes. Low risk does not establish authenticity or guarantee safety.\n\n"
        "## Case context\n"
        f"- Channel: {case.request.channel.upper()} (user-provided)\n"
        f"- Request timestamp: {request_timestamp}\n"
        "- Time provenance: The browser form uses submission time. This timestamp is not "
        "independently verified as the message's receipt time.\n"
        f"- Analysis recorded at: {recorded_at}\n"
        f"- Sender confirmation: {confirmation}\n"
        "- Scope: saved local checks; no links opened or external reputation lookup.\n\n"
        f"## Why\n{reasons}\n\n"
        f"## Warning checks\n{_check_details(warnings, 'No warning results recorded.')}\n\n"
        "## Unresolved evidence\n"
        f"{_check_details(unknowns, 'No unknown results in the stored local checks.')}\n\n"
        "## Checks with no signal\n"
        "A safe check result means that check found no signal; it does not certify the message.\n\n"
        f"{_check_details(no_signals, 'No checks without a signal were recorded.')}\n\n"
        f"## Safer next steps\n{steps}\n\n"
        "## Before sharing\n"
        "Generated locally from saved evidence. The original message and sender field "
        "are omitted. Treat any link or domain shown here as unverified. "
        "Redaction can miss sensitive information: review this report before sharing. "
        "Links were not opened and domain ownership was not verified. "
        "This is guidance, not a guarantee.\n"
    )
