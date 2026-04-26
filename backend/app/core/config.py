from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_JWT_SECRET = "change-me-in-production-use-openssl-rand-hex-32"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Runtime environment
    app_env: str = "development"
    enable_dev_endpoints: bool = False
    sql_echo: bool = False

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
    jwt_secret: str = DEFAULT_JWT_SECRET
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

    @model_validator(mode="after")
    def validate_security_settings(self):
        is_production = self.app_env.lower() == "production"
        if is_production and self.jwt_secret == DEFAULT_JWT_SECRET:
            raise ValueError("jwt_secret must be overridden in production")
        if is_production and self.enable_dev_endpoints:
            raise ValueError("enable_dev_endpoints must be false in production")
        return self


settings = Settings()
