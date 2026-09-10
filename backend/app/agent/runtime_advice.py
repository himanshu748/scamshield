from app.agent.model import StrandsAdvisor, create_strands_agent
from app.agent.orchestrator import FixtureAdvisor
from app.agent.runtime_evidence import evidence
from app.agent.runtime_provider import runtime_model_configuration
from app.domain.models import MessageRequest
from app.tools.redaction import redact_text


def advise(payload: dict, *, fixture: bool = False):
    request = MessageRequest.model_validate(payload)
    request = request.model_copy(
        update={"sender": redact_text(request.sender), "content": redact_text(request.content)}
    )
    if fixture:
        result = FixtureAdvisor().advise(request)
        return {
            "engine": "strands-fixture",
            "advice": result.model_dump(mode="json"),
            "tool_calls": ["fixture_check", "AgentAdvice"],
            "usage": {},
        }
    agent = create_strands_agent(
        **runtime_model_configuration(),
    )
    advisor = StrandsAdvisor(agent)
    result = advisor.advise(request)
    return evidence(advisor.last_run_agent, result)
