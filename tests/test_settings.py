"""Smoke-Tests für Pydantic-Settings.

Wir validieren nicht die env-Loading-Mechanik (das ist Pydantic-Verantwortung),
sondern dass die Defaults für jede Settings-Klasse instanziierbar sind und
plausible Werte haben.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from johnny5.settings import (
    BehaviorSettings,
    MemorySettings,
    MQTTSettings,
    PerceptionSettings,
    SafetySettings,
)


class TestDefaultsInstantiable:
    def test_mqtt(self) -> None:
        s = MQTTSettings()
        assert 1 <= s.port <= 65535
        assert s.reconnect_interval_s > 0.0

    def test_safety(self) -> None:
        s = SafetySettings()
        assert s.heartbeat_interval_s < s.heartbeat_timeout_s

    def test_perception(self) -> None:
        s = PerceptionSettings()
        assert 0.0 <= s.pad_update_min_confidence <= 1.0
        assert s.whisper_model_size in ("tiny", "base", "small", "medium", "large")

    def test_behavior(self) -> None:
        s = BehaviorSettings()
        assert s.reaction_signal_target_ms > s.interrupt_target_ms
        assert s.llm_token_budget_per_day > 0

    def test_memory(self) -> None:
        s = MemorySettings()
        assert 0.0 < s.decay_rate_per_hour < 1.0


class TestOutOfRangeRejected:
    def test_invalid_mqtt_port_rejected(self) -> None:
        with pytest.raises(ValidationError):
            MQTTSettings(port=99999)  # type: ignore[arg-type]

    def test_invalid_perception_confidence_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PerceptionSettings(pad_update_min_confidence=1.5)  # type: ignore[arg-type]
