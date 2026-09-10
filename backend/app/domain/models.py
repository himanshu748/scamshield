from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MessageRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    sender_confirmed: bool = False
    channel: Literal["sms", "email", "chat"] = "sms"
    sender: str = Field(min_length=1, max_length=160)
    content: str = Field(min_length=1, max_length=10_000)
    received_at: datetime


class Claim(BaseModel):
    id: str
    kind: str
    text: str
    provenance: str


class EvidenceCheck(BaseModel):
    id: str
    label: str
    finding: str
    source: str
    result: Literal["risky", "safe", "unknown"]


class RiskAssessment(BaseModel):
    level: Literal["high_risk", "needs_context", "low_risk"]
    score: int = Field(ge=0, le=100)
    confidence: Literal["high", "medium", "low"]
    reasons: list[str]
    safety_steps: list[str]


class AgentAdvice(BaseModel):
    summary: str
    prioritized_check_ids: list[str]


class CaseEvent(BaseModel):
    kind: str
    summary: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ScamCase(BaseModel):
    id: str
    status: Literal["waiting_for_approval", "report_generated", "report_rejected"]
    approval_id: str
    request: MessageRequest
    redacted_sender: str
    redacted_content: str
    claims: list[Claim]
    checks: list[EvidenceCheck]
    assessment: RiskAssessment
    advice: AgentAdvice
    events: list[CaseEvent]
    report: str | None = None
