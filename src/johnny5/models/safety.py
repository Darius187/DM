"""Pydantic-Modelle für den Safety-Layer.

Topics:
    ``safety/heartbeat``  → :class:`HeartbeatMessage`
    ``safety/verdict``    → :class:`SafetyVerdict`
    ``safety/e_stop``     → :class:`EmergencyStop`
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

VerdictDecision = Literal["allow", "modify", "block"]


def _require_utc(v: datetime) -> datetime:
    if v.tzinfo is None:
        raise ValueError("timestamp must be timezone-aware UTC")
    return v


class HeartbeatMessage(BaseModel):
    """Lebenszeichen eines Services.

    Behavior-Engine sendet alle 100 ms ein Heartbeat auf ``behavior/heartbeat``.
    Bleibt es länger als 500 ms aus, löst der Safety-Watchdog Passive Mode aus
    (siehe Guidelines §9 ``WatchdogMonitor``).
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    service: str = Field(min_length=1, max_length=64)
    timestamp: datetime
    status: Literal["alive", "degraded", "dead"] = "alive"
    """``dead`` wird als MQTT-Will-Message gesetzt, nicht aktiv gesendet."""

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class SafetyVerdict(BaseModel):
    """Entscheidung des Safety-Layers über einen Motion-Request.

    Attributes:
        request_id: Verknüpfung zum ursprünglichen :class:`MotionCommand`.
        decision:
            ``allow`` — Befehl wird unverändert durchgelassen.
            ``modify`` — Parameter wurden reduziert (z.B. Jerk-Limit).
            ``block`` — Befehl wird verworfen.
        reason: Menschenlesbare Begründung; bei ``allow`` optional.
        modifications: Bei ``modify`` die geänderten Felder als JSON-dict.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    request_id: str
    timestamp: datetime
    decision: VerdictDecision
    reason: str | None = None
    modifications: dict[str, float] | None = None

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class EmergencyStop(BaseModel):
    """E-Stop-Trigger. Hardware-Button setzt das immer, Software kann auch.

    Konsumenten (Aktoren) müssen unverzüglich in passiven Zustand gehen.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    timestamp: datetime
    source: Literal["hardware_button", "software_watchdog", "user_command", "fault"]
    reason: str = Field(min_length=1, max_length=512)

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)
