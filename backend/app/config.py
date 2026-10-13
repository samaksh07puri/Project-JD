"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .crypto import decrypt, is_encrypted

# Fields that may be stored encrypted (see app/crypto.py). Any of these values
# prefixed with "enc:" is decrypted on load using SECRET_ENCRYPTION_KEY.
SENSITIVE_FIELDS = (
    "gemini_api_key",
    "openai_api_key",
    "groq_api_key",
    "jwt_secret",
    "smtp_password",
    "database_url",
)


class Settings(BaseSettings):
    """Runtime settings. Values are read from the environment or a `.env` file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Master key for decrypting any "enc:"-prefixed setting. Keep this private;
    # it is the only value that must never be committed or shared.
    secret_encryption_key: str = ""

    llm_provider: str = "gemini"
    llm_model: str = "gemini-3.5-flash-lite"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    groq_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    max_upload_mb: int = 5
    request_timeout: int = 120
    allowed_origins: str = "*"

    # SQLite by default; set DATABASE_URL to a Postgres DSN in production.
    database_url: str = "sqlite:///./resume_aid.db"
    jwt_secret: str = "dev-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Base URL of the frontend, used to build the reset link emailed to users.
    frontend_url: str = "http://localhost:3000"
    password_reset_expire_minutes: int = 30

    # When SMTP_HOST is empty, reset emails are skipped and the reset link is
    # logged to the server console (and returned in dev) so the flow is testable.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: bool = True

    @model_validator(mode="after")
    def _decrypt_sensitive_settings(self) -> "Settings":
        """Decrypt any sensitive value stored as ciphertext (prefixed with ``enc:``)."""
        for field in SENSITIVE_FIELDS:
            value = getattr(self, field)
            if is_encrypted(value):
                setattr(self, field, decrypt(value, self.secret_encryption_key))
        return self

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_host)

    @property
    def origins(self) -> list[str]:
        """Parse the comma separated CORS origin list."""
        raw = (self.allowed_origins or "*").strip()
        if raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    def active_api_key(self) -> str:
        provider = self.llm_provider.lower()
        if provider == "gemini":
            return self.gemini_api_key
        if provider == "openai":
            return self.openai_api_key
        if provider == "groq":
            return self.groq_api_key
        return ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
