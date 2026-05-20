"""Aktor-Schnittstelle für virtuelle und reale Implementierungen.

Identische API in Phase 1 (Simulation) und Phase 7 (Hardware) — der Behavior-
Engine soll der Wechsel egal sein. Aktor-Befehle gehen **immer** durch
:class:`johnny5.safety.SafetyValidator` bevor sie die konkrete Implementierung
erreichen.

Siehe ``docs/PROJECT_CONTEXT.md`` §5 (Modul 5).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal, Protocol, runtime_checkable

from johnny5.models.action import (
    BackchannelRequest,
    MotionCommand,
    MotionStatus,
    SpeechRequest,
)

ActuatorStatus = Literal["idle", "busy", "passive", "fault"]


@dataclass(frozen=True)
class ActuatorState:
    """Aktueller Zustand des Aktors.

    Attributes:
        status: Lebenszyklus-Zustand.
        running_request_id: ID des aktuell ausgeführten Requests, sonst ``None``.
        last_update: UTC-Zeitpunkt der letzten Zustandsänderung.
    """

    status: ActuatorStatus
    running_request_id: str | None = None
    last_update: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


@runtime_checkable
class ActuatorInterface(Protocol):
    """Aktor-Protokoll. Implementierungen: :class:`DummyActuator`, später VirtualActuator/ServoActuator.

    Alle Methoden sind asynchron, weil Hardware-Calls I/O sein können.
    Implementierungen müssen interrupt-fähig sein: ein laufender Befehl wird
    durch :meth:`interrupt_current_action` sofort abgebrochen.
    """

    async def move(self, command: MotionCommand) -> MotionStatus:
        """Eine Bewegung anfordern. Liefert das initiale Status-Update zurück.

        Folgende Status-Updates werden über das MQTT-Topic
        ``action/motion/status`` veröffentlicht.
        """
        ...

    async def speak(self, request: SpeechRequest) -> None:
        """TTS-Anforderung in die Pipeline schicken."""
        ...

    async def backchannel(self, request: BackchannelRequest) -> None:
        """Sofortige Mini-Reaktion ausführen (Latenz-Budget <250 ms)."""
        ...

    async def interrupt_current_action(self) -> None:
        """Aktuell laufende Bewegung/Sprache sofort abbrechen."""
        ...

    async def passive_mode(self) -> None:
        """In den sicheren passiven Zustand wechseln (vom Safety-Watchdog)."""
        ...

    def get_state(self) -> ActuatorState:
        """Aktuellen Zustand abfragen (synchron, kein I/O)."""
        ...
