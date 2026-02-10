from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str

    # OpenAI
    openai_api_key: str = ""
    embed_model: str = "text-embedding-3-small"
    model_reco: str = "gpt-4o-mini"
    model_extract: str = "gpt-4o-mini"
    openai_timeout_s: float = 15.0
    openai_max_retries: int = 0

    # Search & AI
    search_provider: str = "duckduckgo"
    ai_max_pages: int = 5

    # Auth / JWT
    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    access_ttl_min: str = "30"
    refresh_ttl_days: str = "30"

    # Admin user (for seeding)
    admin_email: str = "admin@vogoplus.app"
    admin_password: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=(),  # Allow fields starting with 'model_'
    )


settings = Settings()
