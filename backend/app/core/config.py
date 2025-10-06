from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str

    # OpenAI
    openai_api_key: str = ""
    embed_model: str = "text-embedding-3-small"

    # Auth / JWT
    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    access_ttl_min: str = "30"
    refresh_ttl_days: str = "30"

    # Admin user (for seeding)
    admin_email: str = "admin@vogo.app"
    admin_password: str = "ChangeMe123!"

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=False, extra="ignore"
    )


settings = Settings()
