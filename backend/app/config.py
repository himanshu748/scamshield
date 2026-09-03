from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    fixture_mode: bool = True
    aws_region: str = "us-east-1"
    bedrock_model_id: str | None = None
    database_path: Path = Path("data/scamshield.sqlite3")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="SCAMSHIELD_",
        extra="ignore",
    )
