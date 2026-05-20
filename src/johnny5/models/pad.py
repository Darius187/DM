"""Pleasure-Arousal-Dominance Vektor.

Der zentrale Datentyp im affektiven Stack. Alle Komponenten auf ``[-1, 1]``
beschränkt; Dominance ist in der Praxis heuristisch, weil AffectNet keine
Dominance-Labels enthält (siehe ``docs/PROJECT_CONTEXT.md`` §5, Modul 2).

Verwendung an MQTT-Topic-Grenzen, in der Memory-Persistierung und im
LMA-Mapping zur Servo-Parametrisierung.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DominanceSource = Literal["measured", "heuristic", "llm"]


class PADVector(BaseModel):
    """Pleasure-Arousal-Dominance Vektor.

    Attributes:
        valence: Lustdimension. -1 = sehr unangenehm, +1 = sehr angenehm.
        arousal: Erregung. -1 = sehr ruhig, +1 = stark erregt.
        dominance: Kontrolle. -1 = unterworfen, +1 = dominant.
        dominance_source: Wie wurde die Dominance bestimmt? AffectNet-basierte
            Modelle liefern keinen direkten Dominance-Wert, daher meist
            ``"heuristic"``.
        confidence: Vertrauen in den gesamten Vektor in ``[0, 1]``. Wird durch
            die Pipeline propagiert (siehe Guidelines §11).

    Beispiel:
        >>> PADVector(valence=0.7, arousal=0.4, dominance=0.0)
        PADVector(valence=0.7, arousal=0.4, dominance=0.0, ...)
    """

    model_config = ConfigDict(
        frozen=True,
        extra="forbid",
        str_strip_whitespace=True,
    )

    valence: float = Field(ge=-1.0, le=1.0)
    arousal: float = Field(ge=-1.0, le=1.0)
    dominance: float = Field(ge=-1.0, le=1.0)
    dominance_source: DominanceSource = "heuristic"
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)

    @classmethod
    def neutral(cls) -> "PADVector":
        """Neutraler PAD-Vektor (alle Achsen 0, Confidence 1)."""
        return cls(valence=0.0, arousal=0.0, dominance=0.0, confidence=1.0)
