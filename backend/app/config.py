from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    fixture_mode: bool = True
    serve_frontend: bool = False
    agentcore_runtime_arn: str | None = None
    aws_region: str = "us-east-1"
    bedrock_model_id: str | None = Field(default=None, validation_alias="BEDROCK_MODEL_ID")
    database_path: Path = Path("data/scamshield.sqlite3")

    model_config = SettingsConfigDict(
        env_file=(Path(__file__).parents[2] / ".env"),
        env_prefix="SCAMSHIELD_",
        extra="ignore",
        populate_by_name=True,
    )
