"""Pydantic-Modelle für Action-Requests (Behavior → Safety → Aktor).

Topics:
    ``action/motion/request``    → :class:`MotionCommand`
    ``action/motion/status``     → :class:`MotionStatus`
    ``action/speech/request``    → :class:`SpeechRequest`
    ``action/backchannel``       → :class:`BackchannelRequest`
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from johnny5.models.pad import PADVector

MotionType = Literal["wave", "nod", "look_at", "shake_head", "point", "express"]
"""Pre-baked Bewegungs-Choreografien. Konkrete Parametrisierung kommt aus dem
LMA-Mapping (siehe Guidelines §7.4)."""

BackchannelType = Literal["mhm", "nod", "gaze_shift", "raise_brow"]
"""Schnelle Mini-Reaktionen für die Latenz-Lücke (<250 ms ab Yield-Cue)."""

MotionStatusValue = Literal["queued", "running", "done", "blocked_by_safety", "failed"]


def _require_utc(v: datetime) -> datetime:
    if v.tzinfo is None:
        raise ValueError("timestamp must be timezone-aware UTC")
    return v


def _new_request_id() -> str:
    return str(uuid.uuid4())


class MotionCommand(BaseModel):
    """Anforderung einer Servo-Bewegung.

    Geht **immer** durch den Safety-Layer bevor sie den Aktor erreicht.
    Konkrete Servo-Parameter werden im Motion-Controller aus ``emotion_pad``
    via LMA-Mapping abgeleitet — nicht im LLM-Output (siehe Guidelines §15
    "Action-Modul").
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    request_id: str = Field(default_factory=_new_request_id)
    timestamp: datetime
    motion_type: MotionType
    emotion_pad: PADVector
    duration_s: float = Field(gt=0.0, le=10.0)
    """Dauer der Bewegung. Hartlimit 10 s — alles darüber ist verdächtig."""
    interruptible: bool = True
    target_xyz: tuple[float, float, float] | None = None
    """Bei ``motion_type='look_at'`` oder ``'point'`` der Zielpunkt."""

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class MotionStatus(BaseModel):
    """Status-Update vom Aktor zur Behavior-Engine."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    request_id: str
    timestamp: datetime
    status: MotionStatusValue
    reason: str | None = None
    """Bei ``blocked_by_safety`` oder ``failed`` die Begründung."""

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class SpeechRequest(BaseModel):
    """TTS-Anforderung."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    request_id: str = Field(default_factory=_new_request_id)
    timestamp: datetime
    text: str = Field(min_length=1, max_length=2048)
    emotion_pad: PADVector = Field(default_factory=PADVector.neutral)
    interruptible: bool = True
    """Wird die TTS abgebrochen wenn der User zu sprechen beginnt? Default ja."""

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class BackchannelRequest(BaseModel):
    """Sofortige nonverbale Mini-Reaktion (Latenz-Target <250 ms)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    request_id: str = Field(default_factory=_new_request_id)
    timestamp: datetime
    backchannel_type: BackchannelType

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)
