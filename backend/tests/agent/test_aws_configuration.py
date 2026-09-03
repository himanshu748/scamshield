from app.agent.model import create_strands_agent
from app.config import Settings


def test_bedrock_agent_caps_output_tokens() -> None:
    agent = create_strands_agent(
        model_id="amazon.nova-micro-v1:0",
        region_name="us-east-1",
    )

    assert agent.model.config["model_id"] == "amazon.nova-micro-v1:0"
    assert agent.model.config["max_tokens"] == 512


def test_unprefixed_bedrock_model_environment_variable_is_supported(monkeypatch) -> None:
    monkeypatch.setenv("BEDROCK_MODEL_ID", "amazon.nova-micro-v1:0")

    settings = Settings(_env_file=None)

    assert settings.bedrock_model_id == "amazon.nova-micro-v1:0"
