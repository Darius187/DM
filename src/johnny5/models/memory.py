"""Pydantic-Modelle für die Memory-Schicht.

Folgt dem Memory-Stream-Pattern aus Park et al. 2023 (Generative Agents):
Append-Only-Log mit Importance-Score, Embedding, Access-Tracking.

Siehe ``docs/PROJECT_CONTEXT.md`` §5 (Modul 3) und ``CLAUDE_CODE_GUIDELINES.md`` §7.2/7.3.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MemoryType = Literal["observation", "reflection", "plan"]

EMBEDDING_DIM = 384
"""Dimension der Sentence-Transformer-Embeddings (all-MiniLM-L6-v2).

Wenn das Modell geändert wird, MUSS die DB neu aufgebaut werden — Mischen
unterschiedlicher Embedding-Modelle macht Cosine-Similarity unbrauchbar
(siehe Guidelines §8).
"""


def _require_utc(v: datetime) -> datetime:
    if v.tzinfo is None:
        raise ValueError("timestamp must be timezone-aware UTC")
    return v


class MemoryEntry(BaseModel):
    """Ein Eintrag im Memory-Stream.

    Wird sowohl beim Schreiben (ohne ``id``) als auch beim Lesen aus der DB
    (mit ``id``) verwendet.

    Attributes:
        id: Datenbank-ID. ``None`` bevor der Eintrag geschrieben wurde.
        timestamp: Wann das Ereignis stattfand (UTC).
        type: ``observation`` (direkt aus Perception), ``reflection``
            (aggregierte Erkenntnis aus Reflection-Loop), ``plan`` (zukünftige
            Intention).
        person_id: Auf wen sich der Eintrag bezieht. ``None`` für allgemeine
            Beobachtungen.
        content: Natural-Language-Beschreibung. Wird embedded und durchsucht.
        importance: 1-10 nach Park et al. — 1 = trivial, 10 = sehr bedeutsam.
            Beim Schreiben durch LLM bewertet, in Tests heuristisch.
        embedding: Sentence-Transformer-Vektor. ``None`` solange noch nicht
            berechnet (asynchrone Embedding-Pipeline).
        access_count: Wie oft wurde dieser Eintrag bei Retrieval ausgewählt?
        last_accessed_at: UTC. Für Recency-Komponente im Retrieval-Score.
    """

    model_config = ConfigDict(extra="forbid")

    id: int | None = None
    timestamp: datetime
    type: MemoryType
    person_id: str | None = Field(default=None, max_length=64)
    content: str = Field(min_length=1, max_length=8192)
    importance: int = Field(ge=1, le=10)
    embedding: list[float] | None = None
    access_count: int = Field(default=0, ge=0)
    last_accessed_at: datetime

    @field_validator("timestamp", "last_accessed_at")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)

    @field_validator("embedding")
    @classmethod
    def _check_embedding_dim(cls, v: list[float] | None) -> list[float] | None:
        if v is not None and len(v) != EMBEDDING_DIM:
            raise ValueError(
                f"embedding must be {EMBEDDING_DIM}-dimensional, got {len(v)}"
            )
        return v


class Reflection(BaseModel):
    """Aggregierte Erkenntnis aus dem Reflection-Loop.

    Wird nach Park et al. 2023 generiert wenn die Summe der Importance-Scores
    seit der letzten Reflection einen Schwellenwert überschreitet.

    Reflections werden selbst als :class:`MemoryEntry` vom Typ ``reflection``
    abgelegt; diese Klasse ist die Eingabe an den Reflection-Trigger.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    question: str = Field(min_length=1, max_length=2048)
    """Die hochrangige Frage, aus der die Reflection abgeleitet wurde."""

    insights: list[str] = Field(min_length=1, max_length=20)
    """Erkenntnisse, eine pro Listen-Eintrag."""

    source_memory_ids: list[int] = Field(min_length=1)
    """IDs der Memory-Einträge, aus denen diese Reflection abgeleitet wurde."""
