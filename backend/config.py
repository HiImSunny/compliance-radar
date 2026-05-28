import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    brightdata_token: str = ""
    brightdata_zone: str = ""
    gemini_api_key: str = ""
    slack_webhook_url: str = ""
    database_url: str = "sqlite:///./compliance.db"

    class Config:
        env_file = "../.env"


settings = Settings()
