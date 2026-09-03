import re

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


def redact_text(value: str) -> str:
    redacted = PHONE_PATTERN.sub(_mask_phone, value)
    redacted = EMAIL_PATTERN.sub(lambda match: f"{match.group(1)}•••{match.group(2)}", redacted)
    return ACCOUNT_PATTERN.sub(
        lambda match: match.group(0).replace(match.group(1), "••••"), redacted
    )
