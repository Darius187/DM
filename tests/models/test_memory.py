"""Tests für Memory-Modelle."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from johnny5.models.memory import EMBEDDING_DIM, MemoryEntry, Reflection


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _valid_entry_kwargs() -> dict[str, object]:
    return {
        "timestamp": _now_utc(),
        "type": "observation",
        "person_id": "darius",
        "content": "Darius hat heute morgen geredet.",
        "importance": 5,
        "last_accessed_at": _now_utc(),
    }


class TestMemoryEntry:
    def test_valid_entry_without_embedding(self) -> None:
        entry = MemoryEntry(**_valid_entry_kwargs())  # type: ignore[arg-type]
        assert entry.embedding is None
        assert entry.access_count == 0

    def test_embedding_correct_dim(self) -> None:
        kwargs = _valid_entry_kwargs()
        kwargs["embedding"] = [0.0] * EMBEDDING_DIM
        entry = MemoryEntry(**kwargs)  # type: ignore[arg-type]
        assert entry.embedding is not None
        assert len(entry.embedding) == EMBEDDING_DIM

    def test_embedding_wrong_dim_rejected(self) -> None:
        kwargs = _valid_entry_kwargs()
        kwargs["embedding"] = [0.0] * 100
        with pytest.raises(ValidationError):
            MemoryEntry(**kwargs)  # type: ignore[arg-type]

    def test_importance_out_of_range_rejected(self) -> None:
        kwargs = _valid_entry_kwargs()
        kwargs["importance"] = 11
        with pytest.raises(ValidationError):
            MemoryEntry(**kwargs)  # type: ignore[arg-type]

    def test_naive_timestamp_rejected(self) -> None:
        kwargs = _valid_entry_kwargs()
        kwargs["timestamp"] = datetime.now()
        with pytest.raises(ValidationError):
            MemoryEntry(**kwargs)  # type: ignore[arg-type]

    def test_empty_content_rejected(self) -> None:
        kwargs = _valid_entry_kwargs()
        kwargs["content"] = ""
        with pytest.raises(ValidationError):
            MemoryEntry(**kwargs)  # type: ignore[arg-type]


class TestReflection:
    def test_minimal(self) -> None:
        r = Reflection(
            question="Was ist diese Woche aufgefallen?",
            insights=["Darius war drei Abende müde."],
            source_memory_ids=[1, 2, 3],
        )
        assert len(r.insights) == 1

    def test_empty_insights_rejected(self) -> None:
        with pytest.raises(ValidationError):
            Reflection(
                question="Q?",
                insights=[],
                source_memory_ids=[1],
            )

    def test_empty_source_ids_rejected(self) -> None:
        with pytest.raises(ValidationError):
            Reflection(
                question="Q?",
                insights=["i"],
                source_memory_ids=[],
            )
