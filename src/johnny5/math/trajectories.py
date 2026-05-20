"""Trajektorien-Mathematik für Bewegungs-Choreografien.

Aktuelle Implementierung: Quintic-Smoothstep-Approximation.

- Jerk-limitiert (keine plötzlichen Sprünge an den Rändern)
- Aber nicht jerk-optimal
- Erste und zweite Ableitung sind an ``t=0`` und ``t=t_total`` exakt null

Für produktive Servo-Steuerung später eine etablierte Bibliothek (z.B.
``ruckig``) einsetzen — siehe Guidelines §6 und §15 "Action-Modul".
"""

from __future__ import annotations


def s_curve_position(
    t: float,
    t_total: float,
    start: float,
    end: float,
) -> float:
    """Position zum Zeitpunkt ``t`` entlang einer Quintic-Smoothstep-Kurve.

    Args:
        t: Aktuelle Zeit in Sekunden. Werte ``<=0`` liefern ``start``,
            Werte ``>=t_total`` liefern ``end`` — klemmend statt Fehler.
        t_total: Gesamtdauer der Bewegung in Sekunden. Muss positiv sein.
        start: Startposition.
        end: Endposition.

    Returns:
        Skalare Position. Außerhalb ``[0, t_total]`` geclippt.

    Raises:
        ValueError: Wenn ``t_total <= 0``.

    Formel:
        ``u = t / t_total``
        ``smooth(u) = u^3 * (u * (u * 6 - 15) + 10)``
        ``pos(t) = start + (end - start) * smooth(u)``
    """
    if t_total <= 0.0:
        raise ValueError(f"t_total must be > 0, got {t_total}")
    if t <= 0.0:
        return start
    if t >= t_total:
        return end

    u = t / t_total
    smooth = u * u * u * (u * (u * 6.0 - 15.0) + 10.0)
    return start + (end - start) * smooth


def s_curve_velocity(
    t: float,
    t_total: float,
    start: float,
    end: float,
) -> float:
    """Analytische erste Ableitung der Quintic-Smoothstep-Kurve.

    An ``t=0`` und ``t=t_total`` exakt null.

    Args:
        t: Aktuelle Zeit. Außerhalb ``[0, t_total]`` wird ``0.0`` zurückgegeben.
        t_total: Gesamtdauer (>0).
        start: Startposition.
        end: Endposition.

    Returns:
        Geschwindigkeit (Positions-Einheiten / Sekunde).
    """
    if t_total <= 0.0:
        raise ValueError(f"t_total must be > 0, got {t_total}")
    if t <= 0.0 or t >= t_total:
        return 0.0

    u = t / t_total
    # d/du [u^5 * 6 - u^4 * 15 + u^3 * 10] = 30 u^4 - 60 u^3 + 30 u^2
    smooth_deriv = 30.0 * u * u * (u * u - 2.0 * u + 1.0)  # = 30 u^2 (u-1)^2
    return (end - start) * smooth_deriv / t_total
