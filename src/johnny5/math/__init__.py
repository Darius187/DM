"""Mathematik-Helfer für Johnny 5.

Alle Funktionen haben Property-Based-Tests in ``tests/math/``.
Niemals ungetestete Implementierung in den Aktor-Pfad (siehe
``docs/CLAUDE_CODE_GUIDELINES.md`` §6 und §15).
"""

from __future__ import annotations

from johnny5.math.clipping import PAD_HI, PAD_LO, clip, clip_pad, clip_unit
from johnny5.math.cosine import cosine_similarity
from johnny5.math.ewma import DEFAULT_ALPHA, ewma_update
from johnny5.math.kalman import KalmanState, kalman_update
from johnny5.math.trajectories import s_curve_position, s_curve_velocity

__all__ = [
    "DEFAULT_ALPHA",
    "KalmanState",
    "PAD_HI",
    "PAD_LO",
    "clip",
    "clip_pad",
    "clip_unit",
    "cosine_similarity",
    "ewma_update",
    "kalman_update",
    "s_curve_position",
    "s_curve_velocity",
]
