"""Tests für Cosine-Similarity."""

from __future__ import annotations

import math

import numpy as np
import pytest
from hypothesis import given
from hypothesis import strategies as st
from hypothesis.extra.numpy import arrays

from johnny5.math.cosine import cosine_similarity


class TestCosineSimilarity:
    def test_identical_vectors_return_one(self) -> None:
        a = np.array([1.0, 2.0, 3.0])
        assert math.isclose(cosine_similarity(a, a), 1.0, abs_tol=1e-9)

    def test_orthogonal_vectors_return_zero(self) -> None:
        a = np.array([1.0, 0.0])
        b = np.array([0.0, 1.0])
        assert math.isclose(cosine_similarity(a, b), 0.0, abs_tol=1e-9)

    def test_opposite_vectors_return_minus_one(self) -> None:
        a = np.array([1.0, 2.0])
        b = np.array([-1.0, -2.0])
        assert math.isclose(cosine_similarity(a, b), -1.0, abs_tol=1e-9)

    def test_zero_vector_returns_zero_not_nan(self) -> None:
        a = np.zeros(384)
        b = np.array([1.0] * 384)
        result = cosine_similarity(a, b)
        assert result == 0.0
        assert not math.isnan(result)

    def test_both_zero_returns_zero(self) -> None:
        a = np.zeros(10)
        b = np.zeros(10)
        assert cosine_similarity(a, b) == 0.0

    def test_shape_mismatch_raises(self) -> None:
        with pytest.raises(ValueError):
            cosine_similarity(np.array([1.0, 2.0]), np.array([1.0, 2.0, 3.0]))


class TestCosineProperties:
    @given(
        v=arrays(
            dtype=np.float64,
            shape=10,
            elements=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False),
        ),
    )
    def test_result_always_bounded(self, v: np.ndarray) -> None:
        # Self-Similarity: 1.0 oder 0.0 wenn Null-Vektor.
        result = cosine_similarity(v, v)
        if np.linalg.norm(v) < 1e-10:
            assert result == 0.0
        else:
            assert math.isclose(result, 1.0, abs_tol=1e-9)

    @given(
        a=arrays(
            dtype=np.float64,
            shape=5,
            elements=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        ),
        b=arrays(
            dtype=np.float64,
            shape=5,
            elements=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        ),
    )
    def test_result_in_minus_one_to_one(self, a: np.ndarray, b: np.ndarray) -> None:
        result = cosine_similarity(a, b)
        assert -1.0 - 1e-9 <= result <= 1.0 + 1e-9
