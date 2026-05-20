"""Standardisierte structlog-Konfiguration für alle Johnny-5-Services.

Jeder Service ruft einmal beim Start ``configure_logging(service_name)`` auf.
Danach kann jedes Modul ``log = structlog.get_logger()`` benutzen und erhält
einen JSON-Logger mit UTC-Timestamps und gebundenem Service-Namen.

Siehe ``docs/CLAUDE_CODE_GUIDELINES.md`` §3.
"""

from __future__ import annotations

import logging
import sys
from typing import Final, Literal

import structlog

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

_DEFAULT_LEVEL: Final[LogLevel] = "INFO"


def configure_logging(
    service_name: str,
    log_level: LogLevel = _DEFAULT_LEVEL,
    json_output: bool = True,
) -> None:
    """Standardisiertes Logging für einen Service initialisieren.

    Args:
        service_name: Name des Services, wird in jeden Log-Eintrag gebunden.
            Beispiel: ``"perception"``, ``"safety"``, ``"behavior"``.
        log_level: Minimaler Loglevel. Default ``"INFO"``.
        json_output: Wenn ``True`` (Default), JSON-Renderer für maschinelle
            Verarbeitung. ``False`` schaltet auf Konsolen-Renderer um (lokales
            Entwickeln).

    Wirkung:
        - stdlib ``logging`` wird auf stdout konfiguriert (für Bibliotheken,
          die direkt ``logging`` benutzen).
        - structlog bekommt: Context-Vars-Merge, Loglevel, ISO-UTC-Timestamp,
          Stack-/Exception-Renderer, finalen Renderer (JSON oder Console).
        - ``service`` wird via ``contextvars`` gebunden — taucht in jedem
          Eintrag auf, ohne dass man es manuell mitgeben muss.

    Idempotenz:
        Mehrfache Aufrufe sind erlaubt (überschreiben die Konfiguration);
        in der Praxis genau einmal pro Service beim Start aufrufen.
    """
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if json_output
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(log_level),
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(service=service_name)


def bind_request_context(**kwargs: object) -> None:
    """Bindet Context-Vars für einen Aufrufkontext (z.B. ``person_id``).

    Diese werden in jedem darauffolgenden Log-Eintrag mitgeschickt, bis sie
    via :func:`structlog.contextvars.clear_contextvars` zurückgesetzt werden.
    """
    structlog.contextvars.bind_contextvars(**kwargs)
