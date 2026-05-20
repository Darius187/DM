"""Tests für PADVector."""

from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st
from pydantic import ValidationError

from johnny5.models.pad import PADVector


class TestPADVectorValidation:
    def test_neutral_factory(self) -> None:
        pad = PADVector.neutral()
        assert pad.valence == 0.0
        assert pad.arousal == 0.0
        assert pad.dominance == 0.0
        assert pad.confidence == 1.0
        assert pad.dominance_source == "heuristic"

    def test_valid_corner(self) -> None:
        pad = PADVector(valence=1.0, arousal=-1.0, dominance=0.5)
        assert pad.valence == 1.0
        assert pad.arousal == -1.0

    @pytest.mark.parametrize("field", ["valence", "arousal", "dominance"])
    def test_above_upper_bound_rejected(self, field: str) -> None:
        kwargs = {"valence": 0.0, "arousal": 0.0, "dominance": 0.0}
        kwargs[field] = 1.5
        with pytest.raises(ValidationError):
            PADVector(**kwargs)  # type: ignore[arg-type]

    @pytest.mark.parametrize("field", ["valence", "arousal", "dominance"])
    def test_below_lower_bound_rejected(self, field: str) -> None:
        kwargs = {"valence": 0.0, "arousal": 0.0, "dominance": 0.0}
        kwargs[field] = -1.5
        with pytest.raises(ValidationError):
            PADVector(**kwargs)  # type: ignore[arg-type]

    def test_confidence_out_of_range_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PADVector(valence=0.0, arousal=0.0, dominance=0.0, confidence=1.5)

    def test_unknown_dominance_source_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PADVector(
                valence=0.0,
                arousal=0.0,
                dominance=0.0,
                dominance_source="invented",  # type: ignore[arg-type]
            )

    def test_extra_fields_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PADVector(  # type: ignore[call-arg]
                valence=0.0,
                arousal=0.0,
                dominance=0.0,
                undocumented_field=42,
            )

    def test_immutable(self) -> None:
        pad = PADVector.neutral()
        with pytest.raises(ValidationError):
            pad.valence = 0.5  # type: ignore[misc]


class TestPADVectorProperties:
    @given(
        v=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        a=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        d=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        c=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
    )
    def test_any_in_range_value_is_accepted(
        self, v: float, a: float, d: float, c: float
    ) -> None:
        pad = PADVector(valence=v, arousal=a, dominance=d, confidence=c)
        assert -1.0 <= pad.valence <= 1.0
        assert -1.0 <= pad.arousal <= 1.0
        assert -1.0 <= pad.dominance <= 1.0
        assert 0.0 <= pad.confidence <= 1.0
