from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    cors_origins: list[str] = ["http://localhost:5173"]
    max_upload_mb: int = 200
    sandbox_timeout_sec: int = 10
    sandbox_mem_mb: int = 512


def get_settings() -> Settings:
    return Settings()
