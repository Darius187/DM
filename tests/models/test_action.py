"""Tests für Action-Modelle."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from johnny5.models.action import (
    BackchannelRequest,
    MotionCommand,
    MotionStatus,
    SpeechRequest,
)
from johnny5.models.pad import PADVector


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class TestMotionCommand:
    def test_minimal_valid(self) -> None:
        cmd = MotionCommand(
            timestamp=_now_utc(),
            motion_type="wave",
            emotion_pad=PADVector.neutral(),
            duration_s=2.0,
        )
        assert cmd.interruptible is True
        assert cmd.target_xyz is None
        assert cmd.request_id

    def test_duration_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            MotionCommand(
                timestamp=_now_utc(),
                motion_type="wave",
                emotion_pad=PADVector.neutral(),
                duration_s=0.0,
            )

    def test_duration_above_hard_limit_rejected(self) -> None:
        with pytest.raises(ValidationError):
            MotionCommand(
                timestamp=_now_utc(),
                motion_type="wave",
                emotion_pad=PADVector.neutral(),
                duration_s=15.0,
            )

    def test_unknown_motion_type_rejected(self) -> None:
        with pytest.raises(ValidationError):
            MotionCommand(
                timestamp=_now_utc(),
                motion_type="breakdance",  # type: ignore[arg-type]
                emotion_pad=PADVector.neutral(),
                duration_s=1.0,
            )

    def test_request_ids_are_unique(self) -> None:
        a = MotionCommand(
            timestamp=_now_utc(),
            motion_type="wave",
            emotion_pad=PADVector.neutral(),
            duration_s=1.0,
        )
        b = MotionCommand(
            timestamp=_now_utc(),
            motion_type="wave",
            emotion_pad=PADVector.neutral(),
            duration_s=1.0,
        )
        assert a.request_id != b.request_id


class TestMotionStatus:
    def test_blocked_with_reason(self) -> None:
        status = MotionStatus(
            request_id="r1",
            timestamp=_now_utc(),
            status="blocked_by_safety",
            reason="velocity > limit",
        )
        assert status.reason == "velocity > limit"


class TestSpeechRequest:
    def test_default_neutral_emotion(self) -> None:
        req = SpeechRequest(timestamp=_now_utc(), text="Hallo Darius.")
        assert req.emotion_pad == PADVector.neutral()
        assert req.interruptible is True

    def test_empty_text_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SpeechRequest(timestamp=_now_utc(), text="")


class TestBackchannelRequest:
    def test_valid(self) -> None:
        req = BackchannelRequest(
            timestamp=_now_utc(), backchannel_type="nod"
        )
        assert req.backchannel_type == "nod"

    def test_unknown_type_rejected(self) -> None:
        with pytest.raises(ValidationError):
            BackchannelRequest(
                timestamp=_now_utc(),
                backchannel_type="dance",  # type: ignore[arg-type]
            )
