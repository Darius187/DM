"""Tests für Clipping-Helfer."""

from __future__ import annotations

import math

import pytest
from hypothesis import given
from hypothesis import strategies as st

from johnny5.math.clipping import PAD_HI, PAD_LO, clip, clip_pad, clip_unit


class TestClip:
    def test_value_inside_returned_unchanged(self) -> None:
        assert clip(0.5, -1.0, 1.0) == 0.5

    def test_value_below_lo_clamped(self) -> None:
        assert clip(-2.0, -1.0, 1.0) == -1.0

    def test_value_above_hi_clamped(self) -> None:
        assert clip(5.0, -1.0, 1.0) == 1.0

    def test_inverted_bounds_raise(self) -> None:
        with pytest.raises(ValueError):
            clip(0.0, 1.0, -1.0)

    @given(
        value=st.floats(min_value=-1e6, max_value=1e6, allow_nan=False),
        lo=st.floats(min_value=-100.0, max_value=0.0, allow_nan=False),
        hi=st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
    )
    def test_result_always_in_bounds(self, value: float, lo: float, hi: float) -> None:
        result = clip(value, lo, hi)
        assert lo <= result <= hi


class TestClipPAD:
    @given(value=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False))
    def test_always_in_pad_range(self, value: float) -> None:
        result = clip_pad(value)
        assert PAD_LO <= result <= PAD_HI

    def test_already_in_range_unchanged(self) -> None:
        assert math.isclose(clip_pad(0.42), 0.42)


class TestClipUnit:
    @given(value=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False))
    def test_always_in_unit_range(self, value: float) -> None:
        result = clip_unit(value)
        assert 0.0 <= result <= 1.0
