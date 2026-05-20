"""Safety-Layer: Watchdog, Validator, Circuit-Breaker.

Querschnittliche Schicht zwischen Behavior-Engine und Aktor. Blockiert
oder modifiziert Befehle, die Sicherheits-Anforderungen verletzen.

Siehe ``docs/PROJECT_CONTEXT.md`` §5 (Modul 7) und
``docs/CLAUDE_CODE_GUIDELINES.md`` §9.
"""

from __future__ import annotations

from johnny5.safety.circuit_breaker import (
    DEFAULT_FAILURE_THRESHOLD,
    DEFAULT_RECOVERY_TIMEOUT_S,
    CircuitBreaker,
    CircuitState,
)
from johnny5.safety.heartbeat import (
    DEFAULT_HEARTBEAT_INTERVAL_S,
    DEFAULT_HEARTBEAT_TIMEOUT_S,
    PassiveModeCallback,
    PublishCallable,
    WatchdogHeartbeat,
    WatchdogMonitor,
)
from johnny5.safety.validator import (
    MAX_DURATION_S,
    MAX_TARGET_DISTANCE_M,
    SafetyValidator,
    ValidatorConfig,
)

__all__ = [
    "DEFAULT_FAILURE_THRESHOLD",
    "DEFAULT_HEARTBEAT_INTERVAL_S",
    "DEFAULT_HEARTBEAT_TIMEOUT_S",
    "DEFAULT_RECOVERY_TIMEOUT_S",
    "MAX_DURATION_S",
    "MAX_TARGET_DISTANCE_M",
    "CircuitBreaker",
    "CircuitState",
    "PassiveModeCallback",
    "PublishCallable",
    "SafetyValidator",
    "ValidatorConfig",
    "WatchdogHeartbeat",
    "WatchdogMonitor",
]
