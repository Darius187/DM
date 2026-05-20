"""Tests für den Mock-Perception-Emitter."""

from __future__ import annotations

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from johnny5.models.perception import PerceptionFaceEvent
from johnny5.perception.mock import make_face_event


class TestMakeFaceEvent:
    def test_emits_valid_event(self) -> None:
        event = make_face_event(person_id="darius", t=0.0)
        assert isinstance(event, PerceptionFaceEvent)
        assert event.person_id == "darius"

    def test_pad_within_bounds(self) -> None:
        for t in (0.0, 0.5, 1.0, 5.0, 100.0):
            event = make_face_event(person_id="x", t=t)
            assert -1.0 <= event.pad.valence <= 1.0
            assert -1.0 <= event.pad.arousal <= 1.0
            assert -1.0 <= event.pad.dominance <= 1.0

    def test_timestamp_is_utc(self) -> None:
        event = make_face_event(person_id="x", t=0.0)
        assert event.timestamp.tzinfo is not None


class TestMakeFaceEventProperties:
    @settings(max_examples=30)
    @given(t=st.floats(min_value=0.0, max_value=10000.0, allow_nan=False))
    def test_any_time_produces_valid_event(self, t: float) -> None:
        event = make_face_event(person_id="darius", t=t)
        assert -1.0 <= event.pad.valence <= 1.0
        assert 0.0 <= event.perclos <= 1.0
        assert 0.0 <= event.attention <= 1.0


def test_arg_parser_rejects_zero_rate(monkeypatch: pytest.MonkeyPatch) -> None:
    from johnny5.perception import mock

    monkeypatch.setattr("sys.argv", ["mock", "--rate", "0"])
    with pytest.raises(SystemExit):
        mock.main()
