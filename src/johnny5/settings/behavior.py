"""Behavior-Engine-Settings."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BehaviorSettings(BaseSettings):
    """Tick-Raten, Latenz-Targets, LLM-Routing."""

    model_config = SettingsConfigDict(
        env_prefix="JOHNNY5_BEHAVIOR_",
        env_file=".env",
        env_file_encoding="utf-8",
        frozen=True,
        extra="ignore",
    )

    tick_rate_hz: float = Field(default=10.0, gt=0.0, le=100.0)
    """py_trees-Tick-Rate. 10 Hz reicht für Behavior-Updates."""

    reaction_signal_target_ms: float = Field(default=250.0, gt=0.0, le=1000.0)
    """Latenz-Target für Backchanneling ab Yield-Cue (Heldner & Edlund 2010)."""

    interrupt_target_ms: float = Field(default=100.0, gt=0.0, le=500.0)
    """Latenz-Target für Bewegungs-Stops ab VAD-Trigger."""

    first_tts_target_ms: float = Field(default=1500.0, gt=0.0, le=5000.0)
    """Latenz-Target für die erste hörbare TTS-Ausgabe."""

    llm_token_budget_per_day: int = Field(default=100_000, gt=0)
    """Hartes Cloud-LLM-Tagesbudget — Schutz vor Cost-Spikes."""

    llm_local_first: bool = True
    """Wenn ``True``: zuerst Ollama versuchen, Claude API nur als Fallback."""
