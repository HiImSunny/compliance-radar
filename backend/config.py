import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file="../.env", extra="ignore")

    supabase_url: str = ""
    supabase_key: str = ""
    brightdata_token: str = ""
    brightdata_zone: str = ""
    brightdata_api_url: str = "https://api.brightdata.com/request"
    aimlapi_key: str = ""
    aimlapi_base_url: str = "https://api.aimlapi.com/v1"
    aimlapi_model: str = "gpt-4o"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    slack_webhook_url: str = ""
    database_url: str = "sqlite:///./compliance.db"
    cors_origins: str = "*"  # comma-separated list, e.g. "http://localhost:3000,https://yourdomain.com"


settings = Settings()
