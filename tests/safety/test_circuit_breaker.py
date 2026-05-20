"""Tests für Circuit-Breaker."""

from __future__ import annotations

import time

import pytest

from johnny5.safety.circuit_breaker import CircuitBreaker, CircuitState


class TestCircuitBreakerConfig:
    def test_invalid_threshold_raises(self) -> None:
        with pytest.raises(ValueError):
            CircuitBreaker(failure_threshold=0)

    def test_invalid_recovery_timeout_raises(self) -> None:
        with pytest.raises(ValueError):
            CircuitBreaker(recovery_timeout_s=0.0)


class TestCircuitBreakerLifecycle:
    def test_starts_closed(self) -> None:
        cb = CircuitBreaker(failure_threshold=2)
        assert cb.state is CircuitState.CLOSED
        assert cb.call_allowed() is True

    def test_opens_after_threshold_failures(self) -> None:
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout_s=60.0)
        cb.on_failure()
        cb.on_failure()
        assert cb.state is CircuitState.CLOSED
        cb.on_failure()
        assert cb.state is CircuitState.OPEN
        assert cb.call_allowed() is False

    def test_success_resets_failure_count(self) -> None:
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout_s=60.0)
        cb.on_failure()
        cb.on_failure()
        cb.on_success()
        assert cb.failure_count == 0
        assert cb.state is CircuitState.CLOSED

    def test_recovery_transitions_to_half_open(self) -> None:
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout_s=0.01)
        cb.on_failure()
        assert cb.state is CircuitState.OPEN
        # Eigener kleiner Spin statt sleep: Recovery-Timeout ist nur 10 ms
        time.sleep(0.02)
        assert cb.call_allowed() is True
        assert cb.state is CircuitState.HALF_OPEN

    def test_half_open_success_closes(self) -> None:
        cb = CircuitBreaker(failure_threshold=1, recovery_timeout_s=0.01)
        cb.on_failure()
        time.sleep(0.02)
        cb.call_allowed()  # triggers HALF_OPEN
        cb.on_success()
        assert cb.state is CircuitState.CLOSED

    def test_half_open_failure_reopens_immediately(self) -> None:
        cb = CircuitBreaker(failure_threshold=5, recovery_timeout_s=0.01)
        for _ in range(5):
            cb.on_failure()
        time.sleep(0.02)
        cb.call_allowed()
        assert cb.state is CircuitState.HALF_OPEN
        cb.on_failure()
        # Re-open ohne weitere Failures
        assert cb.state is CircuitState.OPEN
