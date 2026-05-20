"""Tests für Safety-Modelle."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from johnny5.models.safety import (
    EmergencyStop,
    HeartbeatMessage,
    SafetyVerdict,
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class TestHeartbeatMessage:
    def test_default_alive(self) -> None:
        hb = HeartbeatMessage(service="behavior", timestamp=_now_utc())
        assert hb.status == "alive"

    def test_dead_status_allowed(self) -> None:
        hb = HeartbeatMessage(
            service="behavior", timestamp=_now_utc(), status="dead"
        )
        assert hb.status == "dead"

    def test_naive_timestamp_rejected(self) -> None:
        with pytest.raises(ValidationError):
            HeartbeatMessage(service="x", timestamp=datetime.now())


class TestSafetyVerdict:
    def test_allow_minimal(self) -> None:
        v = SafetyVerdict(
            request_id="r1", timestamp=_now_utc(), decision="allow"
        )
        assert v.reason is None
        assert v.modifications is None

    def test_modify_with_changes(self) -> None:
        v = SafetyVerdict(
            request_id="r1",
            timestamp=_now_utc(),
            decision="modify",
            reason="velocity reduced",
            modifications={"max_velocity": 0.5},
        )
        assert v.modifications == {"max_velocity": 0.5}

    def test_invalid_decision_rejected(self) -> None:
        with pytest.raises(ValidationError):
            SafetyVerdict(
                request_id="r1",
                timestamp=_now_utc(),
                decision="maybe",  # type: ignore[arg-type]
            )


class TestEmergencyStop:
    def test_hardware_source(self) -> None:
        e = EmergencyStop(
            timestamp=_now_utc(),
            source="hardware_button",
            reason="user pressed e-stop",
        )
        assert e.source == "hardware_button"

    def test_empty_reason_rejected(self) -> None:
        with pytest.raises(ValidationError):
            EmergencyStop(
                timestamp=_now_utc(), source="fault", reason=""
            )
