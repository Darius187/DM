# TODO.md

Konkrete, abarbeitbare Aufgaben. Priorisiert nach aktueller Phase.

> **Konvention:**
> - `[ ]` offen, `[~]` in Arbeit, `[x]` erledigt
> - `🤖` = KI-Assistent kann das machen
> - `👤` = nur Darius (Hardware/Setup auf physischem Gerät)
> - `🤝` = gemeinsam (Code schreibt KI, einrichten/testen muss Darius)

---

## Phase 0 — Konzept & Setup

### Doku-Fundament

- [x] 🤖 `CLAUDE.md` projektspezifisch ausgefüllt
- [x] 🤖 `docs/PROJECT_CONTEXT.md` (v4) ins Repo gelegt
- [x] 🤖 `docs/CLAUDE_CODE_GUIDELINES.md` ins Repo gelegt
- [x] 🤖 `STATUS.md`, `TODO.md`, `LESSONS_LEARNED.md` angelegt
- [x] 🤖 `.gitignore` für Python-Stack

### Architektur-Visualisierung

- [x] 🤖 Mermaid-Diagramm `docs/architecture.mmd` aus dem ASCII-Diagramm in `PROJECT_CONTEXT.md` §4 generiert

### Infrastruktur-Setup (manuell, Darius)

- [ ] 👤 Proxmox auf Esprimo Q958 installieren
- [ ] 👤 PostgreSQL-LXC mit `pgvector`-Extension einrichten
- [ ] 👤 Mosquitto-LXC einrichten (Standard-Port 1883)
- [ ] 👤 Python 3.11+ auf dem Entwicklungsrechner installieren
- [ ] 👤 Claude Code lokal einrichten (Authentifizierung, Workspace)

---

## Phase 1 — Skelett, Safety, Simulation

> Reihenfolge ist wichtig: **Safety zuerst.** Erst danach Aktor-Code.

### 1.1 Projekt-Skelett

- [ ] 🤖 `pyproject.toml` (Python 3.11+, Pydantic v2, structlog, pytest, hypothesis, mypy, ruff)
- [ ] 🤖 Ordner-Struktur: `src/johnny5/{models,perception,interpretation,memory,behavior,action,safety,dashboard}` + `tests/` + `configs/`
- [ ] 🤖 `src/johnny5/__init__.py` mit Version-String
- [ ] 🤖 `src/johnny5/logging_config.py` mit `configure_logging(service_name)` (siehe Guidelines §3)

### 1.2 Datentypen & Topics

- [ ] 🤖 `src/johnny5/models/pad.py` — `PADVector` mit Pydantic-Validation (Field-Constraints `[-1,1]`)
- [ ] 🤖 `src/johnny5/models/perception.py` — `PerceptionFaceEvent`, `PerceptionAudioEvent`
- [ ] 🤖 `src/johnny5/models/interpretation.py` — `EngagementEvent`, `TurnTakingEvent`
- [ ] 🤖 `src/johnny5/models/memory.py` — `MemoryEntry`, `Reflection`
- [ ] 🤖 `src/johnny5/models/action.py` — `MotionCommand`, `SpeechRequest`, `BackchannelRequest`
- [ ] 🤖 `src/johnny5/models/safety.py` — `SafetyVerdict`, `HeartbeatMessage`
- [ ] 🤖 `src/johnny5/topics.py` — Topic-Konstanten + QoS-Mapping (siehe Guidelines §4)

### 1.3 Settings

- [ ] 🤖 `src/johnny5/settings/` — Pydantic-Settings pro Service (PerceptionSettings, BehaviorSettings, MemorySettings, SafetySettings)
- [ ] 🤖 `.env.example` mit Default-Werten

### 1.4 Safety-Layer-Stub (HIGHEST PRIORITY)

