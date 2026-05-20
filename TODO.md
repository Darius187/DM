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

- [x] 🤖 `pyproject.toml` (Python 3.11+, Pydantic v2, structlog, pytest, hypothesis, mypy, ruff)
- [x] 🤖 Ordner-Struktur: `src/johnny5/{models,perception,interpretation,memory,behavior,action,safety,dashboard,mqtt,math,settings}` + `tests/` + `configs/`
- [x] 🤖 `src/johnny5/__init__.py` mit Version-String
- [x] 🤖 `src/johnny5/logging_config.py` mit `configure_logging(service_name)`

### 1.2 Datentypen & Topics

- [x] 🤖 `src/johnny5/models/pad.py` — `PADVector` mit Pydantic-Validation
- [x] 🤖 `src/johnny5/models/perception.py` — `PerceptionFaceEvent`, `PerceptionAudioEvent`, `VADEvent`, `WakeWordEvent`
- [x] 🤖 `src/johnny5/models/interpretation.py` — `SmoothedPADEvent`, `EngagementEvent`, `TurnTakingEvent`
- [x] 🤖 `src/johnny5/models/memory.py` — `MemoryEntry`, `Reflection`
- [x] 🤖 `src/johnny5/models/action.py` — `MotionCommand`, `MotionStatus`, `SpeechRequest`, `BackchannelRequest`
- [x] 🤖 `src/johnny5/models/safety.py` — `HeartbeatMessage`, `SafetyVerdict`, `EmergencyStop`
- [x] 🤖 `src/johnny5/topics.py` — Topic-Konstanten + QoS-Mapping + `format_topic`/`qos_for`

### 1.3 Settings

- [x] 🤖 `src/johnny5/settings/` — `MQTTSettings`, `SafetySettings`, `PerceptionSettings`, `BehaviorSettings`, `MemorySettings`
- [x] 🤖 `.env.example` mit Default-Werten

### 1.4 Safety-Layer-Stub (HIGHEST PRIORITY)

- [x] 🤖 `src/johnny5/safety/heartbeat.py` — `WatchdogHeartbeat` + `WatchdogMonitor`
- [x] 🤖 `src/johnny5/safety/validator.py` — `SafetyValidator.validate_motion()` mit Phase-1-Hartlimits
- [x] 🤖 `src/johnny5/safety/circuit_breaker.py` — `CircuitBreaker` (3 States)
- [x] 🤖 `tests/safety/` — Unit-Tests für alle drei Komponenten (asyncio + parametrisierte Matrix)
- [ ] 🤝 Safety-Service-Entry-Point `python -m johnny5.safety.service` *(braucht laufenden Mosquitto)*

### 1.5 Aktor-Abstraktion

- [x] 🤖 `src/johnny5/action/interface.py` — `ActuatorInterface` (Protocol mit `@runtime_checkable`)
- [x] 🤖 `src/johnny5/action/dummy.py` — `DummyActuator` mit asyncio-Lock, interrupt + passive_mode
- [ ] 🤖 `src/johnny5/action/virtual.py` — Stub für `VirtualActuator` *(kommt mit PyBullet, Phase 1.9)*

### 1.6 Mathematik-Bibliothek

- [x] 🤖 `src/johnny5/math/clipping.py` — `clip`, `clip_pad`, `clip_unit` + Hypothesis-Tests
- [x] 🤖 `src/johnny5/math/ewma.py` — `ewma_update` + Hypothesis-Property-Tests
- [x] 🤖 `src/johnny5/math/kalman.py` — `KalmanState`, `kalman_update` + Konvergenz- und Convex-Hull-Tests
- [x] 🤖 `src/johnny5/math/cosine.py` — `cosine_similarity` + numpy-Tests (Null-Vektor → 0.0, kein NaN)
- [x] 🤖 `src/johnny5/math/trajectories.py` — `s_curve_position` + `s_curve_velocity` + Jerk-Bound-Property-Test

### 1.7 MQTT-Infrastruktur

- [x] 🤖 `src/johnny5/mqtt/client.py` — `publisher_loop` + `subscriber_loop` mit Reconnect
- [ ] 🤝 aiomqtt-API auf der laufenden Umgebung verifizieren (TBD-Marker im Code)
- [ ] 🤖 Mock-MQTT-Fixtures für Integrationstests *(kommt sobald docker-compose mit Mosquitto läuft)*

### 1.8 Mock-Perception

- [x] 🤖 `src/johnny5/perception/mock.py` — Skript, das simulierte Beobachtungen sendet
- [x] 🤖 CLI: `python -m johnny5.perception.mock --rate 30 --person darius [--mqtt]`

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

## Verifikation auf der eingerichteten Umgebung

Sobald Darius Python + Mosquitto + pgvector laufen hat:

- [ ] 👤 `pip install -e .[dev,mqtt]` im Repo-Root
- [ ] 👤 `pytest -q` — sollten alle Tests grün sein (Math + Modelle + Safety + Action + Settings + Topics + Mock-Perception)
- [ ] 👤 `mypy src/johnny5` — sollte ohne Fehler durchlaufen
- [ ] 👤 `ruff check .` — sollte ohne Fehler durchlaufen
- [ ] 👤 `python -m johnny5.perception.mock --duration 5` — stdout-Smoke-Test
- [ ] 👤 `python -m johnny5.perception.mock --mqtt --duration 5` — MQTT-Smoke-Test (Mosquitto muss laufen)
- [ ] 🤖 Falls aiomqtt-API anders ist als angenommen: Fix gemäß den TBD-Markern in `src/johnny5/mqtt/client.py`

## Offene Fragen

> Werden gesammelt; sobald entschieden, wandern sie nach `LESSONS_LEARNED.md`.

- **Simulationsumgebung:** PyBullet vs. MuJoCo vs. Unreal — Empfehlung: PyBullet für Start, später evaluieren
- **LLM-Backend:** Hybrid (lokal + Claude API) — konkrete Routing-Schwellen TBD
- **TTS:** Piper bevorzugt — Stimme/Modellgröße TBD
- **Faster-Whisper Modellgröße:** Start mit `base`, benchmarken
