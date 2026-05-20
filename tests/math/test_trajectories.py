"""Tests für S-Curve-Trajektorien."""

from __future__ import annotations

import math

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from johnny5.math.trajectories import s_curve_position, s_curve_velocity


class TestSCurvePosition:
    def test_t_zero_returns_start(self) -> None:
        assert s_curve_position(0.0, 1.0, start=-1.0, end=1.0) == -1.0

    def test_t_total_returns_end(self) -> None:
        assert s_curve_position(1.0, 1.0, start=-1.0, end=1.0) == 1.0

    def test_negative_t_clamps_to_start(self) -> None:
        assert s_curve_position(-0.5, 1.0, start=0.0, end=10.0) == 0.0

    def test_t_above_total_clamps_to_end(self) -> None:
        assert s_curve_position(2.0, 1.0, start=0.0, end=10.0) == 10.0

    def test_midpoint_is_average(self) -> None:
        # u=0.5: smoothstep(0.5) = 0.5 (Symmetrie der Quintic-Kurve)
        result = s_curve_position(0.5, 1.0, start=0.0, end=10.0)
        assert math.isclose(result, 5.0, abs_tol=1e-9)

    def test_invalid_total_raises(self) -> None:
        with pytest.raises(ValueError):
            s_curve_position(0.5, 0.0, start=0.0, end=1.0)
        with pytest.raises(ValueError):
            s_curve_position(0.5, -1.0, start=0.0, end=1.0)


class TestSCurveVelocity:
    def test_velocity_zero_at_endpoints(self) -> None:
        assert s_curve_velocity(0.0, 1.0, start=0.0, end=1.0) == 0.0
        assert s_curve_velocity(1.0, 1.0, start=0.0, end=1.0) == 0.0

    def test_velocity_max_at_midpoint(self) -> None:
        v_mid = s_curve_velocity(0.5, 1.0, start=0.0, end=1.0)
        v_quart = s_curve_velocity(0.25, 1.0, start=0.0, end=1.0)
        assert v_mid > v_quart > 0.0


class TestSCurveProperties:
    @given(
        start=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False),
        end=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False),
        duration=st.floats(min_value=0.1, max_value=10.0, allow_nan=False),
        t=st.floats(min_value=0.0, max_value=10.0, allow_nan=False),
    )
    def test_position_in_convex_hull(
        self, start: float, end: float, duration: float, t: float
    ) -> None:
        """Position liegt immer zwischen ``start`` und ``end`` (Smoothstep monoton)."""
        pos = s_curve_position(t, duration, start, end)
        lo, hi = min(start, end), max(start, end)
        assert lo - 1e-9 <= pos <= hi + 1e-9

    @settings(max_examples=50)
    @given(
        start=st.floats(min_value=-50.0, max_value=50.0, allow_nan=False),
        end=st.floats(min_value=-50.0, max_value=50.0, allow_nan=False),
        duration=st.floats(min_value=0.5, max_value=5.0, allow_nan=False),
    )
    def test_jerk_bounded(self, start: float, end: float, duration: float) -> None:
        """Maximaler numerischer Jerk bleibt unter analytischer Schranke.

        Für Quintic-Smoothstep ist der maximale Jerk-Betrag analytisch
        ``60 * |end - start| / duration^3``. Wir prüfen mit Toleranz ``*1.5``
        wegen Diskretisierungs-Artefakten.
        """
        if abs(end - start) < 1e-9:
            return  # trivial konstant
        n = 200
        positions = [
            s_curve_position(duration * i / (n - 1), duration, start, end)
            for i in range(n)
        ]
        dt = duration / (n - 1)
        velocities = [(positions[i + 1] - positions[i]) / dt for i in range(n - 1)]
        accelerations = [
            (velocities[i + 1] - velocities[i]) / dt for i in range(n - 2)
        ]
        jerks = [
            (accelerations[i + 1] - accelerations[i]) / dt
            for i in range(n - 3)
        ]
        max_jerk = max(abs(j) for j in jerks)
        analytic_bound = 60.0 * abs(end - start) / duration**3
        assert max_jerk < analytic_bound * 1.5
