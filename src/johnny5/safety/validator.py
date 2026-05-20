"""Safety-Validator-Stub für Motion-Requests.

In Phase 1 absichtlich konservativ: alle Werte bekommen Hard-Limits.
Die feinen Geofencing-/Force-Limits kommen mit der echten Hardware in
Phase 7. Bis dahin gilt: lieber zu viel blockieren als zu wenig.

Siehe ``CLAUDE_CODE_GUIDELINES.md`` §9 und ``PROJECT_CONTEXT.md`` §5 (Modul 7).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Final

import structlog

from johnny5.models.action import MotionCommand
from johnny5.models.safety import SafetyVerdict, VerdictDecision

log = structlog.get_logger()

MAX_DURATION_S: Final[float] = 5.0
"""Phase-1-Hartlimit. Längere Bewegungen werden modifiziert oder blockiert."""

MAX_TARGET_DISTANCE_M: Final[float] = 3.0
"""Hartlimit für ``look_at``/``point``-Ziele in Metern (Wohnzimmer-Größe)."""


@dataclass(frozen=True)
class ValidatorConfig:
    """Konfigurierbare Schranken des Safety-Validators.

    Defaults sind für Phase 1 (Simulation, keine Hardware) gewählt.
    """

    max_duration_s: float = MAX_DURATION_S
    max_target_distance_m: float = MAX_TARGET_DISTANCE_M
    require_interruptible_for_long_motions: bool = True
    """Bewegungen >2 s müssen ``interruptible=True`` haben."""


class SafetyValidator:
    """Synchroner Validator. Stateless — kann aus mehreren Tasks aufgerufen werden."""

    def __init__(self, config: ValidatorConfig | None = None) -> None:
        self._config = config or ValidatorConfig()

    def validate_motion(self, cmd: MotionCommand) -> SafetyVerdict:
        """Prüft einen ``MotionCommand`` gegen die Sicherheits-Regeln.

        Returns:
            :class:`SafetyVerdict` mit Decision ``allow``/``modify``/``block``.
            Bei ``modify`` enthält ``modifications`` die geänderten Felder.
        """
        decision: VerdictDecision = "allow"
        reasons: list[str] = []
        modifications: dict[str, float] = {}

        # 1. Dauer-Limit
        if cmd.duration_s > self._config.max_duration_s:
            new_dur = self._config.max_duration_s
            modifications["duration_s"] = new_dur
            reasons.append(
                f"duration {cmd.duration_s}s > limit {self._config.max_duration_s}s"
            )
            decision = "modify"

        # 2. Interruptible-Pflicht für lange Bewegungen
        if (
            self._config.require_interruptible_for_long_motions
            and cmd.duration_s > 2.0
            and not cmd.interruptible
        ):
            reasons.append("long motion must be interruptible")
            decision = "block"

        # 3. Ziel-Distanz prüfen (nur wenn target_xyz gesetzt)
        if cmd.target_xyz is not None:
            x, y, z = cmd.target_xyz
            distance = (x * x + y * y + z * z) ** 0.5
            if distance > self._config.max_target_distance_m:
                reasons.append(
                    f"target distance {distance:.2f}m > limit "
                    f"{self._config.max_target_distance_m}m"
                )
                decision = "block"

        verdict = SafetyVerdict(
            request_id=cmd.request_id,
            timestamp=datetime.now(timezone.utc),
            decision=decision,
            reason="; ".join(reasons) if reasons else None,
            modifications=modifications if modifications and decision == "modify" else None,
        )

        if decision == "block":
            log.warning(
                "motion_blocked",
                request_id=cmd.request_id,
                motion_type=cmd.motion_type,
                reasons=reasons,
            )
        elif decision == "modify":
            log.info(
                "motion_modified",
                request_id=cmd.request_id,
                motion_type=cmd.motion_type,
                modifications=modifications,
            )

        return verdict
