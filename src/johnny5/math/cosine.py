"""Cosine-Similarity für Memory-Retrieval.

In Produktion macht pgvector das nativ via ``<=>``-Operator. Diese Implementierung
ist für Tests und Edge-Cases (z.B. Score-Berechnung außerhalb der DB).

Siehe Guidelines §6 und Pitfall §14.7 (pgvector-Index-Operator-Matching).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

_NORM_EPSILON: float = 1e-10
"""Unter dieser Norm wird ein Vektor als Null-Vektor behandelt."""


def cosine_similarity(a: NDArray[np.floating], b: NDArray[np.floating]) -> float:
    """Cosine-Similarity zwischen zwei Vektoren.

    Args:
        a: 1D-Array (oder ähnlich), ``shape (n,)``.
        b: 1D-Array gleicher Dimension wie ``a``.

    Returns:
        Wert in ``[-1, 1]``:
            ``+1.0`` identische Richtung
            ``0.0`` orthogonal (oder mindestens einer ist Null-Vektor)
            ``-1.0`` entgegengesetzte Richtung

    Raises:
        ValueError: Wenn die Shapes nicht übereinstimmen.

    Note:
        Null-Vektoren geben ``0.0`` zurück (statt ``NaN``). Das ist die
        Konvention für Memory-Retrieval — fehlende Embeddings produzieren
        kein hartes Failure.
    """
    a_arr = np.asarray(a, dtype=np.float64)
    b_arr = np.asarray(b, dtype=np.float64)

    if a_arr.shape != b_arr.shape:
        raise ValueError(f"shape mismatch: {a_arr.shape} vs {b_arr.shape}")

    norm_a = float(np.linalg.norm(a_arr))
    norm_b = float(np.linalg.norm(b_arr))

    if norm_a < _NORM_EPSILON or norm_b < _NORM_EPSILON:
        return 0.0

    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))
