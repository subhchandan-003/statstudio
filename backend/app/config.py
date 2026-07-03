from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://stat:stat@localhost:5432/statstudio"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me"
    access_token_ttl: int = 900
    refresh_token_ttl: int = 1_209_600

    storage_endpoint: str = "http://localhost:9000"
    storage_bucket: str = "statstudio"
    storage_access_key: str = "minioadmin"
    storage_secret_key: str = "minioadmin"

    max_upload_mb: int = 200
    sandbox_timeout_sec: int = 10
    sandbox_mem_mb: int = 512

    cors_origins: list[str] = ["http://localhost:5173"]


def get_settings() -> Settings:
    return Settings()
