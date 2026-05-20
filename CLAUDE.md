# CLAUDE.md

Leitfaden für KI-Assistenten (Claude Code / Claude Cowork) in diesem Repository.

> **Bei jeder neuen Session ZUERST lesen:**
> 1. `docs/PROJECT_CONTEXT.md` — Projekt-Vision, Architektur, Module, Phasen
> 2. `docs/CLAUDE_CODE_GUIDELINES.md` — Code-Patterns, konkrete Formeln, Anti-Patterns
> 3. `STATUS.md` — aktuelle Phase und Fortschritt
> 4. `TODO.md` — offene Aufgaben

---

## Projekt-Überblick

**Codename:** Johnny 5 Companion

**Ziel:** Humanoider Companion-Roboter, der natürliche menschliche Interaktionsmuster zeigt (Begrüßung, Stimmungserkennung, proaktive Nachfragen, expressive Bewegung). Lebt im Wohnzimmer als Familienmitglied.

**Philosophie:** LEAP-71-Prinzip — etablierte Bausteine intelligent verbinden statt neu erfinden. **Software-First**, Hardware später.

**Status:** Konzeptphase / Phase 0 — Setup, noch kein Produktiv-Code.

**Eigentümer:** Darius Matuszak. Hobby-Projekt, 5–10 h/Woche, Gesamtdauer Simulation ~6–7 Monate.

Vollständiger Kontext: siehe `docs/PROJECT_CONTEXT.md` (v4).

---

## Repository-Struktur

Aktueller Stand (wächst mit den Phasen):

```
/
├── CLAUDE.md                       # Diese Datei
├── STATUS.md                       # Aktuelle Phase + Fortschritt
├── TODO.md                         # Offene Aufgaben (Phase 0/1)
├── LESSONS_LEARNED.md              # Sackgassen, Entscheidungs-Begründungen
├── docs/
│   ├── PROJECT_CONTEXT.md          # Übergabe-Kontext (v4)
│   └── CLAUDE_CODE_GUIDELINES.md   # Code-Patterns, Formeln, Anti-Patterns
└── .gitignore
```

Geplant (Phase 1+):

```
├── src/johnny5/                    # Python-Package
│   ├── models/                     # Pydantic-Modelle (MQTT-Payloads)
│   ├── topics.py                   # MQTT-Topic-Konstanten
│   ├── perception/
│   ├── interpretation/
│   ├── memory/
│   ├── behavior/
│   ├── action/
│   ├── safety/
│   └── dashboard/
├── tests/
├── configs/                        # YAML-Configs (FACS→PAD, Behavior-Rules, LMA-Mapping)
└── pyproject.toml
```

---

## Hardware-Setup (Referenz)

- **Entwicklungsrechner (i9-14900K + RTX 4070 Ti):** Claude Code, Whisper, lokale LLM, Simulation
- **Backend-Server Esprimo Q958 (i5-9500T, 16 GB, 24/7):** Proxmox-Host für MQTT, PostgreSQL+pgvector, Behavior-Engine, Safety-Watchdog, TTS
- **Johnny 5 Hardware:** noch nicht gebaut, wird in Simulation entwickelt

> **Wichtig:** Aktuell ist KEIN PC eingerichtet. KI-Assistenten schreiben Code, führen aber nichts aus (kein `pip install`, kein `pytest`, kein Docker). Darius richtet die Umgebung später selbst ein.

---

## Entwicklungs-Stack

### Sprache & Versionen

- **Python 3.11+** (für `asyncio.TaskGroup`, `match`, etc.)
- Type Hints überall, `mypy --strict`-tauglich

### Kern-Bibliotheken

| Zweck | Bibliothek |
|---|---|
| Validation/Modelle | `pydantic` v2, `pydantic-settings` |
| Logging | `structlog` (strukturiertes JSON) |
| Tests | `pytest`, `hypothesis`, `pytest-asyncio` |
| MQTT | `aiomqtt` (async), `paho-mqtt` (sync-Fallback) |
| DB | `psycopg`, `pgvector`, `sqlalchemy` |
| Behavior Tree | `py_trees` |
| Perception | `mediapipe`, `opencv-python`, `face_recognition`, `silero-vad`, `openwakeword`, `pyannote.audio`, `faster-whisper` |
| ML | `transformers`, `sentence-transformers`, `torch` |
| LLM | `anthropic`, `ollama` |
| Web | `fastapi` oder `streamlit` (Dashboard) |
| Simulation | `pybullet` (Start), evtl. später MuJoCo / Unreal |

### Infrastruktur

- **Proxmox-LXCs** auf dem Esprimo (1 Container pro Service)
- **Mosquitto** als MQTT-Broker
- **PostgreSQL + pgvector** als einzige DB (Memory-Stream, Embeddings, Volltext)

---

## Git-Workflow

### Branches

