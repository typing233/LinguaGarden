from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/linguagarden"
    secret_key: str = "change-this-to-a-random-secret-key"
    anthropic_api_key: str = ""
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    upload_dir: str = "./uploads"
    max_upload_size: int = 10485760

    class Config:
        env_file = ".env"


settings = Settings()
