"""MQTT-Topic-Schema und QoS-Levels für Johnny 5.

Hierarchisch, lowercase, snake_case. Wildcards möglich via ``{placeholder}``.
Alle Services importieren Topic-Namen NUR von hier — keine Magic-Strings.

Siehe ``docs/CLAUDE_CODE_GUIDELINES.md`` §4 und ``docs/PROJECT_CONTEXT.md`` §4.

QoS-Konvention:
    0 (at most once)  — Real-time-Streams (Perception, Audio).
    1 (at least once) — Aktionen, Heartbeats, System-Health.
    2 (exactly once)  — Memory-Writes, Safety-Verdicts, E-Stop.
"""

from __future__ import annotations

from typing import Final


# --------------------------------------------------------------------------
# Perception (von Kamera-/Mikro-Edge)
# --------------------------------------------------------------------------

PERCEPTION_FACE: Final[str] = "perception/face/{person_id}"
"""Topic: pro erkanntes Gesicht, reduzierte Feature-Vektoren.

Wildcard-Subscribe: ``perception/face/+``
"""

PERCEPTION_AUDIO_SPEAKER: Final[str] = "perception/audio/speaker"
"""Speaker-Identification + VAD-Status."""

PERCEPTION_AUDIO_VAD: Final[str] = "perception/audio/vad"
"""Voice-Activity-Detection (boolescher Stream)."""

PERCEPTION_AUDIO_WAKE_WORD: Final[str] = "perception/audio/wake_word"
"""Wake-Word-Erkennung (Trigger für STT-Pipeline)."""


# --------------------------------------------------------------------------
# Interpretation (Verstehen)
# --------------------------------------------------------------------------

INTERPRETATION_PAD: Final[str] = "interpretation/pad/{person_id}"
"""PAD-Vektor nach Late Fusion + temporaler Glättung."""

INTERPRETATION_ENGAGEMENT: Final[str] = "interpretation/engagement/{person_id}"
"""Engagement-Score (sollen wir reagieren?)."""

INTERPRETATION_TURN_TAKING: Final[str] = "interpretation/turn_taking/{person_id}"
"""Yield-/Hold-/Backchannel-Cue-Stream."""


# --------------------------------------------------------------------------
# Memory
# --------------------------------------------------------------------------

MEMORY_OBSERVATION: Final[str] = "memory/observation"
"""Memory-Write Observation (QoS 2)."""

MEMORY_REFLECTION: Final[str] = "memory/reflection"
"""Memory-Write Reflection (QoS 2)."""


# --------------------------------------------------------------------------
# Behavior
# --------------------------------------------------------------------------

BEHAVIOR_DECISION: Final[str] = "behavior/decision"
"""Aktuelle Behavior-Tree-Entscheidung (für Dashboard/Replay)."""

BEHAVIOR_HEARTBEAT: Final[str] = "behavior/heartbeat"
"""100-ms-Heartbeat. Bei Ausbleiben >500 ms → Safety löst Passive Mode aus."""


# --------------------------------------------------------------------------
# Action
# --------------------------------------------------------------------------

ACTION_MOTION_REQUEST: Final[str] = "action/motion/request"
"""Bewegungs-Anforderung von Behavior an Safety-Layer."""

ACTION_MOTION_STATUS: Final[str] = "action/motion/status"
"""Status-Rückmeldung von Aktor (running, done, blocked_by_safety)."""

ACTION_SPEECH_REQUEST: Final[str] = "action/speech/request"
"""TTS-Anforderung mit Text und PAD-Vektor."""

ACTION_BACKCHANNEL: Final[str] = "action/backchannel"
"""Sofortige Mini-Reaktion (Nicken, 'Mhm', Blickzuwendung)."""


# --------------------------------------------------------------------------
# Safety
# --------------------------------------------------------------------------

SAFETY_HEARTBEAT: Final[str] = "safety/heartbeat"
"""Safety-Layer-Lebenszeichen; nutzt MQTT-Last-Will."""

SAFETY_VERDICT: Final[str] = "safety/verdict"
"""Pro Motion-Request: allow / modify / block."""

SAFETY_E_STOP: Final[str] = "safety/e_stop"
"""Hard-Stop aller Aktoren (QoS 2)."""


# --------------------------------------------------------------------------
# System
# --------------------------------------------------------------------------

SYSTEM_HEALTH: Final[str] = "system/health/{service_name}"
"""Periodischer Health-Report pro Service (CPU, Memory, Queue-Depth)."""


# --------------------------------------------------------------------------
# QoS-Mapping
# --------------------------------------------------------------------------

QOS_FOR_TOPIC: Final[dict[str, int]] = {
    PERCEPTION_FACE: 0,
    PERCEPTION_AUDIO_SPEAKER: 0,
    PERCEPTION_AUDIO_VAD: 0,
    PERCEPTION_AUDIO_WAKE_WORD: 1,
    INTERPRETATION_PAD: 0,
    INTERPRETATION_ENGAGEMENT: 0,
    INTERPRETATION_TURN_TAKING: 0,
    MEMORY_OBSERVATION: 2,
    MEMORY_REFLECTION: 2,
    BEHAVIOR_DECISION: 1,
    BEHAVIOR_HEARTBEAT: 1,
    ACTION_MOTION_REQUEST: 1,
    ACTION_MOTION_STATUS: 1,
    ACTION_SPEECH_REQUEST: 1,
    ACTION_BACKCHANNEL: 0,
    SAFETY_HEARTBEAT: 1,
    SAFETY_VERDICT: 2,
    SAFETY_E_STOP: 2,
    SYSTEM_HEALTH: 1,
}


def format_topic(template: str, **fields: str) -> str:
    """Füllt Wildcards in einem Topic-Template ein.

    Args:
        template: Template mit ``{name}``-Wildcards aus diesem Modul.
        **fields: Werte für die Wildcards.

    Returns:
        Konkretes Topic ohne Wildcards.

    Raises:
        KeyError: Wenn ein Wildcard im Template nicht in ``fields`` ist.

    Beispiel:
        >>> format_topic(PERCEPTION_FACE, person_id="darius")
        'perception/face/darius'
    """
    return template.format(**fields)


def qos_for(topic_or_template: str) -> int:
    """Gibt das QoS-Level für ein Topic oder Template zurück.

    Akzeptiert sowohl das Template (``perception/face/{person_id}``) als auch
    ein bereits gefülltes Topic (``perception/face/darius``).

    Args:
        topic_or_template: Topic-String aus diesem Modul oder konkretes Topic.

    Returns:
        QoS-Level 0, 1 oder 2.

    Raises:
        KeyError: Wenn das Topic nicht im Mapping bekannt ist.
    """
    if topic_or_template in QOS_FOR_TOPIC:
        return QOS_FOR_TOPIC[topic_or_template]

    # konkretes Topic — finde das passende Template via Präfix-Match
    for template, qos in QOS_FOR_TOPIC.items():
        prefix = template.split("{", 1)[0]
        if "{" in template and topic_or_template.startswith(prefix):
            return qos

    raise KeyError(f"unknown topic: {topic_or_template!r}")
