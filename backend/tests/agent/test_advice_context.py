import json
from types import SimpleNamespace

import pytest

from app.agent.model import StrandsAdvisor, inspect_message, run_local_checks
from app.agent.orchestrator import ScamWorkflow
from app.domain.models import AgentAdvice, MessageRequest
from app.storage.sqlite import SQLiteStore


@pytest.mark.parametrize("confirmed", [True, False])
def test_strands_prompt_and_tools_preserve_real_context_without_network(monkeypatch, confirmed):
    from app.agent import model

    expected = MessageRequest(
        channel="chat",
        received_at="2026-09-08T13:25:00+05:30",
        sender_confirmed=confirmed,
        sender="+1 (833) 555-0198",
        content="Your reservation is ready. OTP 123456",
    )
    captured = []

    def stub_agent(prompt, *, structured_output_model):
        captured.append(prompt)
        assert structured_output_model is AgentAdvice
        assert "not authenticated by ScamShield" in prompt
        payload = json.loads(prompt.split("Message request JSON:\n", 1)[1])
        assert payload["channel"] == expected.channel
        assert payload["received_at"] == expected.received_at.isoformat()
        assert payload["sender_confirmed"] is confirmed
        inspected = inspect_message(**payload)
        checked = run_local_checks(**payload)
        assert inspected["context"] == checked["context"]
        assert checked["context"]["sender_confirmed"] is confirmed
        assert checked["context"]["received_at"] == expected.received_at.isoformat()
        assert checked["context"]["channel"] == "chat"
        assert "User-provided" in checked["context"]["provenance"]
        sender_check = next(check for check in checked["checks"] if check["id"] == "check-sender")
        assert sender_check["result"] == ("safe" if confirmed else "unknown")
        assert "555-0198" not in json.dumps(inspected)
        assert "123456" not in json.dumps(inspected)
        return SimpleNamespace(
            structured_output=AgentAdvice(
                summary="Context preserved in local checks.",
                prioritized_check_ids=["check-sender"],
            )
        )

    template = object()

    def isolate(agent):
        assert agent is template
        return stub_agent

    monkeypatch.setattr(model, "isolated_agent", isolate)
    result = StrandsAdvisor(template).advise(expected)
    assert result.prioritized_check_ids == ["check-sender"]
    assert len(captured) == 1
    assert "555-0198" not in captured[0] and "123456" not in captured[0]


def test_tool_inspection_redacts_direct_input_claims():
    result = inspect_message(
        sender="private.sender@example.test",
        content="OTP 654321. https://example.test/private?token=secret-value",
        channel="email",
        received_at="2026-09-08T10:00:00Z",
        sender_confirmed=True,
    )
    serialized = json.dumps(result)
    assert "private.sender@example.test" not in serialized
    assert "654321" not in serialized and "secret-value" not in serialized
    assert result["context"]["channel"] == "email"


def test_validated_advice_orders_only_within_severity_groups(tmp_path):
    class OrderingAdvisor:
        def advise(self, request):
            return AgentAdvice(
                summary="Preferred checks do not override risk.",
                prioritized_check_ids=[
                    "invented-check",
                    "check-sender",
                    "check-domain-2",
                    "check-credential",
                    "check-credential",
                ],
            )

    store = SQLiteStore(tmp_path / "order.sqlite3")
    workflow = ScamWorkflow(store=store, advisor=OrderingAdvisor())
    case = workflow.analyze(
        MessageRequest(
            sender="User-confirmed sender",
            content=(
                "Urgent: verify your identity at https://first.example or https://second.example"
            ),
            sender_confirmed=True,
            received_at="2026-09-08T10:00:00Z",
        )
    )
    assert [check.id for check in case.checks] == [
        "check-credential",
        "check-pressure",
        "check-domain-2",
        "check-domain-1",
        "check-sender",
    ]
    assert case.advice.prioritized_check_ids == [
        "check-sender",
        "check-domain-2",
        "check-credential",
    ]
    assert case.assessment.level == "high_risk" and case.assessment.score == 76
    assert store.get_case(case.id).checks == case.checks


def test_empty_advice_keeps_stable_order_inside_each_result_group(tmp_path):
    class EmptyAdvisor:
        def advise(self, request):
            return AgentAdvice(summary="No preference.", prioritized_check_ids=[])

    case = ScamWorkflow(
        store=SQLiteStore(tmp_path / "stable.sqlite3"), advisor=EmptyAdvisor()
    ).analyze(
        MessageRequest(
            sender="Sender",
            content="A message without an explicit link.",
            received_at="2026-09-08T10:00:00Z",
        )
    )
    assert [check.id for check in case.checks] == [
        "check-sender",
        "check-url",
        "check-pressure",
        "check-credential",
    ]
