"""1D-Kalman-Filter für PAD-Glättung.

Wir nutzen drei unabhängige 1D-Filter (V, A, D) statt eines gekoppelten 3D-
Filters — für PAD ist Kopplung nicht nötig (siehe Guidelines §6).

Q (Prozess-Rauschen) und R (Mess-Rauschen) sind Startwerte und müssen
empirisch kalibriert werden anhand realer PAD-Sequenzen.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class KalmanState:
    """Zustand eines 1D-Kalman-Filters für eine einzelne Variable.

    Attributes:
        x: Aktuelle geschätzte Zustandsvariable.
        P: Schätzung-Unsicherheit (Varianz).
        Q: Prozess-Rauschen — wie schnell ändert sich der Zustand wirklich?
            Höheres ``Q`` → schnellere Adaption, mehr Rauschen.
        R: Mess-Rauschen — wie verlässlich sind die Messungen?
            Höheres ``R`` → trägere Anpassung an Messwert.

    Defaults:
        ``Q=1e-4, R=0.05`` — vernünftige Startpunkte für PAD. Empirisch
        anzupassen, siehe Guidelines §6 ("Wichtig").
    """

    x: float
    P: float
    Q: float = 1e-4
    R: float = 0.05


def kalman_update(
    state: KalmanState,
    measurement: float,
    measurement_confidence: float = 1.0,
) -> KalmanState:
    """Ein Kalman-Update-Schritt (Predict + Update).

    Args:
        state: Vorheriger Zustand.
        measurement: Neue Messung.
        measurement_confidence: Vertrauen in die Messung in ``[0, 1]``. Niedrige
            Confidence skaliert das Mess-Rauschen ``R`` hoch (Messung weniger
            einflussreich).

    Returns:
        Neuer ``KalmanState`` mit aktualisiertem ``x`` und ``P``.

    Raises:
        ValueError: Wenn ``measurement_confidence`` außerhalb ``[0, 1]`` liegt.
    """
    if not 0.0 <= measurement_confidence <= 1.0:
        raise ValueError(
            f"measurement_confidence must be in [0, 1], got {measurement_confidence}"
        )

    # Predict
    x_pred = state.x
    P_pred = state.P + state.Q

    # Confidence skaliert das effektive Mess-Rauschen
    # untere Grenze 0.01 verhindert Division durch ~0
    R_eff = state.R / max(measurement_confidence, 0.01)

    # Update
    K = P_pred / (P_pred + R_eff)
    x_new = x_pred + K * (measurement - x_pred)
    P_new = (1.0 - K) * P_pred

    return KalmanState(x=x_new, P=P_new, Q=state.Q, R=state.R)