- [ ] 🤖 `src/johnny5/safety/heartbeat.py` — `WatchdogHeartbeat` + `WatchdogMonitor` (siehe Guidelines §9)
- [ ] 🤖 `src/johnny5/safety/validator.py` — `SafetyLayer.validate_motion()` mit Geofencing/Velocity-Stub
- [ ] 🤖 `src/johnny5/safety/circuit_breaker.py` — `CircuitBreaker` (3 States)
- [ ] 🤖 `tests/safety/` — Unit-Tests für alle drei Komponenten
- [ ] 🤝 Safety-Service-Entry-Point `python -m johnny5.safety.service`

### 1.5 Aktor-Abstraktion

- [ ] 🤖 `src/johnny5/action/interface.py` — `ActuatorInterface` (Protocol/ABC)
- [ ] 🤖 `src/johnny5/action/dummy.py` — `DummyActuator` (Console-Logs)
- [ ] 🤖 `src/johnny5/action/virtual.py` — Stub für `VirtualActuator` (3D später)

### 1.6 Mathematik-Bibliothek

- [ ] 🤖 `src/johnny5/math/clipping.py` — `clip_pad()` + Tests
- [ ] 🤖 `src/johnny5/math/ewma.py` — `ewma_update()` + Hypothesis-Tests
- [ ] 🤖 `src/johnny5/math/kalman.py` — `KalmanState`, `kalman_update()` + Tests
- [ ] 🤖 `src/johnny5/math/cosine.py` — `cosine_similarity()` + Edge-Case-Tests (Null-Vektoren)
- [ ] 🤖 `src/johnny5/math/trajectories.py` — `s_curve_position()` + Property-Test (Jerk-Bound)

### 1.7 MQTT-Infrastruktur

- [ ] 🤖 `src/johnny5/mqtt/client.py` — `mqtt_publisher_with_reconnect()` (siehe Guidelines §4)
- [ ] 🤖 `src/johnny5/mqtt/subscriber.py` — Subscriber mit Reconnect + Pydantic-Validation
- [ ] 🤖 Mock-MQTT-Fixtures für Tests

### 1.8 Mock-Perception

- [ ] 🤖 `src/johnny5/perception/mock.py` — Skript, das simulierte Beobachtungen sendet
- [ ] 🤖 CLI: `python -m johnny5.perception.mock --rate 30`

### 1.9 Simulation

- [ ] 🤝 PyBullet-Stub für 3D-Visualisierung (3D-Avatar reagiert auf MQTT-Action-Topics)

### 1.10 Performance-Profiling

- [ ] 👤 Esprimo-Last-Profiling unter Volllast (alle Services parallel)
- [ ] 🤖 Mess-Script: `scripts/profile_esprimo.py` (CPU/Memory/MQTT-Roundtrip)

---

## Backlog (Phase 2+)

Sammelplatz für später. Wird in die jeweilige Phase verschoben sobald sie dran ist.

- MediaPipe-Wrapper mit Confidence-Gates
- FACS-AU-Berechnung aus Landmarks (OpenFace-Referenz, eigene Implementierung mit Tests)
- VA-Klassifikator (vortrainiert auf AffectNet)
- Faster-Whisper-Latenz-Benchmark pro Modellgröße
- pgvector-Schema + Memory-Service
- Importance-Scoring via LLM
- Reflection-Loop (täglich)
- py_trees-Behavior-Tree
- LLM-Tool-Use-Orchestrator mit Validation
- Sanitization-Gateway (Klasse-A-Filter)
- Dashboard (FastAPI oder Streamlit)
- LMA-Mapping empirisch kalibrieren

---

## Offene Fragen

> Werden gesammelt; sobald entschieden, wandern sie nach `LESSONS_LEARNED.md`.

- **Simulationsumgebung:** PyBullet vs. MuJoCo vs. Unreal — Empfehlung: PyBullet für Start, später evaluieren
- **LLM-Backend:** Hybrid (lokal + Claude API) — konkrete Routing-Schwellen TBD
- **TTS:** Piper bevorzugt — Stimme/Modellgröße TBD
- **Faster-Whisper Modellgröße:** Start mit `base`, benchmarken
