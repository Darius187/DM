"""Pydantic-Modelle für MQTT-Payloads aus dem Perception-Layer.

Topics:
    ``perception/face/{person_id}``       → :class:`PerceptionFaceEvent`
    ``perception/audio/speaker``          → :class:`PerceptionAudioEvent`
    ``perception/audio/vad``              → :class:`VADEvent`
    ``perception/audio/wake_word``        → :class:`WakeWordEvent`

Die Edge sendet **nur** reduzierte Features — keine rohen 468-Landmark-Arrays
(siehe ``docs/PROJECT_CONTEXT.md`` §2 "Lokale Feature-Reduktion").
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from johnny5.models.pad import PADVector


def _require_utc(v: datetime) -> datetime:
    """Erzwingt timezone-aware UTC-Timestamps."""
    if v.tzinfo is None:
        raise ValueError("timestamp must be timezone-aware UTC")
    return v


class HeadPose(BaseModel):
    """Kopfpose in Radiant.

    Werte typisch zwischen ``-pi`` und ``+pi``; keine harte Schranke da der
    Schätzer auch extreme Werte liefern kann. Konsumenten sollen unnatürliche
    Werte durch Confidence-Gates filtern, nicht über Schema-Constraints.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    pitch: float
    yaw: float
    roll: float


class Vector3(BaseModel):
    """Karthesischer 3D-Vektor (Position oder Richtung)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    x: float
    y: float
    z: float


class PerceptionFaceEvent(BaseModel):
    """Reduziertes Feature-Set pro erkanntem Gesicht.

    Wird im Perception-LXC aus 468 MediaPipe-Face-Mesh-Landmarks abgeleitet
    und ist die einzige Form in der Gesichts-Information über MQTT geht.

    Attributes:
        timestamp: UTC. Wird streng validiert.
        person_id: Stabile Kennung (aus face_recognition), nicht der Rohname.
        position_xyz: Geschätzte 3D-Kopfposition relativ zur Kamera.
        head_pose: Pitch/Yaw/Roll in Radiant.
        gaze_vector: Blickrichtung in Kamerakoordinaten.
        pad: Late-Fusion-PAD (Audio + Video falls VAD aktiv).
        perclos: Percentage of Eye Closure im Sliding-Window (NHTSA-Definition).
            Schwellenwert >0.15 gilt als Müdigkeitsindikator.
        attention: Skalar in ``[0, 1]``, kombiniert Gaze-Direction +
            Head-Pose Richtung Roboter.
        confidence: Aggregierte Detection-Confidence; Konsumenten sollen bei
            ``<0.7`` Updates verwerfen (siehe Guidelines §11).
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    timestamp: datetime
    person_id: str = Field(min_length=1, max_length=64)
    position_xyz: Vector3
    head_pose: HeadPose
    gaze_vector: Vector3
    pad: PADVector
    perclos: float = Field(ge=0.0, le=1.0)
    attention: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class PerceptionAudioEvent(BaseModel):
    """Speaker-Identification-Event.

    Wird vom Audio-Edge nach Wake-Word-Trigger oder VAD-Aktivierung gesendet.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    timestamp: datetime
    speaker_id: str | None = Field(default=None, max_length=64)
    """``None`` wenn der Speaker nicht zugeordnet werden konnte."""
    speaker_confidence: float = Field(ge=0.0, le=1.0)
    vad_active: bool
    wake_word_detected: bool

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class VADEvent(BaseModel):
    """Voice-Activity-Detection-Edge: nur Status-Übergänge senden."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    timestamp: datetime
    active: bool
    """``True`` = Sprache wurde gerade erkannt; ``False`` = Stille begann."""

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)


class WakeWordEvent(BaseModel):
    """Wake-Word-Erkennung (openWakeWord)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    timestamp: datetime
    wake_word: str = Field(min_length=1, max_length=64)
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("timestamp")
    @classmethod
    def _check_utc(cls, v: datetime) -> datetime:
        return _require_utc(v)
