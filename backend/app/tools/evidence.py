import re
from urllib.parse import urlparse

from app.domain.models import Claim, EvidenceCheck, MessageRequest

URL_PATTERN = re.compile(r"https?://[^\s]+", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")


def extract_claims(request: MessageRequest) -> list[Claim]:
    text = request.content
    lowered = text.lower()
    claims = [
        Claim(id="claim-sender", kind="sender", text=request.sender, provenance="Sender field")
    ]
    for kind, needle, label in [
        ("urgency", "urgent", "Message uses urgent language"),
        ("threat", "suspend", "Message threatens account suspension"),
        ("credential", "verify", "Message requests identity verification"),
        ("payment", "payment", "Message requests or discusses payment"),
    ]:
        if needle in lowered:
            claims.append(
                Claim(id=f"claim-{kind}", kind=kind, text=label, provenance="Message content")
            )
    for index, url in enumerate(URL_PATTERN.findall(text), start=1):
        claims.append(
            Claim(
                id=f"claim-url-{index}",
                kind="url",
                text=url.rstrip(".,)"),
                provenance="Message link",
            )
        )
    for index, phone in enumerate(PHONE_PATTERN.findall(text), start=1):
        claims.append(
            Claim(
                id=f"claim-phone-{index}",
                kind="phone",
                text=phone,
                provenance="Message phone number",
            )
        )
    return claims


def check_evidence(request: MessageRequest, claims: list[Claim]) -> list[EvidenceCheck]:
    checks: list[EvidenceCheck] = []
    url_claims = [claim for claim in claims if claim.kind == "url"]
    if not url_claims:
        checks.append(
            EvidenceCheck(
                id="check-url",
                label="Link request",
                finding="No explicit HTTP(S) link found; disguised or bare domains may be missed",
                source="Local parser",
                result="safe",
            )
        )
    for index, claim in enumerate(url_claims, start=1):
        try:
            hostname = (urlparse(claim.text).hostname or "").lower()
        except ValueError:
            hostname = ""
        checks.append(
            EvidenceCheck(
                id=f"check-domain-{index}",
                label="Domain identity",
                finding=(
                    f"Ownership of {hostname or 'this invalid host'} has not been verified. "
                    "A domain name alone does not establish trust."
                ),
                source="Local URL parsing; no reputation lookup",
                result="unknown",
            )
        )
    lowered = request.content.lower()
    pressure = any(
        token in lowered
        for token in (
            "urgent",
            "immediately",
            "suspend",
            "within 1 hour",
            "30 minutes",
            "account will close",
            "act now",
        )
    )
    checks.append(
        EvidenceCheck(
            id="check-pressure",
            label="Pressure pattern",
            finding="Urgency or threat language found"
            if pressure
            else "No urgency or threat language found",
            source="Local language rules",
            result="risky" if pressure else "safe",
        )
    )
    credential = bool(re.search(r"\b(?:verify your identity|password|otp|pin)\b", lowered))
    checks.append(
        EvidenceCheck(
            id="check-credential",
            label="Sensitive-data request",
            finding="Message asks for identity or account credentials"
            if credential
            else "No credential request found",
            source="Local request rules",
            result="risky" if credential else "safe",
        )
    )
    known_sender = request.sender_confirmed
    checks.append(
        EvidenceCheck(
            id="check-sender",
            label="Sender verification",
            finding=(
                "You reported independently confirming the sender; "
                "this is not technical authentication"
            )
            if known_sender
            else "Sender identity is unverified; display names can be copied",
            source="User-provided context",
            result="safe" if known_sender else "unknown",
        )
    )
    return checks
