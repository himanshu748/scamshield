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
