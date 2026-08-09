"""
Centralized application settings, loaded from environment variables (.env).

Keeping all configuration in one place makes the API structure easy to
extend later — e.g. adding a maps provider or the medical AI model only
means adding a field here, not hunting through the codebase.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Curoa.AI"
    app_env: str = "development"
    debug: bool = True

    # MySQL connection string, e.g.
    # mysql+pymysql://user:password@localhost:3306/curoa_db
    database_url: str = "mysql+pymysql://curoa_user:change_me@localhost:3306/curoa_db"

    jwt_secret_key: str = "change_this_to_a_long_random_secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    cors_origins: str = "http://localhost:5500,http://127.0.0.1:5500"

    # Placeholders for future integrations — see project README for the
    # planned rollout order (frontend -> backend -> MySQL -> hospitals -> AI chatbot).
    maps_api_key: str = ""
    ai_model_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
