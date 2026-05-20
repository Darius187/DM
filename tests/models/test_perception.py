"""Tests für Perception-Event-Modelle."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from johnny5.models.pad import PADVector
from johnny5.models.perception import (
    HeadPose,
    PerceptionAudioEvent,
    PerceptionFaceEvent,
    VADEvent,
    Vector3,
    WakeWordEvent,
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _valid_face_kwargs() -> dict[str, object]:
    return {
        "timestamp": _now_utc(),
        "person_id": "darius",
        "position_xyz": Vector3(x=0.0, y=0.0, z=1.5),
        "head_pose": HeadPose(pitch=0.0, yaw=0.0, roll=0.0),
        "gaze_vector": Vector3(x=0.0, y=0.0, z=-1.0),
        "pad": PADVector.neutral(),
        "perclos": 0.1,
        "attention": 0.85,
        "confidence": 0.9,
    }


class TestPerceptionFaceEvent:
    def test_valid_event_roundtrips(self) -> None:
        event = PerceptionFaceEvent(**_valid_face_kwargs())  # type: ignore[arg-type]
        roundtrip = PerceptionFaceEvent.model_validate_json(event.model_dump_json())
        assert roundtrip == event

    def test_naive_timestamp_rejected(self) -> None:
        kwargs = _valid_face_kwargs()
        kwargs["timestamp"] = datetime.now()  # naive
        with pytest.raises(ValidationError):
            PerceptionFaceEvent(**kwargs)  # type: ignore[arg-type]

    def test_empty_person_id_rejected(self) -> None:
        kwargs = _valid_face_kwargs()
        kwargs["person_id"] = ""
        with pytest.raises(ValidationError):
            PerceptionFaceEvent(**kwargs)  # type: ignore[arg-type]

    def test_perclos_out_of_range_rejected(self) -> None:
        kwargs = _valid_face_kwargs()
        kwargs["perclos"] = 1.5
        with pytest.raises(ValidationError):
            PerceptionFaceEvent(**kwargs)  # type: ignore[arg-type]

    def test_immutable(self) -> None:
        event = PerceptionFaceEvent(**_valid_face_kwargs())  # type: ignore[arg-type]
        with pytest.raises(ValidationError):
            event.confidence = 0.5  # type: ignore[misc]


class TestPerceptionAudioEvent:
    def test_speaker_id_optional(self) -> None:
        event = PerceptionAudioEvent(
            timestamp=_now_utc(),
            speaker_id=None,
            speaker_confidence=0.0,
            vad_active=False,
            wake_word_detected=False,
        )
        assert event.speaker_id is None

    def test_naive_timestamp_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PerceptionAudioEvent(
                timestamp=datetime.now(),
                speaker_id="darius",
                speaker_confidence=0.9,
                vad_active=True,
                wake_word_detected=False,
            )


class TestVADAndWakeWord:
    def test_vad_event(self) -> None:
        event = VADEvent(timestamp=_now_utc(), active=True)
        assert event.active is True

    def test_wake_word_event(self) -> None:
        event = WakeWordEvent(
            timestamp=_now_utc(), wake_word="johnny", confidence=0.92
        )
        assert event.wake_word == "johnny"
