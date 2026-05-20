"""Wertebereich-Begrenzung für PAD-Werte und ähnliche bounded Floats.

Pydantic-Validation greift nur an Modul-Grenzen. In internen Update-Schritten
(Kalman-Update, EWMA-Misch, LMA-Mapping) braucht es lokales Clipping ohne
Pydantic-Overhead.

Siehe ``CLAUDE_CODE_GUIDELINES.md`` §6 ``clip_pad``.
"""

from __future__ import annotations

PAD_LO: float = -1.0
PAD_HI: float = 1.0


def clip(value: float, lo: float, hi: float) -> float:
    """Beschränkt ``value`` auf das geschlossene Intervall ``[lo, hi]``.

    Args:
        value: Eingabe-Wert.
        lo: Untere Schranke (inklusiv).
        hi: Obere Schranke (inklusiv).

    Returns:
        ``value`` falls bereits in ``[lo, hi]``, sonst die nächste Schranke.

    Raises:
        ValueError: Wenn ``lo > hi``.
    """
    if lo > hi:
        raise ValueError(f"lo ({lo}) must be <= hi ({hi})")
    if value < lo:
        return lo
    if value > hi:
        return hi
    return value


def clip_pad(value: float) -> float:
    """Bequeme PAD-Variante mit Default-Schranken ``[-1, 1]``.

    Args:
        value: PAD-Komponentenwert (Valence / Arousal / Dominance).

    Returns:
        ``value`` geclippt auf ``[-1.0, 1.0]``.
    """
    return clip(value, PAD_LO, PAD_HI)


def clip_unit(value: float) -> float:
    """Beschränkt auf ``[0, 1]`` — für Confidence, Engagement, PERCLOS."""
    return clip(value, 0.0, 1.0)
