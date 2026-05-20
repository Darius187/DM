"""Safety-Layer-Settings."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SafetySettings(BaseSettings):
    """Sicherheits-Schranken und Watchdog-Timing.

    Defaults sind konservativ für Phase 1 (Simulation). Bei Hardware-Migration
    in Phase 7 müssen die Werte an die echten Servo-Spezifikationen angepasst
    werden.
    """

    model_config = SettingsConfigDict(
        env_prefix="JOHNNY5_SAFETY_",
        env_file=".env",
        env_file_encoding="utf-8",
        frozen=True,
        extra="ignore",
    )

    heartbeat_interval_s: float = Field(default=0.1, gt=0.0, le=1.0)
    """Behavior-Engine sendet alle X Sekunden ein Heartbeat. Default 100 ms."""

    heartbeat_timeout_s: float = Field(default=0.5, gt=0.0, le=5.0)
    """Bleibt der Heartbeat länger aus → Passive Mode. Default 500 ms."""

    max_motion_duration_s: float = Field(default=5.0, gt=0.0, le=10.0)
    """Hartlimit für jede einzelne Bewegung."""

    max_target_distance_m: float = Field(default=3.0, gt=0.0, le=10.0)
    """Maximale Entfernung für ``look_at``/``point``-Ziele."""

    require_interruptible_for_long_motions: bool = True
    """Bewegungen >2 s müssen ``interruptible=True`` haben."""
