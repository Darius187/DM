"""Tests für DummyActuator."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest

from johnny5.action.dummy import DummyActuator
from johnny5.action.interface import ActuatorInterface
from johnny5.models.action import (
    BackchannelRequest,
    MotionCommand,
    SpeechRequest,
)
from johnny5.models.pad import PADVector


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _build_motion(duration_s: float = 0.05) -> MotionCommand:
    return MotionCommand(
        timestamp=_now_utc(),
        motion_type="wave",
        emotion_pad=PADVector.neutral(),
        duration_s=duration_s,
    )


class TestDummyActuator:
    def test_implements_interface(self) -> None:
        assert isinstance(DummyActuator(), ActuatorInterface)

    def test_starts_idle(self) -> None:
        actuator = DummyActuator()
        assert actuator.get_state().status == "idle"

    @pytest.mark.asyncio
    async def test_move_transitions_to_busy(self) -> None:
        actuator = DummyActuator()
        status = await actuator.move(_build_motion(duration_s=0.05))
        assert status.status == "running"
        assert actuator.get_state().status == "busy"

    @pytest.mark.asyncio
    async def test_move_finishes_after_duration(self) -> None:
        actuator = DummyActuator()
        cmd = _build_motion(duration_s=0.02)
        await actuator.move(cmd)
        await asyncio.sleep(0.05)
        assert actuator.get_state().status == "idle"

    @pytest.mark.asyncio
    async def test_interrupt_returns_to_idle(self) -> None:
        actuator = DummyActuator()
        await actuator.move(_build_motion(duration_s=5.0))
        await actuator.interrupt_current_action()
        assert actuator.get_state().status == "idle"

    @pytest.mark.asyncio
    async def test_passive_mode_blocks_subsequent_moves(self) -> None:
        actuator = DummyActuator()
        await actuator.passive_mode()
        assert actuator.get_state().status == "passive"
        status = await actuator.move(_build_motion())
        assert status.status == "blocked_by_safety"

    @pytest.mark.asyncio
    async def test_speak_does_not_change_state(self) -> None:
        actuator = DummyActuator()
        await actuator.speak(
            SpeechRequest(timestamp=_now_utc(), text="Hallo")
        )
        assert actuator.get_state().status == "idle"

    @pytest.mark.asyncio
    async def test_backchannel_does_not_change_state(self) -> None:
        actuator = DummyActuator()
        await actuator.backchannel(
            BackchannelRequest(timestamp=_now_utc(), backchannel_type="nod")
        )
        assert actuator.get_state().status == "idle"
