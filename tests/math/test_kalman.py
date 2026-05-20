"""Tests für 1D-Kalman-Filter."""

from __future__ import annotations

import math

import pytest
from hypothesis import given
from hypothesis import strategies as st

from johnny5.math.kalman import KalmanState, kalman_update


class TestKalmanUpdate:
    def test_zero_confidence_rejected(self) -> None:
        # 0 ist erlaubt; nur außerhalb [0,1] wird zurückgewiesen
        state = KalmanState(x=0.0, P=1.0)
        result = kalman_update(state, measurement=1.0, measurement_confidence=0.0)
        # extrem niedrige Confidence → Update minimal
        assert abs(result.x - state.x) < 0.1

    def test_invalid_confidence_raises(self) -> None:
        state = KalmanState(x=0.0, P=1.0)
        with pytest.raises(ValueError):
            kalman_update(state, 1.0, measurement_confidence=1.5)
        with pytest.raises(ValueError):
            kalman_update(state, 1.0, measurement_confidence=-0.1)

    def test_high_confidence_pulls_towards_measurement(self) -> None:
        state = KalmanState(x=0.0, P=1.0)
        result = kalman_update(state, measurement=1.0, measurement_confidence=1.0)
        # mit hoher Confidence und niedrigem R schnelle Annäherung
        assert result.x > 0.5

    def test_p_decreases_after_update(self) -> None:
        state = KalmanState(x=0.0, P=1.0)
        result = kalman_update(state, 0.5, measurement_confidence=1.0)
        assert result.P < state.P + state.Q

    def test_repeated_updates_converge_to_constant_measurement(self) -> None:
        state = KalmanState(x=0.0, P=1.0)
        for _ in range(50):
            state = kalman_update(state, measurement=1.0, measurement_confidence=1.0)
        assert math.isclose(state.x, 1.0, abs_tol=0.05)


class TestKalmanProperties:
    @given(
        x0=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        meas=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        conf=st.floats(min_value=0.01, max_value=1.0, allow_nan=False),
    )
    def test_estimate_in_convex_hull(
        self, x0: float, meas: float, conf: float
    ) -> None:
        """Nach einem Update liegt ``x`` zwischen ``x0`` und ``measurement``.

        Mathematisch garantiert für 1D-Kalman mit nicht-negativen Q, R, P.
        """
        state = KalmanState(x=x0, P=0.5)
        new = kalman_update(state, meas, measurement_confidence=conf)
        lo, hi = min(x0, meas), max(x0, meas)
        assert lo - 1e-9 <= new.x <= hi + 1e-9

    @given(
        x0=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        meas=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        conf=st.floats(min_value=0.01, max_value=1.0, allow_nan=False),
    )
    def test_p_non_negative(self, x0: float, meas: float, conf: float) -> None:
        state = KalmanState(x=x0, P=0.5)
        new = kalman_update(state, meas, measurement_confidence=conf)
        assert new.P >= 0.0
