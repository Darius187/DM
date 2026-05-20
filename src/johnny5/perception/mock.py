"""Mock-Perception: produziert simulierte Perception-Events.

Für Phase 1: erlaubt das Skelett von Behavior-Engine, Memory und Aktor zu
testen, **ohne** dass eine echte Kamera angeschlossen ist.

CLI:
    python -m johnny5.perception.mock --rate 30 --person darius

Schreibt JSON-Lines auf stdout (oder ans MQTT-Topic ``perception/face/{person_id}``
wenn ``--mqtt`` gesetzt).
"""

from __future__ import annotations

import argparse
import asyncio
import math
import random
from datetime import datetime, timezone

import structlog

from johnny5.logging_config import configure_logging
from johnny5.models.pad import PADVector
from johnny5.models.perception import HeadPose, PerceptionFaceEvent, Vector3
from johnny5.topics import PERCEPTION_FACE, format_topic, qos_for

log = structlog.get_logger()


def make_face_event(
    person_id: str,
    t: float,
    seed: int = 0,
) -> PerceptionFaceEvent:
    """Generiert einen plausibel-wirkenden Mock-Event.

    PAD oszilliert langsam in einem 2D-Pfad (Sinus/Cosinus auf Valence/Arousal),
    Dominance bleibt nahe null. Position ist quasi-statisch mit etwas Rauschen.

    Args:
        person_id: Stabile Person-Kennung.
        t: Sekunden seit Start.
        seed: Initialer Random-Seed (für reproduzierbare Streams).

    Returns:
        Validierter PerceptionFaceEvent.
    """
    rng = random.Random(seed + int(t * 1000))

    valence = 0.6 * math.sin(t * 0.5) + 0.05 * rng.uniform(-1.0, 1.0)
    arousal = 0.4 * math.cos(t * 0.3) + 0.05 * rng.uniform(-1.0, 1.0)
    dominance = 0.05 * rng.uniform(-1.0, 1.0)

    # An den Rand klammern um Pydantic-Constraints zu treffen
    valence = max(-1.0, min(1.0, valence))
    arousal = max(-1.0, min(1.0, arousal))
    dominance = max(-1.0, min(1.0, dominance))

    return PerceptionFaceEvent(
        timestamp=datetime.now(timezone.utc),
        person_id=person_id,
        position_xyz=Vector3(
            x=0.05 * rng.uniform(-1.0, 1.0),
            y=0.05 * rng.uniform(-1.0, 1.0),
            z=1.5 + 0.02 * rng.uniform(-1.0, 1.0),
        ),
        head_pose=HeadPose(
            pitch=0.05 * rng.uniform(-1.0, 1.0),
            yaw=0.1 * math.sin(t * 0.2),
            roll=0.0,
        ),
        gaze_vector=Vector3(x=0.0, y=0.0, z=-1.0),
        pad=PADVector(
            valence=valence,
            arousal=arousal,
            dominance=dominance,
            dominance_source="heuristic",
            confidence=0.85,
        ),
        perclos=0.1,
        attention=0.85,
        confidence=0.85,
    )


async def emit_to_stdout(person_id: str, rate_hz: float, duration_s: float) -> None:
    """Schreibt Events als JSON-Lines auf stdout.

    Bricht nach ``duration_s`` ab. ``duration_s == 0`` bedeutet "endlos"
    (per Ctrl-C beendbar).
    """
    interval = 1.0 / rate_hz
    t0 = asyncio.get_event_loop().time()
    n = 0
    try:
        while True:
            t = asyncio.get_event_loop().time() - t0
            if duration_s > 0.0 and t > duration_s:
                break
            event = make_face_event(person_id=person_id, t=t)
            print(event.model_dump_json())  # noqa: T201 — CLI-Output
            n += 1
            await asyncio.sleep(interval)
    finally:
        log.info("mock_perception_finished", events_emitted=n)


async def emit_to_mqtt(
    person_id: str,
    rate_hz: float,
    duration_s: float,
) -> None:
    """Schreibt Events ans MQTT-Topic ``perception/face/{person_id}``.

    Importiert MQTT-Stack lazy, sodass der stdout-Modus auch ohne aiomqtt
    läuft.
    """
    from johnny5.mqtt.client import publisher_loop
    from johnny5.settings.mqtt import MQTTSettings

    settings = MQTTSettings()
    queue: asyncio.Queue[tuple[str, bytes, int]] = asyncio.Queue(maxsize=128)
    topic = format_topic(PERCEPTION_FACE, person_id=person_id)
    qos = qos_for(PERCEPTION_FACE)

    async def feeder() -> None:
        interval = 1.0 / rate_hz
        t0 = asyncio.get_event_loop().time()
        n = 0
        try:
            while True:
                t = asyncio.get_event_loop().time() - t0
                if duration_s > 0.0 and t > duration_s:
                    return
                event = make_face_event(person_id=person_id, t=t)
                await queue.put((topic, event.model_dump_json().encode(), qos))
                n += 1
                await asyncio.sleep(interval)
        finally:
            log.info("mock_perception_finished", events_emitted=n)

    async with asyncio.TaskGroup() as tg:
        tg.create_task(
            publisher_loop(
                settings=settings,
                queue=queue,
                client_id_suffix=f"mock-perception-{person_id}",
            )
        )
        tg.create_task(feeder())


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Johnny 5 — Mock-Perception-Emitter",
    )
    parser.add_argument(
        "--person", default="darius", help="person_id der gemockten Person"
    )
    parser.add_argument(
        "--rate", type=float, default=30.0, help="Emit-Rate in Hz (Default: 30)"
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=0.0,
        help="Laufzeit in Sekunden (0 = endlos)",
    )
    parser.add_argument(
        "--mqtt",
        action="store_true",
        help="Statt stdout: ans MQTT-Topic perception/face/{person_id} senden",
    )
    return parser


def main() -> None:
    args = _build_parser().parse_args()
    configure_logging(service_name="mock-perception")

    if args.rate <= 0.0:
        raise SystemExit("--rate must be > 0")

    coro = (
        emit_to_mqtt(args.person, args.rate, args.duration)
        if args.mqtt
        else emit_to_stdout(args.person, args.rate, args.duration)
    )
    try:
        asyncio.run(coro)
    except KeyboardInterrupt:
        log.info("mock_perception_interrupted")


if __name__ == "__main__":
    main()
