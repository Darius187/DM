"""Pydantic-Modelle für die Interpretation-Schicht.

Topics:
    ``interpretation/pad/{person_id}``         → :class:`SmoothedPADEvent`
    ``interpretation/engagement/{person_id}``  → :class:`EngagementEvent`
    ``interpretation/turn_taking/{person_id}`` → :class:`TurnTakingEvent`
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from johnny5.models.pad import PADVector

TurnTakingCue = Literal["yield", "hold", "backchannel", "interrupt"]
"""Nach Duncan 1972 / Sacks et al. 1974 (siehe PROJECT_CONTEXT §5)."""


def _require_utc(v: datetime) -> datetime:
    if v.tzinfo is None:
        raise ValueError("timestamp must be timezone-aware UTC")
    return v


class SmoothedPADEvent(BaseModel):
    """PAD-Vektor nach temporaler Glättung (Kalman/EWMA).

    Ist die Ausgabe der Interpretation-Pipeline, nicht die Rohmessung.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    timestamp: datetime
    person_id: str = Field(min_length=1, max_length=64)
    pad: PADVector
    smoothing_method: Literal["ewma", "kalman", "none"] = "ewma"

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class EngagementEvent(BaseModel):
    """Engagement-Score: Soll Johnny jetzt reagieren?

    Kombiniert Attention, PERCLOS, Proximity und LLM-Situations-Einschätzung
    (siehe PROJECT_CONTEXT §5, Modul 4 "Engagement Estimation").
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    timestamp: datetime
    person_id: str = Field(min_length=1, max_length=64)
    engagement: float = Field(ge=0.0, le=1.0)
    """0 = unaufmerksam/abgewandt, 1 = sucht aktiv Interaktion."""
    should_initiate: bool
    """Empfehlung an die Behavior-Engine, eine Interaktion zu starten."""

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class TurnTakingEvent(BaseModel):
    """Turn-Taking-Cue nach Duncan/Sacks."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    timestamp: datetime
    person_id: str = Field(min_length=1, max_length=64)
    cue: TurnTakingCue
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)
