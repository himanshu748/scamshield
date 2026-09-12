import re
from urllib.parse import urlsplit

from app.domain.models import MessageRequest

URL_PATTERN = re.compile(r"https?://[^\s<>]+", re.IGNORECASE)
SECRET_PATTERN = re.compile(
    r"\b(password|passcode|otp|pin|one[- ]time (?:password|code)|"
    r"verification code|security code|cvv)"
    r"(\s*(?::|=|\bis\b)\s*)([^\s,;]+)",
    re.IGNORECASE,
)
NUMERIC_SECRET_PATTERN = re.compile(
    r"\b(password|passcode|otp|pin|verification code|one[- ]time code|security code|cvv)"
    r"(\s*(?::|=|\bis\b)\s*|\s+)(\d{3,8})\b",
    re.IGNORECASE,
)

PHONE_PATTERN = re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)")
EMAIL_PATTERN = re.compile(
    r"\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b"
)
ACCOUNT_PATTERN = re.compile(
    r"\b(?:account|acct)\s*(?:number|no\.?|#)?\s*[:#-]?\s*"
    r"((?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]{4,})",
    re.IGNORECASE,
)


def _mask_phone(match: re.Match[str]) -> str:
    value = match.group(0)
    digits = [index for index, char in enumerate(value) if char.isdigit()]
    keep = set(digits[-2:])
    return "".join(
        char if not char.isdigit() or index in keep else "•" for index, char in enumerate(value)
    )


def _minimize_url(match: re.Match[str]) -> str:
    """Keep only the host for review; never persist credentials or opaque URL data."""
    value = match.group(0).rstrip(".,)")
    trailing = match.group(0)[len(value) :]
    try:
        parts = urlsplit(value)
        hostname = parts.hostname
        if not hostname:
            return "[unparseable link removed]" + trailing
        host = f"[{hostname}]" if ":" in hostname else hostname
        origin = f"{parts.scheme}://{host}"
        if parts.path not in ("", "/") or parts.query or parts.fragment or parts.username:
            return origin + "/[URL-details-removed]" + trailing
        return origin + parts.path + trailing
    except ValueError:
        return "[unparseable link removed]" + trailing


def redact_text(value: str) -> str:
    redacted = URL_PATTERN.sub(_minimize_url, value)
    redacted = SECRET_PATTERN.sub(lambda match: f"{match[1]}{match[2]}[redacted]", redacted)
    redacted = NUMERIC_SECRET_PATTERN.sub(lambda match: f"{match[1]}{match[2]}[redacted]", redacted)
    redacted = PHONE_PATTERN.sub(_mask_phone, redacted)
    redacted = EMAIL_PATTERN.sub(lambda match: f"{match.group(1)}•••{match.group(2)}", redacted)
    return ACCOUNT_PATTERN.sub(
        lambda match: match.group(0).replace(match.group(1), "••••"), redacted
    )


def redact_request(request: MessageRequest) -> MessageRequest:
    """The same field masking for preview, model advice and case persistence."""
    return request.model_copy(
        update={"sender": redact_text(request.sender), "content": redact_text(request.content)}
    )
