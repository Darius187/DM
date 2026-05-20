"""Tests für die Topic-Konstanten und Helfer."""

from __future__ import annotations

import pytest

from johnny5 import topics


class TestFormatTopic:
    def test_fills_single_wildcard(self) -> None:
        result = topics.format_topic(topics.PERCEPTION_FACE, person_id="darius")
        assert result == "perception/face/darius"

    def test_fills_system_health(self) -> None:
        result = topics.format_topic(topics.SYSTEM_HEALTH, service_name="perception")
        assert result == "system/health/perception"

    def test_missing_field_raises(self) -> None:
        with pytest.raises(KeyError):
            topics.format_topic(topics.PERCEPTION_FACE)


class TestQosFor:
    def test_template_lookup(self) -> None:
        assert topics.qos_for(topics.PERCEPTION_FACE) == 0
        assert topics.qos_for(topics.MEMORY_OBSERVATION) == 2
        assert topics.qos_for(topics.BEHAVIOR_HEARTBEAT) == 1

    def test_concrete_topic_lookup(self) -> None:
        concrete = topics.format_topic(topics.PERCEPTION_FACE, person_id="darius")
        assert topics.qos_for(concrete) == 0

    def test_unknown_raises(self) -> None:
        with pytest.raises(KeyError):
            topics.qos_for("not/a/real/topic")


class TestQosMappingComplete:
    """Jedes als Konstante exportierte Topic muss ein QoS-Mapping haben."""

    def test_every_topic_constant_has_qos(self) -> None:
        topic_constants = {
            name: value
            for name, value in vars(topics).items()
            if name.isupper() and isinstance(value, str) and "/" in value
        }
        # alle ausser QOS_FOR_TOPIC selbst
        for name, value in topic_constants.items():
            assert value in topics.QOS_FOR_TOPIC, f"{name} has no QoS mapping"

    def test_qos_levels_are_valid(self) -> None:
        for topic, qos in topics.QOS_FOR_TOPIC.items():
            assert qos in (0, 1, 2), f"{topic} has invalid QoS {qos}"
