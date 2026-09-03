from datetime import datetime
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agent.model import StrandsAdvisor, create_strands_agent
from app.agent.orchestrator import ScamWorkflow
from app.config import Settings
from app.domain.models import MessageRequest, ScamCase
from app.storage.sqlite import SQLiteStore


class DecisionRequest(BaseModel):
    approval_id: str
    choice: Literal["approved", "rejected"]


def demo_messages() -> dict[str, MessageRequest]:
    return {
        "high-risk": MessageRequest(
            channel="sms",
            sender="+1 (833) 555-0198",
            received_at=datetime.fromisoformat("2026-09-03T09:42:00+00:00"),
            content=(
                "Northwind Bank: URGENT unusual activity. Verify your identity "
                "immediately or your account "
                "will be suspended: https://secure-nw-bank.com/verify. Call +1 (833) 555-0198."
            ),
        ),
        "needs-context": MessageRequest(
            channel="sms",
            sender="Unknown sender",
            received_at=datetime.fromisoformat("2026-09-03T09:43:00+00:00"),
            content="Can you call me about the delivery when you are free?",
        ),
        "low-risk": MessageRequest(
            channel="sms",
            sender="Campus Library",
            received_at=datetime.fromisoformat("2026-09-03T09:44:00+00:00"),
            content="Your reserved book is ready. Visit the circulation desk during opening hours.",
        ),
    }


def create_app(settings: Settings | None = None, *, store: SQLiteStore | None = None) -> FastAPI:
    active_settings = settings or Settings()
    application = FastAPI(title="ScamShield", version="0.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    active_store = store or SQLiteStore(active_settings.database_path)
    advisor = None
    if not active_settings.fixture_mode:
        if active_settings.bedrock_model_id is None:
            raise ValueError("BEDROCK_MODEL_ID is required when fixture mode is disabled")
        advisor = StrandsAdvisor(
            create_strands_agent(
                model_id=active_settings.bedrock_model_id,
                region_name=active_settings.aws_region,
            )
        )
    workflow = ScamWorkflow(store=active_store, advisor=advisor)

    @application.get("/api/health")
    async def health() -> dict[str, str | bool]:
        return {
            "service": "scamshield",
            "status": "ok",
            "fixture_mode": active_settings.fixture_mode,
        }

    @application.get("/api/demo-messages/{scenario}", response_model=MessageRequest)
    async def demo_message(scenario: str) -> MessageRequest:
        message = demo_messages().get(scenario)
        if message is None:
            raise HTTPException(status_code=404, detail="scenario not found")
        return message

    @application.post("/api/cases", response_model=ScamCase, status_code=201)
    async def analyze(request: MessageRequest) -> ScamCase:
        return workflow.analyze(request)

    @application.get("/api/cases/{case_id}", response_model=ScamCase)
    async def get_case(case_id: str) -> ScamCase:
        case = active_store.get_case(case_id)
        if case is None:
            raise HTTPException(status_code=404, detail="case not found")
        return case

    @application.post("/api/cases/{case_id}/decision", response_model=ScamCase)
    async def decide(case_id: str, decision: DecisionRequest) -> ScamCase:
        try:
            return workflow.decide(
                case_id, approval_id=decision.approval_id, choice=decision.choice
            )
        except KeyError as error:
            raise HTTPException(status_code=404, detail="case not found") from error
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @application.get("/api/cases/{case_id}/report-count")
    async def report_count(case_id: str) -> dict[str, int]:
        return {"count": active_store.report_count(case_id)}

    return application


app = create_app()
