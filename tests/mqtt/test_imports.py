"""Smoke-Test für das mqtt-Subpackage.

Echte Integrationstests gegen einen Mosquitto-Broker kommen mit
``tests/integration/`` sobald der Esprimo-LXC läuft (Phase 1.10+).
"""

from __future__ import annotations


def test_publisher_and_subscriber_importable() -> None:
    from johnny5.mqtt import publisher_loop, subscriber_loop

    assert callable(publisher_loop)
    assert callable(subscriber_loop)


def test_re_exports_are_consistent() -> None:
    import johnny5.mqtt as pkg

    assert "publisher_loop" in pkg.__all__
    assert "subscriber_loop" in pkg.__all__
