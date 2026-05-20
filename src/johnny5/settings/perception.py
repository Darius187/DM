"""Perception-Layer-Settings."""

from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class PerceptionSettings(BaseSettings):
    """MediaPipe-, VAD-, Whisper-Schwellenwerte und Modell-Auswahl."""

    model_config = SettingsConfigDict(
        env_prefix="JOHNNY5_PERCEPTION_",
        env_file=".env",
        env_file_encoding="utf-8",
        frozen=True,
        extra="ignore",
    )

    mediapipe_min_detection_confidence: float = Field(
        default=0.7, ge=0.0, le=1.0
    )
    mediapipe_min_tracking_confidence: float = Field(
        default=0.5, ge=0.0, le=1.0
    )
    mediapipe_max_num_faces: int = Field(default=2, ge=1, le=8)

    pad_update_min_confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    """Unter dieser Confidence wird kein PAD-Update gepostet."""

    pad_update_max_distance_m: float = Field(default=2.0, gt=0.0, le=5.0)
    """Über dieser Distanz wird FACS-AU unzuverlässig — kein PAD-Update."""

    perclos_window_s: float = Field(default=60.0, gt=0.0, le=300.0)
    perclos_threshold: float = Field(default=0.15, ge=0.0, le=1.0)
    """NHTSA-Schwellwert für Müdigkeit (Wierwille 1994)."""

    whisper_model_size: Literal["tiny", "base", "small", "medium", "large"] = "base"
    whisper_compute_type: Literal["int8", "float16", "float32"] = "float16"

    audio_sample_rate_hz: int = Field(default=16000, ge=8000, le=48000)

    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    """ACHTUNG: Beim Wechsel des Embedding-Modells müssen alle bestehenden
    Embeddings in der DB neu berechnet werden — Mischen macht Cosine
    Similarity unbrauchbar (siehe CLAUDE_CODE_GUIDELINES.md §8)."""
