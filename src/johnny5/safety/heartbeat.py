"""Watchdog-Heartbeat: Behavior-Engine sendet, Safety überwacht.

Konzept:
- Behavior-Engine ruft alle ``DEFAULT_HEARTBEAT_INTERVAL_S`` (100 ms) ein
  Heartbeat via :class:`WatchdogHeartbeat`.
- :class:`WatchdogMonitor` läuft im Safety-Service und beobachtet das Topic.
- Bleibt ein Heartbeat länger als ``DEFAULT_HEARTBEAT_TIMEOUT_S`` (500 ms)
  aus, ruft der Monitor seinen Callback auf — typischerweise "Passive Mode"
  (alle Aktoren in sicheren Zustand).

Siehe ``CLAUDE_CODE_GUIDELINES.md`` §9 und ``PROJECT_CONTEXT.md`` §5 (Modul 7).

Hinweis zur MQTT-Integration:
    Dieses Modul ist **MQTT-agnostisch** — es nimmt einen asynchronen
    ``publish``-Callable und einen asynchronen Heartbeat-Receiver. Die
    konkrete Anbindung an ``aiomqtt`` passiert im Safety-Service-Entrypoint
    (Phase 1.4).
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Final

import structlog

log = structlog.get_logger()

DEFAULT_HEARTBEAT_INTERVAL_S: Final[float] = 0.1
"""Behavior-Engine sendet alle 100 ms."""

DEFAULT_HEARTBEAT_TIMEOUT_S: Final[float] = 0.5
"""Bleibt der Heartbeat länger aus, ist etwas kaputt."""

PublishCallable = Callable[[bytes], Awaitable[None]]
"""Async-Callable, das den Heartbeat-Payload veröffentlicht.

In Produktion z.B. ``lambda payload: mqtt_client.publish('behavior/heartbeat', payload, qos=1)``.
In Tests ein Mock.
"""

PassiveModeCallback = Callable[[], Awaitable[None]]
"""Wird vom Monitor aufgerufen wenn der Heartbeat ausbleibt."""


class WatchdogHeartbeat:
    """Sender-Seite: produziert periodische Heartbeats.

    Beispiel:
        >>> hb = WatchdogHeartbeat(publish=mqtt_publish, service="behavior")
        >>> await hb.start()
        >>> # ... Behavior-Engine läuft ...
        >>> await hb.stop()
    """

    def __init__(
        self,
        publish: PublishCallable,
        service: str,
        interval_s: float = DEFAULT_HEARTBEAT_INTERVAL_S,
    ) -> None:
        if interval_s <= 0.0:
            raise ValueError(f"interval_s must be > 0, got {interval_s}")
        self._publish = publish
        self._service = service
        self._interval = interval_s
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        """Heartbeat-Loop als Background-Task starten."""
        if self._task is not None and not self._task.done():
            log.warning("watchdog_heartbeat_already_running", service=self._service)
            return
        self._task = asyncio.create_task(self._loop(), name=f"heartbeat-{self._service}")

    async def stop(self) -> None:
        """Heartbeat-Loop sauber beenden."""
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        self._task = None

    async def _loop(self) -> None:
        try:
            while True:
                ts = datetime.now(timezone.utc).isoformat()
                payload = (
                    f'{{"service":"{self._service}",'
                    f'"ts":"{ts}",'
                    f'"status":"alive"}}'
                ).encode("utf-8")
                try:
                    await self._publish(payload)
                except Exception as e:  # noqa: BLE001 — wir wollen den Loop nicht killen
                    log.warning(
                        "heartbeat_publish_failed",
                        service=self._service,
                        error=str(e),
                    )
                await asyncio.sleep(self._interval)
        except asyncio.CancelledError:
            log.info("heartbeat_loop_cancelled", service=self._service)
            raise


class WatchdogMonitor:
    """Empfänger-Seite: erwartet Heartbeats; ruft Callback bei Timeout.

    Beispiel:
        >>> async def go_passive():
        ...     await actuator.passive_mode()
        >>> monitor = WatchdogMonitor(on_timeout=go_passive)
        >>> # ... MQTT-Subscriber ruft monitor.on_heartbeat(ts) ...
        >>> await monitor.run()
    """

    def __init__(
        self,
        on_timeout: PassiveModeCallback,
        timeout_s: float = DEFAULT_HEARTBEAT_TIMEOUT_S,
        check_interval_s: float = 0.05,
    ) -> None:
        if timeout_s <= 0.0:
            raise ValueError(f"timeout_s must be > 0, got {timeout_s}")
        if check_interval_s <= 0.0:
            raise ValueError(f"check_interval_s must be > 0, got {check_interval_s}")
        self._on_timeout = on_timeout
        self._timeout = timeout_s
        self._check_interval = check_interval_s
        self._last_heartbeat: datetime | None = None
        self._timed_out = False

    def on_heartbeat(self, timestamp: datetime) -> None:
        """Wird vom MQTT-Subscriber pro empfangenem Heartbeat aufgerufen.

        Setzt die "timed_out"-Markierung zurück, sodass bei erneutem Ausbleiben
        wieder gefeuert werden kann.
        """
        if timestamp.tzinfo is None:
            raise ValueError("heartbeat timestamp must be timezone-aware UTC")
        self._last_heartbeat = timestamp
        self._timed_out = False

    @property
    def last_heartbeat(self) -> datetime | None:
        return self._last_heartbeat

    @property
    def timed_out(self) -> bool:
        return self._timed_out

    async def run(self) -> None:
        """Überwachungs-Loop. Bricht nur bei expliziter Cancellation ab."""
        try:
            while True:
                await asyncio.sleep(self._check_interval)
                if self._last_heartbeat is None:
                    continue
                age = (
                    datetime.now(timezone.utc) - self._last_heartbeat
                ).total_seconds()
                if age > self._timeout and not self._timed_out:
                    log.error("watchdog_timeout", age_s=age, timeout_s=self._timeout)
                    self._timed_out = True
                    try:
                        await self._on_timeout()
                    except Exception as e:  # noqa: BLE001
                        log.error("watchdog_callback_failed", error=str(e))
        except asyncio.CancelledError:
            log.info("watchdog_monitor_cancelled")
            raise
