"""Tests für EWMA — inklusive Hypothesis Property-Tests."""

from __future__ import annotations

import math

import pytest
from hypothesis import given
from hypothesis import strategies as st

from johnny5.math.ewma import DEFAULT_ALPHA, ewma_update


class TestEWMAValidation:
    @pytest.mark.parametrize("alpha", [0.0, 1.0, -0.1, 1.5, float("nan")])
    def test_invalid_alpha_raises(self, alpha: float) -> None:
        with pytest.raises(ValueError):
            ewma_update(0.0, 1.0, alpha)


class TestEWMABehaviour:
    def test_alpha_zero_would_keep_prev_but_is_rejected(self) -> None:
        # gleicher Hinweis wie oben: 0 ist ausgeschlossen
        with pytest.raises(ValueError):
            ewma_update(1.0, 0.0, alpha=0.0)

    def test_default_alpha_is_reasonable(self) -> None:
        # Halbe Konvergenzgeschwindigkeit erwartbar
        assert 0.1 < DEFAULT_ALPHA < 0.5

    def test_step_towards_new(self) -> None:
        result = ewma_update(prev=0.0, new=1.0, alpha=0.2)
        assert math.isclose(result, 0.2)


class TestEWMAProperties:
    @given(
        prev=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False),
        new=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False),
        alpha=st.floats(min_value=0.01, max_value=0.99, allow_nan=False),
    )
    def test_result_between_prev_and_new(
        self, prev: float, new: float, alpha: float
    ) -> None:
        """EWMA-Output liegt immer zwischen ``prev`` und ``new`` (zentrale Invariante)."""
        result = ewma_update(prev, new, alpha)
        lo, hi = min(prev, new), max(prev, new)
        # Toleranz für Floating-Point
        assert lo - 1e-9 <= result <= hi + 1e-9

    @given(
        prev=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False),
        new=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False),
    )
    def test_equal_prev_and_new_unchanged(self, prev: float, new: float) -> None:
        # Wenn beide Werte gleich sind, ändert EWMA nichts.
        result = ewma_update(prev, prev, alpha=0.3)
        assert math.isclose(result, prev)
        # zweite Form: new wird nicht benutzt wenn prev==new
        _ = new  # silence linter
