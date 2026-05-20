"""Tests für WatchdogHeartbeat und WatchdogMonitor."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from johnny5.safety.heartbeat import (
    WatchdogHeartbeat,
    WatchdogMonitor,
)


class _FakePublisher:
    """Sammelt veröffentlichte Payloads."""

    def __init__(self) -> None:
        self.payloads: list[bytes] = []

    async def publish(self, payload: bytes) -> None:
        self.payloads.append(payload)


class TestWatchdogHeartbeat:
    @pytest.mark.asyncio
    async def test_invalid_interval_rejected(self) -> None:
        with pytest.raises(ValueError):
            WatchdogHeartbeat(
                publish=_FakePublisher().publish,
                service="behavior",
                interval_s=0.0,
            )

    @pytest.mark.asyncio
    async def test_emits_payloads_periodically(self) -> None:
        pub = _FakePublisher()
        hb = WatchdogHeartbeat(publish=pub.publish, service="behavior", interval_s=0.02)
        await hb.start()
        await asyncio.sleep(0.1)
        await hb.stop()
        # Bei 20ms Intervall in 100ms erwarten wir >=3 Payloads (mit Toleranz)
        assert len(pub.payloads) >= 3
        # Payload enthält service-Namen und JSON-Felder
        first = pub.payloads[0].decode("utf-8")
        assert '"service":"behavior"' in first
        assert '"status":"alive"' in first

    @pytest.mark.asyncio
    async def test_publish_failures_dont_kill_loop(self) -> None:
        attempts = 0

        async def flaky_publish(payload: bytes) -> None:
            nonlocal attempts
            attempts += 1
            if attempts <= 2:
                raise RuntimeError("transient")

        hb = WatchdogHeartbeat(publish=flaky_publish, service="x", interval_s=0.01)
        await hb.start()
        await asyncio.sleep(0.06)
        await hb.stop()
        assert attempts >= 3  # loop hat mehrere Iterationen überlebt


class TestWatchdogMonitor:
    @pytest.mark.asyncio
    async def test_naive_heartbeat_timestamp_rejected(self) -> None:
        async def noop() -> None:
            return None

        monitor = WatchdogMonitor(on_timeout=noop)
        with pytest.raises(ValueError):
            monitor.on_heartbeat(datetime.now())  # naive

    @pytest.mark.asyncio
    async def test_no_heartbeat_does_not_trigger(self) -> None:
        called = False

        async def cb() -> None:
            nonlocal called
            called = True

        monitor = WatchdogMonitor(
            on_timeout=cb, timeout_s=0.1, check_interval_s=0.02
        )
        run_task = asyncio.create_task(monitor.run())
        await asyncio.sleep(0.2)
        run_task.cancel()
        try:
            await run_task
        except asyncio.CancelledError:
            pass
        # Ohne ersten Heartbeat darf nicht gefeuert werden
        assert called is False

    @pytest.mark.asyncio
    async def test_timeout_fires_callback(self) -> None:
        called = 0

        async def cb() -> None:
            nonlocal called
            called += 1

        monitor = WatchdogMonitor(
            on_timeout=cb, timeout_s=0.05, check_interval_s=0.01
        )
        # alten Heartbeat einspielen
        old = datetime.now(timezone.utc) - timedelta(seconds=1.0)
        monitor.on_heartbeat(old)
        run_task = asyncio.create_task(monitor.run())
        await asyncio.sleep(0.05)
        run_task.cancel()
        try:
            await run_task
        except asyncio.CancelledError:
            pass
        assert called >= 1
        assert monitor.timed_out is True

    @pytest.mark.asyncio
    async def test_fresh_heartbeat_clears_timeout_flag(self) -> None:
        async def noop() -> None:
            return None

        monitor = WatchdogMonitor(
            on_timeout=noop, timeout_s=0.05, check_interval_s=0.01
        )
        monitor.on_heartbeat(datetime.now(timezone.utc) - timedelta(seconds=1.0))
        run_task = asyncio.create_task(monitor.run())
        await asyncio.sleep(0.04)
        assert monitor.timed_out is True
        monitor.on_heartbeat(datetime.now(timezone.utc))
        assert monitor.timed_out is False
        run_task.cancel()
        try:
            await run_task
        except asyncio.CancelledError:
            pass
