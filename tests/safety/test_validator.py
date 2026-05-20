"""Tests für SafetyValidator."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from johnny5.models.action import MotionCommand
from johnny5.models.pad import PADVector
from johnny5.safety.validator import (
    MAX_DURATION_S,
    SafetyValidator,
    ValidatorConfig,
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _build_cmd(
    *,
    duration_s: float = 1.0,
    interruptible: bool = True,
    target_xyz: tuple[float, float, float] | None = None,
) -> MotionCommand:
    return MotionCommand(
        timestamp=_now_utc(),
        motion_type="wave",
        emotion_pad=PADVector.neutral(),
        duration_s=duration_s,
        interruptible=interruptible,
        target_xyz=target_xyz,
    )


class TestSafetyValidatorAllow:
    def test_short_interruptible_motion_allowed(self) -> None:
        validator = SafetyValidator()
        cmd = _build_cmd(duration_s=1.0, interruptible=True)
        verdict = validator.validate_motion(cmd)
        assert verdict.decision == "allow"
        assert verdict.modifications is None

    def test_target_at_origin_allowed(self) -> None:
        validator = SafetyValidator()
        cmd = _build_cmd(target_xyz=(0.0, 0.0, 0.0))
        verdict = validator.validate_motion(cmd)
        assert verdict.decision == "allow"


class TestSafetyValidatorModify:
    def test_long_duration_clamped(self) -> None:
        validator = SafetyValidator()
        cmd = _build_cmd(duration_s=8.0)
        verdict = validator.validate_motion(cmd)
        assert verdict.decision == "modify"
        assert verdict.modifications == {"duration_s": MAX_DURATION_S}


class TestSafetyValidatorBlock:
    def test_long_non_interruptible_motion_blocked(self) -> None:
        validator = SafetyValidator()
        cmd = _build_cmd(duration_s=3.0, interruptible=False)
        verdict = validator.validate_motion(cmd)
        assert verdict.decision == "block"
        assert verdict.reason is not None

    def test_far_target_blocked(self) -> None:
        validator = SafetyValidator(
            ValidatorConfig(max_target_distance_m=3.0)
        )
        cmd = _build_cmd(target_xyz=(5.0, 0.0, 0.0))
        verdict = validator.validate_motion(cmd)
        assert verdict.decision == "block"


class TestSafetyValidatorRequestIdPropagation:
    def test_verdict_keeps_request_id(self) -> None:
        validator = SafetyValidator()
        cmd = _build_cmd()
        verdict = validator.validate_motion(cmd)
        assert verdict.request_id == cmd.request_id


@pytest.mark.parametrize(
    "duration_s,interruptible,expected",
    [
        (0.5, True, "allow"),
        (1.5, True, "allow"),
        (3.0, True, "allow"),
        (3.0, False, "block"),
        (6.0, True, "modify"),
    ],
)
def test_validator_matrix(
    duration_s: float, interruptible: bool, expected: str
) -> None:
    validator = SafetyValidator()
    cmd = _build_cmd(duration_s=duration_s, interruptible=interruptible)
    verdict = validator.validate_motion(cmd)
    assert verdict.decision == expected
