# STATUS.md

Aktueller Stand des Johnny-5-Companion-Projekts. Wird bei jedem signifikanten Fortschritt aktualisiert.

> **Format-Regel:** Eine Sektion pro Phase. Erledigtes mit `[x]`, in Arbeit mit `[~]`, offen mit `[ ]`.

---

## Aktuelle Phase: **Phase 1 — Skelett, Safety, Simulation** `[~]`

**Phase 0:** abgeschlossen für alles was ohne PC geht
**Phase 1 Start:** Mai 2026
**Geplante Dauer:** 3–4 Wochen
**Beschäftigung:** 5–10 h/Woche (Hobby)

### Letztes Update

2026-05-20 — Phase-1-Code-Skelett durch Claude Code, parallel zur PC-Einrichtung:
- Projekt-Skelett: `pyproject.toml` (Python 3.11+, Pydantic v2, structlog, pytest, ruff, mypy)
- `src/johnny5/topics.py` mit allen MQTT-Topics + QoS-Mapping
- Pydantic-Modelle für alle MQTT-Payloads (PAD, Perception, Memory, Action, Safety, Interpretation)
- Pydantic-Settings pro Service (`JOHNNY5_<SERVICE>_*`-Env-Vars) + `.env.example`
- Mathematik-Library: Clipping, EWMA, 1D-Kalman, Cosine-Similarity, S-Curve-Trajektorie — alle mit Hypothesis-Property-Tests
- Safety-Layer-Stub: `WatchdogHeartbeat`, `WatchdogMonitor`, `SafetyValidator`, `CircuitBreaker` — alle mit Unit-Tests
- `ActuatorInterface` (Protocol) + `DummyActuator`
- MQTT-Publisher/Subscriber mit Reconnect (aiomqtt-2.x-API, mit TBD-Markern wo die API verifizierbar ist)
- Mock-Perception-Emitter (`python -m johnny5.perception.mock`)

Noch kein Code wurde ausgeführt — wartet auf Darius' Setup von Python + Mosquitto + pgvector.

---

## Phasen-Übersicht

### Phase 0 — Konzept & Setup `[~]` IN ARBEIT

- [x] `PROJECT_CONTEXT.md` v4 finalisiert (vorab durch Darius erstellt)
- [x] `CLAUDE_CODE_GUIDELINES.md` v1.0 erstellt
- [x] Git-Repo aufgesetzt
- [x] `CLAUDE.md` mit Projekt-Spezifika ausgefüllt
- [x] `STATUS.md`, `TODO.md`, `LESSONS_LEARNED.md` angelegt
- [x] `.gitignore` für Python-Stack
- [ ] Proxmox auf Esprimo Q958 installieren *(durch Darius, manuell)*
- [ ] PostgreSQL + pgvector im LXC einrichten *(durch Darius, manuell)*
- [ ] Mosquitto-LXC einrichten *(durch Darius, manuell)*
- [ ] Claude Code lokal auf Hauptrechner einrichten *(durch Darius, manuell)*
- [x] Architektur-Diagramm als Mermaid in `docs/architecture.mmd`

### Phase 1 — Skelett, Safety, Simulation `[~]` IN ARBEIT

3–4 Wochen. Code-Skelett ist da, ausstehend: Code auf eingerichteter Umgebung verifizieren, PyBullet-Simulation, Esprimo-Profiling. Siehe `TODO.md`.

### Phase 2 — Reale Wahrnehmung `[ ]`

4–6 Wochen. MediaPipe, Audio-Stack, Late-Fusion.

### Phase 3 — Interpretation & Memory `[ ]`

4–5 Wochen. pgvector-Schema, Importance-Scoring, Reflection-Loop, Retrieval-Score.

### Phase 4 — Verhalten, Sprache & Latenz `[ ]`

5–7 Wochen. Behavior-Tree (py_trees), Turn-Taking, Interrupt-Coordinator, LLM-Tool-Use, TTS.

### Phase 5 — Bewegungs-Choreografie `[ ]`

3–4 Wochen. Easing, Jerk-Limiting, LMA-Mapping empirisch kalibrieren.

### Phase 6 — Dashboard & Polish `[ ]`

2–3 Wochen. Web-Dashboard, PAD-Live-Viz, Eval-Suite.

### Phase 7 — Hardware-Migration `[ ]`

Mehrere Monate, offen. Mechanik, Servos (Dynamixel bevorzugt), Mikrocontroller, Safety mit echter Hardware.

---

## Bekannte Engpässe / Risiken (Stand jetzt)

- **Esprimo Q958 CPU-Last** unter Volllast unklar — Profiling in Phase 1 zwingend.
- **Faster-Whisper-Latenz** modellabhängig — selbst benchmarken (siehe Guidelines §13).
- **Sim-to-Real-Gap** bei sozialer Robotik ~30–40 % — Hardware-Phase wird Iterationen brauchen.
- **PC noch nicht eingerichtet** — KI-Assistenten schreiben aktuell nur Code, führen nichts aus.

---

## Nächste konkrete Schritte

Siehe `TODO.md` für die ausführliche Liste. Top 3:

1. **Du:** Python 3.11+ einrichten, `pip install -e .[dev,mqtt]`, dann `pytest -q` um zu prüfen ob die Tests durchlaufen.
2. **Du:** Mosquitto-LXC + PostgreSQL-LXC auf Esprimo. Dann `python -m johnny5.perception.mock --mqtt` zum Smoke-Test.
3. Sobald Tests grün: aiomqtt-API in `src/johnny5/mqtt/client.py` verifizieren (TBD-Marker) und ggf. korrigieren.
