"""Memory-Service-Settings (PostgreSQL + pgvector)."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class MemorySettings(BaseSettings):
    """DB-Verbindung, Decay-Parameter, Reflection-Schwelle."""

    model_config = SettingsConfigDict(
        env_prefix="JOHNNY5_MEMORY_",
        env_file=".env",
        env_file_encoding="utf-8",
        frozen=True,
        extra="ignore",
    )

    pg_host: str = "localhost"
    pg_port: int = Field(default=5432, ge=1, le=65535)
    pg_database: str = "johnny5"
    pg_user: str = "johnny5"
    pg_password: str = ""

    decay_rate_per_hour: float = Field(default=0.99, gt=0.0, lt=1.0)
    """Recency-Decay. 0.99/h → nach 1 Tag ~0.79, nach 1 Woche ~0.19."""

    alpha_recency: float = Field(default=1.0, ge=0.0, le=10.0)
    alpha_importance: float = Field(default=1.0, ge=0.0, le=10.0)
    alpha_relevance: float = Field(default=1.0, ge=0.0, le=10.0)

    reflection_importance_threshold: float = Field(
        default=150.0, gt=0.0, le=10000.0
    )
    """Park et al. 2023: ab dieser akkumulierten Importance Reflection auslösen."""

    retrieval_default_limit: int = Field(default=5, ge=1, le=100)
