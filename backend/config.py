import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    brightdata_token: str = ""
    brightdata_zone: str = ""
    brightdata_api_url: str = "https://api.brightdata.com/request"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    slack_webhook_url: str = ""
    database_url: str = "sqlite:///./compliance.db"
    cors_origins: str = "*"  # comma-separated list, e.g. "http://localhost:3000,https://yourdomain.com"

    class Config:
        env_file = "../.env"


settings = Settings()
