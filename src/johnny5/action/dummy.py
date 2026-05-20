"""DummyActuator — loggt nur, führt keine echte Bewegung aus.

Für Tests, Bring-up und Smoke-Tests des Daten-Flusses. Erzeugt deterministische
Status-Updates ohne Sleep im Hot-Path.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import structlog

from johnny5.action.interface import ActuatorInterface, ActuatorState
from johnny5.models.action import (
    BackchannelRequest,
    MotionCommand,
    MotionStatus,
    SpeechRequest,
)

log = structlog.get_logger()


class DummyActuator(ActuatorInterface):
    """Loggt jeden Aufruf, hält den Zustand im Speicher, simuliert keine Dauer.

    Beispiel:
        >>> actuator = DummyActuator()
        >>> status = await actuator.move(cmd)
        >>> assert actuator.get_state().status in ("busy", "idle")
    """

    def __init__(self) -> None:
        self._state = ActuatorState(status="idle")
        self._current_task: asyncio.Task[None] | None = None
        self._lock = asyncio.Lock()

    def get_state(self) -> ActuatorState:
        return self._state

    async def move(self, command: MotionCommand) -> MotionStatus:
        async with self._lock:
            if self._state.status == "passive":
                log.warning("move_rejected_passive", request_id=command.request_id)
                return MotionStatus(
                    request_id=command.request_id,
                    timestamp=datetime.now(timezone.utc),
                    status="blocked_by_safety",
                    reason="actuator in passive mode",
                )
            self._state = ActuatorState(
                status="busy",
                running_request_id=command.request_id,
            )

        log.info(
            "actuator_move",
            request_id=command.request_id,
            motion_type=command.motion_type,
            duration_s=command.duration_s,
            interruptible=command.interruptible,
            target_xyz=command.target_xyz,
        )

        # Background-Task simuliert das Ende der Bewegung
        self._current_task = asyncio.create_task(
            self._finish_after(command.duration_s, command.request_id),
            name=f"dummy-motion-{command.request_id[:8]}",
        )

        return MotionStatus(
            request_id=command.request_id,
            timestamp=datetime.now(timezone.utc),
            status="running",
        )

    async def _finish_after(self, duration_s: float, request_id: str) -> None:
        try:
            await asyncio.sleep(duration_s)
        except asyncio.CancelledError:
            log.info("dummy_motion_cancelled", request_id=request_id)
            raise
        async with self._lock:
            if (
                self._state.running_request_id == request_id
                and self._state.status == "busy"
            ):
                self._state = ActuatorState(status="idle")
        log.info("actuator_move_done", request_id=request_id)

    async def speak(self, request: SpeechRequest) -> None:
        log.info(
            "actuator_speak",
            request_id=request.request_id,
            text=request.text,
            valence=request.emotion_pad.valence,
            arousal=request.emotion_pad.arousal,
        )

    async def backchannel(self, request: BackchannelRequest) -> None:
        log.info(
            "actuator_backchannel",
            request_id=request.request_id,
            backchannel_type=request.backchannel_type,
        )

    async def interrupt_current_action(self) -> None:
        if self._current_task is not None and not self._current_task.done():
            self._current_task.cancel()
            try:
                await self._current_task
            except asyncio.CancelledError:
                pass
        async with self._lock:
            self._state = ActuatorState(status="idle")
        log.info("actuator_interrupted")

    async def passive_mode(self) -> None:
        await self.interrupt_current_action()
        async with self._lock:
            self._state = ActuatorState(status="passive")
        log.warning("actuator_passive_mode")
