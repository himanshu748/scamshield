import pytest

from app.tools.redaction import redact_text


def test_redacts_phone_email_and_account_number() -> None:
    value = "Call +1 (833) 555-0198, email victim@example.com, account 98334421"
    redacted = redact_text(value)
    assert "0198" not in redacted
    assert "victim@example.com" not in redacted
    assert "98334421" not in redacted
    assert redacted.endswith("account ••••")


def test_does_not_mask_words_after_account() -> None:
    value = "Your account will be suspended"
    assert redact_text(value) == value


def test_removes_url_credentials_path_query_and_fragment() -> None:
    value = "Visit https://alice:private-pass@example.com/user/alice?token=secret#personal."
    redacted = redact_text(value)
    assert redacted == "Visit https://example.com/[URL-details-removed]."
    assert redact_text(redacted) == redacted
    assert all(secret not in redacted for secret in ("alice", "private-pass", "token=secret"))


def test_masks_explicit_secret_values_but_retains_request_language() -> None:
    value = "OTP 123456, PIN is 9876; password: secret-value; do not share your password"
    redacted = redact_text(value)
    assert all(secret not in redacted for secret in ("123456", "9876", "secret-value"))
    assert "do not share your password" in redacted


def test_does_not_crash_or_retain_unparseable_url() -> None:
    assert redact_text("See https://[private-token") == "See [unparseable link removed]"


@pytest.mark.parametrize(
    "value",
    [
        "Verification code:123456",
        "Verification code=123456",
        "Passcode 654321",
        "Verification code is 123456",
        "PIN:1234",
    ],
)
def test_named_verification_codes_are_minimized(value: str) -> None:
    redacted = redact_text(value)
    assert "[redacted]" in redacted
    assert not any(char.isdigit() for char in redacted)
    assert redact_text(redacted) == redacted
