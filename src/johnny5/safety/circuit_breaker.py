"""Circuit-Breaker zum Schutz vor Cascading Failures bei externen Diensten.

Wird primär für Cloud-LLM-Calls eingesetzt (Anthropic, Ollama wenn auf
remote-Host). Bei offenem Circuit fällt der Aufrufer auf den lokalen
Fallback (regelbasierte Antwort, kleines lokales Modell) zurück.

Siehe ``CLAUDE_CODE_GUIDELINES.md`` §9.
"""

from __future__ import annotations

import time
from enum import Enum
from typing import Final

import structlog

log = structlog.get_logger()

DEFAULT_FAILURE_THRESHOLD: Final[int] = 5
DEFAULT_RECOVERY_TIMEOUT_S: Final[float] = 30.0


class CircuitState(str, Enum):
    """Drei-Zustands-Maschine eines Circuit-Breakers."""

    CLOSED = "closed"
    """Normaler Betrieb, Calls werden durchgelassen."""

    OPEN = "open"
    """Blockiert wegen wiederholter Fehler; Calls werden abgelehnt."""

    HALF_OPEN = "half_open"
    """Test-Phase nach Recovery-Timeout; ein Probe-Call wird erlaubt."""


class CircuitBreaker:
    """Klassische Drei-Zustands-Implementierung.

    Beispiel:
        >>> cb = CircuitBreaker(failure_threshold=3, recovery_timeout_s=10.0)
        >>> if cb.call_allowed():
        ...     try:
        ...         result = remote_call()
        ...         cb.on_success()
        ...     except RemoteError:
        ...         cb.on_failure()
    """

    def __init__(
        self,
        failure_threshold: int = DEFAULT_FAILURE_THRESHOLD,
        recovery_timeout_s: float = DEFAULT_RECOVERY_TIMEOUT_S,
        name: str = "unnamed",
    ) -> None:
        if failure_threshold < 1:
            raise ValueError(f"failure_threshold must be >= 1, got {failure_threshold}")
        if recovery_timeout_s <= 0.0:
            raise ValueError(
                f"recovery_timeout_s must be > 0, got {recovery_timeout_s}"
            )
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout_s
        self._name = name
        self._failure_count = 0
        self._last_failure_time: float | None = None
        self._state = CircuitState.CLOSED

    @property
    def state(self) -> CircuitState:
        return self._state

    @property
    def failure_count(self) -> int:
        return self._failure_count

    def call_allowed(self) -> bool:
        """Darf ein Call jetzt durchgeführt werden?

        Wechselt selbstständig von ``OPEN`` nach ``HALF_OPEN`` wenn der
        Recovery-Timeout abgelaufen ist.
        """
        if self._state is CircuitState.CLOSED:
            return True
        if self._state is CircuitState.OPEN:
            if (
                self._last_failure_time is not None
                and time.monotonic() - self._last_failure_time > self._recovery_timeout
            ):
                self._state = CircuitState.HALF_OPEN
                log.info("circuit_breaker_half_open", name=self._name)
                return True
            return False
        # HALF_OPEN: einen Probe-Call zulassen
        return True

    def on_success(self) -> None:
        """Nach erfolgreichem Call aufrufen."""
        if self._state is CircuitState.HALF_OPEN:
            log.info("circuit_breaker_closed", name=self._name)
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time = None

    def on_failure(self) -> None:
        """Nach gescheitertem Call aufrufen.

        Erreicht der Fehlerzähler die Schwelle, geht der Breaker in ``OPEN``.
        Im Zustand ``HALF_OPEN`` reicht ein einziger Fehler.
        """
        self._failure_count += 1
        self._last_failure_time = time.monotonic()

        if self._state is CircuitState.HALF_OPEN:
            self._state = CircuitState.OPEN
            log.warning(
                "circuit_breaker_reopened",
                name=self._name,
                failures=self._failure_count,
            )
            return

        if self._failure_count >= self._failure_threshold:
            if self._state is not CircuitState.OPEN:
                log.warning(
                    "circuit_breaker_open",
                    name=self._name,
                    failures=self._failure_count,
                )
            self._state = CircuitState.OPEN
