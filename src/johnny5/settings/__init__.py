"""Pydantic-Settings pro Service.

Jede Settings-Klasse:
- erbt von ``pydantic_settings.BaseSettings``
- liest aus ``.env`` oder Umgebungsvariablen
- hat einen ``JOHNNY5_<SERVICE>_``-Prefix
- ist immutabel nach Konstruktion (``frozen=True``)

Konvention: keine Magic-Numbers im Code — alles was sich pro Deployment
ändern könnte, geht durch Settings.
"""

from __future__ import annotations

from johnny5.settings.behavior import BehaviorSettings
from johnny5.settings.memory import MemorySettings
from johnny5.settings.mqtt import MQTTSettings
from johnny5.settings.perception import PerceptionSettings
from johnny5.settings.safety import SafetySettings

__all__ = [
    "BehaviorSettings",
    "MQTTSettings",
    "MemorySettings",
    "PerceptionSettings",
    "SafetySettings",
]
