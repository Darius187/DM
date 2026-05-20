"""Exponentially Weighted Moving Average für temporale Glättung.

Konkrete Formel und Empfehlungen für ``alpha`` aus
``CLAUDE_CODE_GUIDELINES.md`` §6.

Für PAD-Glättung empfohlener Startwert ``alpha = 0.15`` — schnell genug
für Stimmungsänderungen, stabil genug gegen Flackern.
"""

from __future__ import annotations

import math
from typing import Final

DEFAULT_ALPHA: Final[float] = 0.2


def ewma_update(prev: float, new: float, alpha: float = DEFAULT_ALPHA) -> float:
    """Ein EWMA-Schritt.

    Formel:
        ``out = alpha * new + (1 - alpha) * prev``

    Args:
        prev: Vorheriger geglätteter Wert.
        new: Neue Beobachtung.
        alpha: Gewicht der neuen Beobachtung in ``(0, 1)``.

            - ``0.1`` sehr stabil, träge (~10 Samples Effekt)
            - ``0.2`` ausgewogen (Default)
            - ``0.3`` reaktiv
            - ``0.5`` kaum Smoothing

    Returns:
        Neuer geglätteter Wert. Liegt **immer** zwischen ``prev`` und ``new``
        (Property-Test in ``tests/math/test_ewma.py``).

    Raises:
        ValueError: Wenn ``alpha`` außerhalb ``(0, 1)`` liegt oder NaN.
    """
    if math.isnan(alpha) or not 0.0 < alpha < 1.0:
        raise ValueError(f"alpha must be in (0, 1), got {alpha}")
    return alpha * new + (1.0 - alpha) * prev
