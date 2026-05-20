"""Async-MQTT-Publisher mit automatischem Reconnect.

Verpackt ``aiomqtt`` mit der Reconnect-Schleife aus
``docs/CLAUDE_CODE_GUIDELINES.md`` §4. Bricht nur durch Cancellation ab —
Broker-Restarts und Netzwerk-Hänger werden transparent gehandhabt.

# TBD: aiomqtt-API verifizieren — Version 2.x verwendet ``hostname=``,
# 1.x verwendete ``host=``. Diese Implementierung zielt auf 2.x ab
# (vgl. pyproject.toml: ``aiomqtt>=2.0,<3``). Beim ersten produktiven Lauf
# auf dem Esprimo muss verifiziert werden, dass die Signaturen stimmen,
# insbesondere ``client.messages`` als Async-Iterator.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    import aiomqtt

from johnny5.settings.mqtt import MQTTSettings

log = structlog.get_logger()

PublishMessage = tuple[str, bytes, int]
"""(topic, payload, qos)-Tripel. Wird vom Publisher konsumiert."""

MessageHandler = Callable[[str, bytes], Awaitable[None]]
"""Callback für eingehende Nachrichten: ``(topic, payload) -> None``."""


async def publisher_loop(
    settings: MQTTSettings,
    queue: asyncio.Queue[PublishMessage],
    client_id_suffix: str,
) -> None:
    """Loop: holt Nachrichten aus der Queue und publisht sie.

    Reconnect-Logik: bei Broker-Disconnect wird die Schleife neu gestartet,
    Nachrichten in der Queue bleiben erhalten.

    Args:
        settings: MQTT-Verbindungs-Settings.
        queue: Quelle der zu publizierenden Nachrichten.
        client_id_suffix: Wird mit ``settings.client_id_prefix`` zur
            vollständigen Client-ID kombiniert (eindeutig pro Service).
    """
    # Late-import, damit aiomqtt nur dann gebraucht wird wenn der Publisher
    # tatsächlich läuft (Tests importieren das Modul, aber nicht aiomqtt).
    import aiomqtt

    client_id = f"{settings.client_id_prefix}-{client_id_suffix}"

    while True:
        try:
            async with aiomqtt.Client(
                hostname=settings.host,
                port=settings.port,
                username=settings.username,
                password=settings.password,
                keepalive=settings.keepalive_s,
                identifier=client_id,
            ) as client:
                log.info(
                    "mqtt_publisher_connected",
                    host=settings.host,
                    port=settings.port,
                    client_id=client_id,
                )
                while True:
                    topic, payload, qos = await queue.get()
                    try:
                        await client.publish(topic, payload, qos=qos)
                    except aiomqtt.MqttError as e:
                        log.warning(
                            "mqtt_publish_failed_will_requeue",
                            topic=topic,
                            error=str(e),
                        )
                        # Nachricht zurück in die Queue, dann Reconnect-Versuch
                        await queue.put((topic, payload, qos))
                        raise
        except asyncio.CancelledError:
            log.info("mqtt_publisher_cancelled", client_id=client_id)
            raise
        except aiomqtt.MqttError as e:
            log.warning(
                "mqtt_publisher_disconnected",
                error=str(e),
                retry_in_s=settings.reconnect_interval_s,
            )
            await asyncio.sleep(settings.reconnect_interval_s)


async def subscriber_loop(
    settings: MQTTSettings,
    topics: list[tuple[str, int]],
    handler: MessageHandler,
    client_id_suffix: str,
) -> None:
    """Loop: subscribed auf Topics und ruft ``handler`` für jede Nachricht.

    Args:
        settings: MQTT-Verbindungs-Settings.
        topics: Liste ``(topic_filter, qos)``. Filter dürfen MQTT-Wildcards
            (``+``, ``#``) enthalten.
        handler: Async-Callback ``(topic, payload) -> None``. Exceptions im
            Handler werden geloggt aber stoppen die Schleife nicht.
        client_id_suffix: Eindeutiger Suffix für die Client-ID.
    """
    import aiomqtt

    client_id = f"{settings.client_id_prefix}-{client_id_suffix}"

    while True:
        try:
            async with aiomqtt.Client(
                hostname=settings.host,
                port=settings.port,
                username=settings.username,
                password=settings.password,
                keepalive=settings.keepalive_s,
                identifier=client_id,
            ) as client:
                for topic_filter, qos in topics:
                    await client.subscribe(topic_filter, qos=qos)
                log.info(
                    "mqtt_subscriber_connected",
                    host=settings.host,
                    topics=[t for t, _ in topics],
                    client_id=client_id,
                )
                async for message in _iter_messages(client):
                    payload = (
                        message.payload
                        if isinstance(message.payload, bytes)
                        else bytes(str(message.payload), "utf-8")
                    )
                    try:
                        await handler(str(message.topic), payload)
                    except asyncio.CancelledError:
                        raise
                    except Exception as e:  # noqa: BLE001
                        log.error(
                            "mqtt_handler_error",
                            topic=str(message.topic),
                            error=str(e),
                        )
        except asyncio.CancelledError:
            log.info("mqtt_subscriber_cancelled", client_id=client_id)
            raise
        except aiomqtt.MqttError as e:
            log.warning(
                "mqtt_subscriber_disconnected",
                error=str(e),
                retry_in_s=settings.reconnect_interval_s,
            )
            await asyncio.sleep(settings.reconnect_interval_s)


def _iter_messages(client: "aiomqtt.Client") -> AsyncIterator["aiomqtt.Message"]:
    """Indirektion über ``client.messages`` — kapselt die aiomqtt-2.x-API.

    # TBD: in aiomqtt 2.x ist ``client.messages`` direkt ein AsyncIterator;
    # in 1.x war es ein Context-Manager. Diese Hilfsfunktion erleichtert das
    # Wechseln, falls die API später wieder bricht.
    """
    return client.messages