| Zweck | Pattern | Beispiel |
|---|---|---|
| KI-Setup-Tasks | `claude/<task-id>` | `claude/setup-new-project-d8MkH` |
| Features | `feature/<kurzbeschreibung>` | `feature/perception-pad` |
| Bugfixes | `fix/<kurzbeschreibung>` | `fix/mqtt-reconnect` |
| Releases | `release/<version>` | `release/0.1.0` |

**Niemals direkt nach `main` pushen.**

### Commit-Messages (Conventional Commits)

```
<type>(<scope>): <kurze Zusammenfassung>

[optionaler Body]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

Beispiele:
- `feat(perception): add MediaPipe face mesh wrapper`
- `fix(mqtt): handle broker reconnect after timeout`
- `docs: update Phase-1 checklist in TODO.md`
- `test(memory): add Hypothesis tests for retrieval score`

### Pull Requests

Werden nur erstellt wenn Darius explizit darum bittet. Einzelne Concerns, klare Beschreibung, CI grün.

---

## Coding-Konventionen (Kurzfassung)

Vollständige Patterns in `docs/CLAUDE_CODE_GUIDELINES.md`.

### Maxime

**Korrektheit > Lesbarkeit > Performance > Cleverness**

### Stil

- Python 3.11+, alles Type-annotiert
- Pydantic v2 für Validation an Modul-Grenzen (MQTT-Payloads, Configs)
- `structlog` statt `print`/`logging` (strukturierte JSON-Logs, keine f-strings in Log-Calls)
- `async/await` für I/O; `asyncio.to_thread` für CPU-gebundene Inferenz
- UTC für alle Timestamps, niemals naive `datetime`
- Keine Magic Numbers — Konstante oder Config
- Docstrings im Google-Style

### Sicherheit

- Keine Secrets im Repo (`.env`, Pydantic-Settings)
- Externe Eingaben an Modul-Grenzen validieren (Pydantic)
- Klasse-A-Daten (Roh-Audio, Roh-Video, Kinderstimme) NIEMALS an Cloud-LLM

### Anti-Patterns (siehe Guidelines §14)

- Keine fest verdrahteten Magic-Numbers
- Keine direkten LLM-Calls in Inner-Loops
- Keine Synchron-Calls auf Hardware (immer async)
- Keine ungetesteten Mathematik-Implementierungen (FACS, Kalman, Bayes, PAD-Mapping, Jerk-Limiting, LMA-Mapping)
- Keine Vendor-Locks (LLM-Provider austauschbar)
- Keine rohen Landmark-Streams über MQTT (Reduktion auf ~20 Features)
- Keine Aktor-Befehle ohne Safety-Layer-Validation
- Keine Cloud-Calls mit Klasse-A-Daten

---

## Tests

- **Framework:** `pytest` + `hypothesis` (Property-Based-Tests)
- **Pflicht** für: alle Mathematik-Funktionen (PAD-Clipping, EWMA, Kalman, Cosine-Similarity, Jerk-Limit, S-Curve, PAD→LMA-Mapping, Retrieval-Score)
- **Deterministisch:** keine `time.sleep()`, keine echten Netzwerk-Calls in Unit-Tests
- **Naming:** `should_<verhalten>_when_<bedingung>`

---

## CI / CD

> Wird in Phase 1 aufgesetzt. Geplant: GitHub Actions mit `pytest`, `mypy --strict`, `ruff`.

---

## Anweisungen für KI-Assistenten

1. **Vor jeder Session:** `docs/PROJECT_CONTEXT.md` + `docs/CLAUDE_CODE_GUIDELINES.md` + `STATUS.md` lesen.
2. **Vor dem Bearbeiten:** Datei lesen.
3. **Minimal bleiben:** Nur das umsetzen, was die Aufgabe verlangt. Keine ungebetenen Refactorings.
4. **Branch-Disziplin:** auf dem zugewiesenen Branch arbeiten, nie direkt nach `main` pushen.
5. **Bei zerstörerischen Aktionen** (Datei-Löschen, Force-Push, CI-Änderung) erst bei Darius rückfragen.
6. **Keine erfundenen URLs / APIs.** Bei Unsicherheit zur Funktions-Signatur: Pseudocode mit Markierung `# TBD: API verifizieren`.
7. **Bei fehlenden Infos nachfragen**, nicht erfinden.
8. **Inkrementell committen:** kleine, fokussierte Commits mit aussagekräftigen Messages.
9. **Keine unnötigen Kommentare** — nur wenn das _Warum_ nicht offensichtlich ist.
10. **Bei Sackgassen / offenen Fragen:** in `LESSONS_LEARNED.md` festhalten.

---

## Kontakt-Punkte bei Unsicherheit

- **Code-Pattern unklar?** → `docs/CLAUDE_CODE_GUIDELINES.md`
- **Architektur-Frage?** → `docs/PROJECT_CONTEXT.md`
- **Was ist als nächstes dran?** → `TODO.md`
- **Frühere Entscheidung?** → `LESSONS_LEARNED.md`
- **Nichts davon hilft?** → Pseudocode + `# TBD`-Kommentar + Eintrag in `LESSONS_LEARNED.md`, dann Darius fragen.
