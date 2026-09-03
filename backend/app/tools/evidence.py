import re
from urllib.parse import urlparse

from app.domain.models import Claim, EvidenceCheck, MessageRequest

URL_PATTERN = re.compile(r"https?://[^\s]+", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")
OFFICIAL_DOMAINS = {"northwindbank.example", "postal.example"}


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
                finding="No web link found",
                source="Local parser",
                result="safe",
            )
        )
    for index, claim in enumerate(url_claims, start=1):
        hostname = (urlparse(claim.text).hostname or "").lower()
        official = hostname in OFFICIAL_DOMAINS
        suspicious = "xn--" in hostname or hostname.count("-") >= 2 or not official
        domain_status = (
            "an official fixture domain" if official else "not an official fixture domain"
        )
        checks.append(
            EvidenceCheck(
                id=f"check-domain-{index}",
                label="Domain identity",
                finding=f"{hostname or 'Invalid host'} is {domain_status}",
                source="Offline domain allow-list",
                result="safe" if official else ("risky" if suspicious else "unknown"),
            )
        )
    lowered = request.content.lower()
    pressure = any(
        token in lowered for token in ("urgent", "immediately", "suspend", "within 1 hour")
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
    credential = any(
        token in lowered for token in ("verify your identity", "password", "otp", "pin")
    )
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
    known_sender = request.sender.lower() in {"northwind bank", "campus library", "postal service"}
    checks.append(
        EvidenceCheck(
            id="check-sender",
            label="Sender verification",
            finding="Display name matches a known fixture contact"
            if known_sender
            else "Sender is not a known fixture contact",
            source="Local contact fixture",
            result="safe" if known_sender else "unknown",
        )
    )
    return checks
