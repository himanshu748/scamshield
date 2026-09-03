from typing import Any

from strands import Agent, tool
from strands.models import BedrockModel

from app.domain.models import AgentAdvice, MessageRequest
from app.tools.evidence import check_evidence, extract_claims
from app.tools.redaction import redact_text

SYSTEM_PROMPT = """You are ScamShield, an evidence-first consumer safety agent.
Use only registered read-only tools. Separate facts from inference. Never claim certainty, contact a
sender, open a message URL or transmit content. Prioritize checks and return a concise structured
summary. Report generation is outside your authority and requires explicit user approval.
"""


@tool
def inspect_message(sender: str, content: str) -> dict[str, Any]:
    """Redact and extract claims from a suspicious message without external calls."""
    request = MessageRequest(
        channel="sms", sender=sender, content=content, received_at="2026-09-03T09:00:00Z"
    )
    return {
        "redacted_content": redact_text(content),
        "claims": [claim.model_dump() for claim in extract_claims(request)],
    }


@tool
def run_local_checks(sender: str, content: str) -> dict[str, Any]:
    """Run deterministic offline scam-pattern checks."""
    request = MessageRequest(
        channel="sms", sender=sender, content=content, received_at="2026-09-03T09:00:00Z"
    )
    claims = extract_claims(request)
    return {"checks": [check.model_dump() for check in check_evidence(request, claims)]}


def create_strands_agent(*, model_id: str, region_name: str) -> Agent:
    return Agent(
        name="scamshield_investigator",
        description="Explains locally derived scam-risk evidence",
        model=BedrockModel(model_id=model_id, region_name=region_name, temperature=0.0),
        tools=[inspect_message, run_local_checks],
        system_prompt=SYSTEM_PROMPT,
        callback_handler=None,
    )


class StrandsAdvisor:
    def __init__(self, agent: Agent) -> None:
        self.agent = agent

    def advise(self, request: MessageRequest) -> AgentAdvice:
        result = self.agent(
            "Analyze this message with the read-only tools. "
            f"Sender: {request.sender}\nMessage: {request.content}",
            structured_output_model=AgentAdvice,
        )
        if not isinstance(result.structured_output, AgentAdvice):
            raise ValueError("Strands agent did not return structured advice")
        return result.structured_output
